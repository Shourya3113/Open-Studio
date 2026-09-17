# Product Hunt Launch Kit: Open Studio

---

## 1. Product Metadata

- **Name**: Open Studio
- **Tagline**: 100% offline, native local AI IDE for private code
- **Topics**: Developer Tools, Open Source, Artificial Intelligence, Privacy, Productivity
<!-- airgap-allow: repository url -->
- **Website / Repo**: [https://github.com/Shourya3113/Open-Studio](https://github.com/Shourya3113/Open-Studio)
- **License**: Apache 2.0 / MIT Dual License
- **Pricing**: 100% Free & Open Source

---

## 2. Short Description

Open Studio is a high-performance native desktop IDE (Rust / Tauri v2 + Monaco) that delivers sub-40ms inline autocomplete, 99.6% token-saving frugal diffs, automated shadow Git time-travel checkpoints, and multi-stage RAG completely offline on your local hardware. Zero telemetry. Zero subscriptions. 100% air-gapped privacy.

---

## 3. Maker Comment (First Comment by Creator)

```markdown
Hey Product Hunt! 👋

We’re thrilled to introduce Open Studio to the community!

Over the past year, AI-assisted coding tools have transformed how we write software. But for developers working on proprietary company codebases, under strict NDAs, or in defense/healthcare/finance sectors, cloud-based AI tools are non-starters because they leak code to remote servers. Furthermore, network latency on cloud completions breaks developer flow state.

We built Open Studio to prove that you don't need to sacrifice privacy or speed to have a world-class AI coding experience:

⚡ Sub-40ms Tab Autocomplete: Pinned resident Fill-In-The-Middle (FIM) model on local VRAM/RAM gives you instant ghost-text with 0.56ms TTFT.
📝 Frugal Diff Engine: 3-tier search/replace blocks patch 5,000-line files in 2.7ms, cutting token usage by 99.6%.
🛡️ Shadow Git Safety Net: Automatic time-travel checkpoints before every AI generation with 1-click restore.
🔒 Zero-Telemetry Guarantee: 100% air-gap verified with local SQLite cryptographic SHA-256 audit ledger.
📦 Native Installers: Windows (.msi, .exe), macOS (.dmg with Metal acceleration), and Linux (.AppImage, .deb).

Open Studio works with your local Ollama or llama.cpp setup and runs smoothly on machines from 4GB VRAM laptops to multi-GPU workstations (and even CPU fallback).

Everything is free and 100% open-source under Apache 2.0 / MIT.

We'd love to hear your thoughts, answer any questions, and learn how you use it in your local workflow!
```

---

## 4. Key Feature Highlights

1. **Native Rust + Tauri v2 Shell**: Under 80MB idle memory footprint compared to 600MB+ in Electron editors.
2. **Sub-40ms Resident FIM Autocomplete**: Pinned `qwen2.5-coder:1.5b` model delivers instantaneous ghost-text completions as you type.
3. **Frugal Multi-Hunk Diff Engine**: Token-efficient search/replace blocks with side-by-side Monaco diff inspection.
4. **Shadow Git Time-Travel Checkpoints**: Non-blocking background checkpoint tree allowing 1-click instant rollback without dirtying your active Git commits.
5. **3-Stage Offline Hybrid RAG**: Tree-sitter AST syntax chunking, BM25 lexical search, and vector cosine ranking.
6. **Model Context Protocol (MCP)**: Native stdio JSON-RPC 2.0 client for local tools and plugins.
7. **Tamper-Evident SHA-256 Audit Ledger**: Cryptographically verifiable SQLite log of all local AI events.
8. **Standalone VS Code Extension Wedge**: Use Open Studio's local inference engine directly inside your existing VS Code installation.

---

## 5. Media Gallery Asset Specification

- **Thumbnail** (240x240): Dark-theme Open Studio glowing hexagon icon.
- **Gallery Image 1** (1270x760): Full workspace view with Monaco editor, active ghost-text FIM autocomplete (<40ms), and terminal panel.
- **Gallery Image 2** (1270x760): Multi-hunk Frugal Diff side-by-side Monaco review with accepted/rejected hunks.
- **Gallery Image 3** (1270x760): Shadow Git checkpoint timeline with 1-click time-travel restore.
- **Gallery Image 4** (1270x760): First-run Setup Wizard showing hardware capability detection and zero-config model calibration.
- **Gallery Image 5** (1270x760): Cryptographic SHA-256 audit ledger inspector and Wireshark zero-packet air-gap verification.
