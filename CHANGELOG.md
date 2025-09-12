# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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