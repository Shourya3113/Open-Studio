# OPEN STUDIO: 28-DAY AGENTIC EXECUTION BLUEPRINT
## Machine-Actionable Daily Engineering Plan for Antigravity

> **Project Target**: Open Studio — 100% Offline, Native Local AI IDE & Agentic Workspace  
> **Tech Stack**: Tauri v2 (Rust) + React 18/19 (TypeScript) + Monaco Editor + Ollama / llama.cpp / MLX + Tree-sitter + SQLite-vec + Rust LSP  
> **Execution Model**: 4 Weeks • 28 Atomic Daily Work Packages • Designed for Single-Shot Agentic Implementation  
> **Reference Spec**: Open Studio Blueprint v2.0 (Confidential / Revised August 2026)

---

## Executive Architectural Summary

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      Open Studio Desktop Shell                            │
│                     Tauri v2 (Rust Backend + React UI)                    │
│                 ~15 MB Binary • ~35 MB Shell RAM Footprint                │
├───────────────────┬───────────────────┬───────────────────┬───────────────┤
│    Editor Core    │    File System    │   Terminal PTY    │  Diff Review  │
│   Monaco Editor   │ Custom Watcher &  │   portable-pty /  │ Multi-File    │
│  Ghost-Text / Tab │   Fuzzy SQLite    │     xterm.js      │ Search/Replace│
├───────────────────┴───────────────────┴───────────────────┴───────────────┤
│                           Language Intelligence                           │
│     Rust LSP Client (JSON-RPC) ─── Auto-Detects rust-analyzer, pyright,   │
│     typescript-language-server, gopls, clangd, jdtls                      │
├───────────────────────────────────────────────────────────────────────────┤
│                              Codebase Index                               │
│     Tree-sitter AST Slicer (800 tok) + nomic-embed-text + SQLite-vec      │
│     + BM25 Re-Ranking Engine (<50ms retrieval over 50k files)             │
├───────────────────┬───────────────────────────────────────────────────────┤
│    Agent Core     │ Model Router (VRAM Lifecycle & Ollama keep_alive)     │
│                   │ Shadow Git (refs/ai-checkpoints/) & Time Travel       │
│                   │ MCP Client & Validated Tool Execution Loop            │
├───────────────────┴───────────────────────────────────────────────────────┤
│                             Inference Gateway                             │
│     Ollama API (SSE) • llama.cpp server • MLX (macOS Metal) • vLLM        │
│     Local Models: Qwen2.5-Coder-1.5B (Pinned), 7B (Edit), DeepSeek-R1 8B  │
├───────────────────────────────────────────────────────────────────────────┤
│                     Extensibility & Security Layer                        │
│     TypeScript Plugin API (OpenStudioPlugin) • Zero-Telemetry CI Audit    │
│     Air-Gapped Local SQLite Audit Log • .openstudio/rules.yaml Engine     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# WEEK 1: FOUNDATIONAL CORE & EDITOR INFRASTRUCTURE

---

### Day 1: Project Scaffolding & Tauri v2 Shell

- **Objective**: Establish the production-grade Tauri v2 desktop application workspace with Rust backend and React/TypeScript frontend, styled with Tailwind CSS in an air-gapped dark IDE aesthetic.
- **Deliverables**:
  - `src-tauri/Cargo.toml` with Tauri v2 dependencies (`tauri = "2.0"`, `serde`, `serde_json`, `tokio`).
  - `src-tauri/tauri.conf.json` with secure window configurations, CSP policies forbidding external network, and custom application title.
  - `src/` React + Vite + TypeScript + Tailwind CSS setup.
  - Rust Tauri IPC bridge verifying bi-directional communication (`ping` / `pong` with system telemetry).
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/commands/system.rs
  #[derive(serde::Serialize, serde::Deserialize)]
  pub struct AppSystemInfo {
      pub os: String,
      pub arch: String,
      pub tauri_version: String,
      pub memory_total_mb: u64,
  }

  #[tauri::command]
  pub fn get_system_info() -> Result<AppSystemInfo, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Initialize Tauri v2 app scaffolding using Vite (`react-ts` template).
  2. Configure `tailwind.config.js` with IDE dark theme color tokens (`surface-900`, `surface-800`, `accent-blue`, `syntax-*`).
  3. Implement Tauri Rust command `get_system_info` in `src-tauri/src/main.rs`.
  4. Build main desktop layout skeleton: Activity Bar, Primary Sidebar, Editor Area, Bottom Panel, Status Bar.
  5. Setup CSP in `tauri.conf.json` ensuring no outbound script injection.
- **Antigravity Agent Prompt**:
  ```text
  Scaffold the initial Tauri v2 + React 18 + TypeScript + Tailwind CSS desktop app for Open Studio.
  Configure src-tauri with Tauri 2.x, tokio, serde, and a get_system_info command returning OS, architecture, and memory.
  Configure src with dark-theme IDE layout panels (Sidebar, Editor, Terminal Panel, Status Bar).
  Ensure zero external CDN references and strict local CSP. Run npm install and verify cargo check passes.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo check
  npm run build
  ```
- **Failure Modes & Edge Cases**: Tauri v2 CLI plugin mismatch; ensure `@tauri-apps/cli` version matches `tauri` crate version in `Cargo.toml`.

---

### Day 2: Monaco Editor Core & Layout Engine

