# Video Transcriber

A cross-platform desktop app for batch transcribing video files using OpenAI Whisper. Built with Electron, styled with the Neo-Noir Glass Monitor design system.

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20|%20Windows%20|%20Linux-lightgrey)](https://github.com/sanchez314c/VideoTranscriber/releases)

## What It Does

Point it at a folder, pick a Whisper model, hit Start. It extracts audio from each video file and runs it through Whisper, saving `.txt` transcripts alongside the source files. Progress streams live to the output log.

> **Note:** The current build ships with a simulated transcription backend for UI/workflow demonstration purposes. See [implement.md](implement.md) for the real Whisper integration roadmap.

## Features

- Batch process an entire folder of videos in one run
- Five Whisper model sizes: tiny, base, small, medium, large
- Supported formats: MP4, AVI, MOV, MKV, FLV, WMV, WebM, M4V, MPG, MPEG
- Live output log with timestamped status messages
- Save or clear the log at any time
- Stop a batch mid-run without crashing
- Neo-Noir Glass Monitor UI — frameless, dark, teal accent, drag-to-move header
- Dependency status indicator in the footer
- Runs on macOS, Windows, and Linux

## Tech Stack

- **Electron 28** — desktop shell
- **Node.js** — main process (file I/O, IPC, transcription orchestration)
- **@ffmpeg/ffmpeg 0.12** — WebAssembly FFmpeg for audio extraction
- **fs-extra** — file system helpers
- **electron-builder** — packaging for all platforms

## Quick Start

```bash
git clone https://github.com/sanchez314c/VideoTranscriber.git
cd VideoTranscriber
npm install
```

**Linux:**

```bash
./run-source-linux.sh
```

**macOS:**

```bash
./run-source-macos.sh
```

**Windows:**

```bat
run-source-windows.bat
```

Or directly:

```bash
npm run dev     # development mode with hot reload
npm start       # production mode
```

## Installation

See [SETUP.md](SETUP.md) for full prerequisites and platform-specific setup instructions.

## Usage

1. Click **Browse** to select a folder containing video files.
2. The app scans the folder and shows how many videos it found.
3. Pick a **Whisper model** from the dropdown. Base is a good default.
4. Click **Start Transcription**.
5. Watch the output log. Each file gets a `.txt` transcript saved next to it.
6. Click **Stop** to cancel mid-batch.

### Whisper Model Reference

| Model  | Size    | Speed   | Best For                   |
| ------ | ------- | ------- | -------------------------- |
| tiny   | 39 MB   | Fastest | Quick drafts, testing      |
| base   | 74 MB   | Fast    | General use (default)      |
| small  | 244 MB  | Medium  | Better accuracy            |
| medium | 769 MB  | Slower  | High accuracy              |
| large  | 1550 MB | Slowest | Professional transcription |

## Building a Distributable

```bash
# Current platform
npm run build

# Specific platform
npm run build:mac
npm run build:win
npm run build:linux

# All platforms
npm run dist:all
```

Output goes to the `dist/` folder:

- macOS: `.dmg` and `.app`
- Windows: NSIS installer `.exe` and `.zip`
- Linux: `.AppImage`, `.deb`, `.snap`, `.zip`

## Project Structure

```
video-transcriber/
├── src/
│   ├── main.js                      # Electron main process, IPC handlers
│   ├── preload.js                   # Context bridge (renderer <-> main)
│   ├── renderer.js                  # UI logic, event handlers
│   ├── index.html                   # App HTML
│   ├── styles.css                   # Neo-Noir Glass design tokens + layout
│   ├── self-contained-transcriber.js # Active transcription engine
│   └── transcription-engine.js      # Alt engine (WebAssembly FFmpeg path)
├── docs/                            # Extended documentation
├── resources/                       # Icons and screenshots
├── dev/                             # Dev helper scripts
├── archive/                         # Archived/backup files
├── run-source-linux.sh
├── run-source-macos.sh
├── run-source-windows.bat
└── package.json
```

## Configuration

No config file needed. All settings are made in the UI. The app reads from `package.json` for version info and uses the platform's default temp directory for intermediate audio files during processing.

## Troubleshooting

**App won't launch on Linux (sandbox error)**

The run script handles this automatically, but you can also run manually:

```bash
sudo sysctl -w kernel.unprivileged_userns_clone=1
npm start
```

**No video files found**

Check that your files have one of the supported extensions: `.mp4`, `.avi`, `.mov`, `.mkv`, `.flv`, `.wmv`, `.webm`, `.m4v`, `.mpg`, `.mpeg`.

**Transcription is slow**

Try a smaller model. The `tiny` and `base` models run several times faster than `large` with acceptable accuracy for most use cases.

**Dependency check shows errors**

The current build simulates dependencies as available. When the real Whisper backend is wired up, this check will validate your Python environment and FFmpeg installation.

## Contributing

PRs welcome. Open an issue first for anything beyond a small fix so we can align on the approach before you write code.

## License

MIT. See [LICENSE](LICENSE).
