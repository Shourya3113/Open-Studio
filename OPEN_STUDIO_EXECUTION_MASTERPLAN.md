# OPEN STUDIO: 12-WEEK / 3-PHASE AGENTIC EXECUTION BLUEPRINT
## Machine-Actionable Engineering Roadmap for Antigravity Implementation

> **Project Target**: Open Studio — 100% Offline, Native Local AI IDE & Agentic Workspace  
> **Tech Stack**: Tauri v2 (Rust) + React 18/19 (TypeScript) + Monaco Editor + Ollama (SSE) + Tree-sitter + SQLite-vec + Rust LSP (`lsp-types`)  
> **Execution Model**: 12 Weeks (3 Phases) • Atomic Work Packages • Designed for Single-Shot Agentic Implementation  
> **Reference Specs**: [Local_AI_IDE_Blueprint_and_Strategy_v2.pdf](./Local_AI_IDE_Blueprint_and_Strategy_v2.pdf) & [RECOMMENDATIONS.md](./RECOMMENDATIONS.md)

---

## Strategic Phasing Overview

```
Phase 1: "It Works" MVP (Weeks 1–4)
└── Core IDE Shell, Monaco, Native PTY Terminal, Ollama Streaming, Sub-40ms Autocomplete,
    Chat with @file, Frugal Diffs, Shadow Git Snapshots, Command Palette, Settings, State Persistence.
    Exit Gate: 100% offline working IDE for coding, autocomplete, chat, diffs, and rollback.

Phase 2: "It's Smart" Intelligence (Weeks 5–8)
└── Progressive RAG (BM25 keyword -> nomic-embed-text + SQLite-vec hybrid @codebase),
    Rust LSP Client (lsp-types for TS & Python), Universal Memory Sentinel (sysinfo + Ollama),
    Task-Based Model Router, Terminal Auto-Fix Loop.
    Exit Gate: Codebase-wide context understanding, compiler-grade diagnostics, auto error repair.

Phase 3: "It's Ready" Production & Distribution (Weeks 9–12)
└── Visual Checkpoint Timeline UI, MCP Client with JSON Schema Validation, TypeScript Plugin Host,
    Standalone VS Code Extension Wedge, Zero-Telemetry CI Audit, Multi-Platform Bundles, Launch Kit.
    Exit Gate: Hardened, packaged cross-platform release ready for public developer adoption.
```

---

## Universal Hardware Support Matrix

| Operational Tier | Memory & Compute Acceleration | Autocomplete Engine | Edit & Diff Engine | Reasoning & Planning | Context Budget |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Heavyweight** | **≥12GB VRAM** (NVIDIA RTX 3060 12G/4070/4080/4090, AMD RX 7800/7900) or **≥24GB Unified** (Apple M-Series) | 1.5B Model (GPU Resident) | 7B or 14B Model (GPU Resident) | 8B / 14B Reasoning Engine (Resident) | Full 32k tokens |
| **Tier 2: Standard** | **6GB–11GB VRAM** (RTX 3060/4060, AMD RX 6700/7600, Intel Arc A770) or **16GB Unified** (Apple M-Series) | 1.5B Model (GPU Resident) | 7B Model (GPU Resident) | 8B Reasoning Engine (Swapped) | 16k tokens |
| **Tier 3: Budget / Constrained** | **4GB VRAM** (RTX 3050 Laptop, GTX 1650, Radeon APUs) | 1.5B Model (GPU Resident, sub-40ms) | 7B Model (Hot-swapped, 3m auto-eviction) | 8B Reasoning Engine (On-demand swap) | 8k tokens (Zero-OOM guardrail) |
| **Tier 4: CPU Fallback** | **Integrated Graphics / CPU Only** (Modern Intel Core, AMD Ryzen, ARM) | 1.5B Model (CPU AVX2/AVX-512, ~15 tok/s) | Optional Cloud BYOK | Optional Cloud BYOK | Clamped to system RAM |

---

# PHASE 1: "IT WORKS" MVP (WEEKS 1–4)

---

## WEEK 1: DESKTOP SHELL & EDITOR INFRASTRUCTURE

