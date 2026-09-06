pub mod pty;

use pty::TerminalManager;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn spawn_terminal_session(
    app_handle: AppHandle,
    manager: State<'_, TerminalManager>,
    id: String,
    cols: Option<u16>,
    rows: Option<u16>,
    shell: Option<String>,
) -> Result<(), String> {
    manager.spawn(
        app_handle,
        id,
        cols.unwrap_or(80),
        rows.unwrap_or(24),
        shell,
    )
}

#[tauri::command]
pub fn write_terminal_input(
    manager: State<'_, TerminalManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    manager.write_input(&id, &data)
}

#[tauri::command]
pub fn resize_terminal(
    manager: State<'_, TerminalManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    manager.resize(&id, cols, rows)
}

#[tauri::command]
pub fn close_terminal_session(
    manager: State<'_, TerminalManager>,
    id: String,
) -> Result<(), String> {
    manager.close(&id);
    Ok(())
}
