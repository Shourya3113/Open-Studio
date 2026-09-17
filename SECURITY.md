# Security Policy — Open Studio 🛡️

Open Studio is engineered from the ground up for zero-trust, enterprise air-gapped environments. The system operates 100% offline with a verifiably isolated core, cryptographic tamper-evident auditing, and declarative workspace policy boundaries.

---

## 1. Reporting a Vulnerability

We take the security and integrity of Open Studio seriously. If you discover a security vulnerability, we appreciate your responsible disclosure.

### Reporting Process
- **Email**: Please report security vulnerabilities privately to `security@openstudio.dev`. <!-- airgap-allow: security contact email -->
- **PGP Encryption**: For sensitive reports, you may request our PGP public key or submit encrypted advisories.
- **Response SLA**:
  - Initial acknowledgement within **24 hours**.
  - Triage and impact assessment within **72 hours**.
  - Coordinated patch release within **14 business days** (or sooner depending on severity).

> [!IMPORTANT]
> **Do not report security vulnerabilities through public GitHub issues, discussions, or social channels.** Please use the private disclosure email above to protect users while a patch is prepared.

---

## 2. Core Security Architecture & Air-Gap Guarantees

Open Studio's security model is built on five defensive pillars:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Zero-Telemetry Security Perimeter                    │
├────────────────────────┬───────────────────────┬───────────────────────┤
│   Air-Gapped Core      │ Cryptographic Ledger  │   Policy Engine       │
│   Strict Loopback CSP  │ SHA-256 Hash Chain    │   .openstudio/        │
│   No Remote Telemetry  │ Encrypted SQLite Log  │   rules.yaml          │
├────────────────────────┴───────────────────────┴───────────────────────┤
│                       Isolation & Sandboxing                           │
│   Hardened Runtime Entitlements • Native Rust PTY Process Manager      │
│   Sandboxed TypeScript Plugin Host with Granular Permissions           │
└────────────────────────────────────────────────────────────────────────┘
```

### A. Strict Network Isolation & Content Security Policy (CSP)
- **Local Loopback Restriction**: The desktop application shell (Tauri v2) enforces a strict Content Security Policy:
  ```http
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:11434 http://127.0.0.1:11434;
  ```
- **Socket Level Validation**: The native Rust backend (`src-tauri/src/security/network_guard.rs`) inspects all outbound network attempts and rejects any non-loopback destination, external IP, or WAN hostname.
- **Zero External Telemetry**: Open Studio contains no analytics libraries, no usage trackers, no error beacons, and no CDN dependencies.

### B. Tamper-Evident SHA-256 Audit Ledger
All security-relevant actions are recorded in an encrypted, hash-chained ledger:
- **Hash Chaining**: Each audit entry incorporates the SHA-256 hash of the preceding record (`previous_hash`), forming an immutable cryptographic chain.
- **Encrypted at Rest**: The local database (`.openstudio/audit.db`) is encrypted using ChaCha20-Poly1305 / AES-256-GCM.
- **Events Audited**:
  - File reads, writes, and surgical frugal diff patches.
  - PTY shell commands executed via the embedded terminal.
  - Model prompt submissions and AI generation streams.
  - Policy configuration modifications.
- **Integrity Verification**: The integrity of the audit chain can be verified anytime in-IDE via the Audit Log Inspector or through the CLI runner.

### C. Workspace Policy & Governance Engine (`.openstudio/rules.yaml`)
Workspaces are governed by declarative security policies:
- **Denied Paths**: Globs specifying files that AI agents and tools may never access (e.g. `.env*`, `*.pem`, `id_rsa`, `secrets/**`).
- **Read-Only Boundaries**: Paths permitted for RAG context indexing but blocked from automated code modification.
- **Model Boundaries**: Restricts allowed local model weights to approved lists.
- **Prompt & Tool Guardrails**: Regex pattern filters preventing accidental submission of sensitive API keys or credentials to prompt contexts.

### D. Sandboxed Extension & Plugin Security
- **Plugin Permission Model**: Extensions running in the `PluginHost` must declare explicit permissions in their manifest (`editor:read`, `terminal:write`, `status:display`, etc.).
- **Process Isolation**: Native plugins execute with bounded memory and cannot execute arbitrary OS syscalls without explicit user authorization.

---

## 3. Automated CI Security Audits

Every pull request and release build undergoes automated air-gap verification:
- **Static Scanner**: `npm run verify:airgap` scans every source file, configuration, and dependency to ensure zero unauthorized external network calls or tracking strings.
- **Packaging Scanner**: `npm run verify:packaging` verifies that release installers (.msi, .dmg, .AppImage, .deb) maintain strict offline configurations with auto-updaters disabled.

---

## 4. Supported Versions

| Version | Supported | Security Maintenance Status |
| :--- | :---: | :--- |
| **v1.0.x (Current)** | ✅ | Active security patches and air-gap audits |
| **v0.2.x (Phase 2)** | ⚠️ | Critical security fixes only |
| **v0.1.x (MVP)** | ❌ | End of Life; upgrade to v1.0.x recommended |

---

## 5. Security Checklist for Enterprise Deployments

For high-security, defense, financial, or healthcare installations:
1. Ensure Ollama / local LLM servers are bound strictly to `127.0.0.1:11434` or a local Unix socket.
2. Configure `.openstudio/rules.yaml` in repositories containing proprietary credentials or keys.
3. Run `npm run verify:airgap` in CI pipelines before deploying customized builds.
4. Export and archive the cryptographic audit ledger (`.openstudio/audit.db`) for corporate compliance records.
