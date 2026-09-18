# Open Studio Public Release Guide

This guide details how to release the Open Studio ecosystem to the public across all four distribution pillars:
1. **The Web Platform & Sovereign Registry (`openstudio.com`)**
2. **The Desktop IDE Installers (Windows, macOS, Linux)**
3. **The Sovereign Model Storage Layer (Cloudflare R2 Zero-Egress)**
4. **The Standalone VS Code Extension Wedge (`.vsix`)**

---

## 1. Deploying the Web Platform (`openstudio.com`)

The web platform (`web/`) provides the public landing page, interactive model catalog (`/models`), model cards (`/models/:id`), and community upload portal (`/models/upload`).

### Option A: Cloudflare Pages (Recommended for openstudio.com)
Cloudflare Pages offers unlimited free bandwidth, global CDN edge caching, and zero egress fees when paired with Cloudflare R2:
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Compute (Workers & Pages)** -> **Create Application** -> **Pages** -> **Connect to Git**.
2. Select repository: `Shourya3113/Open-Studio`.
3. Configure Build Settings:
   - **Framework Preset**: `None` or `Vite`
   - **Root directory**: `/`
   - **Build command**: `npm run web:build`
   - **Build output directory**: `web/dist`
4. Click **Save and Deploy**.
5. Under **Custom Domains**, add `openstudio.com` and `www.openstudio.com`. Cloudflare will automatically provision SSL certificates.

### Option B: GitHub Pages (Automatic via GitHub Actions)
A pre-configured GitHub Actions workflow (`.github/workflows/deploy-web.yml`) is already in the repository:
1. In your GitHub repository, go to **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Under **Custom domain**, enter `openstudio.com`.
4. In your DNS registrar for `openstudio.com`, add:
   - CNAME `openstudio.com` -> `<username>.github.io`
   - Or four `A` records pointing to GitHub Pages IPs:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
5. Any push to `main` touching `web/` will automatically build and publish the latest site.

---

## 2. Publishing Desktop IDE Installers (GitHub Releases)

Open Studio uses Tauri v2 to build native installers for Windows, macOS, and Linux. The automated multi-platform release workflow is defined in `.github/workflows/release.yml`.

### Step 1: Trigger the Automated Multi-Platform Build
To trigger a public production release, create and push a semantic Git tag:
```bash
git tag -a v1.0.0 -m "Open Studio v1.0.0 Production GA Release"
git push origin v1.0.0
```

### Step 2: What GitHub Actions Generates
GitHub Actions will spin up 3 native runners in parallel:
- **Windows Runner (`windows-latest`)**:
  - `Open Studio_1.0.0_x64_en-US.msi` (Enterprise WiX MSI installer)
  - `Open Studio_1.0.0_x64-setup.exe` (NSIS portable / user installer)
- **macOS Runner (`macos-latest`)**:
  - `Open Studio_1.0.0_aarch64.dmg` (Apple Silicon DMG with drag-to-Applications)
- **Linux Runner (`ubuntu-22.04`)**:
  - `open-studio_1.0.0_amd64.AppImage` (Universal standalone portable binary)
  - `open-studio_1.0.0_amd64.deb` (Debian / Ubuntu package)

### Step 3: Automated Verification & Release Publishing
1. Calculates SHA-256 checksums for all installer artifacts.
2. Creates a public GitHub Release with release notes at:
   `https://github.com/Shourya3113/Open-Studio/releases/tag/v1.0.0`
3. Download links on the `openstudio.com` landing page point directly to these GitHub Release assets.

---

## 3. Sovereign Model Storage Layer (Cloudflare R2)

Because open-weight GGUF models are 1 GB to 15 GB each, they are hosted on Cloudflare R2 to eliminate bandwidth costs:

1. In Cloudflare Dashboard, navigate to **R2 Object Storage** -> **Create bucket**:
   - Bucket name: `openstudio-models`
   - Region: `Automatic`
2. Under **Bucket Settings** -> **Public Access**:
   - Attach Custom Domain: `models.openstudio.com` (or `r2.openstudio.com`).
3. Upload the Golden Coding Suite quantized GGUF weights:
   - `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf`
   - `qwen2.5-coder-7b-instruct-q4_k_m.gguf`
   - `qwen2.5-coder-14b-instruct-q4_k_m.gguf`
   - `deepseek-r1-distill-qwen-7b-q4_k_m.gguf`
   - `deepseek-r1-distill-llama-8b-q4_k_m.gguf`
   - `codestral-22b-v0.1-q4_k_m.gguf`
4. Cost: Cloudflare R2 has **$0.00 / GB egress fees**, making model downloads 100% sustainable.

---

## 4. Publishing the VS Code Extension Wedge

For developers who want Open Studio's local intelligence directly inside VS Code or Cursor:

### Packaging the Extension (.vsix)
```bash
cd extensions/vscode
npx @vscode/vsce package
```
This produces `open-studio-vscode-1.0.0.vsix`.

### Publishing Options:
1. **GitHub Releases (Offline)**:
   Attach `open-studio-vscode-1.0.0.vsix` to the GitHub release so users can install via `Extensions: Install from VSIX...`.
2. **Open VSX Registry (for VSCodium / Open Source VS Code)**:
   ```bash
   npx ovsx publish open-studio-vscode-1.0.0.vsix -p <OPEN_VSX_PAT>
   ```
3. **Visual Studio Marketplace**:
   ```bash
   npx @vscode/vsce publish -p <MARKETPLACE_PAT>
   ```

---

## 5. Pre-Release Checklist Summary

| Step | Action | Status |
|---|---|---|
| **Code & Tests** | All 773 automated tests passed & air-gap verified | ✅ READY |
| **Production Build** | `npm run build` and `npm run web:build` compiled | ✅ READY |
| **Web Platform** | Push to `main` triggers GitHub Pages or Cloudflare Pages | ✅ CONFIGURED |
| **Installers** | Run `git tag v1.0.0 && git push origin v1.0.0` | ⚡ READY TO TRIGGER |
| **Custom Domain** | Point `openstudio.com` DNS records | 🌐 PENDING DOMAIN REGISTRAR |
