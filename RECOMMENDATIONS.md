# Open Studio — Recommendations & Suggested Changes

> **Author**: Antigravity Review  
> **Date**: September 6, 2026  
> **Reference**: [OPEN_STUDIO_EXECUTION_MASTERPLAN.md](./OPEN_STUDIO_EXECUTION_MASTERPLAN.md)

---

## 1. Timeline Restructuring: 28 Days → 12 Weeks (3 Phases)

### Problem

The current 28-day masterplan packs ~6–9 months of engineering into 4 weeks. The scope includes a full IDE shell, inference gateway, RAG pipeline, LSP client, shadow Git system, hardware profiler across 5 GPU vendors, MCP client, plugin architecture, voice dictation, live canvas, a VS Code extension, and cross-platform packaging.

Even with aggressive AI-assisted development, this timeline risks:
- Cutting critical corners on stability and UX polish
- Burnout and context-switching overhead
- Shipping a fragile v1 that damages first impressions

### Recommended 3-Phase Structure

#### Phase 1 — "It Works" MVP (Weeks 1–4)

Ship a usable, self-contained local AI IDE that proves the core value proposition: **offline, fast, private.**

| Week | Focus | Deliverables |
|------|-------|-------------|
| **Week 1** | Desktop Shell & Editor | Tauri v2 scaffold, Monaco Editor (tabs, splits, themes), File Tree (virtualized, `.gitignore`-aware), integrated terminal (Rust PTY + xterm.js) |
| **Week 2** | Inference & Autocomplete | Ollama SSE streaming client, ghost-text FIM autocomplete (Qwen-1.5B), abort controls, health-check ping |
| **Week 3** | Chat & Diff Engine | Chat panel with `@file` context injection, frugal search/replace diff parser, basic inline diff review UI (accept/reject per hunk) |
| **Week 4** | Safety Net & Integration | Basic shadow Git snapshots (create + list + restore), settings/preferences UI, command palette, state persistence (open tabs, panel layout), first-run onboarding flow, performance baseline |

**Exit Criteria**: A developer can open a project, edit code with AI autocomplete, chat with the AI about specific files, apply suggested diffs, and roll back if something breaks — all 100% offline.

---

#### Phase 2 — "It's Smart" (Weeks 5–8)

Layer in intelligence: codebase-wide context, compiler-grade diagnostics, hardware adaptation, and automated error repair.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **Week 5** | Codebase Indexing | Tree-sitter AST slicer (structural skeleton), BM25 keyword search over raw files (simple `@codebase` v1) |
| **Week 6** | Vector RAG & Hybrid Retrieval | `nomic-embed-text` embeddings, SQLite-vec storage, 2-stage retrieval (vector → BM25 re-rank), full `@codebase` with hybrid search |
| **Week 7** | LSP & Hardware | LSP client (using `lsp-types` crate) for TypeScript + Python, Monaco diagnostics/hover/go-to-def, hardware profiler (macOS Metal first, then CUDA), tier classification |
| **Week 8** | Model Router & Terminal Auto-Fix | Dynamic task-based model routing with VRAM lifecycle management, Ollama `keep_alive` orchestration, terminal error capture with 1-click "Fix & Retry" agent loop |

**Exit Criteria**: The IDE understands the full codebase structure, routes different tasks to appropriate models, provides real compiler diagnostics, and can automatically detect and fix build errors.

---

#### Phase 3 — "It's Ready" (Weeks 9–12)

Production hardening, extensibility, distribution, and community launch.

| Week | Focus | Deliverables |
|------|-------|-------------|
| **Week 9** | Checkpoint Timeline & MCP | Full checkpoint timeline UI (hover previews, pin/unpin, GC), native MCP client with JSON schema validation and retry logic |
| **Week 10** | Plugin Architecture & VS Code Extension | TypeScript plugin host (`OpenStudioPlugin` lifecycle), plugin sandbox APIs, VS Code extension wedge (FIM autocomplete + frugal diff) |
| **Week 11** | Security, Benchmarks & Packaging | Zero-telemetry CI audit (`verify-airgap.sh`), SQLite audit logger, `.openstudio/rules.yaml` policy engine, benchmarking suite (TTFT, diff latency, index build), cross-platform Tauri packaging (`.dmg`, `.msi`, `.AppImage`) |
| **Week 12** | Hardening & Launch | Full test suite pass, documentation (README, SECURITY.md, PRIVACY.md, CONTRIBUTING.md), first-run experience polish, community launch kit (HN Show HN, r/LocalLLaMA, Twitter/X) |

