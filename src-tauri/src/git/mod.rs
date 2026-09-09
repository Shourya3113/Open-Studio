pub mod checkpoint;

use checkpoint::{Checkpoint, RestoreResult};
use std::path::PathBuf;

fn resolve_root(workspace_root: Option<String>) -> Result<PathBuf, String> {
    match workspace_root {
        Some(p) => Ok(PathBuf::from(p)),
        None => std::env::current_dir().map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub fn create_checkpoint(workspace_root: Option<String>, summary: String) -> Result<Checkpoint, String> {
    let root = resolve_root(workspace_root)?;
    checkpoint::create_checkpoint(&root, &summary)
}

#[tauri::command]
pub fn list_checkpoints(workspace_root: Option<String>) -> Result<Vec<Checkpoint>, String> {
    let root = resolve_root(workspace_root)?;
    checkpoint::list_checkpoints(&root)
}

#[tauri::command]
pub fn restore_checkpoint(workspace_root: Option<String>, checkpoint_id: String) -> Result<RestoreResult, String> {
    let root = resolve_root(workspace_root)?;
    checkpoint::restore_checkpoint(&root, &checkpoint_id)
}
