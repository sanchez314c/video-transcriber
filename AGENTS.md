# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Video Transcriber is a cross-platform Electron desktop application for batch transcribing video files using OpenAI's Whisper model. The application provides a modern UI with dark mode support and processes multiple video formats including MP4, AVI, MOV, MKV, FLV, WMV, WebM, M4V, MPG, and MPEG.

## Architecture

The application follows a classic Electron architecture with clear separation of concerns:

- **Main Process** (`src/main.js`): Handles application lifecycle, window management, and IPC communication
- **Renderer Process** (`src/renderer.js`): Manages the UI and user interactions
- **Preload Script** (`src/preload.js`): Provides secure bridge between main and renderer processes
- **Transcription Engines**:
  - `src/self-contained-transcriber.js`: Self-contained implementation with simulated functionality
  - `src/transcription-engine.js`: FFmpeg-based audio processing using @ffmpeg/ffmpeg

## Common Development Commands

### Running the Application
```bash
# Development mode with hot reload and dev tools
npm run dev

# Production mode
npm start
```

### Building Applications
```bash
# Build for current platform
npm run build
npm run dist

# Platform-specific builds
npm run build:mac              # macOS (Intel + ARM)
npm run build:mac-intel        # macOS Intel only
npm run build:mac-arm          # macOS Apple Silicon only
npm run build:mac-universal     # macOS Universal binary
npm run build:win              # Windows
npm run build:linux            # Linux

# Build for all platforms
npm run dist:all
```

### Build Outputs
Built applications are located in the `dist/` directory:
- **macOS**: `Video Transcriber-*.dmg` and `Video Transcriber.app`
- **Windows**: `Video Transcriber Setup *.exe`
- **Linux**: `Video Transcriber-*.AppImage` and `*.deb` packages

## Key Dependencies

### Core Dependencies
- **electron**: Cross-platform desktop framework
- **@ffmpeg/ffmpeg**: WebAssembly-based FFmpeg for audio processing
- **@ffmpeg/core**: FFmpeg WebAssembly core
- **fs-extra**: Enhanced file system operations
- **which**: Cross-platform executable finder

### Development Dependencies
- **electron-builder**: Application packaging and distribution
- **dmg-builder**: macOS DMG creation

## Project Structure

```
src/
├── main.js                    # Electron main process
├── preload.js                 # Preload script for IPC
├── renderer.js                # UI logic and event handling
├── index.html                 # Main application UI
├── styles.css                 # Application styling
├── self-contained-transcriber.js  # Self-contained transcription (simulated)
└── transcription-engine.js     # FFmpeg-based transcription
```

## IPC Communication Patterns

The application uses Electron's IPC (Inter-Process Communication) for secure communication between main and renderer processes:

- **select-folder**: Opens folder selection dialog
- **check-dependencies**: Verifies required dependencies
- **scan-folder**: Scans for video files in selected folder
- **start-transcription**: Initiates transcription process
- **stop-transcription`: Stops active transcription

## Security Configuration

The application follows Electron security best practices:
- **Context Isolation**: Enabled
- **Node Integration**: Disabled in renderer process
- **Preload Script**: Used for secure API exposure

## Build Configuration

Electron Builder is configured for:
- **Multi-platform support**: Windows, macOS, Linux
- **Universal macOS binaries**: Support for both Intel and Apple Silicon
- **Multiple target formats**: DMG/ZIP (macOS), NSIS/ZIP (Windows), AppImage/DEB/SNAP (Linux)
- **Icon management**: Platform-specific icons in `build_resources/icons/`

## Transcription Process

1. User selects folder containing video files
2. Application scans for supported video formats
3. Audio is extracted from video files using FFmpeg
4. Audio is processed through Whisper model for transcription
5. Results are saved as text files alongside original videos

## Development Notes

- The `self-contained-transcriber.js` currently contains simulated functionality
- Real Whisper integration would require Python subprocess execution or bundled binaries
- FFmpeg operations use WebAssembly version in renderer process
- Application supports multiple Whisper models (tiny, base, small, medium, large)

## Platform-Specific Considerations

- **macOS**: Uses hiddenInset title bar style, supports universal binaries
- **Windows**: Includes NSIS installer with proper publisher name
- **Linux**: Includes dependencies for GTK libraries and accessibility features