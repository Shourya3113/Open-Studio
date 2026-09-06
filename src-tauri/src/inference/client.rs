use super::queue::{InferencePriority, InferenceQueue};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::{oneshot, Mutex};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CompletionRequest {
    pub model: String,
    pub prompt: String,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default)]
    pub stop_tokens: Vec<String>,
    pub keep_alive: Option<String>,
    pub priority: Option<InferencePriority>,
}

fn default_temperature() -> f32 {
    0.2
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelInfo {
    pub name: String,
    pub size: Option<u64>,
    pub modified_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InferenceHealth {
    pub online: bool,
    pub endpoint: String,
    pub models: Vec<ModelInfo>,
    pub error: Option<String>,
}

#[derive(Deserialize, Debug)]
struct OllamaTagsResponse {
    #[serde(default)]
    models: Vec<OllamaModelTagItem>,
}

#[derive(Deserialize, Debug)]
struct OllamaModelTagItem {
    name: String,
    size: Option<u64>,
    modified_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LlmTokenEvent {
    pub request_id: String,
    pub token: String,
    pub done: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LlmDoneEvent {
    pub request_id: String,
    pub total_duration: Option<u64>,
    pub eval_count: Option<u32>,
    pub eval_duration: Option<u64>,
}

#[derive(Deserialize, Debug)]
struct OllamaGenerateChunk {
    #[allow(dead_code)]
    model: Option<String>,
    response: Option<String>,
    done: bool,
    total_duration: Option<u64>,
    eval_count: Option<u32>,
    eval_duration: Option<u64>,
}

#[derive(Clone)]
pub struct InferenceManager {
    client: reqwest::Client,
    pub default_endpoint: String,
    active_cancellations: Arc<Mutex<HashMap<String, oneshot::Sender<()>>>>,
    pub queue: Arc<InferenceQueue>,
}

impl Default for InferenceManager {
    fn default() -> Self {
        Self::new(None)
    }
}

impl InferenceManager {
    pub fn new(default_endpoint: Option<String>) -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .build()
                .unwrap_or_default(),
            default_endpoint: default_endpoint
                .unwrap_or_else(|| "http://localhost:11434".to_string()),
            active_cancellations: Arc::new(Mutex::new(HashMap::new())),
            queue: Arc::new(InferenceQueue::new()),
        }
    }

    pub async fn check_health(&self, endpoint_override: Option<String>) -> InferenceHealth {
        let endpoint = endpoint_override.unwrap_or_else(|| self.default_endpoint.clone());
        let url = format!("{}/api/tags", endpoint.trim_end_matches('/'));

        match self.client.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    match resp.json::<OllamaTagsResponse>().await {
                        Ok(tags) => {
                            let models = tags
                                .models
                                .into_iter()
                                .map(|m| ModelInfo {
                                    name: m.name,
                                    size: m.size,
                                    modified_at: m.modified_at,
                                })
                                .collect();
                            InferenceHealth {
                                online: true,
                                endpoint,
                                models,
                                error: None,
                            }
                        }
                        Err(err) => InferenceHealth {
                            online: false,
                            endpoint,
                            models: Vec::new(),
                            error: Some(format!("Failed to parse models response: {}", err)),
                        },
                    }
                } else {
                    InferenceHealth {
                        online: false,
                        endpoint,
                        models: Vec::new(),
                        error: Some(format!("Ollama server returned status: {}", resp.status())),
                    }
                }
            }
            Err(err) => InferenceHealth {
                online: false,
                endpoint,
                models: Vec::new(),
                error: Some(format!("Ollama offline or unreachable: {}", err)),
            },
        }
    }

    pub async fn register_cancellation(&self, request_id: &str) -> oneshot::Receiver<()> {
        let (tx, rx) = oneshot::channel();
        let mut map = self.active_cancellations.lock().await;
        map.insert(request_id.to_string(), tx);
        rx
    }

    pub async fn abort_completion(&self, request_id: &str) -> bool {
        self.queue.clear_active(request_id).await;
        let mut map = self.active_cancellations.lock().await;
        if let Some(tx) = map.remove(request_id) {
            let _ = tx.send(());
            true
        } else {
            false
        }
    }

    pub async fn unregister_cancellation(&self, request_id: &str) {
        self.queue.clear_active(request_id).await;
        let mut map = self.active_cancellations.lock().await;
        map.remove(request_id);
    }

    pub async fn stream_completion(
        &self,
        window: tauri::Window,
        request_id: String,
        req: CompletionRequest,
        endpoint_override: Option<String>,
    ) -> Result<(), String> {
        let endpoint = endpoint_override.unwrap_or_else(|| self.default_endpoint.clone());
        let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));

        let priority = req.priority.unwrap_or(InferencePriority::Chat);
        self.queue.enqueue(request_id.clone(), priority).await;

        let mut cancel_rx = self.register_cancellation(&request_id).await;

        let (sentinel_tx, mut sentinel_rx) = oneshot::channel();
        self.queue
            .set_active(request_id.clone(), priority, sentinel_tx)
            .await;

        let body = serde_json::json!({
            "model": req.model,
            "prompt": req.prompt,
            "stream": true,
            "options": {
                "temperature": req.temperature,
                "stop": req.stop_tokens,
            },
            "keep_alive": req.keep_alive.unwrap_or_else(|| "5m".to_string())
        });

        let resp = match self.client.post(&url).json(&body).send().await {
            Ok(r) => r,
            Err(e) => {
                self.unregister_cancellation(&request_id).await;
                return Err(format!("Failed to connect to inference endpoint: {}", e));
            }
        };

        if !resp.status().is_success() {
            self.unregister_cancellation(&request_id).await;
            return Err(format!("Inference server returned HTTP status {}", resp.status()));
        }

        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        loop {
            tokio::select! {
                _ = &mut cancel_rx => {
                    // Preempted / aborted by user or higher priority request
                    let _ = window.emit(
                        &format!("llm-done:{}", request_id),
                        LlmDoneEvent {
                            request_id: request_id.clone(),
                            total_duration: None,
                            eval_count: None,
                            eval_duration: None,
                        }
                    );
                    self.unregister_cancellation(&request_id).await;
                    return Ok(());
                }
                _ = &mut sentinel_rx => {
                    // Preempted by incoming higher-priority task (e.g. Autocomplete)
                    let _ = window.emit(
                        &format!("llm-done:{}", request_id),
                        LlmDoneEvent {
                            request_id: request_id.clone(),
                            total_duration: None,
                            eval_count: None,
                            eval_duration: None,
                        }
                    );
                    self.unregister_cancellation(&request_id).await;
                    return Ok(());
                }
                chunk = stream.next() => {
                    match chunk {
                        Some(Ok(bytes)) => {
                            if let Ok(text) = std::str::from_utf8(&bytes) {
                                buffer.push_str(text);
                                while let Some(pos) = buffer.find('\n') {
                                    let line = buffer[..pos].trim().to_string();
                                    buffer = buffer[pos + 1..].to_string();
                                    if line.is_empty() {
                                        continue;
                                    }
                                    if let Ok(chunk_data) = serde_json::from_str::<OllamaGenerateChunk>(&line) {
                                        if let Some(token) = chunk_data.response {
                                            let _ = window.emit(
                                                &format!("llm-token:{}", request_id),
                                                LlmTokenEvent {
                                                    request_id: request_id.clone(),
                                                    token,
                                                    done: chunk_data.done,
                                                }
                                            );
                                        }
                                        if chunk_data.done {
                                            let _ = window.emit(
                                                &format!("llm-done:{}", request_id),
                                                LlmDoneEvent {
                                                    request_id: request_id.clone(),
                                                    total_duration: chunk_data.total_duration,
                                                    eval_count: chunk_data.eval_count,
                                                    eval_duration: chunk_data.eval_duration,
                                                }
                                            );
                                            self.unregister_cancellation(&request_id).await;
                                            return Ok(());
                                        }
                                    }
                                }
                            }
                        }
                        Some(Err(err)) => {
                            self.unregister_cancellation(&request_id).await;
                            return Err(format!("Error reading stream chunk: {}", err));
                        }
                        None => {
                            let _ = window.emit(
                                &format!("llm-done:{}", request_id),
                                LlmDoneEvent {
                                    request_id: request_id.clone(),
                                    total_duration: None,
                                    eval_count: None,
                                    eval_duration: None,
                                }
                            );
                            self.unregister_cancellation(&request_id).await;
                            return Ok(());
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[tokio::test]
    async fn test_inference_manager_creation() {
        let mgr = InferenceManager::new(Some("http://127.0.0.1:11434".to_string()));
        assert_eq!(mgr.default_endpoint, "http://127.0.0.1:11434");
    }

    #[tokio::test]
    async fn test_cancellation_channel_lifecycle() {
        let mgr = InferenceManager::default();
        let req_id = "test_req_1";
        let rx = mgr.register_cancellation(req_id).await;

        let aborted = mgr.abort_completion(req_id).await;
        assert!(aborted);

        // Receiver should receive abort signal
        let res = rx.await;
        assert!(res.is_ok());

        // Second abort on already aborted request returns false
        let second_abort = mgr.abort_completion(req_id).await;
        assert!(!second_abort);
    }

    #[tokio::test]
    async fn test_health_check_offline_handling() {
        let mgr = InferenceManager::new(Some("http://127.0.0.1:99999".to_string()));
        let health = mgr.check_health(None).await;
        assert!(!health.online);
        assert!(health.error.is_some());
    }
}
