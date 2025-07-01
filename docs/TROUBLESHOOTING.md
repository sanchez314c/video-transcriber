# Troubleshooting Guide

This guide helps you resolve common issues with Video Transcriber. Find solutions for installation problems, transcription errors, and performance issues.

## 🔧 Installation Issues

### Application Won't Start

#### Windows
**Problem**: "Application cannot be opened" or "Missing DLL" errors

**Solutions**:
1. **Install Visual C++ Redistributable**
   ```
   Download and install Microsoft Visual C++ 2019 Redistributable
   ```

2. **Run as Administrator**
   - Right-click executable
   - Select "Run as administrator"

3. **Check Windows Defender**
   - Add application to exclusion list
   - Disable real-time protection temporarily

#### macOS
**Problem**: "App can't be opened because Apple cannot check it for malicious software"

**Solutions**:
1. **Allow App Anyway**
   ```
   Right-click app → Open → Click "Open" in dialog
   ```

2. **System Preferences Override**
   - System Preferences → Security & Privacy
   - Click "Open Anyway" for the app

3. **Remove Quarantine Flag**
   ```bash
   xattr -d com.apple.quarantine "/Applications/Video Transcriber.app"
   ```

#### Linux
**Problem**: "Permission denied" or "Cannot execute binary"

**Solutions**:
1. **Make Executable**
   ```bash
   chmod +x Video-Transcriber.AppImage
   ```

2. **Install Missing Libraries**
   ```bash
   sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils
   ```

3. **Run with AppImageLauncher**
   ```bash
   ./Video-Transcriber.AppImage --appimage-extract
   ./squashfs-root/AppRun
   ```

### FFmpeg Not Found

**Problem**: "FFmpeg is not installed or not in PATH"

**Solutions**:

#### Windows
1. **Download FFmpeg**
   - Visit https://ffmpeg.org/download.html
   - Download Windows build
   - Extract to `C:\ffmpeg`

2. **Add to PATH**
   ```
   Advanced system settings → Environment Variables
   Add C:\ffmpeg\bin to PATH
   ```

3. **Verify Installation**
   ```cmd
   ffmpeg -version
   ```

#### macOS
```bash
# Using Homebrew
brew install ffmpeg

# Using MacPorts
sudo port install ffmpeg

# Verify
ffmpeg -version
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg

# Arch Linux
sudo pacman -S ffmpeg
```

## 🎥 Transcription Issues

### Video File Not Supported

**Problem**: "Unsupported video format" or "Cannot read video file"

**Solutions**:
1. **Check Supported Formats**
   - Supported: MP4, AVI, MOV, MKV, FLV, WMV, WebM, M4V, MPG, MPEG
   - Convert unsupported formats using FFmpeg:
     ```bash
     ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
     ```

2. **Check File Integrity**
   ```bash
   ffmpeg -i your_video.mp4
   # Look for error messages in output
   ```

3. **Try Different Codec**
   ```bash
   ffmpeg -i input.avi -c:v libx264 -preset slow -crf 23 output.mp4
   ```

### Transcription Fails Mid-Process

**Problem**: Transcription stops unexpectedly or crashes

**Solutions**:
1. **Check Available Memory**
   - Close other applications
   - Use smaller model (tiny/base instead of large)
   - Monitor memory usage during transcription

2. **Reduce File Size**
   ```bash
   # Compress video
   ffmpeg -i input.mp4 -c:v libx264 -crf 28 -c:a aac -b:a 128k output.mp4
   
   # Extract audio only
   ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output.wav
   ```

3. **Check Disk Space**
   - Ensure at least 2x video file size free space
   - Clean temporary files:
     ```bash
     # Windows
     del %TEMP%\*.*
     
     # macOS/Linux
     rm -rf /tmp/vt_*
     ```

### Poor Transcription Quality

**Problem**: Transcription has many errors or misses words

**Solutions**:
1. **Use Larger Model**
   - Switch from tiny/base to small/medium/large
   - Larger models provide better accuracy

2. **Improve Audio Quality**
   ```bash
   # Enhance audio
   ffmpeg -i input.mp4 -af "highpass=200,lowpass=3000,volume=2" output.wav
   ```

3. **Specify Language**
   - Set correct language in options
   - Auto-detection may fail for unclear audio

4. **Split Long Files**
   ```bash
   # Split into 10-minute chunks
   ffmpeg -i input.mp4 -f segment -segment_time 600 -c copy output_%03d.mp4
   ```

## ⚡ Performance Issues

### Slow Transcription Speed

**Problem**: Transcription takes very long time

**Solutions**:
1. **Optimize Model Selection**
   - `tiny`: Fastest, ~32x real-time
   - `base`: Fast, ~16x real-time
   - `small`: Medium, ~6x real-time
   - `medium`: Slow, ~2x real-time
   - `large`: Slowest, ~1x real-time

2. **Hardware Acceleration**
   - Use GPU if available (CUDA/MPS)
   - Enable parallel processing
   - Use SSD for temporary files

3. **System Optimization**
   ```bash
   # Set process priority (Linux/macOS)
   nice -n 10 ./video-transcriber
   
   # Windows: Set priority in Task Manager
   ```

