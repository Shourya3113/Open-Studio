pub mod tree;
pub mod watcher;

use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
pub use tree::FileNode;

#[tauri::command]
pub async fn read_workspace_tree(root_path: Option<String>, depth: Option<usize>) -> Result<FileNode, String> {
    let target_path = match root_path {
        Some(p) => PathBuf::from(p),
        None => std::env::current_dir().map_err(|e| e.to_string())?,
    };

    let max_depth = depth.unwrap_or(4);
    tree::build_tree(&target_path, 0, max_depth)
}

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[tauri::command]
pub async fn write_file_content(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {}", e))?;
    }
    fs::File::create(&path).map_err(|e| format!("Failed to create file {}: {}", path, e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    let target = Path::new(&path);
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| format!("Failed to remove directory: {}", e))
    } else {
        fs::remove_file(target).map_err(|e| format!("Failed to remove file: {}", e))
    }
}

#[tauri::command]
pub fn start_fs_watcher(app_handle: AppHandle, root_path: String) -> Result<(), String> {
    watcher::watch_workspace(app_handle, root_path)
}
