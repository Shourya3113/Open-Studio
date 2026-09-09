use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Checkpoint {
    pub id: String,
    pub ref_name: String,
    pub commit_hash: String,
    pub timestamp: String,
    pub timestamp_epoch_secs: u64,
    pub branch: String,
    pub summary: String,
    pub file_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub success: bool,
    pub checkpoint_id: String,
    pub restored_files: Vec<String>,
    pub message: String,
}

fn run_git(workspace: &Path, args: &[&str], envs: &[(&str, &str)]) -> Result<String, String> {
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(workspace);
    for (k, v) in envs {
        cmd.env(k, v);
    }
    cmd.args(args);
    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute git command {:?}: {}", args, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if err_msg.is_empty() {
            format!("Git command {:?} failed with status {}", args, output.status)
        } else {
            err_msg
        })
    }
}

/// Creates a shadow git checkpoint under `refs/ai-checkpoints/<branch>/<timestamp>`.
/// This operates entirely on an isolated alternate index without moving HEAD,
/// changing the current branch, or modifying normal git history.
pub fn create_checkpoint(workspace: &Path, summary: &str) -> Result<Checkpoint, String> {
    let git_dir = workspace.join(".git");
    if !git_dir.exists() {
        return Err("Workspace is not a Git repository".to_string());
    }

    // Determine current branch or fallback
    let branch = run_git(workspace, &["symbolic-ref", "--short", "HEAD"], &[])
        .unwrap_or_else(|_| {
            run_git(workspace, &["rev-parse", "--short", "HEAD"], &[])
                .unwrap_or_else(|_| "main".to_string())
        });

    let safe_branch = branch.replace(['/', '\\', ' ', ':'], "_");

    // Use an isolated temporary index file
    let temp_index_path = git_dir.join("ai_checkpoint_index");
    let temp_index_str = temp_index_path.to_string_lossy().to_string();

    let envs = [("GIT_INDEX_FILE", temp_index_str.as_str())];

    // Stage working tree into shadow index
    run_git(workspace, &["add", "-A"], &envs)?;

    // Write tree object
    let tree_sha = run_git(workspace, &["write-tree"], &envs)?;

    // Find parent commit if HEAD exists
    let parent_sha = run_git(workspace, &["rev-parse", "HEAD"], &[]).ok();

    // Commit tree
    let commit_msg = format!("AI Checkpoint: {}", summary);
    let mut commit_args = vec!["commit-tree", tree_sha.as_str()];
    if let Some(ref p) = parent_sha {
        if !p.is_empty() {
            commit_args.push("-p");
            commit_args.push(p.as_str());
        }
    }
    commit_args.push("-m");
    commit_args.push(&commit_msg);

    let commit_sha = run_git(workspace, &commit_args, &[])?;

    // Generate unique timestamped ref
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let ref_name = format!("refs/ai-checkpoints/{}/{}", safe_branch, now);

    run_git(workspace, &["update-ref", &ref_name, &commit_sha], &[])?;

    // Clean up temporary index
    let _ = std::fs::remove_file(&temp_index_path);

    // Get changed files
    let file_paths = if let Some(ref p) = parent_sha {
        run_git(
            workspace,
            &["diff-tree", "--no-commit-id", "--name-only", "-r", &commit_sha, p],
            &[],
        )
        .unwrap_or_default()
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
    } else {
        run_git(
            workspace,
            &["diff-tree", "--no-commit-id", "--name-only", "-r", &commit_sha],
            &[],
        )
        .unwrap_or_default()
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
    };

    Ok(Checkpoint {
        id: commit_sha.clone(),
        ref_name,
        commit_hash: commit_sha,
        timestamp: chrono_like_now(),
        timestamp_epoch_secs: now,
        branch,
        summary: summary.to_string(),
        file_paths,
    })
}

/// Lists all shadow checkpoints under `refs/ai-checkpoints/` sorted descending by date.
pub fn list_checkpoints(workspace: &Path) -> Result<Vec<Checkpoint>, String> {
    let git_dir = workspace.join(".git");
    if !git_dir.exists() {
        return Ok(Vec::new());
    }

    let output = run_git(
        workspace,
        &[
            "for-each-ref",
            "--sort=-creatordate",
            "--format=%(refname)%09%(objectname)%09%(creatordate:iso8601)%09%(contents:subject)",
            "refs/ai-checkpoints/",
        ],
        &[],
    )?;

    if output.is_empty() {
        return Ok(Vec::new());
    }

    let mut checkpoints = Vec::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 4 {
            let ref_name = parts[0].to_string();
            let commit_hash = parts[1].to_string();
            let timestamp = parts[2].to_string();
            let raw_subject = parts[3].to_string();
            let summary = raw_subject
                .strip_prefix("AI Checkpoint: ")
                .unwrap_or(&raw_subject)
                .to_string();

            // Extract branch and epoch from ref_name: refs/ai-checkpoints/<branch>/<epoch>
            let segments: Vec<&str> = ref_name.split('/').collect();
            let branch = if segments.len() >= 4 {
                segments[2].to_string()
            } else {
                "unknown".to_string()
            };
            let timestamp_epoch_secs = segments.last().and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);

            // Get file paths changed in this checkpoint
            let file_paths: Vec<String> = run_git(
                workspace,
                &["diff-tree", "--no-commit-id", "--name-only", "-r", &commit_hash],
                &[],
            )
            .unwrap_or_default()
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

            checkpoints.push(Checkpoint {
                id: commit_hash.clone(),
                ref_name,
                commit_hash,
                timestamp,
                timestamp_epoch_secs,
                branch,
                summary,
                file_paths,
            });
        }
    }

    Ok(checkpoints)
}

