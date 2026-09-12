pub mod checkpoint;

use checkpoint::{Checkpoint, CheckpointDiffDetails, FileRestoreResult, RestoreResult};
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

#[tauri::command]
pub fn get_checkpoint_diff(
    workspace_root: Option<String>,
    checkpoint_id: String,
    compare_target: Option<String>,
) -> Result<CheckpointDiffDetails, String> {
    let root = resolve_root(workspace_root)?;
    checkpoint::get_checkpoint_diff(&root, &checkpoint_id, compare_target.as_deref())
}

#[tauri::command]
pub fn restore_checkpoint_file(
    workspace_root: Option<String>,
    checkpoint_id: String,
    file_path: String,
) -> Result<FileRestoreResult, String> {
    let root = resolve_root(workspace_root)?;
    checkpoint::restore_checkpoint_file(&root, &checkpoint_id, &file_path)
}

#[tauri::command]
pub fn restore_checkpoint_files(
    workspace_root: Option<String>,
    checkpoint_id: String,
    file_paths: Vec<String>,
) -> Result<RestoreResult, String> {
    let root = resolve_root(workspace_root)?;
    checkpoint::restore_checkpoint_files(&root, &checkpoint_id, &file_paths)
}

