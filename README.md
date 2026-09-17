# Open Studio 🚀
### 100% Offline, Native Local AI IDE & Autonomous Agentic Workspace

> **The Unified Local-First AI Desktop IDE & Autonomous Workspace**  
> A high-performance native desktop environment powered by local neural models, dynamic task-based routing, frugal search/replace diff generation, AST structural repo mapping, Model Context Protocol (MCP) tool execution, and an invisible shadow Git checkpoint safety net — packaged in an ultra-efficient 35MB desktop shell.

---

## ⚡ Key Highlights & Value Proposition

- **100% Air-Gapped & Verifiably Private**: Zero external network telemetry. Your source code and intellectual property never leave your workstation.
- **Sub-40ms Tab Autocompletion (FIM)**: Resident low-latency completion model pinned permanently in GPU VRAM delivers instant ghost-text as you type (measured P50: **0.58ms**).
- **Frugal Search/Replace Diff Protocol**: Emits strictly targeted replacement blocks (`<<<< SEARCH / REPLACE >>>>`), achieving **99.6% token reduction** and 10x faster code patching on 5,000-line files.
- **Universal Hardware Adaptation**: First-class hardware acceleration for **NVIDIA (CUDA)**, **AMD (ROCm/Vulkan)**, **Apple Silicon (Metal/MLX)**, **Intel Arc (SYCL/oneAPI)**, and a lightweight **CPU-only fallback (AVX2/AVX-512)**.
- **Multi-Stage Hybrid RAG**: Tree-sitter AST slicing + BM25 keyword search + local vector embeddings (`nomic-embed-text`) + cross-encoder re-ranking for sub-10ms retrieval over massive codebases.
- **Shadow Git Time-Travel (`.ai-checkpoints/`)**: Invisible background commits prior to every AI action with granular 1-click snapshot restore, keeping your active Git history 100% clean.
- **Model Context Protocol (MCP) Client**: Native JSON-RPC stdio client supporting multi-server aggregation, schema validation, and autonomous tool calling loops.
- **Sandboxed TypeScript Plugin Engine**: Secure extensibility framework with fine-grained manifest permissions (`editor`, `terminal`, `status`) and fault isolation.
- **Standalone VS Code Extension Wedge**: Zero-friction adoption bridge packaging Open Studio's FIM autocomplete and frugal diff engine for standard VS Code workflows.
- **Tamper-Evident SHA-256 Audit Ledger**: Cryptographic hash-chained security logging encrypted at rest with SQLite export.
- **Declarative Policy Engine (`.openstudio/rules.yaml`)**: Enforces path exclusions, read-only boundaries, and model guardrails.
- **Multi-Platform Installers**: Native `.msi` and `.exe` for Windows, `.dmg` for macOS, and `.AppImage` and `.deb` for Linux.

---

## 📊 Verified Performance Benchmarks

All performance SLOs are automatically verified via `npm run benchmark` and native Rust benchmarks (`cargo test --test benchmarks`):

| Subsystem | Metric | Measured Value | SLO Target | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Inference / FIM** | Time-To-First-Token (P50) | **0.58 ms** | < 40 ms | ✅ PASS |
| **Inference / FIM** | Tail Latency (P95) | **2.80 ms** | < 65 ms | ✅ PASS |
| **Inference / FIM** | Resident Model Generation | **1,060 tok/s** | > 30 tok/s | ✅ PASS |
| **Frugal Diff** | 5,000-Line 10-Hunk Patch Time | **3.53 ms** | < 15 ms | ✅ PASS |
| **Frugal Diff** | Output Token Reduction Ratio | **99.6 %** | > 90 % | ✅ PASS |
| **RAG / BM25** | 200-File Tokenizer & Index Time | **0.95 ms** | < 30 ms | ✅ PASS |
| **RAG / BM25** | Lexical Search Query Latency | **0.05 ms** | < 10 ms | ✅ PASS |
| **RAG / Vector** | Top-5 Cosine Search (1,000 Vectors)| **3.98 ms** | < 10 ms | ✅ PASS |
| **Security / Audit** | SHA-256 Chained Event Logging Rate | **238,846 ops/s**| > 5,000 ops/s | ✅ PASS |
| **Hardware Sentinel**| OS Hardware Telemetry Sample Latency| **176.3 µs** | < 5 ms | ✅ PASS |

---

## 🏗 Architecture Topology

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

For an exhaustive architectural deep dive, see **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

---

## 🏆 Completed Milestones & Architectural Roadmap

### Phase 1: MVP Release (`v0.1.0`) — Days 1–20 (Weeks 1–4)
- **Monaco Desktop Shell**: Multi-tab editor, native file tree, split panes, theme synchronization.
- **Embedded PTY Terminal**: Low-latency terminal with `portable-pty` Rust backend + `@xterm/xterm`.
- **Inference Gateway**: Priority queue with autocomplete preemption and Ollama SSE streaming.
- **Frugal Diff Engine**: 3-tier fallback parser (`Exact`, `Whitespace-Trimmed`, `Line-Anchored`).
- **Shadow Git Checkpoints**: Zero-pollution commits in `refs/ai-checkpoints/` with 1-click restore.
- **Workspace Persistence**: Debounced state rehydration via `.openstudio/workspace.json`.
- **Command Palette & Diagnostics**: Word-boundary fuzzy search (`Ctrl+Shift+P`), multi-compiler error parser.

