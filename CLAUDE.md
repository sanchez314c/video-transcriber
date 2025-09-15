# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Video Transcriber is a cross-platform Electron desktop application for batch transcribing video files using OpenAI's Whisper model. The application features a Neo-Noir Glass Monitor dark UI and supports multiple video formats with real-time progress tracking.

## Architecture

Classic Electron architecture with clear separation of concerns:

- **Main Process** (`src/main.js`): Application lifecycle, window management, IPC handlers
- **Renderer Process** (`src/renderer.js`): UI logic and user interactions
- **Preload Script** (`src/preload.js`): Secure IPC bridge between main and renderer
- **Transcription Engines**:
  - `src/self-contained-transcriber.js`: Self-contained transcription workflow
  - `src/transcription-engine.js`: FFmpeg-based audio processing

## Common Development Commands

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Build for current platform
npm run build

# Build for all platforms
npm run dist:all
```

## Quick Launch

```bash
# Linux (preferred)
./run-source-linux.sh

# macOS
./run-source-macos.sh

# Windows
run-source-windows.bat
```

## Project Structure

```
src/
├── main.js                     # Electron main process
├── preload.js                  # Preload script for IPC
├── renderer.js                 # UI logic and event handling
├── index.html                  # Main application UI
├── styles.css                  # Application styling
├── self-contained-transcriber.js
└── transcription-engine.js
resources/
├── icons/                      # Platform-specific icons
└── screenshots/
docs/                           # Full documentation
tests/                          # Test suite
```

## IPC Communication

- `select-folder` — Opens folder selection dialog
- `check-dependencies` — Verifies required dependencies
- `scan-folder` — Scans for video files in a directory
- `start-transcription` — Initiates transcription process
- `stop-transcription` — Stops active transcription

## Security Configuration

- Context Isolation: enabled
- Node Integration: disabled in renderer
- Preload Script: used for safe API exposure
- Chromium flags: `--enable-transparent-visuals`, `--disable-gpu-compositing`, `--no-sandbox`

## Build Configuration

Electron Builder targets:
- **macOS**: DMG, ZIP (x64, arm64)
- **Windows**: NSIS, ZIP (x64, ia32)
- **Linux**: AppImage, DEB, SNAP, ZIP (x64)

## Author

J. Michaels — https://github.com/sanchez314c
