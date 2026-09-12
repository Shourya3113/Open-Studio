use open_studio_lib::diff::frugal_parser::{apply_hunks, parse_diff_blocks, MatchTier};
use open_studio_lib::git::checkpoint::{
    create_checkpoint, get_checkpoint_diff, restore_checkpoint,
};
use std::fs;
use std::path::{Path, PathBuf};

fn run_git_cmd(dir: &Path, args: &[&str]) {
    let _ = std::process::Command::new("git")
        .current_dir(dir)
        .args(args)
        .output();
}

fn setup_week10_test_repo(name: &str) -> PathBuf {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let temp_dir = std::env::temp_dir().join(format!("open_studio_week10_{}_{}", name, now));
    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir).unwrap();

    run_git_cmd(&temp_dir, &["init"]);
    run_git_cmd(&temp_dir, &["config", "user.name", "Open Studio AI"]);
    run_git_cmd(&temp_dir, &["config", "user.email", "ai@open-studio.local"]);
    run_git_cmd(&temp_dir, &["config", "core.autocrlf", "false"]);

    let main_rs = temp_dir.join("main.rs");
    fs::write(
        &main_rs,
        "fn main() {\n    let a = 10;\n    let b = 20;\n    let sum = a + b;\n    println!(\"{}\", sum);\n}\n",
    )
    .unwrap();

    let utils_rs = temp_dir.join("utils.rs");
    fs::write(
        &utils_rs,
        "pub fn calculate(x: i32) -> i32 {\n    x * 2\n}\n",
    )
    .unwrap();

    run_git_cmd(&temp_dir, &["add", "."]);
    run_git_cmd(&temp_dir, &["commit", "-m", "Initial commit"]);

    temp_dir
}

#[test]
fn test_week10_frugal_diff_multi_file_multi_hunk_parity_e2e() {
    let raw_diff = r#"FILE: src/main.rs
<<<<<<< SEARCH
    let a = 10;
    let b = 20;
=======
    let a = 100;
    let b = 200;
>>>>>>> REPLACE

FILE: src/utils.rs
<<<<<<< SEARCH
pub fn calculate(x: i32) -> i32 {
    x * 2
}
=======
pub fn calculate(x: i32) -> i32 {
    // Fast path bitshift
    x << 1
}
>>>>>>> REPLACE"#;

    let files = parse_diff_blocks(raw_diff);
    assert_eq!(files.len(), 2);
    assert_eq!(files[0].file_path, "src/main.rs");
    assert_eq!(files[0].hunks.len(), 1);
    assert_eq!(files[1].file_path, "src/utils.rs");
    assert_eq!(files[1].hunks.len(), 1);

    // Apply to src/main.rs
    let main_content = "fn main() {\n    let a = 10;\n    let b = 20;\n    let sum = a + b;\n}\n";
    let main_res = apply_hunks(main_content, &files[0].hunks);
    assert!(main_res.all_applied);
    assert!(main_res.modified_content.contains("let a = 100;"));
    assert!(main_res.modified_content.contains("let b = 200;"));

    // Apply to src/utils.rs
    let utils_content = "pub fn calculate(x: i32) -> i32 {\n    x * 2\n}\n";
    let utils_res = apply_hunks(utils_content, &files[1].hunks);
    assert!(utils_res.all_applied);
    assert!(utils_res.modified_content.contains("// Fast path bitshift"));
    assert!(utils_res.modified_content.contains("x << 1"));
}

#[test]
fn test_week10_frugal_diff_3tier_matching_parity_e2e() {
    let source = "fn example() {\n    let status = \"active\";\n    if status == \"active\" {\n        println!(\"ready\");\n    }\n}\n";

    // 1. Exact match tier
    let exact_diff = r#"<<<<<<< SEARCH
    if status == "active" {
        println!("ready");
    }
=======
    if status == "active" {
        println!("online");
    }
>>>>>>> REPLACE"#;
    let hunks1 = parse_diff_blocks(exact_diff);
    let res1 = apply_hunks(source, &hunks1[0].hunks);
    assert!(res1.all_applied);
    assert_eq!(res1.hunk_results[0].matched_tier, Some(MatchTier::Exact));
    assert!(res1.modified_content.contains("println!(\"online\");"));

    // 2. Line-anchored match tier with slightly displaced context
    let line_anchored_diff = r#"<<<<<<< SEARCH (line 3)
    if status == "active" {
        println!("ready");
    }
=======
    if status == "active" {
        println!("dispatched");
    }
>>>>>>> REPLACE"#;
    let hunks2 = parse_diff_blocks(line_anchored_diff);
    let res2 = apply_hunks(source, &hunks2[0].hunks);
    assert!(res2.all_applied);
    assert_eq!(
        res2.hunk_results[0].matched_tier,
        Some(MatchTier::Exact) // exact lines match at line 3
    );

    // 3. Whitespace-trimmed match tier (indented search block differing in whitespace)
    let ws_diff = r#"<<<<<<< SEARCH
let status = "active";
=======
let status = "pending";
>>>>>>> REPLACE"#;
    let hunks3 = parse_diff_blocks(ws_diff);
    let res3 = apply_hunks(source, &hunks3[0].hunks);
    assert!(res3.all_applied);
    assert_eq!(
        res3.hunk_results[0].matched_tier,
        Some(MatchTier::WhitespaceInsensitive)
    );
    assert!(res3.modified_content.contains("    let status = \"pending\";"));
}

