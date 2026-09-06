use notify_debouncer_mini::new_debouncer;
use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct WorkspaceWatcher {
    _handle: Option<()>,
}

pub fn watch_workspace(app_handle: AppHandle, workspace_path: String) -> Result<(), String> {
    let (tx, rx) = channel();

    let mut debouncer = new_debouncer(Duration::from_millis(500), tx)
        .map_err(|e| format!("Failed to create file debouncer: {}", e))?;

    let path = Path::new(&workspace_path);
    if !path.exists() {
        return Err(format!("Workspace path does not exist: {}", workspace_path));
    }

    debouncer
        .watcher()
        .watch(path, notify::RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch workspace path: {}", e))?;

    std::thread::spawn(move || {
        // Keep debouncer alive in thread
        let _debouncer = debouncer;
        while let Ok(res) = rx.recv() {
            match res {
                Ok(events) => {
                    let changed_paths: Vec<String> = events
                        .into_iter()
                        .map(|e| e.path.to_string_lossy().replace('\\', "/"))
                        .collect();
                    let _ = app_handle.emit("workspace-fs-change", changed_paths);
                }
                Err(err) => {
                    eprintln!("File watch error: {:?}", err);
                }
            }
        }
    });

    Ok(())
}
