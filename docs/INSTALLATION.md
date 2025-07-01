# Installation Guide

This guide covers installing Video Transcriber on various platforms.

## System Requirements

### Minimum Requirements
- **Operating System**:
  - Windows 10 (1903) or later
  - macOS 10.14 (Mojave) or later
  - Linux (Ubuntu 18.04+, Fedora 28+, Debian 10+)
- **Processor**: 64-bit CPU
- **Memory**: 4GB RAM
- **Storage**: 2GB free space + space for Whisper models
- **Network**: Internet connection for initial model download

### Recommended Requirements
- **Processor**: Multi-core CPU with 64-bit support
- **Memory**: 8GB RAM or more
- **Storage**: SSD with 10GB free space
- **Graphics**: GPU with CUDA support (for faster processing)

## Installation Methods

### Method 1: Pre-built Installers (Recommended)

#### Windows
1. **Download**:
   - Go to [Releases](https://github.com/user/video-transcriber/releases)
   - Download `Video Transcriber Setup X.X.X.exe`

2. **Install**:
   - Run the downloaded installer as Administrator
   - Follow the installation wizard
   - Choose installation directory (default: `C:\Program Files\Video Transcriber`)

3. **Launch**:
   - Start from Start Menu
   - Or double-click desktop shortcut

#### macOS
1. **Download**:
   - Go to [Releases](https://github.com/user/video-transcriber/releases)
   - Download `Video Transcriber-X.X.X.dmg`

2. **Install**:
   - Open the downloaded DMG file
   - Drag Video Transcriber to Applications folder
   - Eject the DMG

3. **Launch**:
   - Open from Applications folder
   - Or use Spotlight search

#### Linux
1. **Download**:
   - Go to [Releases](https://github.com/user/video-transcriber/releases)
   - Download `Video Transcriber-X.X.X.AppImage`

2. **Install**:
   - Open terminal
   - Make the AppImage executable:
   ```bash
   chmod +x Video-Transcriber-X.X.X.AppImage
   ```

3. **Launch**:
   ```bash
   ./Video-Transcriber-X.X.X.AppImage
   ```

### Method 2: Package Managers

#### Homebrew (macOS)
```bash
# Install
brew install --cask videotranscriber

# Upgrade
brew upgrade --cask videotranscriber

# Uninstall
brew uninstall --cask videotranscriber
```

#### Chocolatey (Windows)
```cmd
# Install
choco install videotranscriber

# Upgrade
choco upgrade videotranscriber

# Uninstall
choco uninstall videotranscriber
```

#### Snap (Linux)
```bash
# Install
sudo snap install videotranscriber

# Upgrade
sudo snap refresh videotranscriber

# Uninstall
sudo snap remove videotranscriber
```

### Method 3: From Source

#### Prerequisites
- Node.js 16.0 or higher
- npm 7.0 or higher
- Python 3.7 or higher
- Git

#### Steps
1. **Clone repository**:
   ```bash
   git clone https://github.com/user/video-transcriber.git
   cd video-transcriber
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Install Python dependencies**:
   ```bash
   # Create virtual environment (recommended)
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   
   # Install requirements
   pip install -r requirements.txt
   ```

4. **Run application**:
   ```bash
   npm start
   ```

## Platform-Specific Setup

### Windows

#### Visual C++ Redistributables
If you encounter missing DLL errors:
1. Download [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. Install and restart your computer

#### FFmpeg Installation
If not bundled with installer:
1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add to PATH: `setx PATH "%PATH%;C:\ffmpeg"`
4. Restart terminal

#### Antivirus Exclusions
Add exclusions for:
- Installation directory
- `%APPDATA%\Video Transcriber`
- Temporary folders

### macOS

#### Gatekeeper Issues
If app won't open:
1. Right-click app → Open
2. Or in System Preferences → Security & Privacy → Allow
3. For permanent solution, use signed version

#### FFmpeg via Homebrew
```bash
brew install ffmpeg
```

#### Permissions
Grant permissions for:
- Microphone access (if using live transcription)
- File system access
- Network access

### Linux

#### Dependencies (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils
```

#### Desktop Integration
Create desktop entry:
```desktop
# ~/.local/share/applications/videotranscriber.desktop
[Desktop Entry]
Name=Video Transcriber
Comment=Transcribe videos using AI
Exec=/path/to/Video-Transcriber.AppImage
Icon=videotranscriber
Terminal=false
Type=Application
Categories=AudioVideo;Video;
```

## Configuration

### First Run Setup
1. **Launch** Video Transcriber
2. **Select** Whisper model directory
3. **Choose** default output location
4. **Configure** preferred settings

### Environment Variables
Optional environment variables:
```bash
# Model cache location
WHISPER_CACHE_DIR=/path/to/models

# Output directory
VIDEO_TRANSCRIBER_OUTPUT=/path/to/transcriptions

# Log level
LOG_LEVEL=info  # debug, info, warn, error
```

### Configuration File
Create `config.json` in settings directory:
```json
{
  "model": "base",
  "language": "auto",
  "outputFormat": "txt",
  "outputDirectory": "",
  "autoSave": true,
  "theme": "dark",
  "maxConcurrentJobs": 2,
  "gpuAcceleration": true
}
```

## Verification

### Test Installation
1. **Launch** the application
2. **Check** version in Help → About
3. **Test** with a sample video file
4. **Verify** transcription output

### Command Line Test
```bash
# Check if installed
videotranscriber --version

# Run with specific config
videotranscriber --config /path/to/config.json
```

## Troubleshooting

### Common Issues

#### "Application won't start"
- Check system requirements
- Verify installation integrity
- Run as administrator
- Check antivirus software

#### "Model download fails"
- Check internet connection
- Verify disk space
- Try manual model download
- Check firewall settings

#### "Transcription errors"
- Verify video format
- Check file permissions
- Ensure sufficient RAM
- Try different model

#### "Performance issues"
- Close other applications
- Use smaller model
- Enable GPU acceleration
- Check disk space

### Log Files
Find logs at:
- **Windows**: `%APPDATA%\Video Transcriber\logs\`
- **macOS**: `~/Library/Logs/Video Transcriber/`
- **Linux**: `~/.local/share/Video Transcriber/logs/`

### Getting Help
If installation fails:
1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/user/video-transcriber/issues)
3. Contact support: support@videotranscriber.com

## Uninstallation

### Windows
1. Open "Add or Remove Programs"
2. Find "Video Transcriber"
3. Click "Uninstall"
4. Follow the wizard

### macOS
1. Drag app to Trash
2. Or use AppCleaner for complete removal
3. Remove preferences: `~/Library/Preferences/com.videotranscriber.plist`

### Linux
```bash
# For AppImage
rm Video-Transcriber.AppImage

# For Snap
sudo snap remove videotranscriber

# For package manager
sudo apt remove videotranscriber
```

## Next Steps

After successful installation:
1. Read the [Quick Start Guide](QUICK_START.md)
2. Check the [FAQ](FAQ.md) for common questions
3. Join the community for support and updates