- **Objective**: Integrate Monaco Editor into the primary editor panel with multi-tab support, split views (horizontal/vertical), file buffer management, and keybinding dispatch.
- **Deliverables**:
  - `src/components/editor/MonacoEditor.tsx` wrapping Monaco with custom dark theme (`open-studio-dark`).
  - `src/stores/editorStore.ts` (Zustand) managing open buffers, active tab, cursor positions, and dirty flags.
  - Split view container allowing 2-pane editor splits.
  - Global keyboard shortcut dispatcher (`Ctrl+S` save, `Ctrl+W` close tab, `Ctrl+\` split view).
- **Interface & Schema Contracts**:
  ```typescript
  // src/types/editor.ts
  export interface EditorBuffer {
    id: string;
    filePath: string;
    fileName: string;
    language: string;
    content: string;
    isDirty: boolean;
    cursorPosition?: { line: number; column: number };
    scrollPosition?: { scrollTop: number; scrollLeft: number };
  }
  ```
- **Step-by-Step Implementation Sequence**:
  1. Install `@monaco-editor/react` and `monaco-editor`. Configure Vite to bundle Monaco workers locally without external CDN requests.
  2. Register custom theme matching VS Code / Cursor dark styles (`#1e1e1e` background, `#007acc` accents).
  3. Implement `EditorStore` with actions: `openFile()`, `closeFile()`, `updateContent()`, `setActiveTab()`.
  4. Create `TabBar` component with modified dot indicators and close buttons.
  5. Add split editor view support using CSS grid/flex with draggable split handles.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Monaco Editor core inside src/components/editor/ with Zustand state management.
  Configure Monaco workers to bundle locally without CDN calls.
  Implement multi-tab switching, dirty state tracking, and vertical/horizontal split pane layouts.
  Wire up keyboard shortcuts: Ctrl+W (close tab), Ctrl+S (save notification), Ctrl+\ (split).
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "editorStore"
  npm run build
  ```
- **Failure Modes & Edge Cases**: Monaco worker loader fails offline; verify `monaco-editor/esm/vs/editor/editor.worker` is bundled via Vite worker config.

---

### Day 3: Native File Explorer & Virtual Workspace Tree

- **Objective**: Build a high-performance native file system watcher and recursive directory explorer capable of managing 50,000+ files without UI lag.
- **Deliverables**:
  - `src-tauri/src/fs/watcher.rs` using `notify-debouncer-mini` for efficient OS file events.
  - `src-tauri/src/fs/tree.rs` streaming directory tree nodes via Tauri IPC.
  - `src/components/sidebar/FileTree.tsx` with virtualization for large folder trees, file icons, and git status badges.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/fs/mod.rs
  #[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
  pub struct FileNode {
      pub path: String,
      pub name: String,
      pub is_dir: bool,
      pub children: Option<Vec<FileNode>>,
      pub git_status: Option<String>, // "modified" | "untracked" | "staged"
  }

  #[tauri::command]
  pub async fn read_workspace_tree(root_path: String, depth: usize) -> Result<FileNode, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Add `notify = "6.1"` and `walkdir = "2.4"` to `src-tauri/Cargo.toml`.
  2. Implement `read_workspace_tree` with `.gitignore` exclusion filtering.
  3. Set up a Tauri event emitter `workspace-fs-change` to broadcast debounced file updates to the frontend.
  4. Build virtualized React tree view component supporting collapse, expand, file create, rename, and delete.
  5. Click event on file loads buffer into Monaco `EditorStore`.
- **Antigravity Agent Prompt**:
  ```text
  Build the native filesystem engine and File Tree UI.
  In Rust (src-tauri/src/fs/), implement read_workspace_tree using walkdir, respecting .gitignore, and set up a notify watcher broadcasting 'fs-change' events.
  In React (src/components/sidebar/FileTree.tsx), render an expandable, virtualized file tree with file creation, deletion, and selection linking directly to the editorStore.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test fs_tree
  npm run test -- -t "FileTree"
  ```
- **Failure Modes & Edge Cases**: File descriptor exhaustion on huge `node_modules`; ensure `node_modules`, `.git`, and build folders are strictly excluded from recursive watchers.

---

### Day 4: Embedded Terminal Infrastructure (Rust PTY + xterm.js)

- **Objective**: Implement an integrated pseudo-terminal powered by a native Rust PTY backend and `xterm.js` in the frontend.
- **Deliverables**:
  - `src-tauri/src/terminal/pty.rs` using `portable-pty` for cross-platform PTY management (Windows ConPTY, Unix PTY).
  - Tauri IPC channels for writing stdin, reading stdout/stderr streams, and handling terminal window resize events (`cols`, `rows`).
  - `src/components/terminal/TerminalPanel.tsx` wrapping `xterm.js` with `@xterm/addon-fit` and `@xterm/addon-webgl`.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/terminal/mod.rs
  #[tauri::command]
  pub fn spawn_terminal_session(id: String, shell: Option<String>) -> Result<(), String>;

  #[tauri::command]
  pub fn write_terminal_input(id: String, data: String) -> Result<(), String>;

  #[tauri::command]
  pub fn resize_terminal(id: String, cols: u16, rows: u16) -> Result<(), String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Add `portable-pty = "0.8"` to `src-tauri/Cargo.toml`.
  2. Implement a `TerminalManager` state in Rust storing active PTY master/writers protected by a mutex.
  3. Spawn shell (PowerShell/cmd on Windows, zsh/bash on macOS/Linux).
  4. Read PTY bytes in a background thread and emit `terminal-data-{id}` events to the webview.
  5. In React, bind `xterm.js` onData to `write_terminal_input` and fit addon on container resize.
- **Antigravity Agent Prompt**:
  ```text
  Implement the integrated terminal backend and frontend for Open Studio.
  Use portable-pty in Rust (src-tauri/src/terminal/) to spawn native shell processes (PowerShell on Windows, bash/zsh on Unix).
  Expose spawn_terminal_session, write_terminal_input, and resize_terminal commands.
  Stream PTY output via Tauri events to an xterm.js component in src/components/terminal/TerminalPanel.tsx with fit addon.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test terminal_pty
  npm run build
  ```
- **Failure Modes & Edge Cases**: Terminal echo loop or encoding corruption on Windows; ensure UTF-8 PTY reader with ConPTY mode.

---

### Day 5: Local Inference Gateway & Streaming SSE Client

- **Objective**: Create a robust, multi-backend local inference engine connecting to Ollama, llama.cpp server, and OpenAI-compatible endpoints with SSE token streaming and abort controls.
- **Deliverables**:
  - `src-tauri/src/inference/client.rs` implementing async HTTP streaming via `reqwest`.
  - Tauri streaming command emitting `llm-token` and `llm-done` events.
  - Abort signal controller allowing instant cancellation of ongoing generations.
  - Health-check ping utility verifying Ollama/llama.cpp status and returning loaded models.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/inference/types.rs
  #[derive(serde::Serialize, serde::Deserialize, Clone)]
  pub struct CompletionRequest {
      pub model: String,
      pub prompt: String,
      pub system_prompt: Option<String>,
      pub temperature: f32,
      pub stop_tokens: Vec<String>,
      pub keep_alive: Option<String>, // "-1" or "3m"
  }

  #[tauri::command]
  pub async fn stream_completion(
      window: tauri::Window,
      request_id: String,
      req: CompletionRequest
  ) -> Result<(), String>;

  #[tauri::command]
  pub fn abort_completion(request_id: String) -> Result<(), String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Add `reqwest = { version = "0.12", features = ["json", "stream"] }` and `futures-util` to `src-tauri`.
  2. Implement `OllamaClient` targeting `http://localhost:11434/api/generate`.
  3. Stream incoming chunks through Tauri event emitter keyed by `request_id`.
  4. Implement an `InferenceManager` with a `HashMap<String, tokio::sync::oneshot::Sender<()>>` to handle cancellation.
  5. Build test harness simulating streaming responses.
- **Antigravity Agent Prompt**:
  ```text
  Implement the local inference gateway in Rust (src-tauri/src/inference/).
  Support Ollama's streaming endpoint (/api/generate) using reqwest with SSE stream processing.
  Emit Tauri events 'llm-chunk:{request_id}' with text deltas and handle graceful aborts via abort_completion.
  Include an endpoint to check Ollama health and list available local models (/api/tags).
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test inference_gateway
  ```
- **Failure Modes & Edge Cases**: Ollama server unreachable (port 11434 closed); return explicit error enum `InferenceError::ServerUnreachable` with actionable troubleshooting message.

---

### Day 6: Inline Ghost-Text Autocomplete Engine

- **Objective**: Build sub-40ms inline Tab autocompletion inside Monaco Editor powered by local `Qwen2.5-Coder-1.5B`.
- **Deliverables**:
  - `src/features/autocomplete/inlineProvider.ts` implementing Monaco `InlineCompletionsProvider`.
  - Context extractor slicing 1,000 characters before and 500 characters after cursor for prompt assembly.
  - 30ms debouncing logic to avoid inference queuing during rapid keystrokes.
  - Cache layer reusing completions for identical prefixes.
- **Interface & Schema Contracts**:
  ```typescript
  // src/features/autocomplete/types.ts
  export interface AutocompleteContext {
    prefix: string;
    suffix: string;
    languageId: string;
    filePath: string;
  }

  export function formatFIMPrompt(ctx: AutocompleteContext): string {
    return `<|fim_prefix|>${ctx.prefix}<|fim_suffix|>${ctx.suffix}<|fim_middle|>`;
  }
  ```
- **Step-by-Step Implementation Sequence**:
  1. Register `monaco.languages.registerInlineCompletionsProvider` for all supported code languages.
  2. Implement prefix/suffix extractor with boundary clamping.
  3. Send FIM prompt to local Ollama client targeting `qwen2.5-coder:1.5b` with `keep_alive: -1`.
  4. Stream completion directly into Monaco ghost text suggestion.
  5. Bind `Tab` key to accept completion and clear pending buffer.
- **Antigravity Agent Prompt**:
  ```text
  Implement the inline ghost-text autocomplete engine for Monaco Editor.
  In src/features/autocomplete/, implement Monaco's InlineCompletionsProvider.
  Extract prefix/suffix around cursor and format using Qwen2.5-Coder FIM prompt tags (<|fim_prefix|>, <|fim_suffix|>, <|fim_middle|>).
  Add a 30ms keystroke debounce, call the local inference gateway, and display ghost text.
  Handle Tab to accept and Esc to dismiss.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "inlineProvider"
  ```
- **Failure Modes & Edge Cases**: Overlapping requests causing flickering completions; use `AbortController` to cancel previous in-flight inference on each new keystroke.

---

### Day 7: Week 1 Integration & Performance Benchmark

- **Objective**: Integrate Editor, Terminal, File Tree, and Autocomplete into a cohesive shell; execute baseline performance benchmarks.
- **Deliverables**:
  - Working desktop application booting in < 1.5 seconds.
  - Automated benchmark script `bench/ttft.py` measuring autocomplete Time-To-First-Token.
  - Memory profiling verification showing shell consumption < 50MB RAM.
- **Step-by-Step Implementation Sequence**:
  1. Wire all UI panels together in `src/App.tsx` with resizable flex layouts.
  2. Run end-to-end typing test in Monaco with Ollama active.
  3. Validate latency metrics (< 40ms TTFT on Qwen-1.5B).
  4. Commit Week 1 milestone tag `v0.1.0-week1`.
- **Antigravity Agent Prompt**:
  ```text
  Perform the Week 1 integration pass for Open Studio.
  Wire the File Tree, Monaco Editor, TabBar, and TerminalPanel into a unified, resizable workspace in src/App.tsx.
  Create a benchmark script bench/ttft.py that sends 50 FIM requests to Ollama and asserts average TTFT < 40ms.
  Ensure clean build with zero TypeScript or Rust warnings.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run build
  cd src-tauri && cargo check --release
  python bench/ttft.py
  ```

---

# WEEK 2: TOKEN OPTIMIZER & IN-LINE DIFF ENGINE

---

### Day 8: Frugal Search/Replace Diff Protocol & Parser

- **Objective**: Build a deterministic search/replace diff parser that saves 98% of generation tokens by only producing changed lines instead of rewriting entire files.
- **Deliverables**:
  - `src-tauri/src/diff/frugal_parser.rs` parsing strict `<<<< SEARCH / ======= / >>>>>> REPLACE` blocks.
  - Exact string matching engine with indentation-insensitive fallback.
  - Multi-hunk validator checking pre-image integrity before applying changes.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/diff/types.rs
  #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
  pub struct DiffHunk {
      pub file_path: String,
      pub search_block: String,
      pub replace_block: String,
      pub start_line_hint: Option<usize>,
  }

  pub fn parse_frugal_diff(llm_output: &str) -> Result<Vec<DiffHunk>, String>;
  pub fn apply_hunk_to_content(content: &str, hunk: &DiffHunk) -> Result<String, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Write regex and state-machine parser in Rust extracting hunks from model responses.
  2. Implement three-tier matching: (a) Exact match, (b) Trimmed-whitespace match, (c) Levenshtein similarity > 0.9.
  3. Unit test with edge cases: multiple hunks per file, duplicate occurrences, empty replacements.
  4. Expose `apply_frugal_diff` command to Tauri frontend.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Frugal Search/Replace Diff Parser in Rust (src-tauri/src/diff/frugal_parser.rs).
  Parse blocks formatted as:
  FILE: <path>
  <<<<<<< SEARCH
  <original code>
  =======
  <new code>
  >>>>>>> REPLACE
  Implement exact match with a fallback for whitespace/indentation variations.
  Write comprehensive Rust unit tests covering multi-hunk diffs, syntax errors, and missing search blocks.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test diff::frugal_parser
  ```
- **Failure Modes & Edge Cases**: Model produces ambiguous search block matching multiple locations; parser must halt and request higher line context or line number hints.

---

### Day 9: Multi-File Diff Review UI

- **Objective**: Build an interactive multi-file diff review interface within Monaco with inline and side-by-side view modes, hunk acceptance, and syntax decoration.
- **Deliverables**:
  - `src/components/diff/DiffReviewModal.tsx` and inline diff editor.
  - Per-hunk "Accept [Y]" / "Reject [N]" buttons rendered in Monaco glyph margins.
  - Collapsible file list with change counters (+lines / -lines).
- **Interface & Schema Contracts**:
  ```typescript
  // src/types/diff.ts
  export interface FileDiffState {
    filePath: string;
    originalContent: string;
    modifiedContent: string;
    hunks: Array<{
      id: string;
      search: string;
      replace: string;
      status: 'pending' | 'accepted' | 'rejected';
    }>;
  }
  ```
- **Step-by-Step Implementation Sequence**:
  1. Leverage `monaco.editor.createDiffEditor` for side-by-side mode.
  2. Implement inline decorations using Monaco `deltaDecorations` with red/green background highlights.
  3. Add keyboard navigation (`Alt+N` next hunk, `Alt+P` previous hunk, `Ctrl+Enter` accept all).
  4. Sync accepted changes back to `editorStore` and disk.
- **Antigravity Agent Prompt**:
  ```text
  Create the Multi-File Diff Review UI in src/components/diff/.
  Support both inline diff decorations and side-by-side Monaco diff viewing.
  Provide per-hunk Accept/Reject actions with keyboard navigation (Alt+N / Alt+P / Ctrl+Enter).
  Update file content on disk and in editorStore when hunks are accepted.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "DiffReview"
  ```
- **Failure Modes & Edge Cases**: User edits code while diff is open; recalculate hunk offsets dynamically or lock buffer during diff review.

---

### Day 10: Shadow Git Checkpoint System

- **Objective**: Implement an invisible, zero-friction time-travel safety net that commits the workspace before every AI modification into `.ai-checkpoints/`.
- **Deliverables**:
  - `src-tauri/src/git/checkpoint.rs` managing hidden Git refs under `refs/ai-checkpoints/`.
  - Automatic snapshot trigger before any diff application or agent tool execution.
  - Automatic Garbage Collection: retention of last 100 snapshots, auto-pruning checkpoints older than 7 days.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/git/types.rs
  #[derive(serde::Serialize, serde::Deserialize, Clone)]
  pub struct CheckpointInfo {
      pub id: String, // commit hash
      pub timestamp: u64,
      pub prompt_summary: String,
      pub files_changed: Vec<String>,
      pub is_pinned: bool,
  }

  #[tauri::command]
  pub fn create_checkpoint(workspace_path: String, summary: String) -> Result<String, String>;

  #[tauri::command]
  pub fn list_checkpoints(workspace_path: String) -> Result<Vec<CheckpointInfo>, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Add `git2 = "0.19"` to `src-tauri/Cargo.toml`.
  2. Create Git repo if not present or hook into existing `.git`.
  3. Create lightweight commits storing tree state without touching user's `HEAD` or branches.
  4. Implement `prune_checkpoints()` removing unpinned commits older than 7 days.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Shadow Git Checkpoint System in Rust (src-tauri/src/git/checkpoint.rs).
  Use git2 to create lightweight background commits targeting 'refs/ai-checkpoints/<branch>/<timestamp>'.
  Store commit metadata (timestamp, user prompt, changed files).
  Implement automated GC pruning commits older than 7 days while preserving pinned snapshots.
  Ensure the user's active branch and working git log are never polluted.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test git::checkpoint
  ```
- **Failure Modes & Edge Cases**: Project is not a Git repository; automatically initialize a hidden `.git` or dedicated `.openstudio/shadow-git` directory.

---

### Day 11: 1-Click Time Travel & Rollback UX

- **Objective**: Build the user-facing checkpoint timeline UI with hover diff previews and instant one-click workspace restoration.
- **Deliverables**:
  - `src/components/sidebar/CheckpointTimeline.tsx` displaying chronological snapshot graph.
  - Hover popover showing diff preview of snapshot changes.
  - "Restore Snapshot" button executing working tree revert with dirty-file stash protection.
- **Step-by-Step Implementation Sequence**:
  1. Fetch checkpoint history via Tauri command `list_checkpoints`.
  2. Render visual node timeline with pin/unpin toggles.
  3. Add restore handler: if editor has uncommitted dirty buffers, prompt user to stash or discard.
  4. Revert disk files to snapshot tree using `git2::Repository::checkout_tree`.
  5. Reload open Monaco buffers.
- **Antigravity Agent Prompt**:
  ```text
  Build the Checkpoint Timeline UI in src/components/sidebar/CheckpointTimeline.tsx.
  Fetch snapshots from the Rust backend and display a vertical timeline with timestamps and prompt descriptions.
  Provide hover diff previews, pin buttons to protect snapshots from GC, and a 1-click 'Restore Snapshot' button with dirty-buffer stash confirmation.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "CheckpointTimeline"
  ```
- **Failure Modes & Edge Cases**: File conflict during checkout; execute safe stash before checkout and notify user.

---

### Day 12: Tree-sitter AST Slicing & Structural Repo Map

- **Objective**: Build a multi-language AST code slicer that strips function bodies and compresses 50+ files into an 800-token structural skeleton of interfaces, signatures, and exports.
- **Deliverables**:
  - `src-tauri/src/ast/slicer.rs` using Tree-sitter for TypeScript, JavaScript, Python, Rust, and Go.
  - Structural skeleton generator removing implementations while preserving types and docstrings.
  - 85% input token reduction engine for repo-wide context compression.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/ast/types.rs
  pub struct SymbolSkeleton {
      pub file_path: String,
      pub language: String,
      pub skeleton_code: String,
      pub token_count: usize,
  }

  #[tauri::command]
  pub fn generate_repo_skeleton(files: Vec<String>) -> Result<String, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Add `tree-sitter = "0.22"`, `tree-sitter-typescript`, `tree-sitter-python`, `tree-sitter-rust` to `src-tauri`.
  2. Traverse AST nodes, identifying function, class, struct, and interface declarations.
  3. Replace node bodies (`body`, `block`) with `{ ... }` or `...`.
  4. Combine skeletons into single formatted prompt block under 1,000 tokens.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Tree-sitter AST Slicing Engine in Rust (src-tauri/src/ast/slicer.rs).
  Use Tree-sitter to parse TypeScript, Python, and Rust files.
  Strip internal function and method bodies while retaining imports, class definitions, function signatures, and docstrings.
  Create an AST repo map formatter that compresses multiple codebase files into an 800-token skeleton for LLM context injection.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test ast::slicer
  ```
- **Failure Modes & Edge Cases**: Unsupported language file encountered; fallback to regex-based signature extraction.

---

### Day 13: Hybrid BM25 + Vector Retrieval Engine (@codebase)

- **Objective**: Implement a 2-stage local codebase retrieval engine combining `nomic-embed-text` embeddings with SQLite-vec and BM25 lexical re-ranking (< 50ms latency).
- **Deliverables**:
  - `src-tauri/src/rag/embeddings.rs` communicating with Ollama embedding API.
  - `src-tauri/src/rag/sqlite_vec.rs` storing chunk embeddings in local SQLite database.
  - Stage 1: Vector search for top 15 chunks; Stage 2: BM25 filter picking top 3 precise chunks.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/rag/types.rs
  #[derive(serde::Serialize, serde::Deserialize)]
  pub struct CodeChunkResult {
      pub file_path: String,
      pub start_line: usize,
      pub end_line: usize,
      pub code_snippet: String,
      pub score: f32,
  }

  #[tauri::command]
  pub async fn query_codebase(query: String, max_results: usize) -> Result<Vec<CodeChunkResult>, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Add `rusqlite = { version = "0.31", features = ["bundled"] }` and SQLite-vec extension.
  2. Implement chunking pipeline: split code files into 40-line overlapping windows.
  3. Batch embed via `nomic-embed-text` during project open or file save.
  4. Implement BM25 scoring algorithm in Rust for lexical keyword reranking.
- **Antigravity Agent Prompt**:
  ```text
  Build the Hybrid BM25 + Vector Retrieval pipeline in Rust (src-tauri/src/rag/).
  Use Ollama's nomic-embed-text for vector generation and SQLite for storing embeddings and chunks.
  Implement a 2-stage query pipeline:
  1) Retrieve top 15 candidate chunks via cosine similarity.
  2) Re-rank candidates using BM25 lexical matching to select the top 3 snippets.
  Ensure query response completes in under 50ms.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test rag::hybrid_retrieval
  ```
- **Failure Modes & Edge Cases**: SQLite database locked; use WAL mode (`PRAGMA journal_mode = WAL;`) for concurrent reads and background indexing.

---

### Day 14: Chat Panel with @codebase Context & In-Editor Insertion

- **Objective**: Build the primary AI Chat Assistant sidebar with `@codebase` mentions, streaming responses, and 1-click diff application into Monaco.
- **Deliverables**:
  - `src/components/chat/ChatPanel.tsx` with Markdown and syntax highlighted code blocks.
  - `@codebase` and `@file` autocomplete tag triggers in the chat input.
  - "Apply to Editor" button injecting frugally formatted diffs straight into the active buffer.
- **Step-by-Step Implementation Sequence**:
  1. Build chat conversation store in Zustand (`messages`, `isGenerating`, `activeContext`).
  2. Parse `@` tags in user prompt to trigger vector retrieval (Day 13) or file inclusion.
  3. Stream response from `Qwen2.5-Coder-7B` via Inference Gateway.
  4. Detect code blocks containing diffs and render interactive "Apply Changes" CTA.
- **Antigravity Agent Prompt**:
  ```text
  Implement the AI Chat Panel in src/components/chat/ChatPanel.tsx.
  Support streaming responses from the inference gateway, markdown code rendering, and @codebase / @file mentions.
  When code blocks match the frugal search/replace diff format, display an 'Apply to Editor' button that routes directly to the multi-file diff engine.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "ChatPanel"
  ```
- **Failure Modes & Edge Cases**: Context window overflow; calculate total tokens before sending and prune chat history while preserving system prompt and AST skeleton.

---

# WEEK 3: LANGUAGE INTELLIGENCE & DYNAMIC VRAM LIFECYCLE

---

### Day 15: Embedded Rust LSP Client Core

- **Objective**: Implement a native JSON-RPC 2.0 Language Server Protocol (LSP) client in Rust to provide deterministic compiler-grade code intelligence.
- **Deliverables**:
  - `src-tauri/src/lsp/client.rs` managing child language server processes via stdin/stdout.
  - Auto-detection for TypeScript (`typescript-language-server`), Python (`pyright`/`pylsp`), and Rust (`rust-analyzer`).
  - Implementation of LSP lifecycle methods: `initialize`, `initialized`, `textDocument/didOpen`, `textDocument/didChange`, `shutdown`.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/lsp/types.rs
  #[derive(serde::Serialize, serde::Deserialize)]
  pub struct LspDiagnostic {
      pub range: LspRange,
      pub severity: u8,
      pub message: String,
      pub source: Option<String>,
  }

  #[tauri::command]
  pub fn start_language_server(language: String, root_uri: String) -> Result<(), String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Implement JSON-RPC message framing (Content-Length header parser) over Tokio asynchronous pipes.
  2. Spawn detected language server binary from system PATH or bundled tools.
  3. Send `initialize` payload with client capabilities.
  4. Forward editor document changes (`didChange`) to server in real-time.
- **Antigravity Agent Prompt**:
  ```text
  Implement the native Rust LSP Client in src-tauri/src/lsp/.
  Build a JSON-RPC 2.0 client communicating with language servers over stdio.
  Implement auto-detection for typescript-language-server, pyright, and rust-analyzer.
  Support LSP lifecycle: initialize, didOpen, didChange, and didClose events.
  Broadcast diagnostic notifications to the Tauri frontend.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test lsp::client
  ```
- **Failure Modes & Edge Cases**: Language server binary missing on host; notify user in status bar with one-click install guidance without crashing editor.

---

### Day 16: LSP Diagnostics, Hover & Go-to-Definition

- **Objective**: Wire LSP diagnostic feeds and navigation tools into Monaco Editor (markers, hover cards, go-to-definition, rename symbol).
- **Deliverables**:
  - `src/features/lsp/diagnosticsBridge.ts` translating LSP diagnostics into Monaco `editor.setModelMarkers`.
  - Monaco `HoverProvider` displaying type definitions and docstrings from LSP.
  - Monaco `DefinitionProvider` jumping cursor across files to symbol origins.
- **Step-by-Step Implementation Sequence**:
  1. Listen to `lsp-publish-diagnostics` events from Tauri.
  2. Map diagnostic ranges to Monaco line/column coordinates.
  3. Register Monaco hover and definition providers invoking Tauri commands `lsp_hover` and `lsp_goto_def`.
  4. Test jump navigation across multi-file TypeScript and Rust projects.
- **Antigravity Agent Prompt**:
  ```text
  Wire the LSP features to Monaco Editor in src/features/lsp/.
  Connect Rust LSP diagnostics to Monaco markers for real-time red/yellow squigglies.
  Implement HoverProvider to display type signatures and documentation on mouse hover.
  Implement DefinitionProvider to navigate to symbol definitions across workspace files.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "diagnosticsBridge"
  ```

---

### Day 17: Hardware Profiler & Dynamic VRAM Sentinel

- **Objective**: Build a real-time GPU/RAM hardware monitor that dynamically calculates VRAM headroom and clamps context windows to prevent Out-Of-Memory (OOM) crashes.
- **Deliverables**:
  - `src-tauri/src/hardware/profiler.rs` detecting GPU vendor, total VRAM, and free VRAM (via NVML on NVIDIA, sysctl on Apple Silicon, DXGI on Windows).
  - VRAM budget calculation engine adjusting `num_ctx` and KV cache quantization (`Q8_0` / `Q4_0`).
  - Status bar hardware indicator widget (e.g. `🟢 4.0GB / 8.0GB VRAM`).
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/hardware/types.rs
  #[derive(serde::Serialize, serde::Deserialize, Clone)]
  pub struct HardwareProfile {
      pub gpu_name: String,
      pub total_vram_mb: u64,
      pub free_vram_mb: u64,
      pub is_apple_silicon: bool,
      pub recommended_tier: String,
  }

  #[tauri::command]
  pub fn get_hardware_profile() -> Result<HardwareProfile, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Query system GPU metrics via OS-specific APIs.
  2. Compute safety guardrails: if VRAM < 4.5GB, force max context window to 8,192 tokens with Q8 KV cache.
  3. Emit VRAM usage updates every 3 seconds to the status bar widget.
  4. Trigger graceful degradation alerts if free VRAM drops below 500MB.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Hardware Profiler & VRAM Sentinel in Rust (src-tauri/src/hardware/profiler.rs).
  Detect GPU model, total VRAM, and available memory across Windows (DXGI/NVML) and macOS (Metal/sysctl).
  Calculate safe context budgets (num_ctx) to prevent OOM errors on 4GB-8GB GPUs.
  Create a React status bar component showing real-time VRAM allocation and active tier badges.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test hardware::profiler
  ```

