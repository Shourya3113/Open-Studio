pub mod commands;
pub mod fs;
pub mod terminal;
pub mod inference;
pub mod diff;
pub mod git;
pub mod ast;
pub mod rag;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(terminal::pty::TerminalManager::new())
        .manage(inference::InferenceManager::default())
        .manage(rag::create_bm25_state())
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            fs::read_workspace_tree,
            fs::read_file_content,
            fs::write_file_content,
            fs::create_file,
            fs::delete_path,
            fs::start_fs_watcher,
            terminal::spawn_terminal_session,
            terminal::write_terminal_input,
            terminal::resize_terminal,
            terminal::close_terminal_session,
            inference::check_inference_health,
            inference::stream_completion,
            inference::abort_completion,
            inference::get_hardware_tier,
            inference::get_model_residency,
            inference::evict_model,
            inference::evict_idle_models,
            diff::parse_frugal_diff,
            diff::preview_frugal_diff,
            diff::apply_frugal_diff,
            git::create_checkpoint,
            git::list_checkpoints,
            git::restore_checkpoint,
            ast::slicer::slice_file_ast,
            ast::slicer::generate_repo_skeleton,
            rag::bm25::build_bm25_index,
            rag::bm25::search_bm25,
            rag::aggregator::aggregate_codebase_context
        ])
        .run(tauri::generate_context!())
        .expect("error while running Open Studio");
}
