# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-21 — Real Whisper + API Stack LITE

### Added — Real Transcription Engine

- Replaced simulated `src/self-contained-transcriber.js` with real ffmpeg + whisper.cpp pipeline. Previous implementation wrote 44-byte dummy WAV and returned hardcoded placeholder text; new implementation spawns real binaries and produces actual transcripts.
- Added `nodejs-whisper@0.3.0` + `ffmpeg-static@5.3.0` dependencies. whisper.cpp compiled from source via cmake (built to `node_modules/nodejs-whisper/cpp/whisper.cpp/build/bin/whisper-cli`).
- Downloaded `ggml-base.en.bin` (141MB) to `models/` directory. `.gitignore` rules updated to keep model binaries out of the repo.
- End-to-end validation: 5/5 expected words detected in test video transcript (espeak-generated 8s sample, base.en model, 296ms latency).
- Binary resolution order: `resources/binaries/<platform>/`, packaged `process.resourcesPath`, then `node_modules/nodejs-whisper/.../build/bin/`. ffmpeg resolves via `ffmpeg-static` package path first, then bundled binaries.
- Added unhandled-rejection + uncaught-exception handlers around new spawn-based pipeline.

### Added — URL Download Support (in progress)

- Bundled yt-dlp binary per platform at `resources/binaries/{linux,macos,win}/yt-dlp[.exe]` (downloaded from github.com/yt-dlp/yt-dlp releases, version 2026.03.17).
- `scripts/download-binaries.js` postinstall script — fetches correct yt-dlp binary for end-user's platform on `npm install`. Idempotent, skips when binary already present.
- New module `src/transcript-formatter.js` — pure functions for VTT/SRT → paragraphed markdown conversion. Dedupes overlapping cues, sentence-segments via regex, groups into paragraphs, emits markdown with YAML frontmatter (source_url, platform, title, author, duration, captured_at, word_count, caption_type).

### Added — API Stack LITE v2.0.0

- New `src/api-stack/` module — Universal Provider Stack with 17 providers: Anthropic (API), Anthropic (Auth), DeepSeek, Groq, HuggingFace, META, Mistral, Moonshot, nVidia, Ollama (Local), OpenAI, OpenRouter, Perplexity, Pi.ai, Together.AI, xAI, Z.ai. Z.ai is the default provider.
- Provider registry at `src/api-stack/providers.js` — per-provider base URL, endpoint paths, stream format, auth header, token-field-name mapping (handles `max_tokens` vs `max_completion_tokens` vs `num_predict` vs `max_output_tokens` vs `max_new_tokens`).
- Key resolution at `src/api-stack/key-resolver.js` — order: settings override > env var (from shell) > empty. Sensitive field masking regex.
- Settings persistence at `src/api-stack/settings-store.js` — plain JSON in Electron `app.getPath('userData')`. LITE variant does not encrypt (local-only desktop).
- Anthropic OAuth at `src/api-stack/anthropic-oauth.js` — resolution chain: `CLAUDE_CODE_OAUTH_TOKEN` env > in-memory cache > `~/.claude/.credentials.json` (`claudeAiOauth.accessToken`). Headers `Authorization: Bearer`, `anthropic-version: 2023-06-01`, `anthropic-beta: oauth-2025-04-20`. Endpoint suffix `?beta=true`.
- Dynamic model fetcher at `src/api-stack/model-fetcher.js` — normalized to `{id, displayName, contextLength?, capabilities?}`, sorted alphabetical, 5-minute session cache, OpenAI + Ollama NDJSON + Anthropic shapes handled.
- Stream parsers at `src/api-stack/streaming.js` — SSE (default), NDJSON (Ollama), Anthropic `content_block_delta` event stream.
- Chat completion at `src/api-stack/chat-completion.js` — `createChatCompletion` async iterable. Defaults temperature 0.7, max_tokens 4096. Per-provider body shape (Anthropic uses `system` field, Ollama nests params in `options:{}`).
- Test probe at `src/api-stack/test-provider.js` — 15s timeout, 2s per-provider cooldown, error classification (auth/rate/server/offline/timeout/unknown), latency measurement in wall-clock ms.
- Public API at `src/api-stack/index.js` — `getActiveProvider`, `getActiveModel`, `getProviderKeys`, `createChatCompletion`, `testProvider`, `listProviders`, `fetchModels`, `refreshEnvVars`, `getAboutInfo`, `saveSettings`, `onConfigChange`.
- AI Modal UI in `src/index.html` + `src/styles.css` + `src/ai-modal.js`:
  - Top-bar sparkle icon (`#ai-btn`) next to existing about button
  - 2-tab modal (Providers, About) — LITE variant, no Parameters tab
  - Per-provider card: enable toggle, API key input with Show/Hide/Clear/Save, base URL override, test model dropdown, Test button with state mutation (Test → Testing… → ✓ 342ms / ✗ 401 Auth), 10s auto-revert, 2s cooldown
  - Test All button for parallel probes
  - About tab: spec version, configured/total counts, paths, Refresh Model Cache / Re-scan Env Vars / Export Settings / Import Settings buttons
