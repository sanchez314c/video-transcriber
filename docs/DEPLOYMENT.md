# Deployment Guide

This guide covers deployment of Video Transcriber to production environments.

## Deployment Options

### Option 1: Direct Distribution

#### Pre-built Binaries
Distribute the pre-built binaries to end users:

1. **Download appropriate installer** from releases:
   - macOS: `Video Transcriber-*.dmg`
   - Windows: `Video Transcriber Setup *.exe`
   - Linux: `Video Transcriber-*.AppImage`

2. **Installation**:
   - **macOS**: Open DMG, drag to Applications folder
   - **Windows**: Run EXE installer, follow wizard
   - **Linux**: Make AppImage executable, run directly

#### System Requirements
- **OS**: Windows 10+, macOS 10.14+, Linux (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space + model storage
- **Dependencies**: FFmpeg, Python 3.7+, Node.js 16+

### Option 2: Package Manager Distribution

#### Homebrew (macOS)
```bash
# Create Homebrew formula
brew create --set-name videotranscriber --set-license MIT https://github.com/user/video-transcriber

# Install
brew install videotranscriber
```

#### Chocolatey (Windows)
```xml
<!-- chocolatey.nuspec -->
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>videotranscriber</id>
    <version>1.0.0</version>
    <packageSourceUrl>https://github.com/user/video-transcriber</packageSourceUrl>
    <owners>Username</owners>
    <title>Video Transcriber</title>
    <authors>Username</authors>
    <projectUrl>https://github.com/user/video-transcriber</projectUrl>
    <iconUrl>https://raw.githubusercontent.com/user/video-transcriber/main/assets/icon.png</iconUrl>
    <copyright>2024 Username</copyright>
    <licenseUrl>https://github.com/user/video-transcriber/blob/main/LICENSE</licenseUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <projectSourceUrl>https://github.com/user/video-transcriber</projectSourceUrl>
    <docsUrl>https://github.com/user/video-transcriber/blob/main/README.md</docsUrl>
    <bugTrackerUrl>https://github.com/user/video-transcriber/issues</bugTrackerUrl>
    <tags>video transcription ai whisper</tags>
    <summary>Video transcription tool using OpenAI Whisper</summary>
    <description>
Video Transcriber is a desktop application for batch transcribing video files using OpenAI's Whisper model.
    </description>
  </metadata>
  <files>
    <file src="tools\**" target="tools" />
  </files>
</package>
```

#### Snap (Linux)
```yaml
# snap/snapcraft.yaml
name: video-transcriber
version: '1.0.0'
summary: Video transcription using AI
description: |
  A desktop application for batch transcribing video files using OpenAI's Whisper model.

grade: stable
confinement: strict
base: core20

apps:
  video-transcriber:
    command: bin/desktop-launch $SNAP/usr/bin/video-transcriber
    plugs:
      - home
      - network
      - audio-playback
      - audio-record

parts:
  video-transcriber:
    plugin: dump
    source: .
    stage-packages:
      - libnss3
      - libatk-bridge2.0-0
      - libdrm2
      - libxcomposite1
      - libxdamage1
      - libxrandr2
      - libgbm1
      - libxss1
      - libasound2
      - libatspi2.0-0
      - libgtk-3-0
      - libgdk-pixbuf2.0-0
```

### Option 3: Enterprise Deployment

#### Silent Installation

**Windows (MSI)**:
```cmd
msiexec /i "Video Transcriber Setup 1.0.0.msi" /quiet /norestart
```

**macOS (DMG)**:
```bash
# Mount and copy via script
hdiutil attach "Video Transcriber-1.0.0.dmg"
cp -R "/Volumes/Video Transcriber/Video Transcriber.app" "/Applications/"
hdiutil detach "/Volumes/Video Transcriber"
```

**Linux (DEB)**:
```bash
sudo dpkg -i video-transcriber_1.0.0_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed
```

#### Configuration Management

Create deployment configuration file:

```json
{
  "deployment": {
    "mode": "enterprise",
    "autoUpdate": false,
    "modelPath": "/network/share/whisper-models",
    "outputPath": "/home/$USER/transcriptions",
    "logLevel": "info",
    "maxConcurrentJobs": 2
  }
}
```

Place at:
- **Windows**: `%PROGRAMDATA%\Video Transcriber\config.json`
- **macOS**: `/Library/Application Support/Video Transcriber/config.json`
- **Linux**: `/etc/videotranscriber/config.json`

### Option 4: Cloud Deployment

#### AWS EC2 Deployment

1. **Launch EC2 Instance**:
   - Instance type: g4dn.xlarge (GPU)
   - AMI: Ubuntu 20.04 LTS
   - Storage: 100GB GP3

2. **Install Dependencies**:
```bash
sudo apt update
sudo apt install -y python3-pip nodejs npm ffmpeg
pip3 install openai-whisper torch
```

3. **Deploy Application**:
```bash
git clone https://github.com/user/video-transcriber
cd video-transcriber
npm install
npm run build
```

4. **Create Service**:
```ini
# /etc/systemd/system/videotranscriber.service
[Unit]
Description=Video Transcriber Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/video-transcriber
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install openai-whisper torch

# Set up app
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Expose port for web interface
EXPOSE 3000

# Run application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  video-transcriber:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./videos:/app/videos
      - ./transcriptions:/app/transcriptions
      - ./models:/app/models
    environment:
      - NODE_ENV=production
      - WHISPER_MODEL=base
    restart: unless-stopped
```

## Deployment Checklist

### Pre-deployment
- [ ] Build all platform binaries
- [ ] Test installers on clean systems
- [ ] Verify code signing certificates
- [ ] Check dependencies are bundled
- [ ] Test auto-update mechanism
- [ ] Validate EULA and licenses

### Post-deployment
- [ ] Monitor crash reports
- [ ] Check update server connectivity
- [ ] Verify model downloads work
- [ ] Test transcription on various formats
- [ ] Validate performance benchmarks

## Monitoring and Maintenance

### Logging
Configure centralized logging:

```javascript
// main.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});
```

### Metrics Collection

Track deployment metrics:
- Installation count by platform
- Model usage statistics
- Transcription success rates
- Performance metrics
- Error frequency

### Update Management

Configure update server:

```json
{
  "updates": {
    "enabled": true,
    "channel": "stable",
    "checkInterval": "24h",
    "autoDownload": false,
    "autoInstall": false
  }
}
```

## Security Considerations

### Code Signing
- **macOS**: Apple Developer ID required
- **Windows**: Code signing certificate required
- **Linux**: GPG signing recommended

### Network Security
- Use HTTPS for all communications
- Validate model downloads
- Implement certificate pinning
- Rate limit API calls

### Data Protection
- Encrypt local transcriptions
- Secure model storage
- Implement data retention policies
- GDPR compliance for EU users

## Troubleshooting Deployment

### Common Issues

**Installer won't open**:
- Check code signing certificate
- Verify Gatekeeper settings (macOS)
- Run as administrator (Windows)

**Models won't download**:
- Check network connectivity
- Verify firewall settings
- Check storage space

**Transcription fails**:
- Verify FFmpeg installation
- Check Python dependencies
- Validate video formats

### Debug Mode

Enable debug logging:
```bash
# Environment variable
export DEBUG=videotranscriber:*

# Or in config
{
  "logLevel": "debug"
}
```

## Rollback Procedure

### Version Rollback
1. **Stop application**
2. **Download previous version**
3. **Uninstall current version**
4. **Install previous version**
5. **Restore configuration**

### Data Recovery
1. **Locate transcriptions folder**
2. **Backup current data**
3. **Restore from backup if needed**
4. **Verify integrity**

## Support and Maintenance

### Support Channels
- Email: support@videotranscriber.com
- Documentation: https://docs.videotranscriber.com
- Issues: https://github.com/user/video-transcriber/issues

### Maintenance Schedule
- **Weekly**: Check for security updates
- **Monthly**: Review performance metrics
- **Quarterly**: Update dependencies
- **Annually**: Major version upgrade planning