# Quick Start Guide

Get up and running with Video Transcriber in minutes. This guide will walk you through the essential steps to start transcribing your video files.

## Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 4GB, 8GB+ recommended
- **Storage**: 2GB free space for application + models
- **Processor**: 64-bit CPU with SSE4.1 support

### Required Dependencies

- **FFmpeg**: For audio extraction from video files
- **Node.js**: Version 16 or higher (for development)

## Installation Options

### Option 1: Download Pre-built Application (Recommended)

1. **Download the latest release**
   - Go to the [Releases page](https://github.com/yourusername/video-transcriber/releases)
   - Download the appropriate version for your platform:
     - Windows: `Video-Transcriber-Setup-x.x.x.exe`
     - macOS: `Video-Transcriber-x.x.x.dmg`
     - Linux: `Video-Transcriber-x.x.x.AppImage`

2. **Install the application**
   - **Windows**: Run the installer and follow the wizard
   - **macOS**: Open the DMG and drag to Applications folder
   - **Linux**: Make the AppImage executable and run

3. **Launch Video Transcriber**
   - Find the application in your start menu or applications folder

### Option 2: Build from Source

For developers or custom installations:

```bash
# Clone the repository
git clone https://github.com/yourusername/video-transcriber.git
cd video-transcriber

# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build for your platform
npm run dist:current
```

## First Run Setup

### 1. Install FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
# Using Homebrew
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

### 2. Launch the Application

Open Video Transcriber. You'll see the main interface with:
- File browser area
- Model selection dropdown
- Output folder selector
- Progress display area

### 3. Configure Settings

1. **Select Whisper Model**
   - Click the model dropdown
   - Choose based on your needs:
     - `tiny`: Fastest, lower accuracy
     - `base`: Good balance (default)
     - `small`: Better accuracy
     - `medium`: High accuracy
     - `large`: Best accuracy, slower

2. **Set Output Folder**
   - Click "Browse" next to output folder
   - Select where transcriptions will be saved

## Basic Usage

### Transcribe a Single Video

1. **Select Video File**
   - Click "Browse" or drag & drop a video file
   - Supported formats: MP4, AVI, MOV, MKV, FLV, WMV, WebM

2. **Choose Options**
   - Select Whisper model
   - Set output folder
   - Choose output format (TXT, SRT, VTT)

3. **Start Transcription**
   - Click "Start Transcription"
   - Monitor progress in the progress area
   - Wait for completion notification

### Batch Transcribe Multiple Videos

1. **Select Multiple Files**
   - Click "Browse" and select multiple files
   - Or drag multiple videos onto the app

2. **Configure Batch Settings**
   - Model selection applies to all files
   - Output folder for all transcriptions

3. **Process Batch**
   - Click "Start Batch Transcription"
   - Progress shows current file and overall progress
   - Files are processed sequentially

## Understanding the Interface

### Main Components

```
┌─────────────────────────────────────────┐
│ Video Transcriber              [⚙️] [🌙] │
├─────────────────────────────────────────┤
│ 📁 Select Video Files                  │
│ [Browse...] [Clear All]                │
│                                        │
│ 🎯 Whisper Model: [base ▼]            │
│                                        │
│ 📂 Output Folder: [Browse...]          │
│                                        │
│ 📄 Output Format: [TXT ▼]              │
│                                        │
│ [Start Transcription]                  │
├─────────────────────────────────────────┤
│ Progress:                              │
│ ████████████░░░░ 75%                  │
│ Processing: video1.mp4                 │
│                                        │
│ Log:                                   │
│ • Extracting audio...                  │
│ • Loading model...                     │
│ • Transcribing...                      │
└─────────────────────────────────────────┘
```

### Status Indicators

- **🟢 Ready**: Application is ready to transcribe
- **🟡 Processing**: Transcription in progress
- **🔴 Error**: An error occurred
- **✅ Complete**: Transcription finished successfully

## Tips for Best Results

### Audio Quality

- Use high-quality video files when possible
- Avoid videos with background noise
- Ensure clear speech in the audio

### Model Selection

- For quick drafts: Use `tiny` or `base`
- For important content: Use `medium` or `large`
- Consider file size vs. accuracy trade-off

### Performance

- Close other applications when transcribing
- Use SSD for better performance
- Ensure adequate RAM for larger models

## Output Formats

### TXT (Plain Text)
```
This is the transcribed text from the video.
It includes all spoken words in sequence.
```

### SRT (Subtitles)
```
1
00:00:00,000 --> 00:00:03,500
This is the transcribed text

2
00:00:03,500 --> 00:00:07,000
from the video.
```

### VTT (WebVTT)
```
WEBVTT

00:00:00.000 --> 00:00:03.500
This is the transcribed text

00:00:03.500 --> 00:00:07.000
from the video.
```

## Common Tasks

### Change Theme

1. Click the moon icon (🌙) in the top right
2. Toggle between dark and light themes
3. Preference is saved automatically

### View Logs

1. Scroll in the progress area to see full log
2. Logs show:
   - File processing steps
   - Errors and warnings
   - Completion status

### Cancel Transcription

1. Click "Cancel" during processing
2. Current file will stop processing
3. Already completed files remain saved

## Getting Help

### Documentation

- **Full Documentation**: See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- **API Reference**: See [API.md](API.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### FAQ

**Q: Why is transcription slow?**
A: Larger models take more time. Try the `base` model for faster results.

**Q: Can I transcribe without internet?**
A: Yes, once models are downloaded, transcription works offline.

**Q: What languages are supported?**
A: Whisper supports 99+ languages. Auto-detection works well.

### Support

- **Issues**: Report on [GitHub Issues](https://github.com/yourusername/video-transcriber/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/yourusername/video-transcriber/discussions)
- **Email**: support@videotranscriber.com

## Next Steps

Now that you're set up:

1. **Explore Advanced Features**: Learn about batch processing, custom models
2. **Customize Settings**: Adjust transcription parameters
3. **Integrate with Workflow**: Use API for automation
4. **Contribute**: See [CONTRIBUTING.md](CONTRIBUTING.md) to help improve

Happy transcribing! 🎥➡️📝