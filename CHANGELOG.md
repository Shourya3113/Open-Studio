# Changelog — Open Studio

All notable changes to the **Open Studio** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-09-17 (Production General Availability)

### Phase 3: Hardening, Ecosystem & Production GA (Weeks 9–12, Days 41–60)

#### Week 12: Production Hardening, Distribution & Official GA Launch (Days 56–60)
- **Day 60: The Grand Finale — Official v1.0.0-GA Production Release**
  - Promoted all package manifests (`package.json`, `Cargo.toml`, `tauri.conf.json`, `open-studio-vscode`) to `v1.0.0`.
  - Authored official `RELEASE_NOTES.md` and complete 60-day `CHANGELOG.md`.
  - Executed master 9-stage release pre-flight verification with 100% pass rate.
  - Tagged `v1.0.0` in Git repository.
- **Day 59: Final End-to-End Release Hardening & Release Candidate Validation (`v1.0.0-rc1`)**
  - Created full-system TypeScript integration suite (`src/week12_integration.test.ts`) covering all 10 architectural subsystems.
  - Created Rust Tauri kernel integration suite (`src-tauri/tests/week12_integration.rs`) with 7 native subsystem checks.
  - Built master release pre-flight auditor script (`scripts/verify-release.mjs`) generating cryptographic release manifest.
- **Day 58: Community Launch Kit & Public Distribution Package**
  - Published Hacker News *Show HN* launch submission (`docs/launch/SHOW_HN.md`).
  - Authored Reddit *r/LocalLLaMA* architecture deep-dive (`docs/launch/REDDIT_LOCALLAMA.md`).
  - Created Twitter/X 10-tweet technical launch thread (`docs/launch/TWITTER_THREAD.md`).
  - Prepared Product Hunt launch kit (`docs/launch/PRODUCT_HUNT.md`).
  - Created scene-by-scene 5-minute interactive video demo script (`docs/launch/DEMO_SCRIPT.md`).
  - Standardized GitHub issue governance templates (`.github/ISSUE_TEMPLATE/` and `PULL_REQUEST_TEMPLATE.md`).
- **Day 57: First-Run Experience & Out-of-the-Box Onboarding Wizard**
  - Implemented interactive `OnboardingWizard` modal with 4-step hardware calibration and model discovery.
  - Built zero-config local model scanner and role classifier (`src/features/onboarding/modelDetector.ts`).
  - Added Command Palette quick-action triggers (`help:welcome` and `setup:diagnostic-wizard`).
- **Day 56: Cross-Platform Native Desktop Packaging & Zero-Telemetry CI Verification**
  - Configured multi-platform installer declarations: WiX MSI, NSIS EXE, Apple DMG, Linux AppImage & DEB.
  - Implemented automated pre-flight packaging validator (`scripts/verify-packaging.mjs`) and bundle builder (`scripts/build-installers.mjs`).
  - Authored complete multi-platform packaging guide (`docs/PACKAGING.md`).

#### Week 11: Standalone VS Code Extension Wedge (Days 51–55)
- **Day 55: System Release Info & Cross-Platform Distribution UI**
  - Implemented `src/features/system/releaseInfo.ts` and diagnostic modal integrations.
- **Day 54: Extension Diff History & Undo Stack**
  - Created persistent local diff tracking and rollback history for the VS Code extension.
- **Day 53: Monaco Virtual Document Provider**
  - Built read-only virtual document provider rendering surgical side-by-side diff previews in VS Code.
- **Day 52: Frugal Diff Orchestrator for VS Code**
  - Ported 3-tier frugal diff search-and-replace algorithm to `extensions/vscode/src/frugalDiff.ts`.
- **Day 51: Standalone VS Code Extension Wedge Scaffolding**
  - Created `extensions/vscode/` package with local Ollama client, FIM completion provider, and chat webview.

#### Week 10: Native Plugin Runtime & Workspace Security Boundaries (Days 46–50)
- **Day 50: Cryptographic Merkle Audit Logger**
  - Built zero-dependency pure-Rust FIPS 180-4 SHA-256 audit logger (`src-tauri/src/security/audit_logger.rs`).
  - Implemented tamper-evident local SQLite ledger at `.openstudio/audit.db`.
