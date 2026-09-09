pub mod frugal_parser;

use frugal_parser::{DiffHunk, DiffPreviewResult, FileDiff};
use std::path::PathBuf;

#[tauri::command]
pub fn parse_frugal_diff(diff_text: String) -> Result<Vec<FileDiff>, String> {
    Ok(frugal_parser::parse_diff_blocks(&diff_text))
}

#[tauri::command]
pub fn preview_frugal_diff(
    original_content: String,
    hunks: Vec<DiffHunk>,
) -> Result<DiffPreviewResult, String> {
    Ok(frugal_parser::apply_hunks(&original_content, &hunks))
}

#[tauri::command]
pub fn apply_frugal_diff(
    workspace_root: String,
    file_diff: FileDiff,
) -> Result<DiffPreviewResult, String> {
    let root = PathBuf::from(&workspace_root);
    frugal_parser::apply_diff_to_file(&root, &file_diff)
}
