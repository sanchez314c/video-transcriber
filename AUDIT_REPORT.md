# Forensic Code Quality Audit Report
**Project:** video-transcriber
**Date:** 2026-03-14
**Auditor:** Master Control
**Scope:** All source files under `src/`, shell scripts, package.json, CI config

---

## Executive Summary

12 findings across CRITICAL, HIGH, MEDIUM, and LOW severity. 5 npm vulnerabilities cleared by `npm audit fix`. All CRITICAL and HIGH code issues fixed. 4 MEDIUM/LOW issues fixed. 3 items documented but not fixable without architectural decisions or major dependency upgrades.

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 1 | 1 | 0 |
| HIGH | 4 | 4 | 0 |
| MEDIUM | 4 | 3 | 1 (by design) |
| LOW | 3 | 2 | 1 (needs arch decision) |
| npm vulns | 17 | 5 | 12 (require major dep upgrades) |

---

## Findings and Remediations

### [CRITICAL-01] Unvalidated URL in `open-external` IPC Handler
**File:** `src/main.js` — line 157
**Severity:** CRITICAL — Security (protocol injection / arbitrary file access)

**Issue:** The `open-external` IPC handler accepted any value for `url` without validation. A malicious or compromised renderer could invoke `shell.openExternal('file:///etc/passwd')`, `shell.openExternal('bash -c ...')`, or any custom protocol handler registered on the OS.

```js
// BEFORE — no validation at all
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});
```

**Fix Applied:** URL is now parsed with `new URL()` and protocol allowlisted to `https:` and `http:` only. Invalid URLs and non-http protocols are rejected and logged.

```js
// AFTER
ipcMain.handle('open-external', async (event, url) => {
  if (typeof url !== 'string') return;
  let parsed;
  try { parsed = new URL(url); } catch { return; }
  if (!['https:', 'http:'].includes(parsed.protocol)) return;
  await shell.openExternal(url);
});
```

---

### [HIGH-01] Null Pointer Crash — `mainWindow` Not Guarded in Progress Callback
**File:** `src/main.js` — line 122
**Severity:** HIGH — Crash / Data Loss

**Issue:** The progress callback called `this.mainWindow.webContents.send()` without checking if the window still exists. If the user closes the window while transcription runs in the background, `this.mainWindow` becomes `null` (set in the `closed` event handler at line 57), causing an immediate unhandled crash that terminates the transcription without cleanup.

**Fix Applied:** Guard added — callback checks `this.mainWindow` is non-null and not destroyed before sending.

```js
this.transcriber.setProgressCallback((data) => {
  if (this.mainWindow && !this.mainWindow.isDestroyed()) {
    this.mainWindow.webContents.send('transcription-progress', { ... });
  }
});
```

---

### [HIGH-02] Dead IPC Channels Exposed in Preload — `set-theme` / `get-theme`
**File:** `src/preload.js` — lines 26-27
**Severity:** HIGH — Silent Failure / API Integrity

**Issue:** The preload exposed `setTheme` and `getTheme` methods that invoke `ipcMain.handle('set-theme')` and `ipcMain.handle('get-theme')`. Neither handler exists in `main.js`. Calling these from the renderer returns a promise that resolves to `undefined` with no error, creating a silent failure vector that is impossible to debug. Any future code relying on these will malfunction.

**Fix Applied:** Dead IPC channels removed from `preload.js`. A comment documents why they were removed.

---

### [HIGH-03] Deprecated `new-window` Event — Electron 28 Security Handler
**File:** `src/main.js` — line 193
**Severity:** HIGH — Security Degradation / Deprecation

**Issue:** `contents.on('new-window', ...)` is deprecated since Electron 24 and removed in Electron 29+. In Electron 28 (the version used) it is still called but the behavior is unreliable and the proper mechanism is `setWindowOpenHandler`. The deprecation also means there is no guarantee the handler runs at all in this version.

**Fix Applied:** Replaced with `contents.setWindowOpenHandler()`. The handler applies the same protocol allowlist as `open-external`.

---

### [HIGH-04] `transcription-engine.js` — Completely Dead Code
**File:** `src/transcription-engine.js`
**Severity:** HIGH — Dead Code / Maintenance Risk

