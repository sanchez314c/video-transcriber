# Architecture Documentation

## System Overview

Video Transcriber is a cross-platform desktop application built with Electron that provides batch transcription of video files using OpenAI's Whisper model. The application follows a modular architecture with clear separation of concerns between the UI, transcription engine, and system integration.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Video Transcriber                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Renderer      │    │          Main Process           │ │
│  │   Process       │◄──►│         (Node.js)               │ │
│  │                 │    │                                 │ │
│  │ • UI Components │    │ • File System Operations        │ │
│  │ • Theme System  │    │ • Transcription Engine          │ │
│  │ • Event Handlers│    │ • IPC Management               │ │
│  └─────────────────┘    │ • Window Management             │ │
│                          └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  SelfContainedTranscriber│
                    │                         │
                    │ • Audio Extraction       │
                    │ • Whisper Integration    │
                    │ • Progress Tracking      │
                    │ • Dependency Management  │
                    └─────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │    External Tools       │
                    │                         │
                    │ • FFmpeg                │
                    │ • Whisper Models        │
                    │ • System APIs           │
                    └─────────────────────────┘
```

## Core Components

### 1. Main Process (`src/main.js`)

The main process serves as the application's controller and handles all system-level operations.

**Responsibilities:**
- Application lifecycle management
- Window creation and management
- IPC (Inter-Process Communication) handlers
- File system operations
- Integration with SelfContainedTranscriber
- Menu and tray management

**Key Features:**
- Cross-platform window styling (inset title bar on macOS)
- Secure IPC communication through preload script
- Async file operations with progress callbacks
- Error handling and logging

### 2. Renderer Process (`src/renderer.js`)

The renderer process manages the user interface and user interactions.

**Responsibilities:**
- UI component initialization and event handling
- Theme management (dark/light mode)
- File browser and selection interface
- Progress display and logging
- User feedback and notifications

**Key Features:**
- Responsive dark mode UI
- Real-time progress updates
- Drag-and-drop file support
- Persistent theme preferences

### 3. Self-Contained Transcriber (`src/self-contained-transcriber.js`)

The transcription engine handles the core video processing workflow.

**Responsibilities:**
- Video file validation
- Audio extraction using FFmpeg
- Whisper model management
- Transcription execution
- Progress tracking and reporting

**Key Features:**
- Modular design for easy testing
- Progress callbacks for real-time updates
- Error handling and recovery
- Dependency checking

### 4. Preload Script (`src/preload.js`)

Security bridge between main and renderer processes.

**Responsibilities:**
- Secure API exposure to renderer
- IPC communication wrapper
- Context isolation maintenance
- Input validation and sanitization

## Data Flow

### Transcription Workflow

```
User selects files
       │
       ▼
Renderer validates files
       │
       ▼
IPC request to Main
       │
       ▼
Main creates SelfContainedTranscriber
       │
       ▼
For each video file:
  ├─ Extract audio (FFmpeg)
  ├─ Load Whisper model
  ├─ Transcribe audio
  └─ Save transcription
       │
       ▼
Progress callbacks to Renderer
       │
       ▼
Display progress to user
       │
       ▼
Completion notification
```

### IPC Communication Pattern

```
Renderer Process          Main Process
       │                      │
       ├─ invoke('select-files')
       │                      │
       │◄───── files array ────┤
       │                      │
       ├─ invoke('start-transcription', options)
       │                      │
       │◄───── job id ─────────┤
       │                      │
       │◄─ 'transcription-progress' events
       │◄─ 'transcription-complete' event