### Day 1: Project Scaffolding & Tauri v2 Shell
- **Objective**: Establish the production Tauri v2 desktop workspace with Rust core, Vite + React + TS, and Tailwind CSS in an air-gapped dark IDE theme.
- **Deliverables**:
  - `src-tauri/Cargo.toml` with Tauri v2 (`tauri = "2.0"`, `serde`, `serde_json`, `tokio`).
  - `src-tauri/tauri.conf.json` with strict offline CSP forbidding external network.
  - `src/` React + Vite + TypeScript + Tailwind CSS setup.
  - Rust Tauri IPC bridge verifying bi-directional communication (`get_system_info`).
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
- **Antigravity Prompt**:
  ```text
  Scaffold the initial Tauri v2 + React 18 + TypeScript + Tailwind CSS desktop app for Open Studio.
  Configure src-tauri with Tauri 2.x, tokio, serde, and a get_system_info command returning OS, architecture, and memory.
  Configure src with dark-theme IDE layout panels (Sidebar, Editor, Terminal Panel, Status Bar).
  Ensure zero external CDN references and strict local CSP. Run npm install and verify cargo check passes.
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo check && cd .. && npm run build
  ```

### Day 2: Monaco Editor Core & Offline Bundling
- **Objective**: Integrate Monaco Editor with local worker bundling via Vite (zero CDN calls), multi-tab buffer management, split views (H/V), and dirty tracking.
- **Deliverables**:
  - `src/components/editor/MonacoEditor.tsx` with custom `open-studio-dark` theme.
  - `src/stores/editorStore.ts` (Zustand) managing buffers, active tabs, dirty states, and cursor positions.
  - `vite.config.ts` configured with Monaco worker bundling for 100% offline operation.
  - Split pane container and shortcut dispatch (`Ctrl+S`, `Ctrl+W`, `Ctrl+\`).
- **Interface & Schema Contracts**:
  ```typescript
  export interface EditorBuffer {
    id: string;
    filePath: string;
    fileName: string;
    language: string;
    content: string;
    isDirty: boolean;
    cursorPosition?: { line: number; column: number };
  }
  ```
- **Antigravity Prompt**:
  ```text
  Implement Monaco Editor in src/components/editor/ with Zustand state management.
  Configure Vite to bundle Monaco workers locally without external CDN requests.
  Implement multi-tab switching, dirty state tracking, and vertical/horizontal split pane layouts.
  Wire up keyboard shortcuts: Ctrl+W (close tab), Ctrl+S (save notification), Ctrl+\ (split).
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "editorStore" && npm run build
  ```

### Day 3: Native File Explorer & Virtualized Tree
- **Objective**: Build native file system watcher and recursive directory explorer capable of managing 50,000+ files without UI lag.
- **Deliverables**:
  - `src-tauri/src/fs/watcher.rs` using `notify-debouncer-mini` for efficient OS file events.
  - `src-tauri/src/fs/tree.rs` streaming directory tree nodes via Tauri IPC respecting `.gitignore`.
  - `src/components/sidebar/FileTree.tsx` with virtualization, file icons, and git status indicators.
- **Interface & Schema Contracts**:
  ```rust
  #[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
  pub struct FileNode {
      pub path: String,
      pub name: String,
      pub is_dir: bool,
      pub children: Option<Vec<FileNode>>,
      pub git_status: Option<String>,
  }

  #[tauri::command]
  pub async fn read_workspace_tree(root_path: String, depth: usize) -> Result<FileNode, String>;
  ```
- **Antigravity Prompt**:
  ```text
  Build native filesystem engine and File Tree UI.
  In Rust (src-tauri/src/fs/), implement read_workspace_tree using walkdir, respecting .gitignore, and set up a notify watcher broadcasting 'fs-change' events.
  In React (src/components/sidebar/FileTree.tsx), render an expandable, virtualized file tree with file creation, deletion, and selection linking directly to editorStore.
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo test fs_tree && cd .. && npm run test -- -t "FileTree"
  ```

### Day 4: Embedded Terminal Infrastructure (Rust PTY + xterm.js)
- **Objective**: Embed native cross-platform PTY terminal supporting PowerShell/cmd on Windows and bash/zsh on Unix with ANSI color streams and resize handling.
- **Deliverables**:
  - `src-tauri/src/terminal/pty.rs` using `portable-pty` crate.
  - Tauri IPC channels: `spawn_terminal_session`, `write_terminal_input`, `resize_terminal`.
  - `src/components/terminal/TerminalPanel.tsx` wrapping `xterm.js` with fit addon.
- **Interface & Schema Contracts**:
  ```rust
  #[tauri::command]
  pub fn spawn_terminal_session(id: String, shell: Option<String>) -> Result<(), String>;

  #[tauri::command]
  pub fn write_terminal_input(id: String, data: String) -> Result<(), String>;

  #[tauri::command]
  pub fn resize_terminal(id: String, cols: u16, rows: u16) -> Result<(), String>;
  ```
- **Antigravity Prompt**:
  ```text
  Implement the integrated terminal backend and frontend.
  Use portable-pty in Rust (src-tauri/src/terminal/) to spawn native shell processes (PowerShell on Windows, bash/zsh on Unix).
  Expose spawn_terminal_session, write_terminal_input, and resize_terminal commands.
  Stream PTY output via Tauri events to an xterm.js component in src/components/terminal/TerminalPanel.tsx with fit addon.
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo test terminal_pty && cd .. && npm run build
  ```

### Day 5: Week 1 Integration & Testing
- **Objective**: Unify File Tree, Monaco Editor, TabBar, and Terminal Panel into a coherent workspace shell; execute unit and integration tests.
- **Deliverables**:
  - `src/App.tsx` layout with draggable panels and collapse toggles.
  - End-to-end typing, file opening, and terminal execution validation.
  - Tag `v0.1.0-w1`.
- **Verification Command**:
  ```powershell
  npm run build && cd src-tauri && cargo check --release
  ```

---

## WEEK 2: INFERENCE GATEWAY & INLINE AUTOCOMPLETE

### Day 6: Ollama Inference Gateway & SSE Streaming
- **Objective**: Build multi-backend async HTTP streaming client for Ollama with SSE token streaming, abort controls, and health-check ping.
- **Deliverables**:
  - `src-tauri/src/inference/client.rs` using `reqwest` with SSE streaming.
  - `stream_completion` command emitting `llm-token` and `llm-done` events.
  - `abort_completion` command using `tokio::sync::oneshot` channels.
  - `check_inference_health` querying `/api/tags`.
- **Interface & Schema Contracts**:
  ```rust
  #[derive(serde::Serialize, serde::Deserialize, Clone)]
  pub struct CompletionRequest {
      pub model: String,
      pub prompt: String,
      pub temperature: f32,
      pub stop_tokens: Vec<String>,
      pub keep_alive: Option<String>,
  }

  #[tauri::command]
  pub async fn stream_completion(window: tauri::Window, request_id: String, req: CompletionRequest) -> Result<(), String>;
  ```
- **Antigravity Prompt**:
  ```text
  Implement local inference gateway in Rust (src-tauri/src/inference/).
  Support Ollama's streaming endpoint (/api/generate) using reqwest with SSE stream processing.
  Emit Tauri events 'llm-chunk:{request_id}' with text deltas and handle graceful aborts via abort_completion.
  Include an endpoint to check Ollama health and list available local models (/api/tags).
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo test inference_gateway
  ```

### Day 7: Inference Priority Queue & Concurrency Sentinel
- **Objective**: Implement a request priority queue ensuring latency-critical autocomplete requests immediately preempt background chat or indexing tasks.
- **Deliverables**:
  - `src-tauri/src/inference/queue.rs` implementing 4 priority levels:
    1. Abort Signals (Immediate)
    2. Autocomplete (Latency-Critical, pre-emptive)
    3. Chat & Edit Requests (Standard)
    4. Background Indexing (Low Priority)
- **Antigravity Prompt**:
  ```text
  Implement an Inference Priority Queue in Rust (src-tauri/src/inference/queue.rs).
  Prioritize incoming inference requests: Priority 1 (Aborts), Priority 2 (Autocomplete), Priority 3 (Chat), Priority 4 (Background).
  Ensure in-flight low-priority generations yield or pause when an inline autocomplete request arrives.
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo test inference::queue
  ```

### Day 8: Inline Ghost-Text Autocomplete Engine
- **Objective**: Build sub-40ms inline Tab autocompletion inside Monaco powered by resident `Qwen2.5-Coder-1.5B`.
- **Deliverables**:
  - `src/features/autocomplete/inlineProvider.ts` implementing Monaco `InlineCompletionsProvider`.
  - Prefix/suffix context extractor (1,000 chars before, 500 chars after cursor).
  - Qwen FIM prompt formatter (`<|fim_prefix|>...<|fim_suffix|>...<|fim_middle|>`).
  - 30ms keystroke debouncer; Tab accepts, Esc dismisses.
- **Antigravity Prompt**:
  ```text
  Implement the inline ghost-text autocomplete engine for Monaco Editor in src/features/autocomplete/.
  Implement Monaco's InlineCompletionsProvider.
  Extract prefix/suffix around cursor and format using Qwen2.5-Coder FIM prompt tags.
  Add a 30ms keystroke debounce, call the local inference gateway with keep_alive: -1, and display ghost text.
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "inlineProvider"
  ```

### Day 9: Autocomplete Benchmark & Latency Verification
- **Objective**: Validate sub-40ms Time-To-First-Token (TTFT) and memory footprint under heavy typing simulation.
- **Deliverables**:
  - `bench/ttft.py` sending 50 synthetic FIM requests to Ollama.
  - Automated pass/fail latency assertions (< 40ms average).
- **Verification Command**:
  ```powershell
  python bench/ttft.py
  ```

### Day 10: Week 2 Polish & Error Recovery
- **Objective**: Add graceful UX for autocomplete: offline indicator in status bar if Ollama is unreachable; automatic retry on reconnection.
- **Deliverables**:
  - Status bar AI indicator (`🟢 AI Ready` / `🔴 Ollama Offline`).
  - Tag `v0.1.0-w2`.
- **Verification Command**:
  ```powershell
  npm run build && cd src-tauri && cargo check --release
  ```

---

## WEEK 3: CHAT & DIFF ENGINE

### Day 11: AI Chat Assistant Core
- **Objective**: Build primary AI Chat sidebar with streaming Markdown rendering, code blocks, and conversation state management.
- **Deliverables**:
  - `src/components/chat/ChatPanel.tsx` with virtualized message history.
  - Markdown renderer with syntax-highlighted code blocks and copy buttons.
  - Conversation store with cancel/retry support.
- **Antigravity Prompt**:
  ```text
  Build the AI Chat Assistant in src/components/chat/ChatPanel.tsx.
  Support streaming responses from the inference gateway, markdown rendering with syntax highlighting, and conversation history in Zustand.
  Add cancel generation and retry actions.
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "ChatPanel"
  ```

### Day 12: `@file` Context Injection
- **Objective**: Implement explicit file context injection (`@file:path/to/file`) allowing users to query specific files without complex RAG infrastructure.
- **Deliverables**:
  - `@` mention auto-complete dropdown in chat input.
  - File content resolution reading target file into system prompt context.
- **Antigravity Prompt**:
  ```text
  Implement @file context injection in the chat panel.
  When the user types '@', show a fuzzy dropdown of workspace files.
  On selection, resolve the file content and inject it into the prompt context sent to the model.
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "fileMention"
  ```

### Day 13: Frugal Search/Replace Diff Parser with Line Anchors
- **Objective**: Build deterministic search/replace diff parser saving 98% of output tokens by only producing modified lines, enhanced with line-number anchor hints.
- **Deliverables**:
  - `src-tauri/src/diff/frugal_parser.rs` parsing:
    ```
    FILE: <path>
    <<<<<<< SEARCH (line 42)
    <original code>
    =======
    <new code>
    >>>>>>> REPLACE
    ```
  - 3-tier matching: Exact match -> Line-number anchored match -> Whitespace-insensitive match.
- **Antigravity Prompt**:
  ```text
  Implement the Frugal Search/Replace Diff Parser in Rust (src-tauri/src/diff/frugal_parser.rs).
  Parse blocks formatted with SEARCH (line hint) / ======= / REPLACE.
  Implement multi-tier matching (exact, line-anchored, and whitespace-trimmed).
  Write unit tests covering multi-hunk replacements, empty replacements, and ambiguous matches.
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo test diff::frugal_parser
  ```

### Day 14: Monaco Multi-File Diff Review UI
- **Objective**: Build interactive diff review interface in Monaco supporting inline annotations and side-by-side reviews with hunk-level actions.
- **Deliverables**:
  - `src/components/diff/DiffReviewModal.tsx` and inline diff decorations.
  - Per-hunk "Accept [Y]" / "Reject [N]" glyph buttons.
  - Keyboard navigation: `Alt+N` (next hunk), `Alt+P` (prev hunk), `Ctrl+Enter` (accept all).
- **Antigravity Prompt**:
  ```text
  Create the Monaco Diff Review UI in src/components/diff/.
  Support inline diff decorations and side-by-side Monaco diff viewing.
  Provide per-hunk Accept/Reject actions with keyboard navigation (Alt+N / Alt+P / Ctrl+Enter).
  Update file content on disk and in editorStore when hunks are accepted.
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "DiffReview"
  ```

### Day 15: Week 3 Integration & In-Editor Insertion
- **Objective**: Connect chat diff responses directly to the active Monaco buffer with 1-click "Apply Changes".
- **Deliverables**:
  - "Apply to Editor" CTA button in chat code blocks routing to diff engine.
  - Tag `v0.1.0-w3`.
- **Verification Command**:
  ```powershell
  npm run build && cd src-tauri && cargo check --release
  ```

---

## WEEK 4: SAFETY NET, SHELL POLISH & MVP EXIT GATE

### Day 16: Shadow Git Checkpoints (1-Click Rollback)
- **Objective**: Implement automatic background workspace snapshots before any AI diff application using Git stash/commit objects.
- **Deliverables**:
  - `src-tauri/src/git/checkpoint.rs` creating background snapshots in `refs/ai-checkpoints/`.
  - 1-click "Restore Snapshot" action reverting working tree with uncommitted stash protection.
  - Snapshot list command returning timestamps and prompt summaries.
- **Antigravity Prompt**:
  ```text
  Implement the Shadow Git Checkpoint System in Rust (src-tauri/src/git/checkpoint.rs).
  Create lightweight background commits targeting 'refs/ai-checkpoints/<branch>/<timestamp>'.
  Provide create_checkpoint, list_checkpoints, and restore_checkpoint commands.
  Ensure active branch and user git history are never modified.
  ```
- **Verification Command**:
  ```powershell
  cd src-tauri && cargo test git::checkpoint
  ```

### Day 17: State Persistence Engine
- **Objective**: Ensure workspace state survives application restarts (open tabs, active file, split layout, recent files).
- **Deliverables**:
  - `src/stores/persistence.ts` debounced sync to `.openstudio/workspace.json`.
  - Rehydration on launch restoring editor buffers, cursor positions, and panel sizes.
- **Antigravity Prompt**:
  ```text
  Build the State Persistence Engine in src/stores/persistence.ts.
  Persist open tabs, active file, split layouts, and recent files into .openstudio/workspace.json on debounced changes.
  Rehydrate state seamlessly on app launch.
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "persistence"
  ```

### Day 18: Command Palette (`Ctrl+Shift+P`)
- **Objective**: Implement a global fuzzy-searchable Command Palette for all editor and AI actions.
- **Deliverables**:
  - `src/components/palette/CommandPalette.tsx` accessible via `Ctrl+Shift+P`.
  - Fuzzy matcher registering commands: Open File, Toggle Terminal, Split Editor, Check Ollama Status, Clear Chat.
- **Antigravity Prompt**:
  ```text
  Implement the Command Palette in src/components/palette/CommandPalette.tsx triggered by Ctrl+Shift+P.
  Provide fuzzy searching over registered commands, recent files, and editor actions with keyboard navigation (Up/Down/Enter/Esc).
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "CommandPalette"
  ```

### Day 19: Settings & Preferences UI (`Ctrl+,`)
- **Objective**: Build a clean Settings modal allowing users to configure Ollama URLs, model selections, tab size, and themes.
- **Deliverables**:
  - `src/components/settings/SettingsModal.tsx` accessible via `Ctrl+,`.
  - Saved to `.openstudio/settings.json`.
  - Options: Ollama Endpoint, Autocomplete Model, Edit Model, Tab Size, Theme.
- **Antigravity Prompt**:
  ```text
  Implement the Settings Panel in src/components/settings/SettingsModal.tsx triggered by Ctrl+,.
  Allow users to configure Ollama URL, model preferences, font size, tab width, and theme.
  Persist configuration in .openstudio/settings.json.
  ```
- **Verification Command**:
  ```powershell
  npm run test -- -t "SettingsModal"
  ```

### Day 20: First-Run Onboarding & Phase 1 MVP Exit Gate
- **Objective**: Guide new users on startup: check Ollama health, offer 1-click model pull (`qwen2.5-coder:1.5b`), and run full Phase 1 smoke test.
- **Deliverables**:
  - `src/components/onboarding/OnboardingWizard.tsx`.
  - Complete Phase 1 MVP verification pass.
  - Tag `v0.1.0-MVP`.
- **Exit Criteria**: Developer can open a repo, get sub-40ms autocomplete, chat with `@file`, apply frugal diffs, and restore snapshots — 100% offline.
- **Verification Command**:
  ```powershell
  npm run build && cd src-tauri && cargo test && cd .. && npm run test
  ```

---

# PHASE 2: "IT'S SMART" INTELLIGENCE & CONTEXT (WEEKS 5–8) — COMPLETE (`v0.2.0-P2`)

---

### Week 5: Progressive Codebase Indexing (Complete)
- **Week Focus**: Tree-sitter AST structural slicing and BM25 lexical search for `@codebase` v1.
- **Deliverables**:
  - `src-tauri/src/ast/slicer.rs`: Tree-sitter parsers for TypeScript, Python, and Rust stripping function bodies to generate 800-token repo skeletons.
  - `src-tauri/src/rag/bm25.rs`: Fast in-memory BM25 lexical keyword search over workspace files for instant `@codebase` v1 queries without embeddings.
- **Verification**: 5/5 Rust tests + 9/9 Vitest tests passed.

### Week 6: Vector RAG & Hybrid Retrieval (`@codebase` v2) (Complete)
- **Week Focus**: Local embeddings via `nomic-embed-text` and vector store for 3-stage hybrid search.
- **Deliverables**:
  - `src-tauri/src/rag/embeddings.rs` & `src/features/rag/embeddingClient.ts` communicating with Ollama embedding API.
  - `src-tauri/src/rag/vector_store.rs` & `src/features/rag/vectorStore.ts` storing cosine-similarity chunk vectors.
  - `src-tauri/src/rag/hybrid.rs` & `src/features/rag/hybridSearch.ts` 3-Stage Query Pipeline: Vector candidate search ➔ BM25 reciprocal rank fusion (RRF) ➔ Neural cross-encoder re-ranking and noise filtering.
- **Verification**: 5/5 Rust tests + 5/5 Vitest tests passed.

### Week 7: Language Server Protocol & Universal Memory Sentinel (Complete)
- **Week Focus**: Compiler-grade diagnostics via `lsp-types` crate, dynamic context clamping, and hardware memory profiling.
- **Deliverables**:
  - `src-tauri/src/lsp/client.rs` & `src-tauri/src/lsp/detector.rs` using `lsp-types = "0.95"` for `rust-analyzer`, `vtsls`, `pyright`, `gopls`, `clangd`.
  - Monaco diagnostics bridge, hover info, document symbols, and references provider (`src/features/diagnostics/lspMonacoBridge.ts`).
  - `src-tauri/src/hardware/profiler.rs` using `sysinfo` and Ollama `/api/ps` to classify system into Tier 1–4 and dynamically clamp context budgets.
  - `src-tauri/src/inference/swapper.rs` ModelSwapper with residency tracking, idle model eviction, and sub-40ms autocomplete pinning.
- **Verification**: 5/5 Rust tests + 6/6 Vitest tests passed.

### Week 8: Task-Based Model Router & Terminal Auto-Fix (Complete)
- **Week Focus**: Dynamic VRAM lifecycle orchestration, PTY stream error capture, 1-click diagnostic repair loop, and interactive terminal verification.
- **Deliverables**:
  - **Day 36**: `src-tauri/src/router/model_router.rs` & `src/features/router/taskRouter.ts`: Task-based intent router (`TaskType::TerminalFix`, `FastEdit`, `Reasoning`, `Autocomplete`, `GeneralChat`), fallback cascades, and keep-alive management.
  - **Day 37**: `src/features/terminal/errorCapture.ts` & `src/stores/terminalErrorStore.ts`: Multi-line regex compiler parsers (`pytest`, `cargo`, `npm`, `tsc`, `python`, `go`), chunk boundary accumulator, deduplication, and terminal error cards.
  - **Day 38**: `src/features/terminal/diagnosticRepair.ts` & `src/components/terminal/DiagnosticRepairModal.tsx`: 1-Click "Fix with AI ⚡" context window extraction, surgical frugal diff generation, and Shadow Git safety snapshotting.
  - **Day 39**: `src/features/terminal/fixVerifier.ts` & `src/stores/diagnosticRepairStore.ts`: Native PTY command re-execution, multi-framework verification evaluation, 1-click auto-rollback, and bounded iterative self-healing (up to 3 attempts).
  - **Day 40**: `src-tauri/tests/week8_integration.rs`, `src/week8_integration.test.ts`, and `src/features/terminal/benchmark.test.ts`: Complete Phase 2 integration test suites and performance benchmarks.
- **Phase 2 Exit Gate Verification**:
  - **Vitest Suite**: 306/306 tests passing across all 51 test files (`npm test -- --run`)
  - **Rust Backend Suite**: 88/88 tests passing across all unit and integration suites (`cargo test`)
  - **TypeScript Typecheck**: Code 0 (`npx tsc --noEmit`)
  - **Production Build**: Clean bundle in 53.51s (`npm run build`)
  - **Release Milestone**: `v0.2.0-P2` (Phase 2 Local Intelligence Engine)

---

# PHASE 3: "IT'S READY" PRODUCTION & DISTRIBUTION (WEEKS 9–12)

---

### Week 9: Checkpoint Timeline UI & Native MCP Client
- **Week Focus**: Visual time-travel history and Anthropic Model Context Protocol integration.
- **Deliverables**:
  - `src/components/sidebar/CheckpointTimeline.tsx` with visual snapshot tree and hover diff previews.
  - `src-tauri/src/mcp/client.rs` stdio transport with strict JSON schema validation and single-tool retry fallback for local 7B models.
- **Test Command**: `cd src-tauri && cargo test mcp::client && cd .. && npm run test -- -t "CheckpointTimeline"`

### Week 10: Plugin Architecture & VS Code Extension Wedge
- **Week Focus**: Community extensibility host and standalone VS Code extension for user acquisition.
- **Deliverables**:
  - `src/plugins/PluginHost.ts` implementing `OpenStudioPlugin` lifecycle with sandboxed Editor/Terminal APIs.
  - `extensions/vscode/` packaging the FIM prompt formatter and frugal diff parser into a standalone VS Code extension.
- **Test Command**: `cd extensions/vscode && npm run compile && npm run test`

### Week 11: Zero-Telemetry Security CI & Packaging
- **Week Focus**: Enterprise air-gap verification, performance benchmarks, and release installers.
- **Deliverables**:
  - `scripts/verify-airgap.sh` CI script failing on any unannotated network calls.
  - `src-tauri/src/security/audit_logger.rs` local encrypted SQLite audit logger.
  - Multi-platform packaging: Windows `.msi` / `.exe`, macOS `.dmg` with Metal acceleration, Linux `.AppImage`.
- **Test Command**: `bash scripts/verify-airgap.sh && npm run tauri build`

### Week 12: Production Hardening & Community Launch
- **Week Focus**: Final release polish, documentation audit, and public launch kit.
- **Deliverables**:
  - Production `README.md`, `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`.
  - Community launch post for r/LocalLLaMA and Hacker News Show HN.
  - Tag `v1.0.0-GA`.
- **Test Command**: `npm run test && cd src-tauri && cargo test && bash scripts/verify-airgap.sh`

---

## Antigravity Daily Execution Protocol

When prompting Antigravity to build any specific milestone:
1. **Target the Milestone**: `Execute Phase 1, Week X, Day Y of OPEN_STUDIO_EXECUTION_MASTERPLAN.md`.
2. **Deliverables Checklist**: Confirm every file in Deliverables is generated without placeholders.
3. **Run Test Command**: Execute the specified verification command and verify `code 0` exit status.
