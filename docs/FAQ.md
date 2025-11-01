# Frequently Asked Questions

## General Questions

### Q: What is Video Transcriber?
A: Video Transcriber is a desktop application that automatically converts speech in video files to text using OpenAI's Whisper AI model. It supports batch processing of multiple files and works on Windows, macOS, and Linux.

### Q: Is Video Transcriber free?
A: Yes, Video Transcriber is open source and released under the MIT license. However, you'll need to download Whisper models which are provided free by OpenAI.

### Q: What video formats are supported?
A: Video Transcriber supports all major video formats including:
- MP4, AVI, MOV, MKV
- FLV, WMV, WebM, M4V
- MPG, MPEG

### Q: How accurate is the transcription?
A: Accuracy depends on the Whisper model used:
- **Tiny**: ~85% accuracy, fastest processing
- **Base**: ~90% accuracy, good balance
- **Small**: ~93% accuracy
- **Medium**: ~95% accuracy
- **Large**: ~97% accuracy, slowest but best

## Installation & Setup

### Q: How do I install Video Transcriber?
A: 
1. Download the appropriate installer for your OS from the [Releases](https://github.com/user/video-transcriber/releases) page
2. Run the installer and follow the wizard
3. Launch the application from your applications menu

### Q: Do I need to install anything else?
A: Video Transcriber bundles most dependencies, but requires:
- **FFmpeg**: For video processing (bundled in most builds)
- **Python 3.7+**: For Whisper models (automatic setup)
- **Network connection**: For model downloads

### Q: Can I run it from source?
A: Yes! See the [Development Guide](DEVELOPMENT.md) for instructions.

## Usage

### Q: How do I transcribe multiple files?
A: 
1. Click "Browse" and select a folder containing videos
2. Choose your preferred Whisper model
3. Click "Start Transcription"
4. Files will be processed in batch

### Q: Where are transcriptions saved?
A: Transcriptions are saved as `.txt` files in the same directory as the source videos. The filename will match the video with `_transcript` appended.

### Q: Can I pause or resume transcription?
A: Currently, transcription runs continuously until all files are processed. You can stop the process, but resuming requires starting over.

### Q: How long does transcription take?
A: Processing time depends on:
- Video duration (1:1 ratio for most models)
- Whisper model size (tiny is fastest)
- Computer hardware (GPU acceleration helps)

Typical speeds:
- **Tiny**: Real-time or faster
- **Base**: 0.5x real-time
- **Small**: 0.3x real-time
- **Medium**: 0.2x real-time
- **Large**: 0.1x real-time

## Models & Performance

### Q: Which Whisper model should I use?
A: 
- **Tiny**: Quick drafts, testing
- **Base**: Default, good for most uses
- **Small**: Better accuracy for important content
- **Medium**: High accuracy when quality matters
- **Large**: Professional transcription, best quality

### Q: How much disk space do models need?
A: 
- Tiny: 39MB
- Base: 74MB
- Small: 244MB
- Medium: 769MB
- Large: 1550MB

Models are downloaded once and cached locally.

### Q: Can I use custom models?
A: Currently, Video Transcriber only supports official OpenAI Whisper models. Custom model support is planned for a future release.

## Troubleshooting

### Q: "Dependencies not found" error
A: 
1. Ensure you have an internet connection
2. Run the application as administrator
3. Check if antivirus is blocking downloads
4. Try manual dependency installation

### Q: Transcription fails on certain files
A: 
1. Check if the file is corrupted
2. Try a different Whisper model
3. Ensure sufficient disk space
4. Verify the file format is supported

### Q: Application won't start
A: 
1. Verify your OS meets requirements
2. Install/update graphics drivers
3. Check if another instance is running
4. Review log files for errors

### Q: Slow transcription speed
A: 
1. Use a smaller model (tiny/base)
2. Close other applications
3. Check if GPU acceleration is available
4. Ensure sufficient RAM

## Technical

### Q: Does it work offline?
A: Yes, once the Whisper models are downloaded, Video Transcriber works completely offline.

### Q: Is my data sent to the cloud?
A: No, all processing happens locally on your machine. No video or audio data is sent to external servers.

### Q: Can I use it programmatically?
A: While Video Transcriber is a GUI application, you can use the underlying Whisper library directly in your own projects.

### Q: What languages are supported?
A: Whisper supports 99 languages including:
- English, Spanish, French, German
- Chinese, Japanese, Korean
- And many more - see [OpenAI's documentation](https://github.com/openai/whisper#available-models-and-languages)

## Privacy & Security

### Q: Is my data private?
A: Yes, all processing occurs locally. Your videos and transcriptions never leave your computer unless you explicitly share them.

### Q: Are there any telemetry or analytics?
A: Video Transcriber does not collect personal data or usage analytics. Anonymous crash reports may be sent to help improve the application.

### Q: How can I ensure my data is secure?
A: 
1. Download from official sources only
2. Keep the application updated
3. Use a secure internet connection for model downloads
4. Regularly backup your transcriptions

## Licensing

### Q: Can I use Video Transcriber commercially?
A: Yes, the MIT license allows commercial use. However, check OpenAI's terms for Whisper model usage.

### Q: Can I modify and redistribute?
A: Yes, the MIT license allows modification and redistribution, as long as you include the original license and copyright notice.

## Getting Help

### Q: Where can I get support?
A: 
1. Check this FAQ first
2. Search [GitHub Issues](https://github.com/user/video-transcriber/issues)
3. Join our [Discord Community](https://discord.gg/videotranscriber)
4. Email: support@videotranscriber.com

### Q: How do I report bugs?
A: Please file an issue on GitHub with:
- Your OS and version
- Video Transcriber version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

### Q: How do I request features?
A: 
1. Check if already requested in [Issues](https://github.com/user/video-transcriber/issues)
2. Create a new issue with "feature request" label
3. Provide detailed use case and requirements

## Still Have Questions?

If your question isn't answered here:
- 📖 Check the [full documentation](DOCUMENTATION_INDEX.md)
- 🐛 Browse [GitHub Issues](https://github.com/user/video-transcriber/issues)
- 💬 Join our [Discord](https://discord.gg/videotranscriber)
- 📧 Email us at support@videotranscriber.com