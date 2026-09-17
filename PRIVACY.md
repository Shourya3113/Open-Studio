# Privacy Policy & Zero-Telemetry Commitment — Open Studio 🔒

> **TL;DR**: Open Studio collects **zero data**. No analytics, no telemetry, no tracking, no crash reports, and no code snippets ever leave your computer. Everything runs 100% locally on your own hardware.

---

## 1. Our Fundamental Privacy Pledge

Open Studio was created as an antidote to cloud-tethered developer tools that harvest source code, keystrokes, and proprietary intellectual property. 

We believe that your code, prompts, project structure, and developer habits belong solely to you. Therefore, Open Studio is architected with a **verifiable zero-telemetry core**:

- **No Remote Servers**: Open Studio does not operate any centralized telemetry intake, user account service, or analytics servers.
- **No Cloud AI APIs by Default**: All inference, tab autocompletion, RAG embedding generation, and agentic workflows execute against resident models running on your local GPU or CPU.
- **No Keystroke or Prompt Logging**: Your typing, code snippets, diffs, and chat messages are never transmitted over the internet.

---

## 2. Data Handling & Local Storage Architecture

All data created or processed by Open Studio is stored strictly on your local filesystem:

| Data Type | Purpose | Storage Location | Retention & Privacy |
| :--- | :--- | :--- | :--- |
| **Source Code & Buffers** | Editor active buffers and workspace files | Your local project directory | Never uploaded; modified only with your explicit confirmation. |
| **Codebase RAG Index** | Lexical (BM25) and semantic vector embeddings | `.openstudio/index.db` (Local SQLite) | Generated locally using `nomic-embed-text`; stays on your machine. |
| **Shadow Git Snapshots** | Automated 1-click rollback checkpoints | `.git/refs/ai-checkpoints/` | Invisible local Git refs; never pushed to upstream remotes. |
| **Audit Ledger** | Cryptographic tamper-evident log | `.openstudio/audit.db` | Encrypted at rest; owned entirely by you. |
| **User Preferences** | Keybindings, UI layout, model assignments | `.openstudio/settings.json` | Plaintext local configuration; zero remote synchronization. |
| **Workspace Policy Rules** | Path exclusions and guardrail definitions | `.openstudio/rules.yaml` | Committed to your project or kept local. |

---

## 3. Network Communication Boundaries

Open Studio's native shell enforces a strict sandbox:
1. **Loopback Only**: Network sockets are strictly restricted to local loopback origins:
   - `http://localhost:11434` and `http://127.0.0.1:11434` (Local Ollama / llama.cpp inference engine).
2. **Zero External Requests**: The application does not download remote scripts, fonts, web components, or analytics SDKs at runtime.
3. **No Automatic Updaters**: The native application does not query cloud servers for updates in the background. Software updates are installed manually by the user or through enterprise package managers.

---

## 4. Enterprise & Regulatory Compliance

Because Open Studio never transmits data externally, it is natively compliant with the world's most stringent privacy and data sovereignty regulations:

- **GDPR (European Union)**: Compliant by design. No personal data is collected, stored, or processed by Open Studio creators.
- **HIPAA (Healthcare)**: Safe for developing software that interacts with Protected Health Information (PHI). Code and queries never traverse third-party networks.
- **ITAR / Export Controls (Defense & Aerospace)**: Compliant for classified and export-controlled software development in disconnected SCIF environments.
- **SOC 2 Type II Compliance**: Simplifies enterprise compliance audits through local encrypted cryptographic audit logs.

---

## 5. Complete Data Erasure

You have total ownership and control over all data. To completely delete all metadata, indices, and audit logs created by Open Studio in any project workspace, simply delete the `.openstudio` directory:

```bash
# Completely erase all local indices, checkpoints, and audit logs
rm -rf .openstudio
```

---

## 6. Verification

We provide automated tools for users and compliance teams to verify our zero-telemetry claims:
- Run `npm run verify:airgap` to statically audit the entire source code for network calls.
- Inspect network traffic with any packet analyzer (e.g. Wireshark) during use: zero packets will leave the loopback interface (`lo` / `127.0.0.1`).