```

## File Structure

```
video-transcriber/
├── src/                          # Source code
│   ├── main.js                   # Main process
│   ├── renderer.js               # Renderer process
│   ├── preload.js                # Preload script
│   ├── self-contained-transcriber.js  # Transcription engine
│   ├── index.html                # Main UI
│   └── styles.css                # Application styles
├── docs/                         # Documentation
├── scripts/                      # Build and utility scripts
├── build_resources/             # Build assets
│   ├── icons/                    # Application icons
│   └── screenshots/              # App screenshots
├── .github/                      # GitHub configuration
│   └── workflows/                # CI/CD workflows
├── binaries/                     # Platform-specific binaries
└── dist/                         # Build output
```

## Design Patterns

### 1. Modular Architecture

The application follows a modular design where each component has a single responsibility:

- **UI Layer**: Handles presentation and user interaction
- **Business Logic**: Manages transcription workflow
- **Data Layer**: Handles file operations and persistence

### 2. IPC Communication Pattern

Uses Electron's IPC for secure communication between processes:

- **invoke/handle**: For request-response operations
- **send/on**: For event-based communication
- **Preload Script**: Provides secure API bridge

### 3. Event-Driven Architecture

The system uses events for:

- Progress updates during transcription
- User interactions
- System notifications
- Error handling

### 4. Theme System

Implements a flexible theming system:

- CSS custom properties for dynamic theming
- Persistent storage for user preferences
- Smooth transitions between themes

## Technology Stack

### Core Technologies

- **Electron**: Cross-platform desktop framework
- **Node.js**: Runtime for main process
- **HTML/CSS/JavaScript**: UI technologies
- **Chromium**: Renderer process engine

### External Dependencies

- **FFmpeg**: Audio/video processing
- **OpenAI Whisper**: Speech recognition
- **Node.js APIs**: File system, process management

### Build Tools

- **Electron Builder**: Application packaging
- **electron-builder**: Multi-platform builds
- **npm scripts**: Build automation

## Security Considerations

### 1. Context Isolation

- Renderer process runs in isolated context
- Preload script provides secure API bridge
- No direct Node.js access in renderer

### 2. Input Validation

- All file paths validated
- User inputs sanitized
- File type restrictions enforced

### 3. Secure IPC

- Whitelisted IPC channels
- Parameter validation
- Error message sanitization

## Performance Considerations

### 1. Async Operations

- All file operations are asynchronous
- Non-blocking UI during transcription
- Progress callbacks for user feedback

### 2. Memory Management

- Proper cleanup of temporary files
- Resource release after operations
- Stream processing for large files

### 3. Batch Processing

- Queue management for multiple files
- Parallel processing where possible
- Progress tracking per file

## Platform-Specific Considerations

### macOS

- Native inset title bar
- Universal binary support (Intel/Apple Silicon)
- Notarization ready

### Windows

- NSIS installer support
- MSI package option
- Windows 10/11 compatibility

### Linux

- AppImage for universal distribution
- DEB package for Debian/Ubuntu
- SNAP support for Ubuntu Store

## Extensibility

### 1. Plugin Architecture

The modular design allows for:

- Custom transcription engines
- Additional file format support
- New UI components
- External service integrations

### 2. Configuration System

- JSON-based configuration
- Environment-specific settings
- User preference management

### 3. API Extensions

- IPC channel registration
- Event system hooks
- Custom error handlers

## Testing Strategy

### 1. Unit Testing

- Individual component testing
- Mock external dependencies
- Isolated function testing

### 2. Integration Testing

- IPC communication testing
- End-to-end workflow testing
- Cross-platform compatibility

### 3. User Acceptance Testing

- UI/UX testing
- Performance testing
- Accessibility testing

## Future Architecture Considerations

### 1. Microservices

- Separate transcription service
- Cloud-based processing options
- Distributed processing

### 2. Web Components

- Component-based UI architecture
- Reusable UI elements
- Framework-agnostic design

### 3. Advanced Features

- Real-time transcription
- Multi-language support
- Custom model training integration

## Documentation Architecture

The documentation follows a standardized structure:

- **API.md**: Technical API reference
- **ARCHITECTURE.md**: System design documentation
- **DEVELOPMENT.md**: Developer setup guide
- **DEPLOYMENT.md**: Deployment instructions
- **FAQ.md**: Common questions and answers
- **INSTALLATION.md**: Installation guide
- **QUICK_START.md**: Quick start guide
- **TROUBLESHOOTING.md**: Issue resolution guide
- **WORKFLOW.md**: Development workflow

This architecture ensures maintainability, scalability, and extensibility of the Video Transcriber application while providing a solid foundation for future enhancements.