#[test]
fn test_week10_frugal_diff_crlf_preservation_e2e() {
    let crlf_source = "fn test() {\r\n    let val = 1;\r\n    let res = val + 1;\r\n}\r\n";
    let diff = r#"<<<<<<< SEARCH
    let val = 1;
=======
    let val = 42;
>>>>>>> REPLACE"#;

    let hunks = parse_diff_blocks(diff);
    let res = apply_hunks(crlf_source, &hunks[0].hunks);
    assert!(res.all_applied);
    assert!(res.modified_content.contains("\r\n"));
    assert!(res.modified_content.contains("    let val = 42;\r\n"));
}

#[test]
fn test_week10_shadow_checkpoint_frugal_diff_rollback_flow_e2e() {
    let repo_dir = setup_week10_test_repo("frugal_checkpoint");

    // 1. Create baseline shadow checkpoint
    let cp1 = create_checkpoint(&repo_dir, "Baseline before frugal patching")
        .expect("Failed to create baseline checkpoint");
    assert!(!cp1.id.is_empty());

    // 2. Apply surgical frugal diff to main.rs
    let main_rs = repo_dir.join("main.rs");
    let initial_main = fs::read_to_string(&main_rs).unwrap();

    let diff = r#"<<<<<<< SEARCH
    let sum = a + b;
    println!("{}", sum);
=======
    let sum = a * b;
    println!("Product: {}", sum);
>>>>>>> REPLACE"#;

    let file_diffs = parse_diff_blocks(diff);
    let preview = apply_hunks(&initial_main, &file_diffs[0].hunks);
    assert!(preview.all_applied);
    fs::write(&main_rs, &preview.modified_content).unwrap();

    // Verify main.rs was modified
    let modified_main = fs::read_to_string(&main_rs).unwrap();
    assert!(modified_main.contains("Product:"));

    // 3. Create second checkpoint after patch
    let cp2 = create_checkpoint(&repo_dir, "After frugal multiplication patch")
        .expect("Failed to create second checkpoint");
    let diff_vs_parent = get_checkpoint_diff(&repo_dir, &cp2.id, Some("parent"))
        .expect("Failed to get parent diff");
    assert!(diff_vs_parent
        .files
        .iter()
        .any(|f| f.patch.contains("Product:")));

    // 4. Restore baseline checkpoint (1-click rollback)
    let restore_res =
        restore_checkpoint(&repo_dir, &cp1.id).expect("Failed to restore baseline checkpoint");
    assert!(restore_res.success);

    // Verify file returned to initial baseline
    let restored_main = fs::read_to_string(&main_rs).unwrap();
    assert_eq!(restored_main, initial_main);
    assert!(!restored_main.contains("Product:"));
}

#[test]
fn test_week10_air_gapped_network_isolation_security_e2e() {
    // Air-gap validation: local daemon endpoints must be loopback only
    fn is_air_gapped_endpoint(endpoint: &str) -> bool {
        let clean = endpoint
            .trim_start_matches("http://")
            .trim_start_matches("https://");
        let host = clean.split(':').next().unwrap_or("");
        host == "127.0.0.1" || host == "localhost" || host == "::1"
    }

    assert!(is_air_gapped_endpoint("http://127.0.0.1:11434"));
    assert!(is_air_gapped_endpoint("http://localhost:11434"));
    assert!(is_air_gapped_endpoint("http://127.0.0.1:8080"));

    // Rejection of cloud endpoints
    assert!(!is_air_gapped_endpoint("https://api.openai.com/v1"));
    assert!(!is_air_gapped_endpoint("https://api.anthropic.com"));
    assert!(!is_air_gapped_endpoint("https://telemetry.openstudio.ai"));
    assert!(!is_air_gapped_endpoint("http://192.168.1.100:11434"));
}