- 8 new IPC channels under `api-stack:*` namespace (main.js + preload.js + window.aiStack bridge). WIRE_AUDIT.md updated: 11 core + 8 api-stack = 19 total.

### Validated

- All 9 new api-stack modules pass `node -c` syntax check.
- `npx eslint src/` returns clean — 0 errors, 0 warnings.
- Live end-to-end: 17 providers registered, alphabetical, Z.ai default. Anthropic OAuth auto-resolved from `~/.claude/.credentials.json`. Groq model fetch returned 16 models. Groq ping test returned 200 OK in 296ms (real API round trip, not mocked).

### Migrated

- `.eslintrc.json` → `eslint.config.js` (ESLint v9 flat config). Added `@eslint/js` + `globals` devDeps.

## [1.0.5] - 2026-04-11 — Code Audit & Remediation

### Security

- **HIGH**: Documented Electron 28 vulnerabilities (17 CVEs) — requires manual upgrade to Electron 41.2.0
- **HIGH**: Documented tar package vulnerabilities (6 CVEs) — requires manual upgrade to dmg-builder 26.8.1
- **MEDIUM**: Documented Linux sandbox disabled for transparency workaround
- Generated package-lock.json for reproducible installs

### Code Quality

- Created `src/constants.js` — extracted duplicate VIDEO_EXTENSIONS array
- Updated `src/main.js` — import VIDEO_EXTENSIONS from constants
- Updated `src/self-contained-transcriber.js` — import VIDEO_EXTENSIONS from constants
- Fixed `src/main.js` — added folder path validation to scan-folder IPC handler (type check, absolute path check, path traversal block)
- Fixed `src/main.js` — changed error throw from plain object to Error instance
- Fixed `src/self-contained-transcriber.js` — removed redundant pathExists() check before unlink()
- Fixed `src/renderer.js` — prefixed unused event parameter with underscore

### Developer Tooling

- Added `.eslintrc.json` — ESLint configuration for automated linting
- Added `.prettierrc` — Prettier configuration for consistent formatting
- Added `.editorconfig` — Editor standardization (indentation, line endings)
- Updated `.gitignore` — added `*.backup.*` pattern

### Project Hygiene

- Moved all `.backup.*` files from `src/` to `archive/src-backups-20260314/`
- Created `AUDIT_REPORT.md` — comprehensive forensic audit (30 findings documented)

### Dependency Health

- Ran `npm audit` — 14 vulnerabilities found (4 low, 1 moderate, 9 high)
- All high-severity vulnerabilities require manual Electron 41 + dmg-builder 26.8.1 upgrade
- Generated package-lock.json for security auditing

### Documentation

- Created `AUDIT_REPORT.md` — full codebase audit with findings by severity and file
- Documented all 30 findings (0 critical, 13 high, 2 medium, 15 low)

### Notes

- **BREAKING CHANGE REQUIRED**: Upgrade to Electron 41.2.0 (fixes 17 security vulnerabilities)
- **BREAKING CHANGE REQUIRED**: Upgrade dmg-builder to 26.8.1 (fixes 6 tar vulnerabilities)
- App remains in demo/simulation mode — dependency checks return hardcoded true values
- All code fixes applied and tested — syntax validation passed

## [1.0.4] - 2026-04-11 — Documentation Standardization

### Documentation

- Generated comprehensive PRD.md via /repoprdgen (16 sections, ~900 lines)
- Standardized documentation to portfolio 27-file standard via /repodocs
- Created GitHub issue templates (bug_report.md, feature_request.md)
- Created docs/README.md as documentation index
- Archived duplicate governance files from docs/ (now only at root)
- Archived redundant root-level docs (ARCHITECTURE.md, SETUP.md)

### Pipeline

- Executed full repo pipeline: repoprdgen, repodocs
- All 27 standard documentation files now present
- Documentation index links to all 15 docs/ files

## [1.0.3] - 2026-03-14 — Security & Quality Audit

### Security Fixed

- **CRITICAL** `src/main.js`: `open-external` IPC handler now validates URL with `new URL()` and allowlists `https:`/`http:` protocols only — prevents protocol injection via `file://`, `shell:`, or OS-registered custom protocols
- **HIGH** `src/main.js`: Replaced deprecated `new-window` event with `setWindowOpenHandler()` (Electron 28 compatible, same protocol allowlist applied)
- `src/index.html`: Added Content-Security-Policy meta tag — `default-src 'self'`, no external connections

### Bugs Fixed

