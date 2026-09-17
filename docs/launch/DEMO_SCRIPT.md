# Open Studio: 5-Minute Production Video & Demo Script

---

## Overview
This script is designed for recording the official public launch video, product overview GIFs, and live developer conference demonstrations of Open Studio.

**Total Runtime**: ~5 minutes  
**Tone**: Technical, clear, developer-focused, no marketing fluff.  
**Prerequisites**:
- Open Studio installed and running.
- Local Ollama instance running with `qwen2.5-coder:1.5b` and `qwen2.5-coder:7b`.

---

## Segment Breakdown

### 00:00 – 00:45 | Scene 1: First-Run Experience & Hardware Calibration
- **Visual**: Launching Open Studio for the first time. The Setup Wizard appears automatically with the "100% Offline Air-Gap" badge.
- **Narrator**:
  > "Welcome to Open Studio: the 100% offline, native desktop AI IDE built with Rust and Tauri v2.
  > When you open the application for the first time, our zero-config setup wizard automatically detects your hardware capabilities. It reads your GPU VRAM, classifies your system into an operational hardware tier, and pings your local Ollama or llama.cpp instance on loopback port 11434.
  > In one click, Open Studio matches your hardware tier to the optimal local model suite and token context budget. No complex configuration files, no remote API keys."
- **Action**: Click "1-Click Apply Pairing", then click "Launch Workspace". The wizard smoothly transitions into the Monaco editor.

---

### 00:45 – 01:45 | Scene 2: Sub-40ms Resident Tab Autocomplete
- **Visual**: Opening a TypeScript or Python file (e.g. `src/utils/math.ts`).
- **Narrator**:
  > "Let's start by writing code. Notice what happens when I start typing a function signature:
  > `export function calculateFibonacci(n: number): number {`
  > Instantly, ghost-text appears.
  > Unlike cloud-based coding assistants where completions travel across the internet with 300 to 700 milliseconds of latency, Open Studio pins a specialized 1.5-billion parameter Fill-In-The-Middle model resident in your GPU VRAM or system RAM.
  > Our keystroke-to-prediction latency is under 1 millisecond. Hit Tab, and you're coding without interruption."
- **Action**: Type a few functions in rapid succession, accepting suggestions with `Tab`. Show that completions adapt to surrounding prefixes and suffixes seamlessly.

---

### 01:45 – 03:00 | Scene 3: Natural Language Chat & Frugal Diff Engine
- **Visual**: Opening the Chat Panel (`Ctrl+Shift+L` or sidebar). Selecting code in the editor and pressing `Ctrl+K` or submitting a prompt: *"Refactor this component to use an asynchronous cache and add input validation."*
- **Narrator**:
  > "Now let's ask Open Studio to perform a multi-file refactoring.
  > In conventional AI tools, editing a 3,000-line file requires re-generating the entire source file, which burns thousands of tokens and takes up to a minute on local hardware.
  > Open Studio uses a 3-Tier Frugal Diff Engine. Our local model generates surgical search/replace blocks.
  > The diff applies in under 3 milliseconds across 5,000 lines of code, saving 99.6% of generation tokens.
  > In the side-by-side Monaco diff inspector, you can review individual hunks, accept or reject changes with keyboard shortcuts, or hit Ctrl+Enter to apply all accepted edits."
- **Action**: Inspect hunks side-by-side. Accept the diff. Notice clean file update.

---

### 03:00 – 03:45 | Scene 4: Shadow Git Time-Travel Safety Net
- **Visual**: Intentionally introducing a syntax error or hallucinated edit, then navigating to the Checkpoint Timeline.
- **Narrator**:
  > "We all know AI models can occasionally make mistakes or break existing logic.
  > In Open Studio, you are protected by the Shadow Git Safety Net. Before every AI generation or diff application, Open Studio creates a background checkpoint in a shadow Git alternate index.
  > Your working tree commits are never dirtied.
  > If an AI edit doesn't work, click 'Restore Checkpoint' or press Ctrl+Z to travel back in time. Your code returns to its exact pre-AI state instantly."
- **Action**: Click "Restore Checkpoint". The file immediately reverts to its original contents.

---

### 03:45 – 04:30 | Scene 5: Local Hybrid RAG & MCP Tool Execution
- **Visual**: In the chat panel, typing `@index` or `@file` to query a codebase symbol.
- **Narrator**:
  > "For codebase understanding, Open Studio employs a 3-stage offline hybrid RAG engine.
  > It uses Tree-sitter for AST syntax chunking, BM25 for sub-millisecond lexical symbol lookup, and an in-memory vector store for cosine semantic ranking.
  > Open Studio also features a native Model Context Protocol (MCP) JSON-RPC 2.0 client. You can connect local MCP servers to inspect local SQLite databases, run unit tests in the embedded terminal, or read local documentation without sending a single byte to the cloud."
- **Action**: Show an MCP tool call executing locally and returning formatted output.

---

### 04:30 – 05:00 | Scene 6: Zero-Telemetry Verification & Cryptographic Audit
- **Visual**: Opening Command Palette (`Ctrl+Shift+P`) -> `Security: Open Audit Log`.
- **Narrator**:
  > "Finally, let's look at security. Open Studio makes a verifiable zero-telemetry guarantee.
  > Every AI prompt, model response, and configuration change is logged into a tamper-evident SHA-256 merkle-chain in local SQLite.
  > You can inspect this log at any time or run your own packet capture with Wireshark. You will observe zero outbound packets.
  > Open Studio is completely free and open-source under Apache 2.0 and MIT. Download the native installer for Windows, macOS, or Linux today."
- **Action**: Scroll through the audit ledger inspector showing verified SHA-256 block hashes. Fade out to GitHub URL slide.
