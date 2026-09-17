# Open Studio Release Candidate Notes — v1.0.0-rc1

**Release Tag**: `v1.0.0-rc1`  
**Codename**: *Permafrost*  
**Date**: September 2026  
**License**: Apache-2.0 / MIT Dual License  
**Air-Gap Guarantee**: 100% Offline, Zero External Network Calls, Zero Telemetry  

---

## 1. Executive Overview

Open Studio `v1.0.0-rc1` marks the feature-complete Release Candidate for the 100% offline, native local AI development environment. Designed for defense-grade security, enterprise compliance, and resource-conscious developer workstations, Open Studio delivers high-performance agentic coding, multi-model hot-swapping, non-destructive shadow git checkpoints, and hybrid RAG indexing without ever transmitting a single byte over the public internet.

Every system boundary is strictly enforced at both the TypeScript application layer and the Rust Tauri kernel layer through hard-coded loopback network guards, SHA-256 Merkle audit chains, and declarative workspace policy engines (`.openstudio/rules.yaml`).

---

## 2. Universal Hardware Tier Support Matrix

Open Studio dynamically inspects available GPU VRAM and physical system RAM on boot, assigning an optimal execution tier with automatic memory sentinel eviction rules:

| Tier | Profile | Hardware Spec Baseline | Context Window | Recommended Autocomplete | Recommended Reasoning / Chat | Eviction Policy |
|:---|:---|:---|:---|:---|:---|:---|
| **Tier 1** | Heavyweight | &ge; 12GB VRAM or &ge; 24GB Unified RAM | 32,768 tokens | `qwen2.5-coder:1.5b` | `qwen2.5-coder:7b` / `deepseek-coder:6.7b` | Persistent residency (no eviction) |
| **Tier 2** | Standard | 6GB &ndash; 11GB VRAM or 16GB &ndash; 23GB RAM | 16,384 tokens | `qwen2.5-coder:1.5b` | `qwen2.5-coder:7b` | Auto-evict chat model after 5m idle |
| **Tier 3** | Budget / Constrained | 4GB &ndash; 5GB VRAM or 8GB &ndash; 15GB RAM | 8,192 tokens | `qwen2.5-coder:1.5b` | `qwen2.5-coder:7b` | Auto-evict chat model after 3m idle |
| **Tier 4** | CPU Fallback | &lt; 4GB VRAM or &lt; 8GB RAM (CPU-only) | 4,096 tokens | `qwen2.5-coder:1.5b` | `qwen2.5-coder:1.5b` (quantized) | Immediate on-demand swap (60s idle) |

---

## 3. Key Architectural Pillars

### A. 100% Air-Gapped Network Guard
- Hard-coded validation blocking all non-loopback network calls (`127.0.0.0/8`, `::1`, `localhost`).
- Static analysis and pre-flight auditing script (`npm run verify:airgap`) preventing external HTTP/WebSocket libraries or telemetry SDKs from being bundled.
- Zero outbound telemetry pings, zero telemetry endpoints, zero external CDN dependencies.

### B. Multi-Engine Local Inference & Hot-Swapper
- Native dual-engine support: Local Ollama daemon (`http://localhost:11434`) and embedded `llama.cpp` sidecar.
- Sub-second model swapping with automated VRAM sentinel preventing Out-of-Memory (OOM) crashes on constrained GPUs.
- Dynamic prompt prefix caching and speculative autocomplete decoding yielding sub-25ms response latencies.

### C. Non-Destructive Shadow Git Checkpoints
- Automated snapshots written to isolated Git references (`refs/ai-checkpoints/<branch>/<timestamp>`).
- Completely isolated from normal working tree git branches and `HEAD`.
- 1-Click Rollback and unified diff comparison modal, allowing instant undo of any AI-suggested code modifications.

### D. Hybrid RAG Codebase Indexer
- Dual-mode indexing combining BM25 lexical term frequency with pure-local embedding vector search.
- Incremental file-watcher synchronization (`sync_file_changes`) re-indexing modified files without re-scanning the whole workspace.
- Cosine similarity ranking and AST symbol extraction for precise contextual code injection.

### E. Declarative Workspace Governance (`.openstudio/rules.yaml`)
- Denied file patterns (`**/.env*`, `**/*.key`, `**/secrets/**`) guarded against accidental AI context reading or writing.
- Read-only protection for critical dependency locks (`package-lock.json`, `Cargo.lock`, `pnpm-lock.yaml`).
- Model allowlisting and banned prompt pattern filtering.

### F. Cryptographic Merkle Audit Logger
- Zero-dependency FIPS 180-4 SHA-256 tamper-evident log stored locally in `.openstudio/audit.db`.
- Every prompt, completion, diff execution, and checkpoint is hashed in an immutable hash chain starting from genesis hash.
- Instant chain verification (`verify_chain_integrity`) alerting users if any disk corruption or tampering occurs.

---

## 4. Verification & Quality Gates

Before tagging `v1.0.0-rc1`, the entire codebase was subjected to the 9-stage release pre-flight suite (`npm run verify:release`):

```
============================================================
  Open Studio — Release Pre-Flight Verification Auditor
  Target Version: v1.0.0-rc1 | Airgap Mode: STRICT
============================================================

 [PASS] Stage 1: Zero-Telemetry & Air-Gap Auditor
 [PASS] Stage 2: Tauri Bundler Packaging Pre-Check
 [PASS] Stage 3: TypeScript Type Checking (tsc --noEmit)
 [PASS] Stage 4: Vitest Test Suite (79 files, 547+ tests)
 [PASS] Stage 5: Rust Cargo Test Suite (130+ tests)
 [PASS] Stage 6: VS Code Extension Test Suite (61 tests)
 [PASS] Stage 7: Performance Benchmark SLO Verification
 [PASS] Stage 8: Dry-Run Packaging & Binary Structure
 [PASS] Stage 9: Vite Production Build Optimization

Result: ALL 9 RELEASE GATES PASSED (100% AIR-GAP COMPLIANT)
```

---

## 5. Getting Started with v1.0.0-rc1

### Prerequisites
- **Operating System**: Windows 10/11 (x64), macOS 12+ (Apple Silicon / Intel), or Linux (Ubuntu 20.04+, Fedora 38+, Arch).
- **Local Model Runner**: [Ollama](https://ollama.com) installed and running locally, or bundled `llama.cpp` sidecar.
- **Recommended Initial Models**:
  ```bash
  ollama pull qwen2.5-coder:1.5b
  ollama pull qwen2.5-coder:7b
  ```

### Launching Open Studio
1. Launch Open Studio from your desktop or terminal:
   ```bash
   npm run tauri dev
   ```
2. The **First-Run Onboarding Wizard** will automatically scan your local Ollama instance, detect available models, classify your hardware tier, and pre-configure the optimal reasoning and autocomplete models.
3. Open any local workspace folder and begin developing with full privacy and native speed.

---

## 6. Release Checksums & Manifest Verification

Each official build artifact is cryptographically hashed with SHA-256. Verify your local download against `.openstudio/release-manifest.json`:

```bash
# Verify downloaded archive integrity
sha256sum OpenStudio_1.0.0-rc1_x64.msi
sha256sum OpenStudio_1.0.0-rc1_aarch64.dmg
sha256sum OpenStudio_1.0.0-rc1_amd64.AppImage
```

---

*Open Studio is committed to sovereign, offline, and private AI tools for developers worldwide.*