**Exit Criteria**: Production-quality, cross-platform release with security guarantees, benchmarks, plugin system, and community-ready documentation.

---

#### Deferred to Post-Launch

These features are valuable but not essential for a strong v1:

| Feature | Reason to Defer |
|---------|----------------|
| **Whisper Voice Dictation** | Nice-to-have; requires `cpal` + `whisper.cpp` integration and is orthogonal to core IDE value |
| **Live Generative Canvas** | Complex sandboxed iframe + bundled Babel/Tailwind runtime; low ROI for initial users |
| **Multi-backend inference** (llama.cpp, MLX, vLLM) | Ollama already abstracts hardware backends; direct llama.cpp/MLX support can wait |
| **Full multi-language LSP** (Go, Java, C/C++) | Start with TypeScript + Python (most common AI-assisted coding languages), expand later |
| **AMD ROCm / Intel SYCL profiling** | Start with macOS Metal + NVIDIA CUDA; these cover >90% of target users |

---

## 2. RAG Pipeline Simplification

### Problem

Days 12–13 of the current plan attempt Tree-sitter AST slicing + `nomic-embed-text` embeddings + SQLite-vec + BM25 re-ranking in 2 days. Each of these is independently complex.

### Recommended Approach: Progressive Enhancement

```
Phase 1 (Week 3):  @file  — Explicit file inclusion, zero infrastructure
                    └── User types @file:src/utils.ts → file content injected into prompt

Phase 2 (Week 5):  @codebase v1  — BM25 keyword search over raw files
                    └── Simple text search, no embeddings, no AST parsing
                    └── Fast to build, surprisingly effective for code search

Phase 2 (Week 6):  @codebase v2  — Full hybrid retrieval
                    └── Add Tree-sitter AST skeleton for structural context
                    └── Add nomic-embed-text vector embeddings
                    └── 2-stage pipeline: vector recall → BM25 re-rank
```

### Why This Order Works

- `@file` gives users immediate value with zero complexity
- BM25 alone is surprisingly good for code retrieval (keyword-heavy domain)
- Vector embeddings add semantic understanding *on top* of an already-working system
- Each layer can be tested and validated independently

---

## 3. LSP Client: Use Existing Crates, Don't Write From Scratch

### Problem

Writing a full JSON-RPC 2.0 LSP client from scratch that correctly handles `rust-analyzer`, `pyright`, `tsserver`, `gopls`, and `clangd` is a multi-month project. Each server has protocol quirks, initialization sequences, and capability negotiations that require extensive testing.

### Recommendation