---

### Day 18: Dynamic Task-Based Auto-Model Router

- **Objective**: Implement intelligent request routing dispatching tasks to specialized models while managing the VRAM lifecycle and Ollama `keep_alive` timers.
- **Deliverables**:
  - `src-tauri/src/router/model_router.rs` routing requests:
    - Typing -> `Qwen2.5-Coder-1.5B` (`keep_alive: -1`, pinned)
    - Code Refactor/Edit -> `Qwen2.5-Coder-7B` (`keep_alive: 3m`)
    - Planning/Reasoning -> `DeepSeek-R1-8B` (`keep_alive: 3m`)
    - Vision/Diagram -> `Moondream-2B` (`keep_alive: 3m`)
  - Eviction priority manager preventing concurrent 7B+8B collisions on 4GB cards.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/router/types.rs
  pub enum TaskIntent {
      InlineAutocomplete,
      CodeRefactor,
      ArchitectureReasoning,
      VisionInterpretation,
  }

  #[tauri::command]
  pub fn route_task(intent: TaskIntent, user_override: Option<String>) -> Result<String, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Implement classifier identifying intent from prompt syntax or UI trigger.
  2. Manage Ollama model states: before spawning 7B/8B on a 4GB GPU, issue eviction for previous heavy model if needed.
  3. Support user overrides via `Ctrl+Shift+M` or `.openstudio/models.json`.
