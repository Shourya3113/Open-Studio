pub mod client;

pub use client::{CompletionRequest, InferenceHealth, InferenceManager, ModelInfo};
use tauri::State;

#[tauri::command]
pub async fn check_inference_health(
    state: State<'_, InferenceManager>,
    endpoint: Option<String>,
) -> Result<InferenceHealth, String> {
    Ok(state.check_health(endpoint).await)
}

#[tauri::command]
pub async fn stream_completion(
    window: tauri::Window,
    state: State<'_, InferenceManager>,
    request_id: String,
    req: CompletionRequest,
    endpoint: Option<String>,
) -> Result<(), String> {
    state
        .stream_completion(window, request_id, req, endpoint)
        .await
}

#[tauri::command]
pub async fn abort_completion(
    state: State<'_, InferenceManager>,
    request_id: String,
) -> Result<bool, String> {
    Ok(state.abort_completion(&request_id).await)
}