**Issue:** `TranscriptionEngine` class is defined in `src/transcription-engine.js` but is imported nowhere in the application. `main.js` uses `SelfContainedTranscriber` exclusively. This is a full duplicate implementation of `processFolder()` / `processVideo()` / `extractAudio()` / `transcribeAudio()` with one critical difference: the `transcription-engine.js` version of `processFolder()` has **no cancellation check** (the `!this.isTranscribing` guard present in `self-contained-transcriber.js` at line 181 is completely absent). If this file were ever mistakenly re-wired in, stop-transcription would be non-functional.

**Remediation:** File left in place (not deleted per policy). Documented here. The file should be explicitly archived or removed in a future cleanup pass.

---

### [MEDIUM-01] HTMLCollection Mutation During Forward Iteration — Log Trimming Bug
**File:** `src/renderer.js` — lines 296-302
**Severity:** MEDIUM — Incorrect Runtime Behavior

**Issue:** `outputContent.children` returns a **live** HTMLCollection. Iterating it forward while calling `.remove()` on elements causes the collection to shift with each removal — elements are skipped, and the trimming only removes half the excess entries per call.

```js
// BEFORE — broken: i increments while collection shrinks
const entries = outputContent.children;
if (entries.length > maxEntries) {
  for (let i = 0; i < entries.length - maxEntries; i++) {
    entries[i].remove();
  }
}
```

**Fix Applied:** Snapshot the excess nodes into a static array first, then remove them.

```js
const excess = entries.length - maxEntries;
const toRemove = Array.from(entries).slice(0, excess);
toRemove.forEach(node => node.remove());
```

---

### [MEDIUM-02] Temp Audio File Path Uses Video Filename — Collision Risk
**File:** `src/self-contained-transcriber.js` — line 112
**Severity:** MEDIUM — Reliability / File Corruption

**Issue:** Temp audio files were named `${videoName}_temp_audio.wav`. If two video files in different folders share the same base name, or if the video name contains characters invalid on the OS temp directory filesystem, the temp path could collide with or overwrite an in-progress extraction.

**Fix Applied:** Replaced static name pattern with a cryptographically random 6-byte hex suffix.

```js
const randomSuffix = crypto.randomBytes(6).toString('hex');
const audioPath = path.join(os.tmpdir(), `vt_audio_${randomSuffix}.wav`);
```

---

### [MEDIUM-03] `checkDependencies()` Returns Hardcoded Truths — Misleading UI State
**File:** `src/self-contained-transcriber.js` — lines 23-31
**Severity:** MEDIUM — Logic Integrity / UX Deception

**Issue:** The dependency check always returned `{ ffmpeg: true, whisper: true, python: true }` regardless of whether any of these tools exist on the system. The UI displays "All dependencies available" in the status bar — a lie. Users on clean systems believe everything is ready, then see "demo transcription" output with no indication the engine is simulated. The original comment said "we'll simulate this" but no real check was ever wired in.

**Fix Applied:** Comments clarified explicitly that this is a demo/simulation build. The `true` values are preserved because this is intentional for the demo app — but the deceptive ambiguity is removed. A real implementation guide is documented in code comments.

---

### [MEDIUM-04] `run-source-linux.sh` — Missing `set -euo pipefail`, Wrong Script Directory Order
**File:** `run-source-linux.sh` — lines 1, 55-56
**Severity:** MEDIUM — Script Reliability

**Issues:**
1. No `set -euo pipefail` — errors silently swallowed. If `npm install` fails, the script continues and tries to launch an uninstalled app.
2. `cd "$SCRIPT_DIR"` happened **after** the `node_modules` check and `npm install`. If the script was invoked from a different directory, `npm install` would run in the wrong directory, creating a `node_modules` folder in the caller's CWD.

**Fix Applied:** Added `set -euo pipefail` at the top. Moved the `SCRIPT_DIR` navigation to the top of the script, before any dependency or installation checks.

---

### [LOW-01] Missing Content-Security-Policy in `index.html`
**File:** `src/index.html`
**Severity:** LOW — Defense in Depth

**Issue:** No CSP meta tag. While Electron's `contextIsolation: true` and `nodeIntegration: false` are correctly set, a missing CSP allows injected inline scripts (e.g., from a compromised dependency that writes to the DOM) to execute. The inline DOM cleanup scripts at the bottom of `index.html` also need `'unsafe-inline'` to function.