- **Antigravity Agent Prompt**:
  ```text
  Build the Task-Based Model Router in Rust (src-tauri/src/router/).
  Route tasks dynamically based on intent:
  - Autocomplete -> Qwen-1.5B (pinned permanently in VRAM)
  - Diff/Edit -> Qwen-7B (evicted after 3m inactivity)
  - Reasoning -> DeepSeek-R1 (evicted after 3m inactivity)
  Implement VRAM safety checks preventing dual model allocations on GPUs with <= 6GB VRAM.
  Allow user overrides via command palette and workspace configuration.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test router::model_router
  ```

---

### Day 19: Terminal Auto-Fix Loop

- **Objective**: Capture runtime build and test errors from the terminal, isolate file and line numbers, and provide a 1-click "Fix & Retry" agent loop.
- **Deliverables**:
  - `src/features/terminal/errorCapture.ts` regex parsing output from `pytest`, `cargo test`, `npm test`, `tsc`.
  - 1-Click "Fix Error" banner in terminal header.
  - Automated repair prompt generation fed into the Frugal Diff Engine.
- **Step-by-Step Implementation Sequence**:
  1. Intercept terminal stream in `TerminalPanel.tsx`.
  2. Apply error pattern matchers extracting: file path, line number, error description, stack trace.
  3. When an error is detected, render "⚡ Auto-Fix with Local AI" action.
  4. On click: read error lines from disk, create Shadow Git checkpoint, prompt Qwen-7B, display diff for approval.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Terminal Auto-Fix Loop in src/features/terminal/errorCapture.ts.
  Parse terminal ANSI text for test/build errors (pytest, cargo, npm, tsc).
  Extract file paths and line numbers, and display an inline 'Fix with AI' action in the terminal header.
  When triggered, construct an error repair prompt, generate a frugal diff, and present it in the diff review UI.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "errorCapture"
  ```

---

### Day 20: Local Whisper Voice Dictation

- **Objective**: Integrate 100% offline push-to-talk voice prompt dictation using embedded `whisper.cpp` (< 75MB RAM).
- **Deliverables**:
  - `src-tauri/src/audio/whisper.rs` wrapping `whisper.cpp` bindings with `tiny.en` or `base.en` model.
  - Native microphone audio capture stream using `cpal`.
  - Global `Ctrl+Space` push-to-talk shortcut in editor and chat panels.
- **Step-by-Step Implementation Sequence**:
  1. Add `cpal = "0.15"` to `src-tauri` for cross-platform audio input.
  2. Implement recording buffer triggered on key-down and committed on key-up.
  3. Transcribe audio buffer locally and return raw text string to frontend.
  4. Support command mode ("rename function...") and dictation mode (raw insertion at cursor).
- **Antigravity Agent Prompt**:
  ```text
  Integrate offline voice dictation using whisper.cpp and cpal in src-tauri/src/audio/.
  Capture microphone audio on Ctrl+Space press, run local transcription using the Whisper base model, and stream transcribed text directly into the active editor or chat panel.
  Ensure zero external network calls and memory footprint < 80MB.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test audio::whisper
  ```

---

### Day 21: Live Generative Sandboxed Canvas

- **Objective**: Build an isolated, secure live-preview canvas rendering React components, Tailwind HTML, and Mermaid charts generated by local models.
- **Deliverables**:
  - `src/components/canvas/LiveCanvas.tsx` hosting a sandboxed `iframe`.
  - Strict Content Security Policy (CSP) blocking any external network or top-level navigation.
  - Fast-refresh renderer for JSX and Mermaid diagram previews.
- **Step-by-Step Implementation Sequence**:
  1. Construct sandboxed `iframe` with attributes: `sandbox="allow-scripts"`.
  2. Inject in-memory Babel standalone compiler and Tailwind CDN (bundled locally).
  3. Establish `postMessage` protocol between main app and canvas iframe.
  4. Render AI-generated React components and architectural diagrams in real-time.
- **Antigravity Agent Prompt**:
  ```text
  Build the Live Generative Canvas in src/components/canvas/LiveCanvas.tsx.
  Create an isolated iframe with strict CSP headers that renders React components, Tailwind HTML, and Mermaid charts.
  Use local bundled runtime scripts (no remote CDN fetches).
  Provide split-screen canvas mode alongside the Monaco editor.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "LiveCanvas"
  ```

---

# WEEK 4: AGENT PROTOCOLS, ENTERPRISE AIR-GAP & DISTRIBUTION

---

### Day 22: MCP (Model Context Protocol) Client & Guardrails

- **Objective**: Implement native Anthropic Model Context Protocol (MCP) client with strict JSON schema validation and retry prompting designed for local 7B models.
- **Deliverables**:
  - `src-tauri/src/mcp/client.rs` communicating with local MCP servers (SQLite, Filesystem, GitHub) over stdio.
  - JSON schema validator catching malformed tool payloads before execution.
  - Fallback retry logic converting multi-tool prompts to one-tool-at-a-time prompts if local 7B model stumbles.
- **Interface & Schema Contracts**:
  ```rust
  // src-tauri/src/mcp/types.rs
  #[derive(serde::Serialize, serde::Deserialize)]
  pub struct McpToolCall {
      pub server_name: String,
      pub tool_name: String,
      pub arguments: serde_json::Value,
  }

  #[tauri::command]
  pub async fn execute_mcp_tool(call: McpToolCall) -> Result<serde_json::Value, String>;
  ```
- **Step-by-Step Implementation Sequence**:
  1. Implement stdio transport for spawning and communicating with external MCP server binaries.
  2. Query `tools/list` on startup and register available tools.
  3. Intercept LLM tool calls; validate JSON against tool's `inputSchema`.
  4. If validation fails, feed schema error back into model for immediate 1-shot correction.
- **Antigravity Agent Prompt**:
  ```text
  Implement the MCP Client in Rust (src-tauri/src/mcp/).
  Support JSON-RPC stdio transport to external MCP servers (SQLite, Filesystem).
  Implement tool registration, payload validation against JSON schemas, and a retry mechanism tailored for local 7B models when malformed tool arguments are generated.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd src-tauri && cargo test mcp::client
  ```

---

### Day 23: TypeScript Plugin Architecture & Extension Host

- **Objective**: Build the Open Studio Plugin Engine allowing community extensions to contribute UI panels, status bar items, and custom commands.
- **Deliverables**:
  - `src/plugins/PluginHost.ts` implementing the `OpenStudioPlugin` lifecycle.
  - Plugin sandbox providing restricted `EditorAPI`, `TerminalAPI`, `FileSystemAPI`.
  - Local `.osp` bundle drag-and-drop installer.
- **Interface & Schema Contracts**:
  ```typescript
  // src/types/plugin.ts
  export interface OpenStudioPlugin {
    id: string;
    name: string;
    version: string;
    activate(ctx: PluginContext): void;
    deactivate(): void;
  }

  export interface PluginContext {
    editor: { getActiveBuffer(): string; insertText(text: string): void };
    terminal: { sendCommand(cmd: string): void };
    ui: { registerSidebarPanel(id: string, title: string, component: React.ComponentType): void };
    commands: { registerCommand(id: string, callback: () => void): void };
  }
  ```
- **Step-by-Step Implementation Sequence**:
  1. Define plugin manifest format (`plugin.json`).
  2. Implement JS sandbox loader executing plugin bundles safely.
  3. Provide UI hooks for mounting custom panels into the activity bar.
  4. Create example plugin: `GitBlameLens`.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Plugin & Extension Architecture in src/plugins/PluginHost.ts.
  Define the OpenStudioPlugin interface and PluginContext APIs (editor, terminal, UI, commands).
  Build a plugin manager that loads local plugin bundles, handles activation/deactivation lifecycles, and registers extension commands into the command palette.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test -- -t "PluginHost"
  ```

