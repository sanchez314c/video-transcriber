# AGENTS.md

This file provides guidance to AI agents working with the Video Transcriber codebase.

## Project Overview

**Video Transcriber** is a cross-platform Electron desktop application that batch transcribes video files using OpenAI's Whisper model. It features a Neo-Noir Glass Monitor dark UI with real-time progress tracking.

## Core Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start

# Build for current platform
npm run dist:current

# Build for all platforms
npm run dist:all
```

## Quick Launch Scripts

```bash
./run-source-linux.sh      # Linux
./run-source-macos.sh      # macOS
run-source-windows.bat     # Windows
```

## Architecture Overview

| File | Role |
|------|------|
| `src/main.js` | Electron main process, IPC handlers, window lifecycle |
| `src/renderer.js` | UI controller, event handling, theme management |
| `src/preload.js` | Secure IPC bridge |
| `src/index.html` | App UI structure |
| `src/styles.css` | Styling |
| `src/self-contained-transcriber.js` | Transcription workflow |
| `src/transcription-engine.js` | FFmpeg-based audio processing |

## IPC Channels

- `select-folder` — Folder picker dialog
- `check-dependencies` — Verify FFmpeg/Whisper/Python presence
- `scan-folder` — List video files in a directory
- `start-transcription` — Begin batch transcription
- `stop-transcription` — Cancel active transcription
- `open-external` — Open URL in system browser
- `get-app-version` — Return app version string

## Whisper Model Options

| Model | Size | Speed |
|-------|------|-------|
| tiny | 39MB | Fastest |
| base | 74MB | Balanced (default) |
| small | 244MB | Good accuracy |
| medium | 769MB | High accuracy |
| large | 1550MB | Best accuracy |

## Supported Video Formats

MP4, AVI, MOV, MKV, FLV, WMV, WebM, M4V, MPG, MPEG

## Security Rules

- Never enable `nodeIntegration` in renderer
- Always keep `contextIsolation: true`
- All user-facing APIs must go through preload.js
- No eval() or dynamic code execution in renderer

## Build Outputs

- **macOS**: `dist/Video Transcriber-*.dmg`
- **Windows**: `dist/Video Transcriber Setup *.exe`
- **Linux**: `dist/Video Transcriber-*.AppImage`, `*.deb`

## Known Limitations

1. `self-contained-transcriber.js` contains demo/simulated functionality
2. No actual Whisper model bundled — requires Python + whisper installed
3. FFmpeg uses WebAssembly in renderer (not native binary)

## Agent Guidelines

- Read entire files before editing
- Do not auto-open DevTools (already commented out in main.js)
- Never add `--disable-gpu` flags (forbidden)
- Chromium flags are injected before `app.whenReady()` in `init()`
- Keep `--no-sandbox` in all electron launch scripts

## Author

J. Michaels — https://github.com/sanchez314c