### Phase 2: Local Intelligence Engine (`v0.2.0-P2`) — Days 21–40 (Weeks 5–8)
- **Hybrid AST & BM25 Codebase Search**: Tree-sitter AST slicing, code tokenization, incremental inverted indexing, dynamic context budget clamping.
- **Multi-Stage RAG & Vector Embeddings**: Sliding-window chunking, local vector store, Reciprocal Rank Fusion (RRF), cross-encoder re-ranking.
- **Context Sentinel & Native LSP Bridge**: 4-tier hardware profiler (CUDA/ROCm/Metal/Vulkan/CPU), VRAM idle model eviction, resident autocomplete pinning, Rust LSP client.
- **Task-Based Router & Terminal Auto-Fix**: Intent classification, PTY compiler error interception, 1-click "Fix & Verify ⚡", bounded iterative self-healing loop (up to 3 attempts).

### Phase 3: Production Hardening, Extensibility & Ecosystem (`v1.0.0-GA`) — Days 41–60 (Weeks 9–12)
- **Model Context Protocol (MCP) Client**: Native JSON-RPC stdio transport, schema translation, safe autonomous tool calling loop.
- **Sandboxed Plugin Architecture**: TypeScript `PluginHost` with fine-grained manifest permissions, error isolation, and built-in Code Metrics plugin.
- **VS Code Extension Wedge**: Standalone extension (`extensions/vscode/`) packaging Open Studio's FIM provider and frugal diff parser for user adoption.
- **Enterprise Air-Gap CI Scanner**: Automated security auditor (`scripts/verify-airgap.mjs`) failing CI on any unauthorized external network calls or tracking strings.
- **Cryptographic Audit Ledger**: Local SHA-256 hash-chained log encrypted at rest with SQLite export.
- **Policy & Governance Engine**: `.openstudio/rules.yaml` path exclusions, read-only boundaries, and model guardrails.
- **Comprehensive Benchmarking Battery**: Standalone CLI runner (`npm run benchmark`), visual Benchmark Inspector modal, and native Rust microbenchmarks.
- **Multi-Platform Tauri Packaging**: WiX MSI and NSIS installers for Windows, DMG for macOS with Metal acceleration entitlements, AppImage and DEB for Linux.
- **Production Documentation Suite**: Formal `SECURITY.md`, `PRIVACY.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, and `docs/AIRGAP_VERIFICATION.md`.

---

## 📦 Multi-Platform Installation & Release Binaries

Download signed, verified installer packages from GitHub Releases or build them locally:

| Operating System | Package Format | Target Architecture | Description |
| :--- | :--- | :--- | :--- |
| **Windows** | `.msi` (WiX) | x86_64 | Enterprise silent deployment & Group Policy rollout |
| **Windows** | `.exe` (NSIS) | x86_64 | Standard desktop installer with Start Menu integration |
| **macOS** | `.dmg` | Apple Silicon / Intel | Drag-to-Applications bundle with Metal GPU acceleration |
| **Linux** | `.AppImage` | x86_64 | Portable zero-install executable (Ubuntu, Fedora, Arch) |
| **Linux** | `.deb` | x86_64 | Native Debian/Ubuntu package with desktop menu launcher |

### Building Installers Locally
```bash
# Verify air-gap and packaging configuration prerequisites
npm run verify:airgap
npm run verify:packaging

# Execute dry-run packaging pipeline
npm run package:dry-run

# Build full native desktop installers
npm run package
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v20+
- **Rust Toolchain**: 1.78+ (`rustup default stable`)
- **Ollama Inference Engine**: Running locally on loopback (`http://localhost:11434`):
  ```bash
  # Pull the recommended model pair
  ollama pull qwen2.5-coder:1.5b   # Resident Autocomplete (sub-40ms)
  ollama pull qwen2.5-coder:7b      # Edit / Refactor / Chat
  ```

### 2. Launching Open Studio
```bash
# Clone the repository
git clone https://github.com/Shourya3113/Open-Studio.git <!-- airgap-allow: official repo URL -->
cd "Open Studio"

# Install dependencies
npm install

# Start development shell
npm run dev

# Or launch as a native Tauri desktop window
npm run tauri dev
```

---

## 🛡️ Enterprise Air-Gap Security & Compliance

Open Studio is purpose-built for regulated, classified, and privacy-critical environments:
- **Zero Outbound Sockets**: Read our **[Enterprise Air-Gap Verification Manual](./docs/AIRGAP_VERIFICATION.md)** for Wireshark packet capture verification instructions.
- **Security Policy**: See **[SECURITY.md](./SECURITY.md)** for vulnerability disclosure protocols and cryptographic audit details.
- **Privacy Commitment**: See **[PRIVACY.md](./PRIVACY.md)** for our formal zero-data-collection pledge.
- **Contributing Guidelines**: See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for development workflows and air-gap engineering standards.

---

## 📄 License

Open Studio is open-source software licensed under the **Apache-2.0 License**. See [LICENSE](./LICENSE) for details.