---

### Day 24: Zero-Telemetry Air-Gap Enforcement & Security CI

- **Objective**: Implement enterprise-grade air-gapped security: automated network call verification CI script, local SQLite audit logger, and `.openstudio/rules.yaml` policy engine.
- **Deliverables**:
  - `scripts/verify-airgap.sh` CI script failing on any unannotated network calls in the codebase.
  - `src-tauri/src/security/audit_logger.rs` logging every prompt, model, and output hash into encrypted SQLite WAL.
  - `.openstudio/rules.yaml` evaluator blocking forbidden file patterns (`*.env`, `secrets/*`) from AI context.
- **Interface & Schema Contracts**:
  ```yaml
  # .openstudio/rules.yaml
  rules:
    model_allowlist:
      - "qwen2.5-coder:1.5b"
      - "qwen2.5-coder:7b"
      - "deepseek-r1:8b"
    data_boundary:
      exclude_patterns:
        - "**/.env*"
        - "**/secrets/**"
        - "**/*.pem"
    max_token_budget_per_hour: 500000
  ```
- **Step-by-Step Implementation Sequence**:
  1. Write network audit shell script scanning `src/` and `src-tauri/` for `fetch`, `reqwest`, `http`.
  2. Implement local audit log recording: timestamp, user, model, input SHA256, output SHA256.
  3. Build context filter validating all `@codebase` and diff inputs against `rules.yaml`.
