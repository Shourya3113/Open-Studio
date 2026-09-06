pub mod client;
pub mod queue;
pub mod swapper;

pub use client::{CompletionRequest, InferenceHealth, InferenceManager, ModelInfo};
pub use queue::{InferencePriority, InferenceQueue};
pub use swapper::{HardwareTier, HardwareTierInfo, ModelResidency, ModelSwapper};
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

#[tauri::command]
pub fn get_hardware_tier(
    state: State<'_, InferenceManager>,
) -> Result<HardwareTierInfo, String> {
    Ok(state.get_hardware_tier())
}

#[tauri::command]
pub async fn get_model_residency(
    state: State<'_, InferenceManager>,
) -> Result<Vec<ModelResidency>, String> {
    Ok(state.get_model_residency().await)
}

#[tauri::command]
pub async fn evict_model(
    state: State<'_, InferenceManager>,
    model: String,
    endpoint: Option<String>,
) -> Result<(), String> {
    state.evict_model(&model, endpoint).await
}

#[tauri::command]
pub async fn evict_idle_models(
    state: State<'_, InferenceManager>,
    endpoint: Option<String>,
) -> Result<Vec<String>, String> {
    Ok(state.evict_idle_models(endpoint).await)
}