### High CPU/Memory Usage

**Problem**: Application uses too many system resources

**Solutions**:
1. **Limit Concurrent Operations**
   - Process files one at a time
   - Close other applications
   - Use smaller models

2. **Adjust Process Priority**
   ```bash
   # Linux/macOS
   renice 10 -p $(pgrep video-transcriber)
   
   # Windows: Task Manager → Details → Set priority
   ```

3. **Monitor Resource Usage**
   - Check Activity Monitor/Task Manager
   - Identify bottlenecks
   - Consider hardware upgrade

## 🐛 Error Messages

### Common Error Codes

#### `E_NO_FFMPEG`
**Meaning**: FFmpeg not found or not executable

**Solution**:
1. Install FFmpeg (see installation section)
2. Add FFmpeg to system PATH
3. Restart application

#### `E_INVALID_FILE`
**Meaning**: Video file is corrupted or unsupported

**Solution**:
1. Verify file plays in media player
2. Convert to supported format
3. Check file permissions

#### `E_TRANSCRIPTION_FAILED`
**Meaning**: Whisper model failed to process audio

**Solution**:
1. Try different model
2. Check audio quality
3. Reduce file size
4. Restart application

#### `E_OUTPUT_ERROR`
**Meaning**: Cannot write transcription file

**Solution**:
1. Check disk space
2. Verify write permissions
3. Choose different output folder
4. Check filename for invalid characters

### Debug Mode

Enable debug logging for detailed error information:

1. **Windows**
   ```
   VideoTranscriber.exe --debug
   ```

2. **macOS/Linux**
   ```bash
   ./VideoTranscriber --debug
   ```

3. **Check Log Files**
   - Windows: `%APPDATA%/VideoTranscriber/logs/`
   - macOS: `~/Library/Logs/VideoTranscriber/`
   - Linux: `~/.local/share/VideoTranscriber/logs/`

## 🔄 Recovery Procedures

### Corrupted Installation

**Symptoms**: App crashes, missing files, strange behavior

**Recovery Steps**:
1. **Backup Settings**
   - Export configuration if possible
   - Save transcriptions

2. **Clean Reinstall**
   ```bash
   # Windows
   # Uninstall via Control Panel
   # Delete %APPDATA%/VideoTranscriber
   
   # macOS
   rm -rf ~/Library/Application\ Support/VideoTranscriber
   rm -rf ~/Library/Preferences/com.videotranscriber.plist
   
   # Linux
   rm -rf ~/.local/share/VideoTranscriber
   rm -rf ~/.config/VideoTranscriber
   ```

3. **Reinstall Application**
   - Download fresh installer
   - Install with administrator privileges
   - Restore settings

### Lost Transcriptions

**Recovery Options**:
1. **Check Temporary Folders**
   - Windows: `%TEMP%\vt_*`
   - macOS/Linux: `/tmp/vt_*`

2. **Search for Output Files**
   ```bash
   # Find all .txt files modified recently
   find ~ -name "*.txt" -mtime -7 -type f
   
   # Windows
   dir C:\Users\%USERNAME%\*.txt /s /b
   ```

3. **Check Recycle Bin**
   - Look for accidentally deleted files
   - Restore if found

## 📞 Getting Help

### Before Contacting Support

1. **Collect Information**
   - Application version
   - Operating system version
   - Error messages
   - Steps to reproduce

2. **Try Basic Fixes**
   - Restart application
   - Reinstall FFmpeg
   - Try with different file

3. **Check Documentation**
   - Read [FAQ.md](FAQ.md)
   - Review [API.md](API.md)
   - Check [TODO.md](TODO.md) for known issues

### Contact Channels

1. **GitHub Issues**
   - Report bugs at: https://github.com/yourusername/video-transcriber/issues
   - Include system information and error logs
   - Use issue templates when available

2. **Community Forum**
   - Join discussions at: https://github.com/yourusername/video-transcriber/discussions
   - Ask questions and share solutions
   - Help other users

3. **Email Support**
   - Email: support@videotranscriber.com
   - Response time: 24-48 hours
   - Include detailed information

### Bug Report Template

```
**Description**: Brief description of the issue

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happened

**System Information**:
- OS: Windows 10 / macOS 12.0 / Ubuntu 20.04
- App Version: 1.0.0
- FFmpeg Version: 4.4.0
- Model Used: base

**Error Messages**: Copy full error text

**Additional Notes**: Any other relevant information
```

## 📚 Additional Resources

### External Tools

- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **Whisper GitHub**: https://github.com/openai/whisper
- **Electron Issues**: https://github.com/electron/electron/issues

### Community

- **Reddit**: r/VideoTranscriber
- **Discord**: https://discord.gg/videotranscriber
- **Stack Overflow**: Tag with `video-transcriber`

### Video Tutorials

- Installation guides
- Feature walkthroughs
- Advanced usage tips
- Troubleshooting examples

Remember: Most issues can be resolved by ensuring FFmpeg is properly installed and using appropriate model sizes for your system capabilities.