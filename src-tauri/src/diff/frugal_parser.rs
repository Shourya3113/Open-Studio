use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MatchTier {
    Exact,
    LineAnchored,
    WhitespaceInsensitive,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    pub id: String,
    pub line_hint: Option<usize>,
    pub search: String,
    pub replace: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileDiff {
    pub file_path: String,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HunkApplicationResult {
    pub hunk_id: String,
    pub success: bool,
    pub matched_tier: Option<MatchTier>,
    pub matched_line_start: Option<usize>,
    pub matched_line_end: Option<usize>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiffPreviewResult {
    pub original_content: String,
    pub modified_content: String,
    pub hunk_results: Vec<HunkApplicationResult>,
    pub all_applied: bool,
}

#[derive(Debug, Clone)]
struct MatchLocation {
    pub line_start: usize, // 1-based inclusive
    pub line_end: usize,   // 1-based inclusive
    pub tier: MatchTier,
    pub indent_delta: isize,
}

/// Extract optional line anchor hint from a `<<<<<<< SEARCH (line 42)` line.
fn extract_line_hint(header: &str) -> Option<usize> {
    let lower = header.to_lowercase();
    if let Some(pos) = lower.find("line") {
        let after = &lower[pos + 4..];
        let digits: String = after
            .chars()
            .skip_while(|c| *c == 's' || *c == ':' || *c == ' ' || *c == '(' || *c == '#')
            .take_while(|c| c.is_ascii_digit())
            .collect();
        digits.parse::<usize>().ok()
    } else {
        None
    }
}

/// Normalize path string by removing markdown backticks, quotes, and normalizing slashes.
fn clean_file_path(raw: &str) -> String {
    let trimmed = raw.trim();
    let stripped = trimmed
        .strip_prefix("FILE:")
        .or_else(|| trimmed.strip_prefix("file:"))
        .or_else(|| trimmed.strip_prefix("File:"))
        .or_else(|| trimmed.strip_prefix("***"))
        .or_else(|| trimmed.strip_prefix("---"))
        .unwrap_or(trimmed)
        .trim();

    let unquoted = stripped
        .trim_matches(|c| c == '`' || c == '"' || c == '\'' || c == '*' || c == ':')
        .trim();

    unquoted.replace('\\', "/")
}

/// Parses frugal diff blocks from raw LLM output text.
///
/// Expected format:
/// FILE: path/to/file.ext
/// <<<<<<< SEARCH (line 42)
/// <original code>
/// =======
/// <new code>
/// >>>>>>> REPLACE
pub fn parse_diff_blocks(input: &str) -> Vec<FileDiff> {
    let mut files: Vec<FileDiff> = Vec::new();
    let mut current_file_path = String::from("untitled");
    let mut current_hunks: Vec<DiffHunk> = Vec::new();
    let mut hunk_counter: usize = 1;

    enum State {
        Scanning,
        InSearch {
            line_hint: Option<usize>,
            search_lines: Vec<String>,
        },
        InReplace {
            line_hint: Option<usize>,
            search_lines: Vec<String>,
            replace_lines: Vec<String>,
        },
    }

    let mut state = State::Scanning;

    for raw_line in input.lines() {
        let line = raw_line.trim_end();
        let trimmed_line = line.trim();

        match &mut state {
            State::Scanning => {
                // Check if this line specifies a file path
                if (trimmed_line.starts_with("FILE:")
                    || trimmed_line.starts_with("File:")
                    || trimmed_line.starts_with("file:")
                    || trimmed_line.starts_with("*** ")
                    || trimmed_line.starts_with("--- "))
                    && !trimmed_line.starts_with("--- a/")
                {
                    let new_path = clean_file_path(trimmed_line);
                    if !new_path.is_empty() {
                        if !current_hunks.is_empty() {
                            files.push(FileDiff {
                                file_path: current_file_path.clone(),
                                hunks: current_hunks,
                            });
                            current_hunks = Vec::new();
                        }
                        current_file_path = new_path;
                    }
                    continue;
                }

                // Check for SEARCH block start
                if trimmed_line.starts_with("<<<<<<< SEARCH")
                    || trimmed_line.starts_with("<<<<<<< search")
                {
                    let line_hint = extract_line_hint(trimmed_line);
                    state = State::InSearch {
                        line_hint,
                        search_lines: Vec::new(),
                    };
                }
            }
            State::InSearch {
                line_hint,
                search_lines,
            } => {
                if trimmed_line.starts_with("=======") {
                    let hint = *line_hint;
                    let sl = std::mem::take(search_lines);
                    state = State::InReplace {
                        line_hint: hint,
                        search_lines: sl,
                        replace_lines: Vec::new(),
                    };
                } else {
                    search_lines.push(line.to_string());
                }
            }
            State::InReplace {
                line_hint,
                search_lines,
                replace_lines,
            } => {
                if trimmed_line.starts_with(">>>>>>> REPLACE")
                    || trimmed_line.starts_with(">>>>>>> replace")
                    || trimmed_line.starts_with(">>>>>>>")
                {
                    let hunk = DiffHunk {
                        id: format!("hunk-{}", hunk_counter),
                        line_hint: *line_hint,
                        search: search_lines.join("\n"),
                        replace: replace_lines.join("\n"),
                    };
                    hunk_counter += 1;
                    current_hunks.push(hunk);
                    state = State::Scanning;
                } else {
                    replace_lines.push(line.to_string());
                }
            }
        }
    }

    // Flush any pending hunks
    if !current_hunks.is_empty() {
        files.push(FileDiff {
            file_path: current_file_path,
            hunks: current_hunks,
        });
    }

    files
}

/// Matches a single hunk against the lines of a file using the 3-tier matching engine.
fn match_hunk(file_lines: &[String], hunk: &DiffHunk) -> Result<MatchLocation, String> {
    // Edge case: Empty search represents a pure insertion
    if hunk.search.is_empty() {
        let insert_line = match hunk.line_hint {
            Some(hint) => hint.max(1).min(file_lines.len() + 1),
            None => 1,
        };
        return Ok(MatchLocation {
            line_start: insert_line,
            line_end: insert_line.saturating_sub(1), // 0-length range
            tier: MatchTier::Exact,
            indent_delta: 0,
        });
    }

    let search_lines: Vec<&str> = hunk.search.lines().collect();
    if search_lines.is_empty() {
        let insert_line = hunk.line_hint.unwrap_or(1).max(1).min(file_lines.len() + 1);
        return Ok(MatchLocation {
            line_start: insert_line,
            line_end: insert_line.saturating_sub(1),
            tier: MatchTier::Exact,
            indent_delta: 0,
        });
    }

    let n_search = search_lines.len();
    if n_search > file_lines.len() {
        return Err(format!(
            "Search block ({} lines) exceeds target file length ({} lines)",
            n_search,
            file_lines.len()
        ));
    }

    // -------------------------------------------------------------
    // Tier 1: Exact Line Sequence Match
    // -------------------------------------------------------------
    let mut exact_matches: Vec<usize> = Vec::new();
    for i in 0..=(file_lines.len() - n_search) {
        let file_slice: Vec<&str> = file_lines[i..i + n_search].iter().map(|s| s.as_str()).collect();
        if file_slice == search_lines {
            exact_matches.push(i);
        }
    }

    if exact_matches.len() == 1 {
        let idx = exact_matches[0];
        return Ok(MatchLocation {
            line_start: idx + 1,
            line_end: idx + n_search,
            tier: MatchTier::Exact,
            indent_delta: 0,
        });
    } else if exact_matches.len() > 1 {
        if let Some(hint) = hunk.line_hint {
            let target_idx = hint.saturating_sub(1);
            let mut sorted = exact_matches.clone();
            sorted.sort_by_key(|&c| (c as isize - target_idx as isize).abs());

            let d0 = (sorted[0] as isize - target_idx as isize).abs();
            let d1 = (sorted[1] as isize - target_idx as isize).abs();

            if d0 < d1 {
                let idx = sorted[0];
                return Ok(MatchLocation {
                    line_start: idx + 1,
                    line_end: idx + n_search,
                    tier: MatchTier::LineAnchored,
                    indent_delta: 0,
                });
            } else {
                return Err(format!(
                    "Ambiguous match: search block matched equally near line {} (candidates at lines {} and {})",
                    hint,
                    sorted[0] + 1,
                    sorted[1] + 1
                ));
            }
        } else {
            let line_numbers: Vec<usize> = exact_matches.iter().map(|&i| i + 1).collect();
            return Err(format!(
                "Ambiguous match: search block matches {} locations at lines {:?}. Provide a line anchor hint.",
                exact_matches.len(),
                line_numbers
            ));
        }
    }

    // -------------------------------------------------------------
    // Tier 2: Line-Number Anchored Match (Local Window / Minor Drift)
    // -------------------------------------------------------------
    if let Some(hint) = hunk.line_hint {
        let target_idx = hint.saturating_sub(1);
        let window_start = target_idx.saturating_sub(15);
        let window_end = (target_idx + 15).min(file_lines.len().saturating_sub(n_search));

        if window_start <= window_end && window_end < file_lines.len() {
            let mut window_matches = Vec::new();
            for i in window_start..=window_end {
                let file_slice: Vec<&str> =
                    file_lines[i..i + n_search].iter().map(|s| s.as_str()).collect();
                if file_slice == search_lines {
                    window_matches.push(i);
                }
            }

            if window_matches.len() == 1 {
                let idx = window_matches[0];
                return Ok(MatchLocation {
                    line_start: idx + 1,
                    line_end: idx + n_search,
                    tier: MatchTier::LineAnchored,
                    indent_delta: 0,
                });
            }
        }
    }

    // -------------------------------------------------------------
    // Tier 3: Whitespace-Insensitive Match
    // -------------------------------------------------------------
    // Step 3a: Match ignoring trailing whitespace
    let mut trailing_trimmed_matches: Vec<usize> = Vec::new();
    for i in 0..=(file_lines.len() - n_search) {
        let matched = (0..n_search).all(|k| {
            file_lines[i + k].trim_end() == search_lines[k].trim_end()
        });
        if matched {
            trailing_trimmed_matches.push(i);
        }
    }

    if trailing_trimmed_matches.len() == 1 {
        let idx = trailing_trimmed_matches[0];
        return Ok(MatchLocation {
            line_start: idx + 1,
            line_end: idx + n_search,
            tier: MatchTier::WhitespaceInsensitive,
            indent_delta: 0,
        });
    }

    // Step 3b: Match ignoring both leading and trailing whitespace
    let mut fully_trimmed_matches: Vec<usize> = Vec::new();
    for i in 0..=(file_lines.len() - n_search) {
        let matched = (0..n_search).all(|k| {
            file_lines[i + k].trim() == search_lines[k].trim()
        });
        if matched {
            fully_trimmed_matches.push(i);
        }
    }

    if fully_trimmed_matches.len() == 1 {
        let idx = fully_trimmed_matches[0];
        let orig_indent = file_lines[idx]
            .chars()
            .take_while(|c| c.is_whitespace())
            .count();
        let search_indent = search_lines[0]
            .chars()
            .take_while(|c| c.is_whitespace())
            .count();
        let indent_delta = orig_indent as isize - search_indent as isize;

        return Ok(MatchLocation {
            line_start: idx + 1,
            line_end: idx + n_search,
            tier: MatchTier::WhitespaceInsensitive,
            indent_delta,
        });
    } else if fully_trimmed_matches.len() > 1 {
        if let Some(hint) = hunk.line_hint {
            let target_idx = hint.saturating_sub(1);
            let mut sorted = fully_trimmed_matches.clone();
            sorted.sort_by_key(|&c| (c as isize - target_idx as isize).abs());

            let d0 = (sorted[0] as isize - target_idx as isize).abs();
            let d1 = (sorted[1] as isize - target_idx as isize).abs();

            if d0 < d1 {
                let idx = sorted[0];
                let orig_indent = file_lines[idx]
                    .chars()
                    .take_while(|c| c.is_whitespace())
                    .count();
                let search_indent = search_lines[0]
                    .chars()
                    .take_while(|c| c.is_whitespace())
                    .count();
                let indent_delta = orig_indent as isize - search_indent as isize;

                return Ok(MatchLocation {
                    line_start: idx + 1,
                    line_end: idx + n_search,
                    tier: MatchTier::WhitespaceInsensitive,
                    indent_delta,
                });
            } else {
                return Err(format!(
                    "Ambiguous whitespace-insensitive match near line {} (candidates at lines {} and {})",
                    hint,
                    sorted[0] + 1,
                    sorted[1] + 1
                ));
            }
        } else {
            let line_numbers: Vec<usize> = fully_trimmed_matches.iter().map(|&i| i + 1).collect();
            return Err(format!(
                "Ambiguous whitespace-insensitive match: search block matches {} locations at lines {:?}. Provide line anchor.",
                fully_trimmed_matches.len(),
                line_numbers
            ));
        }
    }

    Err("Search block not found in file".to_string())
}

/// Applies a set of hunks to original file content, generating a preview or final result.
pub fn apply_hunks(original_content: &str, hunks: &[DiffHunk]) -> DiffPreviewResult {
    let has_crlf = original_content.contains("\r\n");
    let newline = if has_crlf { "\r\n" } else { "\n" };
    let ends_with_newline = original_content.ends_with('\n');

    let mut file_lines: Vec<String> = original_content
        .lines()
        .map(|s| s.to_string())
        .collect();

    // If original content was completely empty
    if file_lines.is_empty() && !original_content.is_empty() {
        file_lines.push(String::new());
    }

    let mut hunk_results = Vec::new();
    let mut matches: Vec<(usize, DiffHunk, MatchLocation)> = Vec::new();

    // First pass: Match all hunks against original content
    for (index, hunk) in hunks.iter().enumerate() {
        match match_hunk(&file_lines, hunk) {
            Ok(loc) => {
                matches.push((index, hunk.clone(), loc));
            }
            Err(err) => {
                hunk_results.push((
                    index,
                    HunkApplicationResult {
                        hunk_id: hunk.id.clone(),
                        success: false,
                        matched_tier: None,
                        matched_line_start: None,
                        matched_line_end: None,
                        error: Some(err),
                    },
                ));
            }
        }
    }

    // Check for overlapping hunks among successful matches
    let mut non_overlapping_matches: Vec<(usize, DiffHunk, MatchLocation)> = Vec::new();
    for (idx, hunk, loc) in matches {
        let mut overlaps = false;
        for (_, other_hunk, other_loc) in &non_overlapping_matches {
            if loc.line_start <= other_loc.line_end && other_loc.line_start <= loc.line_end {
                overlaps = true;
                hunk_results.push((
                    idx,
                    HunkApplicationResult {
                        hunk_id: hunk.id.clone(),
                        success: false,
                        matched_tier: Some(loc.tier.clone()),
                        matched_line_start: Some(loc.line_start),
                        matched_line_end: Some(loc.line_end),
                        error: Some(format!(
                            "Hunk conflicts with overlapping hunk '{}' (lines {}-{})",
                            other_hunk.id, other_loc.line_start, other_loc.line_end
                        )),
                    },
                ));
                break;
            }
        }
        if !overlaps {
            non_overlapping_matches.push((idx, hunk, loc));
        }
    }

    // Sort matches descending by line_start so we can splice bottom-to-top without offset invalidation
    non_overlapping_matches.sort_by(|a, b| b.2.line_start.cmp(&a.2.line_start));

    // Second pass: Splice replacements bottom-to-top
    for (orig_idx, hunk, loc) in non_overlapping_matches {
        let replace_lines: Vec<String> = if hunk.replace.is_empty() {
            Vec::new()
        } else {
            hunk.replace
                .lines()
                .map(|line| {
                    if loc.indent_delta > 0 {
                        format!("{}{}", " ".repeat(loc.indent_delta as usize), line)
                    } else if loc.indent_delta < 0 {
                        let strip_count = (-loc.indent_delta) as usize;
                        let leading_spaces = line.chars().take_while(|c| *c == ' ').count();
                        let to_strip = strip_count.min(leading_spaces);
                        line[to_strip..].to_string()
                    } else {
                        line.to_string()
                    }
                })
                .collect()
        };

        // Determine 0-based splice bounds
        let start_idx = loc.line_start.saturating_sub(1).min(file_lines.len());
        let end_idx = loc.line_end.min(file_lines.len());

        if start_idx <= end_idx {
            file_lines.splice(start_idx..end_idx, replace_lines);
            hunk_results.push((
                orig_idx,
                HunkApplicationResult {
                    hunk_id: hunk.id.clone(),
                    success: true,
                    matched_tier: Some(loc.tier),
                    matched_line_start: Some(loc.line_start),
                    matched_line_end: Some(loc.line_end),
                    error: None,
                },
            ));
        } else {
            hunk_results.push((
                orig_idx,
                HunkApplicationResult {
                    hunk_id: hunk.id.clone(),
                    success: false,
                    matched_tier: Some(loc.tier),
                    matched_line_start: Some(loc.line_start),
                    matched_line_end: Some(loc.line_end),
                    error: Some("Invalid splice range".to_string()),
                },
            ));
        }
    }

    // Sort hunk results back to original input order
    hunk_results.sort_by_key(|(idx, _)| *idx);
    let final_hunk_results: Vec<HunkApplicationResult> =
        hunk_results.into_iter().map(|(_, res)| res).collect();

    let all_applied = !final_hunk_results.is_empty()
        && final_hunk_results.iter().all(|r| r.success);

    let mut modified_content = file_lines.join(newline);
    if ends_with_newline && !modified_content.is_empty() {
        modified_content.push_str(newline);
    }

    DiffPreviewResult {
        original_content: original_content.to_string(),
        modified_content,
        hunk_results: final_hunk_results,
        all_applied,
    }
}

/// Applies diff hunks directly to a file on disk within the given workspace root.
pub fn apply_diff_to_file(workspace_root: &Path, file_diff: &FileDiff) -> Result<DiffPreviewResult, String> {
    let full_path = workspace_root.join(&file_diff.file_path);
    if !full_path.exists() {
        return Err(format!("Target file does not exist: {:?}", full_path));
    }

    let original = std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file {:?}: {}", full_path, e))?;

    let preview = apply_hunks(&original, &file_diff.hunks);

    if preview.all_applied {
        std::fs::write(&full_path, &preview.modified_content)
            .map_err(|e| format!("Failed to write updated file {:?}: {}", full_path, e))?;
    }

    Ok(preview)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_single_hunk() {
        let diff_text = r#"
FILE: src/main.rs
<<<<<<< SEARCH (line 42)
fn main() {
    println!("hello");
}
=======
fn main() {
    println!("hello world");
}
>>>>>>> REPLACE
"#;
        let files = parse_diff_blocks(diff_text);
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].file_path, "src/main.rs");
        assert_eq!(files[0].hunks.len(), 1);
        assert_eq!(files[0].hunks[0].line_hint, Some(42));
        assert_eq!(
            files[0].hunks[0].search,
            "fn main() {\n    println!(\"hello\");\n}"
        );
        assert_eq!(
            files[0].hunks[0].replace,
            "fn main() {\n    println!(\"hello world\");\n}"
        );
    }

    #[test]
    fn test_parse_multiple_hunks_and_files() {
        let diff_text = r#"
```diff
FILE: src/lib.rs
<<<<<<< SEARCH (line 10)
pub fn old_fn() {}
=======
pub fn new_fn() {}
>>>>>>> REPLACE

<<<<<<< SEARCH (line 25)
const X: u32 = 1;
=======
const X: u32 = 2;
>>>>>>> REPLACE

FILE: src/config.rs
<<<<<<< SEARCH (line 5)
let debug = false;
=======
let debug = true;
>>>>>>> REPLACE
```
"#;
        let files = parse_diff_blocks(diff_text);
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].file_path, "src/lib.rs");
        assert_eq!(files[0].hunks.len(), 2);
        assert_eq!(files[0].hunks[0].line_hint, Some(10));
        assert_eq!(files[0].hunks[1].line_hint, Some(25));

        assert_eq!(files[1].file_path, "src/config.rs");
        assert_eq!(files[1].hunks.len(), 1);
        assert_eq!(files[1].hunks[0].line_hint, Some(5));
    }

    #[test]
    fn test_exact_match_success() {
        let original = "line 1\nline 2\nline 3\nline 4\n";
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: None,
            search: "line 2\nline 3".into(),
            replace: "line two\nline three".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(result.all_applied);
        assert_eq!(result.hunk_results[0].matched_tier, Some(MatchTier::Exact));
        assert_eq!(result.hunk_results[0].matched_line_start, Some(2));
        assert_eq!(result.hunk_results[0].matched_line_end, Some(3));
        assert_eq!(result.modified_content, "line 1\nline two\nline three\nline 4\n");
    }

    #[test]
    fn test_line_anchored_match_success() {
        let original = "target\nother\ntarget\nfinal\n";
        // 'target' appears at line 1 and line 3. With line_hint: 3, it should select line 3.
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: Some(3),
            search: "target".into(),
            replace: "target_three".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(result.all_applied);
        assert_eq!(
            result.hunk_results[0].matched_tier,
            Some(MatchTier::LineAnchored)
        );
        assert_eq!(result.hunk_results[0].matched_line_start, Some(3));
        assert_eq!(result.modified_content, "target\nother\ntarget_three\nfinal\n");
    }

    #[test]
    fn test_whitespace_trimmed_match() {
        let original = "    let x = 1;\n    let y = 2;\n";
        // Search hunk has 2 spaces instead of 4
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: None,
            search: "  let x = 1;\n  let y = 2;".into(),
            replace: "  let x = 100;\n  let y = 200;".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(result.all_applied);
        assert_eq!(
            result.hunk_results[0].matched_tier,
            Some(MatchTier::WhitespaceInsensitive)
        );
        // Indentation delta should adapt to 4 spaces
        assert_eq!(
            result.modified_content,
            "    let x = 100;\n    let y = 200;\n"
        );
    }

    #[test]
    fn test_empty_replacement_deletion() {
        let original = "header\nredundant line\nfooter\n";
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: Some(2),
            search: "redundant line".into(),
            replace: "".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(result.all_applied);
        assert_eq!(result.modified_content, "header\nfooter\n");
    }

    #[test]
    fn test_empty_search_insertion() {
        let original = "line 1\nline 2\n";
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: Some(2),
            search: "".into(),
            replace: "inserted between".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(result.all_applied);
        assert_eq!(result.modified_content, "line 1\ninserted between\nline 2\n");
    }

    #[test]
    fn test_ambiguous_match_error() {
        let original = "same\nsame\nsame\n";
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: None,
            search: "same".into(),
            replace: "different".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(!result.all_applied);
        assert!(!result.hunk_results[0].success);
        assert!(result.hunk_results[0]
            .error
            .as_ref()
            .unwrap()
            .contains("Ambiguous match"));
    }

    #[test]
    fn test_multi_hunk_sequential_application() {
        let original = "fn first() {\n    return 1;\n}\n\nfn second() {\n    return 2;\n}\n";
        let hunk1 = DiffHunk {
            id: "hunk-1".into(),
            line_hint: Some(2),
            search: "    return 1;".into(),
            replace: "    return 10;".into(),
        };
        let hunk2 = DiffHunk {
            id: "hunk-2".into(),
            line_hint: Some(6),
            search: "    return 2;".into(),
            replace: "    return 20;".into(),
        };

        let result = apply_hunks(original, &[hunk1, hunk2]);
        assert!(result.all_applied);
        assert_eq!(result.hunk_results.len(), 2);
        assert!(result.hunk_results[0].success);
        assert!(result.hunk_results[1].success);
        assert_eq!(
            result.modified_content,
            "fn first() {\n    return 10;\n}\n\nfn second() {\n    return 20;\n}\n"
        );
    }

    #[test]
    fn test_crlf_preservation() {
        let original = "line 1\r\nline 2\r\nline 3\r\n";
        let hunk = DiffHunk {
            id: "hunk-1".into(),
            line_hint: Some(2),
            search: "line 2".into(),
            replace: "new line 2".into(),
        };

        let result = apply_hunks(original, &[hunk]);
        assert!(result.all_applied);
        assert!(result.modified_content.contains("\r\n"));
        assert_eq!(result.modified_content, "line 1\r\nnew line 2\r\nline 3\r\n");
    }
}
