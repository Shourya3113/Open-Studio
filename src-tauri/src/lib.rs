pub mod commands;
pub mod fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            fs::read_workspace_tree,
            fs::read_file_content,
            fs::write_file_content,
            fs::create_file,
            fs::delete_path,
            fs::start_fs_watcher
        ])
        .run(tauri::generate_context!())
        .expect("error while running Open Studio");
}
