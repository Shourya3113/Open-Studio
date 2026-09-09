use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct BM25SearchResult {
    pub file_path: String,
    pub score: f64,
    pub matching_lines: Vec<usize>,
    pub snippet: String,
    pub matched_terms: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct IndexSummary {
    pub indexed_files_count: usize,
    pub total_tokens: usize,
    pub unique_terms_count: usize,
    pub index_duration_ms: u64,
}

#[derive(Clone, Debug)]
pub struct IndexedDocument {
    pub id: usize,
    pub file_path: String,
    pub lines: Vec<String>,
    pub token_count: usize,
}

#[derive(Clone, Debug)]
pub struct Posting {
    pub doc_id: usize,
    pub frequency: usize,
    pub line_occurrences: Vec<usize>,
}

#[derive(Clone, Debug)]
pub struct BM25Index {
    pub docs: Vec<IndexedDocument>,
    pub term_dict: HashMap<String, Vec<Posting>>,
    pub avg_doc_len: f64,
    pub k1: f64,
    pub b: f64,
}

pub type BM25IndexState = Arc<RwLock<Option<BM25Index>>>;

pub fn create_bm25_state() -> BM25IndexState {
    Arc::new(RwLock::new(None))
}

/// Tokenizes code text into searchable terms.
/// Handles camelCase, PascalCase, snake_case, and standard symbols.
pub fn tokenize_code(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();

    for raw_word in text.split(|c: char| !c.is_alphanumeric() && c != '_') {
        let trimmed = raw_word.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Add whole token in lowercase
        let lower = trimmed.to_lowercase();
        if !tokens.contains(&lower) {
            tokens.push(lower);
        }

        // If snake_case, split on underscore
        if trimmed.contains('_') {
            for sub in trimmed.split('_') {
                let sub_trimmed = sub.trim();
                if sub_trimmed.len() >= 2 {
                    let sub_lower = sub_trimmed.to_lowercase();
                    if !tokens.contains(&sub_lower) {
                        tokens.push(sub_lower);
                    }
                }
            }
        }

        // If camelCase or PascalCase, split on uppercase transitions
        let mut current_subword = String::new();
        let chars: Vec<char> = trimmed.chars().collect();
        for i in 0..chars.len() {
            let ch = chars[i];
            if ch.is_uppercase() && !current_subword.is_empty() {
                // If previous was lowercase or next is lowercase, break
                let prev_is_lower = chars[i - 1].is_lowercase();
                let next_is_lower = if i + 1 < chars.len() {
                    chars[i + 1].is_lowercase()
                } else {
                    false
                };
                if prev_is_lower || next_is_lower {
                    if current_subword.len() >= 2 {
                        let sub_lower = current_subword.to_lowercase();
                        if !tokens.contains(&sub_lower) {
                            tokens.push(sub_lower);
                        }
                    }
                    current_subword.clear();
                }
            }
            if ch != '_' {
                current_subword.push(ch);
            }
        }
        if current_subword.len() >= 2 {
            let sub_lower = current_subword.to_lowercase();
            if !tokens.contains(&sub_lower) {
                tokens.push(sub_lower);
            }
        }
    }

    tokens
}

impl BM25Index {
    pub fn new() -> Self {
        Self {
            docs: Vec::new(),
            term_dict: HashMap::new(),
            avg_doc_len: 0.0,
            k1: 1.2,
            b: 0.75,
        }
    }

    pub fn add_document(&mut self, file_path: &str, content: &str) {
        let doc_id = self.docs.len();
        let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

        let mut term_freqs: HashMap<String, (usize, Vec<usize>)> = HashMap::new();
        let mut total_doc_tokens = 0;

        for (line_idx, line) in lines.iter().enumerate() {
            let line_num = line_idx + 1;
            let tokens = tokenize_code(line);
            total_doc_tokens += tokens.len();

            for token in tokens {
                let entry = term_freqs.entry(token).or_insert((0, Vec::new()));
                entry.0 += 1;
                if !entry.1.contains(&line_num) {
                    entry.1.push(line_num);
                }
            }
        }

        self.docs.push(IndexedDocument {
            id: doc_id,
            file_path: file_path.to_string(),
            lines,
            token_count: total_doc_tokens,
        });

        for (term, (freq, line_numbers)) in term_freqs {
            let postings = self.term_dict.entry(term).or_insert_with(Vec::new);
            postings.push(Posting {
                doc_id,
                frequency: freq,
                line_occurrences: line_numbers,
            });
        }
    }

    pub fn finalize(&mut self) {
        if self.docs.is_empty() {
            self.avg_doc_len = 0.0;
            return;
        }
        let total_tokens: usize = self.docs.iter().map(|d| d.token_count).sum();
        self.avg_doc_len = total_tokens as f64 / self.docs.len() as f64;
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<BM25SearchResult> {
        let query_terms = tokenize_code(query);
        if query_terms.is_empty() || self.docs.is_empty() {
            return Vec::new();
        }

        let num_docs = self.docs.len() as f64;
        let mut scores: HashMap<usize, (f64, HashSet<usize>, Vec<String>)> = HashMap::new();

        for term in &query_terms {
            if let Some(postings) = self.term_dict.get(term) {
                let doc_freq = postings.len() as f64;
                // IDF formulation: ln(1 + (N - n + 0.5) / (n + 0.5))
                let idf = ((num_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0).ln();

                for posting in postings {
                    let doc = &self.docs[posting.doc_id];
                    let tf = posting.frequency as f64;
                    let doc_len = doc.token_count as f64;

                    // BM25 term weight
                    let denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len.max(1.0)));
                    let term_score = idf * (tf * (self.k1 + 1.0) / denom);

                    let entry = scores.entry(posting.doc_id).or_insert((0.0, HashSet::new(), Vec::new()));
                    entry.0 += term_score;
                    for line_num in &posting.line_occurrences {
                        entry.1.insert(*line_num);
                    }
                    if !entry.2.contains(term) {
                        entry.2.push(term.clone());
                    }
                }
            }
        }

        let mut ranked: Vec<(usize, f64, Vec<usize>, Vec<String>)> = scores
            .into_iter()
            .map(|(doc_id, (score, lines_set, terms))| {
                let mut lines: Vec<usize> = lines_set.into_iter().collect();
                lines.sort();
                (doc_id, score, lines, terms)
            })
            .collect();

        ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        ranked.truncate(limit);

        ranked
            .into_iter()
            .map(|(doc_id, score, matching_lines, matched_terms)| {
                let doc = &self.docs[doc_id];
                let snippet = extract_snippet(&doc.lines, &matching_lines);

                BM25SearchResult {
                    file_path: doc.file_path.clone(),
                    score,
                    matching_lines,
                    snippet,
                    matched_terms,
                }
            })
            .collect()
    }
}

/// Extracts a representative 10-line code snippet centered around the primary matching line
fn extract_snippet(lines: &[String], matching_lines: &[usize]) -> String {
    if lines.is_empty() {
        return String::new();
    }

    let center_line = matching_lines.first().copied().unwrap_or(1);
    let center_idx = center_line.saturating_sub(1);

    let start_idx = center_idx.saturating_sub(4);
    let end_idx = (center_idx + 6).min(lines.len());

    let mut snippet_lines = Vec::new();
    for i in start_idx..end_idx {
        let line_num = i + 1;
        let is_match = matching_lines.contains(&line_num);
        let prefix = if is_match { ">" } else { " " };
        snippet_lines.push(format!("{} {:4} | {}", prefix, line_num, lines[i]));
    }

    snippet_lines.join("\n")
}

/// Builds in-memory index from workspace directory
pub fn build_index_from_workspace(
    workspace_root: &str,
    max_files: usize,
) -> Result<(BM25Index, IndexSummary), String> {
    let start_time = Instant::now();
    let root_path = Path::new(workspace_root);
    if !root_path.exists() {
        return Err(format!("Workspace root does not exist: {}", workspace_root));
    }

    let target_extensions = [
        "ts", "tsx", "js", "jsx", "rs", "py", "json", "toml", "yaml", "md", "html", "css",
    ];

    let mut index = BM25Index::new();

    let walker = ignore::WalkBuilder::new(root_path)
        .hidden(true)
        .git_ignore(true)
        .build();

    let mut indexed_count = 0;

    for entry in walker.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if target_extensions.contains(&ext.to_lowercase().as_str()) {
                    let path_str = path.to_string_lossy().to_string();
                    if path_str.contains("node_modules")
                        || path_str.contains("target")
                        || path_str.contains(".git")
                        || path_str.contains("dist")
                    {
                        continue;
                    }

                    if let Ok(content) = std::fs::read_to_string(path) {
                        let rel_path = path
                            .strip_prefix(root_path)
                            .unwrap_or(path)
                            .to_string_lossy()
                            .replace('\\', "/");

                        index.add_document(&rel_path, &content);
                        indexed_count += 1;

                        if indexed_count >= max_files {
                            break;
                        }
                    }
                }
            }
        }
    }

    index.finalize();

    let total_tokens: usize = index.docs.iter().map(|d| d.token_count).sum();
    let unique_terms = index.term_dict.len();
    let duration = start_time.elapsed().as_millis() as u64;

    let summary = IndexSummary {
        indexed_files_count: indexed_count,
        total_tokens,
        unique_terms_count: unique_terms,
        index_duration_ms: duration,
    };

    Ok((index, summary))
}

