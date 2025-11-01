# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Video Transcriber** is a cross-platform desktop application built with Electron that batch transcribes video files using OpenAI's Whisper model. The app features a modern dark mode UI and supports various video formats with real-time progress tracking.

## Core Commands

### Development
```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Run standard mode
npm start
```

### Building Applications
```bash
# Build for current platform
npm run dist:current

# Build for all platforms
npm run dist:all

# Platform-specific builds
npm run dist:mac              # macOS (DMG, ZIP, universal)
npm run dist:mac-intel        # macOS Intel only
npm run dist:mac-arm          # macOS Apple Silicon only
npm run dist:mac-universal     # macOS universal binary
npm run dist:win              # Windows (NSIS installer, ZIP)
npm run dist:win:msi          # Windows MSI installer
npm run dist:linux            # Linux (AppImage, DEB, SNAP, ZIP)

# Create unpacked build for testing
npm run pack
```

### Quick Launch Scripts
```bash
# Platform-specific source runners
./run-source-macos.sh      # macOS
./run-source-linux.sh      # Linux
```

## Architecture Overview

### Main Components

**`src/main.js`**: Electron main process
- Application lifecycle management
- IPC handlers for file operations and transcription
- Integration with SelfContainedTranscriber
- Window management and menu setup

**`src/self-contained-transcriber.js`**: Transcription engine
- Handles video processing workflow
- Audio extraction simulation (currently demo implementation)
- Progress tracking and logging
- Dependency checking (simulated for demo)

**`src/renderer.js`**: UI controller
- Theme management (dark/light mode)
- Event handling for user interactions
- Progress display and logging
- File selection and batch processing

**`src/index.html`**: Application UI structure
- Dark mode optimized interface
- File browser and selection
- Model selection controls
- Progress display area

**`src/preload.js`**: Security bridge
- IPC communication between main and renderer
- Safe API exposure to frontend

### Key Design Patterns

**Modular Architecture**:
- Separation of concerns between UI, transcription engine, and file operations
- Self-contained transcription engine that can be swapped out
- Theme system with persistent storage

**IPC Communication**:
- Async communication for file operations
- Progress callbacks for real-time updates
- Error handling across process boundaries

**Progress Tracking**:
- Real-time progress updates during transcription
- Detailed logging system
- User feedback for all operations

## Configuration Management

### Whisper Models
The application supports all Whisper models:
- **tiny** (39MB): Fastest, good for quick drafts
- **base** (74MB): Balanced performance (default)
- **small** (244MB): Good accuracy
- **medium** (769MB): High accuracy
- **large** (1550MB): Best accuracy, professional use

### Supported Video Formats
MP4, AVI, MOV, MKV, FLV, WMV, WebM, M4V, MPG, MPEG

## Build System

### Electron Builder Configuration

**Multi-Platform Support**:
- **macOS**: DMG, ZIP, universal binaries (x64, ARM64)
- **Windows**: NSIS installer, MSI, ZIP (x64, ia32)
- **Linux**: AppImage, DEB, SNAP, ZIP (x64)

**Key Features**:
- No code signing (identity: null) - for development builds
- Hardened runtime disabled
- FFmpeg dependencies bundled
- Cross-platform icon support

**File Inclusions**:
- Source files in `src/`
- Assets in `assets/`
- FFmpeg binaries in `binaries/`
- Node modules for FFmpeg

## Current Implementation Status

### Demo Mode Features
The current implementation includes:
- Complete UI with dark/light theme toggle
- File browser and folder selection
- Progress tracking system
- Model selection interface
- Cross-platform window management

### Placeholder Implementations
- Audio extraction creates dummy WAV files
- Transcription is simulated with progress updates
- Dependency checking returns hardcoded results
- No actual Whisper model integration

### To Make Fully Functional
1. Implement actual FFmpeg integration in `self-contained-transcriber.js`
2. Add Whisper model loading and execution
3. Replace placeholder dependency checking
4. Bundle actual FFmpeg binaries for each platform

## Development Guidelines

### Adding New Features
1. UI changes: Update `renderer.js` and `index.html`
2. Backend logic: Update `self-contained-transcriber.js`
3. IPC communication: Update `main.js` and `preload.js`
4. Styling: Update `styles.css`

### Testing
1. Use `npm run dev` for development with hot reload
2. Test theme switching functionality
3. Verify file browser works across platforms
4. Test progress callbacks during simulated transcription

### Platform-Specific Notes
- **macOS**: Uses hidden inset title bar style
- **Windows/ Linux**: Uses default title bar
- All platforms support theme persistence in localStorage

## Build Output Locations

After building:
- **macOS**: `dist/Video Transcriber-*.dmg`, `dist/Video Transcriber-*.zip`, `dist/mac*/Video Transcriber.app`
- **Windows**: `dist/Video Transcriber Setup *.exe`, `dist/Video Transcriber-*.msi`
- **Linux**: `dist/Video Transcriber-*.AppImage`, `dist/*.deb`, `dist/*.snap`

## Known Limitations

1. **FFmpeg Integration**: Currently simulated, needs actual binary bundling
2. **Whisper Models**: No actual AI model integration
3. **Dependencies**: Hardcoded dependency checking
4. **Audio Extraction**: Creates placeholder files only

## Future Enhements

1. Implement actual Whisper transcription
2. Bundle platform-specific FFmpeg binaries
3. Add real dependency validation
4. Support for custom model paths
5. Batch transcription with queue management