# Open Studio Local AI - VS Code Extension

**100% Offline, Native Local AI Autocompletion, Frugal Diffs & Chat powered by Ollama.**

Open Studio brings the local intelligence of the Open Studio IDE directly into Visual Studio Code. Experience ultra-low latency inline code completion, context-aware AI chat, and surgical multi-file search/replace patching with complete data privacy and zero cloud telemetry.

---

## Key Features

### ⚡ Sub-50ms Inline Code Autocompletion
- Powered by Fill-In-the-Middle (FIM) models (default: `qwen2.5-coder:1.5b`).
- 30ms typing debounce for seamless, uninterrupted editing flow.
- Models stay pinned in local GPU/VRAM for instant generation.

### 💬 Native Sidebar Webview Chat Panel
- Chat directly with local 7B models (default: `qwen2.5-coder:7b`, `llama3`, `deepseek-coder`).
- Real-time token streaming with live typing indicator.
- 100% air-gapped webview interface with strict Content Security Policy (`default-src 'none'`).

### 🛠️ Frugal Search/Replace Diffs & 1-Click Patching
- Generates compact `<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE` diff blocks instead of costly whole-file rewrites (98% token reduction).
- **Interactive Diff Cards**: Click **"Preview Diff"** to inspect side-by-side changes in VS Code's native diff editor before applying.
- **1-Click Apply**: Click **"Apply Diff"** to surgically patch files on disk with zero dry-run conflicts.

### ⏪ Local Rollback History Stack
- Automatically creates pre-patch snapshots before applying any diff.
- Roll back to the exact previous state at any time via **Open Studio: Rollback Last Applied Diff**.
- Bounded 20-session history stack with zero disk pollution.

### 🎯 Quick-Action Context Menu Commands
Highlight any code block, right-click, and run:
- **Open Studio: Explain Selected Code**
- **Open Studio: Refactor Selected Code**
- **Open Studio: Generate Tests for Selection**
- **Open Studio: Fix Bugs in Selected Code**

---

## Quick Start Guide

### 1. Install & Start Ollama
Ensure you have Ollama installed locally:
- macOS / Linux: `curl -fsSL https://ollama.com/install.sh | sh`
- Windows: Download installer from [ollama.com](https://ollama.com)

### 2. Pull Recommended Models
```bash
# Fast inline code completion (~1GB VRAM)
ollama pull qwen2.5-coder:1.5b

# High-intelligence chat & frugal diff generation (~5GB VRAM)
ollama pull qwen2.5-coder:7b
```

### 3. Verify Health
In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
```text
Open Studio: Check Local AI Health
```
A status notification will confirm whether Ollama is online and resident in memory.

---

## Extension Settings

Customize extension behavior in VS Code Settings (`Ctrl+,` -> search `Open Studio`):

| Setting | Default | Description |
| :--- | :--- | :--- |
| `openstudio.ollamaEndpoint` | `http://127.0.0.1:11434` | Base URL of the local Ollama daemon. |
| `openstudio.autocompleteModel`| `qwen2.5-coder:1.5b` | Local model for FIM inline code autocompletion. |
| `openstudio.chatModel` | `qwen2.5-coder:7b` | Local model for sidebar chat and diff generation. |
| `openstudio.debounceMs` | `30` | Typing debounce delay in milliseconds. |
| `openstudio.temperature` | `0.1` | Sampling temperature for code completion. |
| `openstudio.maxPrefixChars` | `1000` | Maximum characters before cursor included in FIM prompt. |
| `openstudio.maxSuffixChars` | `500` | Maximum characters after cursor included in FIM prompt. |

---

## Available Commands

| Command | Title | Description |
| :--- | :--- | :--- |
| `openstudio.openChat` | Open AI Chat | Focus the sidebar chat webview panel |
| `openstudio.checkHealth` | Check Local AI Health | Test Ollama connectivity and model status |
| `openstudio.triggerAutocomplete`| Trigger Local AI Autocomplete | Manually request inline suggestion |
| `openstudio.previewFrugalDiff` | Preview Frugal Diff | Open side-by-side diff preview for selection |
| `openstudio.applyFrugalDiff` | Apply Frugal Diff Patch | Surgically apply frugal diff from selection |
| `openstudio.rollbackLastDiff` | Rollback Last Applied Diff | Revert the last applied patch session |
| `openstudio.explainCode` | Explain Selected Code | AI code explanation via sidebar chat |
| `openstudio.refactorCode` | Refactor Selected Code | AI code refactoring with diffs |
| `openstudio.generateTests` | Generate Tests for Selection | Unit test generation with mocks |
| `openstudio.fixCode` | Fix Bugs in Selected Code | Bug detection and surgical fix |

---

## Security & Privacy Guarantee

Open Studio is engineered with a **zero-telemetry, 100% offline commitment**:
- No network requests ever leave `127.0.0.1:11434`.
- No user code, metrics, or telemetry are ever uploaded to any cloud server.
- Webviews use inline styling and script with zero remote CDN dependencies.