Use the [`lsp-types`](https://crates.io/crates/lsp-types) crate for all protocol types and message definitions. This gives you:

- Complete LSP type definitions (no manual struct definitions)
- Correct serialization/deserialization
- Protocol version compatibility

```toml
# src-tauri/Cargo.toml
[dependencies]
lsp-types = "0.95"    # LSP protocol types
```

**For the JSON-RPC transport layer**, use [`tower-lsp`](https://github.com/ebkalderon/tower-lsp) or write a thin stdin/stdout framing layer (Content-Length header parsing) on top of Tokio. Don't implement the full protocol state machine from scratch.

**For MVP, start with only 2 language servers:**

| Language | Server | Why First |
|----------|--------|-----------|
| TypeScript/JavaScript | `typescript-language-server` | Most web developers, largest user base |
| Python | `pyright` | Most AI/ML developers, second largest base |

Rust (`rust-analyzer`), Go (`gopls`), Java (`jdtls`), and C/C++ (`clangd`) can be added incrementally — the transport layer is the same, only initialization capabilities differ.

---

## 4. Hardware Profiler: Delegate to Ollama, Start Narrow

### Problem

Detecting VRAM across NVIDIA (NVML), AMD (ROCm), Apple (Metal/sysctl), Intel (SYCL), and CPU requires different system libraries on each platform, many of which aren't available at compile time. This is a cross-platform nightmare.

### Recommendation

#### Step 1: Use Ollama's Built-In Hardware Detection

Ollama already detects GPUs, manages VRAM allocation, and handles model loading. Query its API instead of reimplementing:

```
GET http://localhost:11434/api/ps     → Currently loaded models + VRAM usage
GET http://localhost:11434/api/tags   → Available models
GET http://localhost:11434/api/show   → Model details (parameter count, quantization)
```

#### Step 2: Simple System Memory Detection (Rust)

For tier classification, you primarily need:
- **macOS**: `sysctl hw.memsize` (unified memory) — covers Apple Silicon
- **Linux/Windows**: Total system RAM via `sysinfo` crate

```toml
# src-tauri/Cargo.toml
[dependencies]
sysinfo = "0.30"
```

#### Step 3: Tier Classification Logic

```
if unified_memory >= 24GB  → Tier 1 (Heavyweight)
if unified_memory >= 16GB  → Tier 2 (Standard)
if total_ram >= 8GB        → Tier 3 (Constrained)
else                       → Tier 4 (CPU Fallback)
```

Let Ollama handle the actual GPU backend selection (CUDA vs Metal vs ROCm). Your app just needs to know *how much memory is available* to set appropriate `num_ctx` values and decide which models to load.

#### Step 4: Advanced Multi-Vendor Profiling (Post-MVP)

Defer direct NVML/ROCm/SYCL queries to Phase 3 or post-launch. They add precision but aren't essential when Ollama handles the heavy lifting.

---

## 5. VS Code Extension: Build Earlier, Not Day 26

### Problem

The VS Code extension is currently scheduled for Day 26 (near the end). But it's the **most important growth channel** — a way to reach millions of VS Code users before the full IDE is ready.

### Recommendation

Build the VS Code extension **in parallel during Phase 1**, or as the first deliverable of Phase 2:

```
Week 1–4:  Build core IDE (Phase 1 MVP)
Week 5:    Ship VS Code extension with:
           ├── FIM autocomplete (Qwen-1.5B via local Ollama)
           ├── Frugal search/replace diff protocol
           ├── Shadow Git snapshot creation
           └── Chat panel (webview sidebar)
```

### Why Earlier Is Better

| Benefit | Details |
|---------|---------|
| **User acquisition funnel** | VS Code has ~15M monthly users. Get local AI autocomplete in front of them while building the full IDE. |
| **Code reuse validation** | The TypeScript diff parser, FIM prompt formatter, and inference client are shared with the main app. Building the extension early validates these modules. |
| **Community feedback** | Real user feedback on autocomplete quality, diff reliability, and model recommendations *before* you lock in the full IDE architecture. |
| **Marketing asset** | "From the makers of Open Studio" in the VS Code marketplace description drives awareness. |

---

## 6. Missing Features to Add to the Plan

### 6.1 Settings & Preferences UI

**Priority**: Phase 1, Week 4

Currently absent from the masterplan. Users need to configure:

- Ollama endpoint URL (default `localhost:11434`, but some users run it remotely)
- Model preferences per task (autocomplete, edit, reasoning)
- Keybinding customization
- Theme selection (dark/light/high-contrast)
- Editor preferences (font size, tab width, word wrap, minimap)
- File exclusion patterns for indexing

**Implementation**: Zustand store + JSON config file at `.openstudio/settings.json`, with a React settings panel accessible via `Ctrl+,`.

---

### 6.2 Command Palette

**Priority**: Phase 1, Week 4

Mentioned in passing (Day 23) but not a dedicated deliverable. This is the **primary power-user interaction surface** — arguably more important than any menu bar.

**Implementation**:
- `Ctrl+Shift+P` opens a fuzzy-searchable command list
- Sources: built-in commands, editor actions, recently opened files, AI commands
- Use a lightweight fuzzy matching library (e.g., `fuse.js` or `match-sorter`)

---

### 6.3 First-Run Onboarding & Error Recovery

**Priority**: Phase 1, Week 4

The plan assumes Ollama is installed and models are pulled. In reality:

```
User installs Open Studio
  └── Ollama not installed?
      └── Show installation guide with 1-click download link
  └── Ollama installed but no models?
      └── Offer to pull qwen2.5-coder:1.5b automatically
  └── Ollama installed but not running?
      └── Attempt to start it, or show clear status in bottom bar
  └── Everything working?
      └── Show quick-start walkthrough (open folder, try autocomplete, try chat)
```

**Implementation**: A first-run wizard component that checks prerequisites, guides installation, and shows a feature tour. Also a persistent status indicator in the bottom bar showing Ollama connection state.

---

### 6.4 State Persistence

**Priority**: Phase 1, Week 4

Workspace state must survive app restarts:

| State | Storage |
|-------|---------|
| Open tabs and active file | `.openstudio/workspace.json` |
| Cursor positions per file | `.openstudio/workspace.json` |
| Panel sizes and layout | `.openstudio/workspace.json` |
| Recent files list | `.openstudio/recent.json` |
| Chat history | `.openstudio/chat-history.json` |
| Settings and preferences | `.openstudio/settings.json` |

**Implementation**: Serialize Zustand store snapshots to disk on change (debounced) and rehydrate on app launch.

---

### 6.5 Testing Strategy

**Priority**: Define in Phase 1, enforce from Week 1

The masterplan mentions test commands but doesn't define a testing pyramid:

```
                    ┌─────────┐
                    │  E2E    │  ← Tauri WebDriver / Playwright (Week 4+)
                   ┌┴─────────┴┐
                   │Integration │  ← Rust integration tests (cargo test)
                  ┌┴───────────┴┐
                  │  Unit Tests  │  ← Rust unit tests + Vitest (React)
                 ┌┴─────────────┴┐
                 │  Type Safety   │  ← TypeScript strict mode + cargo check
                 └───────────────┘
```

**Specific recommendations:**
- **Rust backend**: `cargo test` with module-level unit tests from Day 1. Use `mockito` for HTTP mocking (Ollama API tests).
- **React frontend**: Vitest + React Testing Library for component and store tests.
- **E2E**: Defer to Week 4. Use Tauri's built-in WebDriver support or Playwright.
- **CI**: GitHub Actions running `cargo test`, `npm test`, `cargo clippy`, and `tsc --noEmit` on every PR.

---

## 7. Minor Technical Recommendations

### 7.1 Frugal Diff Parser — Add Line Number Anchoring

The current parser uses 3-tier matching (exact → trimmed → Levenshtein). Add a **line number hint** to the prompt template so the model can output `SEARCH (near line 42)`:

```
FILE: src/utils.ts
<<<<<< SEARCH (line 42)
const oldValue = compute();
=======
const newValue = computeOptimized();
>>>>>> REPLACE
```

This dramatically improves match accuracy in files with repeated patterns (e.g., similar function signatures).

### 7.2 Shadow Git — Use `git stash` Semantics, Not Full Commits

For MVP, consider using `git stash create` (which creates a stash commit object without modifying refs) instead of full commits under `refs/ai-checkpoints/`. Benefits:
- Simpler implementation
- No risk of ref pollution
- Built-in `git stash pop` for restoration

For Phase 2, upgrade to the full `refs/ai-checkpoints/` system with metadata, pinning, and GC.

### 7.3 Inference Gateway — Add Request Queuing

The current plan doesn't address what happens when multiple inference requests arrive simultaneously (e.g., autocomplete fires while a chat response is streaming). Add a simple priority queue:

```
Priority 1 (Highest): Abort signals
Priority 2: Autocomplete (latency-critical, preempts chat)
Priority 3: Chat / Edit requests (can wait)
Priority 4: Background indexing (lowest priority)
```

### 7.4 Monaco Worker Bundling

The plan correctly identifies offline Monaco worker bundling as critical. Use the `monaco-editor` package directly (not `@monaco-editor/react` wrapper) with Vite's worker plugin for maximum control:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
```

This guarantees zero CDN requests at runtime.

---

## Summary of All Changes

| # | Change | Type | Impact |
|---|--------|------|--------|
| 1 | Restructure from 28 days → 12 weeks (3 phases) | Timeline | 🔴 Critical |
| 2 | Progressive RAG: `@file` → BM25 → vector+BM25 | Simplification | 🟡 High |
| 3 | Use `lsp-types` crate; start with TS + Python only | Simplification | 🟡 High |
| 4 | Delegate GPU detection to Ollama; use `sysinfo` for RAM | Simplification | 🟡 High |
| 5 | Build VS Code extension in Week 5, not Day 26 | Reordering | 🟢 Strategic |
| 6.1 | Add Settings & Preferences UI to Phase 1 | Missing feature | 🟡 High |
| 6.2 | Add Command Palette as Phase 1 deliverable | Missing feature | 🟡 High |
| 6.3 | Add first-run onboarding & error recovery | Missing feature | 🟡 High |
| 6.4 | Add state persistence (tabs, layout, history) | Missing feature | 🟡 High |
| 6.5 | Define testing pyramid and CI strategy | Missing feature | 🟡 High |
| 7.1 | Add line number anchoring to frugal diff | Enhancement | 🟢 Nice-to-have |
| 7.2 | Use `git stash` for MVP shadow checkpoints | Simplification | 🟢 Nice-to-have |
| 7.3 | Add request priority queue to inference gateway | Enhancement | 🟢 Nice-to-have |
| 7.4 | Direct Monaco bundling via Vite worker plugin | Enhancement | 🟢 Nice-to-have |