- **Antigravity Agent Prompt**:
  ```text
  Implement the Air-Gap Enforcement and Enterprise Compliance suite.
  Create scripts/verify-airgap.sh that inspects source code and fails CI if any network calls lack explicit '// NETWORK: ollama-local' annotations.
  Implement a local SQLite audit logger in src-tauri/src/security/ recording prompt hashes and models used.
  Add .openstudio/rules.yaml policy enforcement blocking sensitive files (.env, keys) from ever entering LLM context.
  ```
- **Verification & Test Commands**:
  ```powershell
  bash scripts/verify-airgap.sh
  cd src-tauri && cargo test security::audit_logger
  ```

---

### Day 25: Performance Benchmarking Suite

- **Objective**: Build a complete, reproducible benchmarking harness verifying all latency and memory claims before public release.
- **Deliverables**:
  - `bench/ttft.py` (Autocomplete TTFT < 40ms).
  - `bench/diff_latency.py` (End-to-end 7B diff generation < 2s).
  - `bench/index_build.py` (Tree-sitter + embedding build < 60s for 10k files).
  - Automated report generator outputting `BENCHMARKS.md`.
- **Step-by-Step Implementation Sequence**:
  1. Construct benchmark runner executing automated synthetic keystrokes and diff prompts.
  2. Aggregate P50, P95, and P99 latency figures.
  3. Measure memory footprint of Tauri shell under heavy buffer load.
  4. Generate GitHub-flavored markdown report.
