# Wire Audit Report — Video Transcriber

**Date**: 2026-04-21 (updated with API Stack LITE channels)
**Stack**: Electron 28.3.3 desktop app
**Wire surface**: IPC channels renderer <-> preload <-> main <-> transcription engine + AI provider stack

---

## Full Wire Inventory

### Core Channels (10 invoke + 1 event = 11 total)

| # | Channel | Type | Renderer Call | Preload Expose | Main Handler | Engine | Status |
|---|---------|------|---------------|----------------|--------------|--------|--------|
| 1 | `window-minimize` | invoke | renderer.js:25 | preload.js:7 | main.js:67 | -- | OK |
| 2 | `window-maximize` | invoke | renderer.js:28 | preload.js:8 | main.js:71 | -- | OK |
| 3 | `window-close` | invoke | renderer.js:31 | preload.js:9 | main.js:77 | -- | OK |
| 4 | `select-folder` | invoke | renderer.js:127 | preload.js:12 | main.js:82 | -- | OK |
| 5 | `scan-folder` | invoke | renderer.js:148 | preload.js:13 | main.js:105 | -- | OK |
| 6 | `check-dependencies` | invoke | renderer.js:173 | preload.js:16 | main.js:94 | engine.checkDependencies():27 | OK |
| 7 | `start-transcription` | invoke | renderer.js:265 | preload.js:19 | main.js:148 | engine.setProgressCallback():17 + engine.processFolder():194 | OK |
| 8 | `stop-transcription` | invoke | renderer.js:281 | preload.js:20 | main.js:200 | engine.stop():255 | OK |
| 9 | `open-external` | invoke | renderer.js:71 | preload.js:28 | main.js:210 | -- | OK |
| 10 | `get-app-version` | invoke | renderer.js:217 | preload.js:29 | main.js:228 | -- | OK |
| 11 | `transcription-progress` | event (main->renderer) | renderer.js:112 (listener) | preload.js:23 (bridge) | main.js:175 (sender) | engine.log() -> callback -> send | OK |

### API Stack LITE v2.0.0 Channels (8 total, added 2026-04-21)

| # | Channel | Type | Renderer Call (via window.aiStack) | Preload Expose | Main Handler | Module | Status |
|---|---------|------|-----------------------------------|----------------|--------------|--------|--------|
| 12 | `api-stack:list-providers` | invoke | `listProviders()` | preload.js | main.js `api-stack:list-providers` | api-stack/providers.js | OK |
| 13 | `api-stack:get-settings` | invoke | `getSettings()` | preload.js | main.js `api-stack:get-settings` | api-stack/settings-store.js | OK |
| 14 | `api-stack:save-settings` | invoke | `saveSettings(payload)` | preload.js | main.js `api-stack:save-settings` | api-stack/settings-store.js | OK |
| 15 | `api-stack:fetch-models` | invoke | `fetchModels(providerId, opts)` | preload.js | main.js `api-stack:fetch-models` | api-stack/model-fetcher.js | OK |
| 16 | `api-stack:test-provider` | invoke | `testProvider(providerId, modelId)` | preload.js | main.js `api-stack:test-provider` | api-stack/test-provider.js | OK |
| 17 | `api-stack:chat-completion` | invoke + event stream | `chatCompletion(payload)` + `onChatDelta/onChatEnd` | preload.js | main.js `api-stack:chat-completion` emits `api-stack:chat-delta` + `api-stack:chat-end` | api-stack/chat-completion.js | OK |
| 18 | `api-stack:refresh-env-vars` | invoke | `refreshEnvVars()` | preload.js | main.js `api-stack:refresh-env-vars` | api-stack/index.js | OK |
| 19 | `api-stack:get-about-info` | invoke | `getAboutInfo()` | preload.js | main.js `api-stack:get-about-info` | api-stack/index.js | OK |

**Total wire count**: 19 (11 core + 8 api-stack)

### Engine Internal Call Chain

| # | Engine Method | Called By | Purpose |
|---|---------------|-----------|---------|
| E1 | `checkDependencies()` | main.js:96 (via M5) | Returns dependency status |
| E2 | `setProgressCallback(cb)` | main.js:173 (via M7) | Registers progress callback |
| E3 | `processFolder(path, model)` | main.js:185 (via M7) | Batch transcribe folder |
| E4 | `stop()` | main.js:203 (via M8) | Cancel transcription |
| E5 | `processVideo(path, dir, model)` | processFolder():226 (internal) | Single video pipeline |
| E6 | `extractAudio(video, audio)` | processVideo():158 (internal) | Audio extraction (simulated) |
| E7 | `transcribeAudio(audio, model)` | processVideo():164 (internal) | Transcription (simulated) |
| E8 | `log(msg, type)` | All methods | Emits progress via callback |

---

## Issues Found

### Orphan: `removeTranscriptionProgressListener` (preload.js:24-25)
- **Type**: Dead preload exposure
- **Detail**: `contextBridge` exposed `removeTranscriptionProgressListener` wrapping `ipcRenderer.removeListener('transcription-progress', callback)`. No renderer code calls it. The `onTranscriptionProgress` listener is registered once at init and never removed — no cleanup needed since the renderer process lifecycle matches the app lifecycle.
- **Fix**: Removed from preload.js.

### Dead Import: `_spawn` (self-contained-transcriber.js:7)
- **Type**: Unused variable
- **Detail**: `const { spawn: _spawn } = require('child_process')` imported with underscore convention indicating planned use, but never referenced. The engine uses `setTimeout` for simulation, not child processes.
- **Fix**: Removed import and comment.

### Stale Doc: `transcription-engine.js` (CLAUDE.md)
- **Type**: Phantom file reference
- **Detail**: CLAUDE.md Architecture section and Project Structure both listed `src/transcription-engine.js: FFmpeg-based audio processing`. File does not exist. Only `self-contained-transcriber.js` exists and handles all transcription.
- **Fix**: Removed references, updated CLAUDE.md architecture section and file tree.

---

## Fixes Applied

| # | File | Edit | Lines Affected |
|---|------|------|----------------|
| F1 | src/preload.js | Removed `removeTranscriptionProgressListener` exposure | Was lines 24-25 |
| F2 | src/self-contained-transcriber.js | Removed unused `child_process` import and comment | Was lines 5-7 |
| F3 | CLAUDE.md | Removed `transcription-engine.js` from Architecture section | Was line 18 |
| F4 | CLAUDE.md | Replaced phantom file in Project Structure tree with `constants.js` | Was line 59 |
| F5 | CLAUDE.md | Added missing IPC channels to IPC Communication section | Lines 69-74 expanded |

---

## Validation Summary

- **Total IPC channels**: 11 (10 invoke/handle + 1 event listener)
- **Channels verified end-to-end**: 11/11
- **Orphan handlers removed**: 1 (`removeTranscriptionProgressListener`)
- **Dead imports removed**: 1 (`child_process._spawn`)
- **Stale doc references fixed**: 2 (CLAUDE.md architecture + file tree)
- **Broken wires**: 0
- **Missing links**: 0

**Result**: All 11 active IPC channels trace cleanly from renderer through preload to main to engine and back. No broken mid-chain wires. No orphan handlers. No phantom calls.

---

*Wire audit completed 2026-04-17.*