/// Restores workspace files to match the specified checkpoint commit.
/// Protects uncommitted changes by creating a pre-restore safety snapshot first.
pub fn restore_checkpoint(workspace: &Path, checkpoint_id: &str) -> Result<RestoreResult, String> {
    let git_dir = workspace.join(".git");
    if !git_dir.exists() {
        return Err("Workspace is not a Git repository".to_string());
    }

    // Resolve checkpoint identifier (could be ref name or commit hash)
    let commit_hash = run_git(workspace, &["rev-parse", checkpoint_id], &[])?;

    // Create safety snapshot before restoring so restore itself can be rolled back
    let _ = create_checkpoint(workspace, &format!("Safety snapshot before restore of {}", &commit_hash[..7.min(commit_hash.len())]));

    // Find all files present in the target commit
    let files_output = run_git(
        workspace,
        &["diff-tree", "--no-commit-id", "--name-only", "-r", &commit_hash],
        &[],
    )?;
    let restored_files: Vec<String> = files_output
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    // Checkout all files from target commit to working directory
    run_git(workspace, &["checkout", &commit_hash, "--", "."], &[])?;

    Ok(RestoreResult {
        success: true,
        checkpoint_id: commit_hash.clone(),
        restored_files: restored_files.clone(),
        message: format!("Successfully restored {} files from checkpoint {}", restored_files.len(), &commit_hash[..7.min(commit_hash.len())]),
    })
}

fn chrono_like_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("timestamp: {}", now)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn setup_test_repo(name: &str) -> std::path::PathBuf {
        let temp_dir = std::env::temp_dir().join(format!("open_studio_test_git_{}_{}", name, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        run_git(&temp_dir, &["init"], &[]).unwrap();
        run_git(&temp_dir, &["config", "user.name", "Test User"], &[]).unwrap();
        run_git(&temp_dir, &["config", "user.email", "test@openstudio.ai"], &[]).unwrap();
        run_git(&temp_dir, &["config", "core.autocrlf", "false"], &[]).unwrap();

        // Initial commit
        let sample_file = temp_dir.join("sample.txt");
        fs::write(&sample_file, "initial content\n").unwrap();
        run_git(&temp_dir, &["add", "sample.txt"], &[]).unwrap();
        run_git(&temp_dir, &["commit", "-m", "Initial commit"], &[]).unwrap();

        temp_dir
    }

    #[test]
    fn test_create_and_list_shadow_checkpoints() {
        let repo = setup_test_repo("create_and_list");

        // Modify file without committing to git
        let sample_file = repo.join("sample.txt");
        fs::write(&sample_file, "modified content for checkpoint\n").unwrap();

        // Create shadow checkpoint
        let cp = create_checkpoint(&repo, "Test pre-diff checkpoint").expect("Failed to create checkpoint");
        assert!(!cp.id.is_empty());
        assert!(cp.ref_name.starts_with("refs/ai-checkpoints/"));
        assert_eq!(cp.summary, "Test pre-diff checkpoint");

        // List checkpoints
        let list = list_checkpoints(&repo).expect("Failed to list checkpoints");
        assert!(!list.is_empty());
        assert_eq!(list[0].id, cp.id);
        assert_eq!(list[0].summary, "Test pre-diff checkpoint");

        // Verify HEAD branch history was not polluted
        let log = run_git(&repo, &["log", "--oneline"], &[]).unwrap();
        assert!(!log.contains("AI Checkpoint"));

        let _ = fs::remove_dir_all(&repo);
    }

    #[test]
    fn test_restore_checkpoint_reverts_files() {
        let repo = setup_test_repo("restore");

        let sample_file = repo.join("sample.txt");
        fs::write(&sample_file, "good content\n").unwrap();

        // Checkpoint the good content
        let cp = create_checkpoint(&repo, "Good state").expect("Checkpoint failed");

        // Corrupt or make unwanted modifications
        fs::write(&sample_file, "bad broken content\n").unwrap();
        assert_eq!(fs::read_to_string(&sample_file).unwrap().replace("\r\n", "\n"), "bad broken content\n");

        // Restore checkpoint
        let res = restore_checkpoint(&repo, &cp.id).expect("Restore failed");
        assert!(res.success);

        // Verify content restored
        let restored_content = fs::read_to_string(&sample_file).unwrap();
        assert_eq!(restored_content.replace("\r\n", "\n"), "good content\n");

        let _ = fs::remove_dir_all(&repo);
    }

    #[test]
    fn test_active_branch_history_unpolluted() {
        let repo = setup_test_repo("history_clean");
        let initial_log = run_git(&repo, &["rev-parse", "HEAD"], &[]).unwrap();

        let sample_file = repo.join("sample.txt");
        fs::write(&sample_file, "intermediate work\n").unwrap();

        let _cp = create_checkpoint(&repo, "Shadow Snapshot").expect("Checkpoint failed");

        let head_after = run_git(&repo, &["rev-parse", "HEAD"], &[]).unwrap();
        assert_eq!(initial_log, head_after, "HEAD commit must not move during checkpoint");

        let _ = fs::remove_dir_all(&repo);
    }
}