- **Antigravity Agent Prompt**:
  ```text
  Build the performance benchmarking suite in bench/.
  Implement Python/Rust test harnesses for:
  1) bench/ttft.py: Measure TTFT on 100 autocomplete requests.
  2) bench/diff_latency.py: Benchmark 7B search/replace diff turnaround time.
  3) bench/index_build.py: Measure indexing speed across a 10,000 file synthetic repo.
  Output results into BENCHMARKS.md with pass/fail thresholds.
  ```
- **Verification & Test Commands**:
  ```powershell
  python bench/ttft.py
  python bench/diff_latency.py
  ```

---

### Day 26: Standalone VS Code Extension Wedge

- **Objective**: Package the Model Router, Token Optimizer, and Shadow Git as a standalone VS Code extension to establish an immediate user acquisition wedge.
- **Deliverables**:
  - `extensions/vscode/package.json` and extension host entry point.
  - Inline completion provider bridging to local Ollama.
  - Frugal diff applicator integrated directly into standard VS Code editor tabs.
- **Step-by-Step Implementation Sequence**:
  1. Scaffold VS Code extension using `yo code`.
  2. Port TypeScript frugal diff parser and FIM prompt generator into extension core.
  3. Register `vscode.languages.registerInlineCompletionItemProvider`.
  4. Package `.vsix` ready for Open VSX Registry and VS Code Marketplace.