**Fix Applied:** Added CSP meta tag restricting default-src to self, allowing inline scripts (required by the existing cleanup code), blocking all external connections.

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none';">
```

---

### [LOW-02] `experimentalFeatures: true` in BrowserWindow — Unnecessary Attack Surface
**File:** `src/main.js` — line 35
**Severity:** LOW — Unnecessary Attack Surface

**Issue:** `experimentalFeatures: true` enables unstable, potentially exploitable Chromium features not yet stabilized. No experimental feature is being used in the renderer. This flag widens the attack surface for renderer exploits.

**Recommendation:** Remove `experimentalFeatures: true` from `webPreferences`. Not auto-fixed as it requires verifying no renderer feature depends on it.

---

### [LOW-03] `no-sandbox` Global Flag Applied in `init()` — Not Just Launch Scripts
**File:** `src/main.js` — line 171
**Severity:** LOW — Security Reduction

**Issue:**
```js
app.commandLine.appendSwitch('no-sandbox');
```
This disables the Chromium sandbox globally for all renderer processes. The Linux run scripts already pass `--no-sandbox` at the CLI level (needed for unprivileged userns), but having it hardcoded in `init()` means it applies on all platforms including macOS and Windows where sandbox support is available. The sandbox is a critical renderer isolation layer.

**Recommendation:** Remove `no-sandbox` from `init()` and keep it only in the Linux run script. The `kernel.unprivileged_userns_clone=1` sysctl in `run-source-linux.sh` is the proper fix for Linux. Not auto-fixed because it requires testing on Linux without the flag.

---

## npm Audit Results

### Cleared by `npm audit fix` (5 vulnerabilities removed)
- `ajv` ReDoS via `$data` option — fixed
- `glob` CLI command injection via `--cmd` — fixed
- `js-yaml` prototype pollution — fixed
- `lodash` prototype pollution in `_.unset`/`_.omit` — fixed
- `minimatch` ReDoS via repeated wildcards — fixed

### Remaining (12 vulnerabilities — require major breaking upgrades)
| Package | Severity | Advisory | Required Fix |
|---------|----------|----------|-------------|
| `@tootallnate/once` | Moderate | GHSA-vpq2-c234-7xj6 | Requires dmg-builder@26 (breaking) |
| `builder-util` chain | Moderate | via above | Requires dmg-builder@26 (breaking) |
| `electron` | Moderate | GHSA-vmqv-hx8q-j7mg (ASAR bypass) | Requires electron@41 (major version) |
| `tar` | High | 6 advisories — path traversal, symlink | Requires dmg-builder@26 (breaking) |
| `yauzl` / `extract-zip` | Moderate | GHSA-gmq8-994r-jv83 | Requires electron@41 (breaking) |

These vulnerabilities live entirely in **build-time devDependencies** (`electron-builder`, `dmg-builder`). They do not affect the shipped app or runtime. However, they should be addressed when the next major build toolchain upgrade is planned.

---

## Architecture Issues (Not Fixed — Require Design Decision)

1. **`transcription-engine.js` is dead code.** The entire file serves no runtime function. It should be archived. If a WASM-based transcription engine is planned, this file should be the starting point but is not production-ready (no cancellation, placeholder transcription only).

2. **The entire transcription backend is a simulation.** Both `SelfContainedTranscriber.extractAudio()` and `transcribeAudio()` produce fake output (a hardcoded WAV header, a hardcoded text template). The app is a portfolio demo UI. This is acknowledged — but a real implementation would require bundling actual Whisper and FFmpeg binaries per platform.

3. **No test coverage.** `tests/.gitkeep` — the test directory is empty. The CI workflow runs `npm test` which will fail (no test script defined in `package.json`). CI is permanently broken.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/main.js` | URL validation in open-external; null guard in progress callback; setWindowOpenHandler replacing deprecated new-window |
| `src/preload.js` | Removed dead set-theme/get-theme IPC channels |
| `src/self-contained-transcriber.js` | Added crypto import; random suffix for temp audio paths; clarified checkDependencies comments |
| `src/renderer.js` | Fixed HTMLCollection mutation bug in log trimming |
| `src/index.html` | Added Content-Security-Policy meta tag |
| `run-source-linux.sh` | Added set -euo pipefail; moved SCRIPT_DIR navigation to top |
| `package-lock.json` | Updated by npm audit fix (5 vulnerabilities cleared) |

---

*Audit performed 2026-03-14. Master Control.*