- **Day 49: Declarative Policy & Governance Engine**
  - Implemented `.openstudio/rules.yaml` policy engine shielding `.env*`, `*.key`, and lockfiles.
- **Day 48: Sandboxed Plugin Host & Capabilities System**
  - Built `PluginHost.ts` with capability-based security (`editor:read`, `editor:write`, `commands:register`).
- **Day 47: Built-in Code Metrics Analyzer Plugin**
  - Created reference native plugin computing LOC, cyclomatic complexity, and code health.
- **Day 46: Native Plugin Architecture Scaffolding**
  - Designed plugin manifest schema and lifecycle hooks.

#### Week 9: Native Model Context Protocol (MCP) Integration (Days 41–45)
- **Day 45: MCP Tool Content Marshaling & Chat UI Rendering**
  - Rendered interactive tool invocation and result bubbles in the chat panel.
- **Day 44: Multi-Server MCP Manager & Aggregator**
  - Supported multiple concurrent MCP servers with unified schema translation.
- **Day 43: Sandboxed Stdio Tool Execution**
  - Implemented air-gapped process execution for MCP tools without WAN access.
- **Day 42: MCP JSON-RPC 2.0 Protocol Engine**
  - Built native Rust JSON-RPC 2.0 client (`src-tauri/src/mcp/client.rs`).
- **Day 41: Model Context Protocol Architecture Foundation**
  - Defined MCP specification types and local server configuration format.

---

## [0.2.0] — 2026-08-15 (Advanced Capabilities)

### Phase 2: Advanced Capabilities (Weeks 5–8, Days 21–40)

#### Week 8: Autonomous Task Routing & Shadow Git Checkpoints (Days 36–40)
- Implemented Shadow Git Checkpoints (`refs/ai-checkpoints/`) without moving `HEAD` or polluting working tree.
- Built 1-Click Diff Comparison & Restore Modal.
- Built Task Router with intent classification and fallback cascades.
- Integrated XTerm.js PTY terminal manager with background execution and ANSI streaming.

#### Week 7: Universal Hardware Tiers & Memory Sentinel (Days 31–35)
- Created 4 Universal Hardware Tiers (Heavyweight, Standard, Budget, CPU Fallback).
- Implemented VRAM Memory Sentinel with auto-eviction and idle timeout management.
- Integrated Language Server Protocol (LSP) client for diagnostics, go-to-definition, and symbol navigation.

#### Week 6: Offline Hybrid RAG & Vector Search (Days 26–30)
- Built pure-local embedding vector store with cosine similarity ranking.
- Implemented Reciprocal Rank Fusion (RRF) combining BM25 and vector search.
- Created sliding window code chunker with Tree-sitter AST syntax boundary awareness.

#### Week 5: AST Slicing & BM25 Codebase Indexing (Days 21–25)
- Implemented Tree-sitter AST symbol extractor and Repo Map generator.
- Built zero-dependency in-memory BM25 lexical search engine with code tokenizer.
- Implemented incremental file-watcher synchronization.

---

## [0.1.0] — 2026-07-20 (Core MVP)

### Phase 1: Core MVP (Weeks 1–4, Days 1–20)

#### Week 4: Frugal Diff Engine Core & MVP Release (Days 16–20)
- Developed initial 3-tier Frugal Diff Engine cutting token usage by 90%+.
- Built Monaco side-by-side diff review modal.
- Verified Phase 1 MVP milestones.

#### Week 3: Multi-Model Inference & Prompt Engineering (Days 11–15)
- Implemented streaming SSE inference client for Ollama.
- Built Fill-In-the-Middle (FIM) prompt builder with model-specific stop tokens.
- Implemented inline tab autocomplete provider in Monaco Editor.

#### Week 2: Local Model Connectivity & Air-Gap Guards (Days 6–10)
- Built hard-coded loopback network guards rejecting non-loopback destinations.
- Implemented local Ollama health check and auto-reconnect listeners.
- Created AI Ready status bar indicator.

#### Week 1: Desktop Shell & IDE Scaffolding (Days 1–5)
- Initialized Rust Tauri v2 desktop application shell.
- Integrated Monaco Editor with multi-tab buffer management.
- Built collapsible multi-panel IDE layout with XTerm.js terminal.
- Added virtualized workspace file tree.

---

*Open Studio is maintained by Shourya Solanki and the open-source community.*
