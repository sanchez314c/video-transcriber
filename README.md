# Video Transcriber

A modern cross-platform desktop application for batch transcribing video files using OpenAI's Whisper model. Built with Electron for Windows, macOS, and Linux.

## Features

✨ **Modern UI with Dark Mode**: Beautiful, responsive interface with light/dark theme support  
🎬 **Batch Processing**: Process multiple video files simultaneously  
📁 **Wide Format Support**: MP4, AVI, MOV, MKV, FLV, WMV, WebM, M4V, MPG, MPEG  
🤖 **Multiple AI Models**: Choose from Whisper's tiny, base, small, medium, or large models  
⚡ **Real-time Progress**: Live progress tracking and detailed logging  
🔧 **Smart Dependencies**: Automatic dependency checking and installation guidance  
💾 **Cross-platform**: Native applications for Windows, macOS, and Linux  
📊 **Export Logs**: Save transcription logs for reference  

## Screenshots

*Coming soon - the app features a sleek dark mode interface*

## Quick Start - One-Command Build & Run

### Option 1: One-Command Solution (Recommended)

```bash
# Clone and build
git clone <repository-url>
cd Video-Transcriber

# Build and run with a single command!
./build-release-run.sh
```

### Option 2: Development Mode

```bash
# Run in development mode with hot reload
./build-release-run.sh --dev
```

### Build Options

```bash
# Build only (don't launch)
./build-release-run.sh --build-only

# Clean build
./build-release-run.sh --clean

# Build for specific platform
./build-release-run.sh --platform mac
./build-release-run.sh --platform win
./build-release-run.sh --platform linux

# Build for all platforms
./build-release-run.sh --platform all
```

### Manual Setup (if needed)

1. **Install Node.js** (16+ required)
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Install FFmpeg:**
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from https://ffmpeg.org/
   - **Linux**: `sudo apt install ffmpeg`

## Usage

1. **Launch the app**: `npm start`
2. **Select folder**: Click "Browse" to choose a folder with video files
3. **Choose model**: Select Whisper model (tiny=fastest, large=most accurate)
4. **Start transcription**: Click "Start Transcription"
5. **Monitor progress**: Watch real-time progress and logs
6. **Access results**: Text files are saved alongside video files

## Development

### Running in Development Mode
```bash
npm run dev  # Enables hot reload and dev tools
```

### Building Distributables

```bash
# One-command build for current platform
./build-release-run.sh --build-only

# Build for all platforms
./build-release-run.sh --platform all --build-only

# Build for specific platforms
./build-release-run.sh --platform win --build-only
./build-release-run.sh --platform mac --build-only
./build-release-run.sh --platform linux --build-only
```

### Build Output Locations

After building, find your executables in:
- **macOS**: `dist/Video Transcriber-*.dmg` and `dist/mac*/Video Transcriber.app`
- **Windows**: `dist/Video Transcriber Setup *.exe`
- **Linux**: `dist/Video Transcriber-*.AppImage` and `dist/*.deb`

## System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.14, or Linux (64-bit)
- **RAM**: 4GB (8GB recommended for large models)
- **Storage**: 2GB free space (plus space for models)
- **Dependencies**: Python 3.7+, FFmpeg, Node.js 16+

### Recommended Requirements
- **RAM**: 8GB+ for optimal performance
- **CPU**: Multi-core processor for faster transcription
- **Storage**: SSD for better I/O performance

## Whisper Models

| Model  | Size  | Speed    | Accuracy | Use Case |
|--------|-------|----------|----------|----------|
| tiny   | 39MB  | Fastest  | Good     | Quick drafts, testing |
| base   | 74MB  | Fast     | Better   | General use (default) |
| small  | 244MB | Medium   | Good     | Balanced performance |
| medium | 769MB | Slower   | Better   | High accuracy needs |
| large  | 1550MB| Slowest  | Best     | Professional transcription |

## Project Structure

```
Video-Transcriber/
├── build-release-run.sh  # One-command build & run script
├── package.json          # Node.js configuration
├── src/                  # Application source code
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script
│   ├── renderer.js      # Renderer process
│   ├── index.html       # Application UI
│   └── styles.css       # Application styles
├── assets/              # Application assets
│   ├── icon.png        # Application icon
│   ├── icon.ico        # Windows icon
│   └── icon.svg        # SVG icon
├── dev/                 # Development files
│   ├── build.js        # Legacy build script
│   ├── compile.js      # Legacy compile script
│   ├── install.js      # Setup helper
│   └── launch.command  # macOS launch script
├── dist/               # Build outputs (created after build)
└── requirements.txt    # Python dependencies

```

## Architecture

The application consists of:
- **Electron Frontend**: Modern web-based UI with native OS integration
- **Python Backend**: Handles video processing and Whisper transcription
- **IPC Communication**: Secure communication between frontend and backend
- **Cross-platform Build**: Automated packaging for all major platforms

## Troubleshooting

### Common Issues

**"Dependencies not found"**
- Ensure Python, FFmpeg, and Whisper are installed
- Try running the automated installer: `node install.js`

**"Transcription fails"**
- Check video file format is supported
- Ensure sufficient disk space
- Try a smaller Whisper model

**"App won't start"**
- Verify Node.js 16+ is installed
- Run `npm install` to ensure dependencies are installed
- Check console for error messages

### Getting Help

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Run `node install.js` to verify setup
3. Enable development mode: `npm run dev` for detailed logs

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release with Electron-based UI
- Dark mode support
- Cross-platform builds
- Real-time progress tracking
- Batch processing capabilities