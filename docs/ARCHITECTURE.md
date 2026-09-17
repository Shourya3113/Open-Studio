# Open Studio: System Architecture & Technical Specification 🏛️

> Comprehensive technical blueprint of Open Studio — 100% Offline, Native Local AI IDE & Autonomous Agentic Workspace.

---

## 1. System Topology & Process Architecture

Open Studio adopts a high-efficiency desktop architecture pairing a lightweight native Rust core with a high-performance Monaco Editor front-end, packaged via **Tauri v2**:

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
│     + BM25 Re-Ranking Engine (<10ms retrieval over 50k files)             │
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

## 2. Core Architectural Subsystems

### A. Sub-40ms Tab Autocompletion (FIM Pipeline)
- **Resident Model Pinning**: Keeps an ultra-compact coding model (`qwen2.5-coder:1.5b`) permanently resident in GPU VRAM (`keep_alive: -1`).
- **Prompt Tokenizer Assembly**: Formats prefixes and suffixes using standard Fill-in-the-Middle tokens:
  ```
  <|fim_prefix|>{code_before_cursor}<|fim_suffix|>{code_after_cursor}<|fim_middle|>
  ```
- **Ghost-Text Injection**: Monaco inline completion provider intercepts keystrokes, calculates token cache deltas, and renders streaming suggestions with zero perceptible editor lag.

### B. Frugal Search/Replace Diff Protocol
- **Problem**: Full-file rewrites waste 90–98% of output generation tokens and take tens of seconds on multi-thousand-line files.
- **Solution**: Open Studio's Frugal Diff protocol instructs models to emit strictly targeted replacement blocks:
  ```diff
  <<<< SEARCH
  let count = 0;
  ====
  let count = items.length;
  >>>>
  ```
- **3-Tier Matching Engine**:
  1. *Tier 1 (Exact String Match)*: Instant single-pass substring search.
  2. *Tier 2 (Whitespace-Trimmed Match)*: Ignores indentation variations and trailing spaces.
  3. *Tier 3 (Line-Anchored Fuzzing)*: Matches hunk header lines within a ±15 line vicinity, achieving resilient application even on mutated files.

### C. Shadow Git Safety Net & Time-Travel Snapshots
- **Non-Polluting Checkpoint Engine**: Creates lightweight Git commits before every automated AI file modification.
- **Alternate Index Isolation**: Operates on an alternate Git tree reference (`refs/ai-checkpoints/<branch>/<timestamp>`).
- **Clean Repository**: The user's active branch, working tree, and `git log` remain 100% pristine.
- **Granular 1-Click Rollback**: Enables users to restore single files or entire multi-file changesets instantaneously.

### D. Multi-Stage Hybrid RAG Architecture
Code retrieval is structured across 4 specialized stages to minimize context window consumption while maximizing semantic accuracy:
1. **Tree-sitter AST Slicing**: Strips non-target function bodies, compressing 50+ files into an 800-token skeleton of types, interfaces, and signatures.
2. **BM25 Lexical Inverted Index**: High-speed keyword identifier search with camelCase and snake_case tokenization (<1ms retrieval).
3. **Local Vector Search**: 384-dimensional unit vector cosine similarity search generated locally via `nomic-embed-text`.
4. **Reciprocal Rank Fusion (RRF) & Cross-Encoder Re-Ranking**: Fuses lexical and semantic score distributions, eliminates license boilerplate/import noise, and delivers the top-K relevant snippets.

### E. Dynamic Task Router & Hardware Memory Sentinel
- **Hardware Telemetry Profiler**: Queries GPU/CPU telemetry across 5 vendors (NVIDIA CUDA, AMD ROCm, Apple Silicon Metal, Intel Arc oneAPI, CPU AVX2) and classifies workstations into 4 operational tiers.
- **Task Intent Classification**: Directs lightweight completions to Tier 1 models, complex multi-hunk edits to 7B models, and architectural queries to DeepSeek-R1 reasoning models.
- **Proactive Memory Eviction**: Automatically unloads idle background models when VRAM pressure exceeds 85%, preventing Out-Of-Memory (OOM) crashes.

### F. Automated Terminal Self-Healing Loop
- **PTY Error Interception**: Native Rust pseudo-terminal (`portable-pty`) streams shell outputs through regex/AST parsers for `cargo`, `tsc`, `pytest`, `npm`, and `go`.
- **1-Click "Fix & Verify ⚡"**: Generates a targeted frugal diff repair, automatically creates a Shadow Git snapshot, applies the patch, re-executes the failed terminal command, and verifies exit code 0.
- **Bounded Iteration**: Restricts autonomous retry loops to a maximum of 3 attempts with automated rollback on failure.

### G. Model Context Protocol (MCP) Client
- **Open Standards**: Full compliance with the Anthropic Model Context Protocol (JSON-RPC 2.0).
- **Stdio Transport**: Spawns isolated local child processes (`sqlite`, `git`, `filesystem`, `postgres-local`) communicating over stdin/stdout pipes.
- **JSON Schema Validation**: Translates MCP tool definitions into structured agent function schemas with type validation before execution.

### H. Sandboxed TypeScript Plugin Host
- **Extensibility Framework**: Third-party and built-in plugins implement the `OpenStudioPlugin` lifecycle (`activate`, `deactivate`).
- **Granular Permissions**: Restricts access to editor, terminal, status bar, and command palette APIs based on declared manifest permissions (`PluginManifest`).
- **Fault Isolation**: Catches plugin runtime errors without crashing the main editor shell.

### I. Zero-Telemetry Cryptographic Audit Ledger
- **SHA-256 Hash Chaining**: Every file mutation, shell command, and prompt submission is cryptographically bound to the hash of the preceding event.
- **Encrypted SQLite Storage**: Stored in `.openstudio/audit.db` encrypted with AES-256-GCM.
- **Tamper Detection**: Immediate detection and flagging if any historical record is altered, deleted, or truncated.

---

## 3. Communication Protocols

| Interface | Protocol | Transport | Latency Target |
| :--- | :--- | :--- | :--- |
| **Monaco Editor <-> Tauri Backend** | JSON-RPC 2.0 / Tauri IPC | Native Webview Bridge | < 1ms |
| **Backend <-> Ollama / llama.cpp** | HTTP / Server-Sent Events (SSE) | Loopback TCP (`127.0.0.1:11434`) | < 5ms connection |
| **Backend <-> Terminal Process** | Raw Byte Stream | Native OS PTY | < 0.5ms |
| **Backend <-> LSP Servers** | Language Server Protocol (LSP) | Stdio Pipes | < 15ms |
| **Backend <-> MCP Servers** | Model Context Protocol (JSON-RPC) | Stdio Child Process Pipes | < 5ms |