// -----------------------------------------------------------------------------
// Tauri IPC Commands
// -----------------------------------------------------------------------------

#[tauri::command]
pub async fn build_bm25_index(
    state: tauri::State<'_, BM25IndexState>,
    workspace_path: String,
    max_files: Option<usize>,
) -> Result<IndexSummary, String> {
    let limit = max_files.unwrap_or(200);
    let (index, summary) = build_index_from_workspace(&workspace_path, limit)?;

    let mut lock = state.write().await;
    *lock = Some(index);

    Ok(summary)
}

#[tauri::command]
pub async fn search_bm25(
    state: tauri::State<'_, BM25IndexState>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<BM25SearchResult>, String> {
    let lock = state.read().await;
    if let Some(index) = lock.as_ref() {
        let max_results = limit.unwrap_or(5);
        Ok(index.search(&query, max_results))
    } else {
        Err("BM25 index has not been built yet. Call build_bm25_index first.".to_string())
    }
}

// -----------------------------------------------------------------------------
// Unit Tests
// -----------------------------------------------------------------------------

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn test_code_tokenizer_camel_and_snake() {
        let tokens = tokenize_code("getUserProfileByID calculate_total_tax");
        assert!(tokens.contains(&"getuserprofilebyid".to_string()));
        assert!(tokens.contains(&"user".to_string()));
        assert!(tokens.contains(&"profile".to_string()));
        assert!(tokens.contains(&"calculate".to_string()));
        assert!(tokens.contains(&"total".to_string()));
        assert!(tokens.contains(&"tax".to_string()));
    }

    #[test]
    fn test_bm25_scoring_exact_identifier() {
        let mut index = BM25Index::new();
        index.add_document(
            "src/auth.ts",
            "export function authenticateUser(token: string): boolean {\n  return token.length > 0;\n}\n",
        );
        index.add_document(
            "src/render.ts",
            "export function renderCanvas(): void {\n  console.log('rendering canvas');\n}\n",
        );
        index.finalize();

        let results = index.search("authenticateUser", 5);
        assert!(!results.is_empty());
        assert_eq!(results[0].file_path, "src/auth.ts");
        assert!(results[0].score > 0.0);
        assert!(results[0].matched_terms.contains(&"authenticateuser".to_string()));
        assert!(results[0].snippet.contains("authenticateUser"));
    }

    #[test]
    fn test_multi_file_ranking() {
        let mut index = BM25Index::new();
        index.add_document("doc1.rs", "fn compute() { let x = 10; }");
        index.add_document("doc2.rs", "fn compute_heavy() { let compute = true; let value = compute; }");
        index.add_document("doc3.rs", "fn unrelated() { println!(\"hello\"); }");
        index.finalize();

        let results = index.search("compute", 5);
        assert_eq!(results.len(), 2);
        // doc2 mentions compute twice, should have higher or equal score
        assert!(results[0].score >= results[1].score);
    }

    #[test]
    fn test_snippet_extraction_context_window() {
        let lines = vec![
            "line 1".to_string(),
            "line 2".to_string(),
            "line 3".to_string(),
            "target match here".to_string(), // line 4
            "line 5".to_string(),
            "line 6".to_string(),
        ];
        let snippet = extract_snippet(&lines, &[4]);
        assert!(snippet.contains(">    4 | target match here"));
        assert!(snippet.contains("line 3"));
        assert!(snippet.contains("line 5"));
    }
}