- **Antigravity Agent Prompt**:
  ```text
  Create the Standalone VS Code Extension Wedge in extensions/vscode/.
  Reuse the TypeScript FIM prompt formatter and Frugal Diff Protocol from the main app.
  Implement VS Code's InlineCompletionItemProvider connecting to local Ollama (Qwen-1.5B).
  Provide commands for Shadow Git snapshot creation and frugal search/replace diff application inside standard VS Code.
  ```
- **Verification & Test Commands**:
  ```powershell
  cd extensions/vscode && npm run compile && npm run test
  ```

---

### Day 27: Cross-Platform Packaging & Installer

- **Objective**: Configure Tauri v2 release bundles for Windows, macOS (Intel & Apple Silicon), and Linux with code signing and auto-update configuration.
- **Deliverables**:
  - Windows `.msi` and lightweight `.exe` installer.
  - macOS `.dmg` and universal binary with Metal acceleration enabled.
  - GitHub Actions CI workflow building multi-platform release artifacts on git tag.
- **Step-by-Step Implementation Sequence**:
  1. Configure `tauri.conf.json` bundle options (icons, identifiers, license).
  2. Write `.github/workflows/release.yml` utilizing Tauri Action.
  3. Verify clean installation, desktop launch, and uninstaller on Windows.
- **Antigravity Agent Prompt**:
  ```text
  Configure the multi-platform Tauri v2 release packaging.
  Set up tauri.conf.json bundle identifiers, file associations, and custom installers for Windows (.msi/.exe) and macOS (.dmg).
  Create .github/workflows/release.yml to build, package, and upload release binaries on git tag push.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run tauri build
  ```

---

### Day 28: Final Hardening, Documentation & Launch Kit

- **Objective**: Final release hardening, zero-warning audit, comprehensive documentation, and community launch assets.
- **Deliverables**:
  - `README.md` with demo GIFs, quickstart instructions, and hardware requirements.
  - `SECURITY.md` and `PRIVACY.md` detailing the zero-telemetry offline promise.
  - Launch kit for Hacker News Show HN, r/LocalLLaMA, and Twitter/X.
- **Step-by-Step Implementation Sequence**:
  1. Run full test suite across all 28 modules (`cargo test`, `npm test`, `benchmarks`).
  2. Audit all documentation links, license headers, and screenshots.
  3. Create community discussion templates and issue trackers.
  4. Tag production release `v1.0.0-GA`.
- **Antigravity Agent Prompt**:
  ```text
  Perform the final production hardening pass for Open Studio.
  Run full test suites across frontend and backend.
  Produce production README.md, SECURITY.md, PRIVACY.md, and CONTRIBUTING.md.
  Prepare the community launch announcement kit (r/LocalLLaMA, Hacker News Show HN) highlighting sub-40ms autocomplete, 100% offline privacy, and 35MB RAM footprint.
  ```
- **Verification & Test Commands**:
  ```powershell
  npm run test
  cd src-tauri && cargo test
  bash scripts/verify-airgap.sh
  ```

---

## Antigravity Daily Execution Protocol

When prompting Antigravity to execute any specific day:
1. **Reference the Day**: State `Execute Day X of OPEN_STUDIO_EXECUTION_MASTERPLAN.md`.
2. **Review Acceptance Criteria**: Ensure all items in the Deliverables list are generated.
3. **Execute Verification Command**: Run the designated test commands to guarantee regression-free completion before moving to the next day.