- **HIGH** `src/main.js`: Added null-guard (`this.mainWindow && !this.mainWindow.isDestroyed()`) to progress callback — prevents crash when window is closed during active transcription
- **HIGH** `src/preload.js`: Removed dead `set-theme`/`get-theme` IPC channel exposure — no handler exists in main process; was causing silent unresolved promises
- **MEDIUM** `src/renderer.js`: Fixed HTMLCollection live mutation bug in log trimming — forward iteration while calling `.remove()` skipped elements; replaced with static array snapshot before removal
- **MEDIUM** `src/self-contained-transcriber.js`: Temp audio files now use a cryptographically random 6-byte hex suffix instead of video filename — prevents path collisions and special-character path issues

### Code Quality

- `src/self-contained-transcriber.js`: Clarified `checkDependencies()` comments — explicitly documented that all checks are demo simulations, not real binary detection
- `run-source-linux.sh`: Added `set -euo pipefail`; moved `SCRIPT_DIR` navigation to top of script so all subsequent commands run in the correct directory

### Dependencies

- Ran `npm audit fix` — cleared 5 non-breaking vulnerabilities: `ajv` ReDoS, `glob` CLI injection, `js-yaml` prototype pollution, `lodash` prototype pollution, `minimatch` ReDoS
- 12 vulnerabilities remain — all in build-time devDependencies, all require major version breaking changes (electron@41, dmg-builder@26); documented in AUDIT_REPORT.md

### Documented (Not Auto-Fixed)

- `src/main.js` line 171: `no-sandbox` commandLine switch applied globally — recommend removing and using Linux run script flag only
- `src/main.js` line 35: `experimentalFeatures: true` in webPreferences — unnecessary attack surface, recommend removal
- `src/transcription-engine.js`: Entirely dead code — never imported, should be archived

## [1.0.2] - 2026-02-07 01:45

### Changed

- Complete UI restyle to Neo-Noir Glass Monitor design system
- Frameless transparent window with 16px floating gap around app container
- Glassmorphism cards with teal accent color system (#14b8a6)
- 95+ CSS design tokens for consistent theming
- Custom close button replacing OS title bar (X button, top-right)
- Header acts as drag handle for frameless window
- Gradient title with "Video" + teal "Transcriber" accent text
- Dark void background (#0a0b0e) with glass card panels
- Teal gradient progress bar replacing blue
- Destructive-style stop button (red outlined glass)
- Status dot indicator in footer (green glow = online, red = error)
- Custom styled select dropdown with SVG chevron
- 6px thin scrollbars, dark thumb on transparent track
- Removed theme toggle (permanently dark Neo-Noir)

## [1.0.1] - 2026-02-07 02:15

### Fixed

- Fixed `command_exists` undefined function corruption in `run-source-linux.sh` → replaced with `command -v`
- Added Electron sandbox fix (`kernel.unprivileged_userns_clone=1`) to Linux run script
- Added script directory navigation (`cd $SCRIPT_DIR`) to prevent path-dependent failures
- Fixed npm script detection to match actual package.json scripts (`dev`, `start`)
- Added multi-core build support via `UV_THREADPOOL_SIZE=$(nproc)`
- Applied .gitignore optimizations: added `legacy/`, `build/`, `dist_electron/`, `build-temp/`, `._*`, consolidated `.env.*.local`

## [1.0.0] - 2024-09-XX

### Added

- Initial release of Video Transcriber
- Cross-platform video transcription using OpenAI Whisper
- Support for multiple video formats (MP4, AVI, MOV, MKV, etc.)
- Audio extraction and processing with FFmpeg
- Real-time transcription progress
- Export transcriptions to SRT, VTT, TXT formats
- Batch processing capabilities
- Modern Electron-based desktop interface
- Dark/light theme support
- Keyboard shortcuts and accessibility features

### Features

- Drag and drop video files for transcription
- Real-time preview of transcription progress
- Multiple language support for Whisper models
- Custom model selection (base, small, medium, large)
- GPU acceleration support
- Export options for different subtitle formats
- Search and highlight within transcriptions

### Technical

- Built with Electron 28.0.0
- Uses FFmpeg for audio processing
- OpenAI Whisper integration
- Cross-platform build configuration with electron-builder
- Icon support for macOS (.icns), Windows (.ico), and Linux (.png)

## [2026-02-07 02:15:00] - Neo-Noir Glass Theme Applied

### UI/UX Enhancement

- Applied Neo-Noir Glass Monitor theme based on Llama Wrangler reference design
- Updated color palette to match reference: #121212 primary, #1E1E1E cards, #10B981 teal accent
- Enhanced glass effects with 12px backdrop blur and 80-85% opacity
- Refined border radius: 14px cards, 9px buttons, 8px inputs
- Updated typography to Inter/SF Pro Display with proper sizing hierarchy
- Enhanced shadows and glow effects for depth and focus states
- Improved button hover states with subtle elevation
- Updated notification toasts with gradient backgrounds matching theme

### Technical Details

- CSS custom properties for easy theming and maintenance
- Maintained responsive design for mobile viewport
- Preserved all existing functionality while enhancing visual design
