# API Documentation

## Overview

Video Transcriber provides an IPC-based API for communication between the main process and renderer process in Electron. This document outlines the available APIs for extending and integrating with the application.

## IPC API Reference

### Main Process → Renderer Process

#### `transcription-progress`

Emitted during transcription to provide real-time progress updates.

```javascript
// Event data structure
{
  type: 'transcription-progress',
  data: {
    current: number,        // Current file being processed
    total: number,          // Total files to process
    fileName: string,       // Name of current file
    progress: number,       // Progress percentage (0-100)
    message: string         // Status message
  }
}
```

#### `transcription-complete`

Emitted when all transcription tasks are completed.

```javascript
// Event data structure
{
  type: 'transcription-complete',
  data: {
    totalProcessed: number,
    successful: number,
    failed: number,
    duration: number        // Total duration in milliseconds
  }
}
```

#### `log-message`

Emitted for logging messages from the main process.

```javascript
// Event data structure
{
  type: 'log-message',
  data: {
    level: 'info' | 'warn' | 'error',
    message: string,
    timestamp: string
  }
}
```

### Renderer Process → Main Process

#### `select-files`

Open a file dialog to select video files for transcription.

```javascript
// Request
ipcRenderer.invoke('select-files')

// Response
{
  success: boolean,
  files?: string[],        // Array of selected file paths
  error?: string
}
```

#### `select-output-folder`

Open a dialog to select the output folder for transcriptions.

```javascript
// Request
ipcRenderer.invoke('select-output-folder')

// Response
{
  success: boolean,
  folderPath?: string,     // Selected folder path
  error?: string
}
```

#### `start-transcription`

Begin the transcription process for selected files.

```javascript
// Request
ipcRenderer.invoke('start-transcription', {
  files: string[],         // Array of video file paths
  outputFolder: string,    // Output directory path
  model: string,          // Whisper model name
  options: {
    language?: string,     // Target language (optional)
    enableTimestamps?: boolean,
    enableSpeakerDiarization?: boolean
  }
})

// Response
{
  success: boolean,
  jobId?: string,         // Unique job identifier
  error?: string
}
```

#### `check-dependencies`

Verify that all required dependencies are available.

```javascript
// Request
ipcRenderer.invoke('check-dependencies')

// Response
{
  success: boolean,
  dependencies: {
    ffmpeg: {
      installed: boolean,
      version?: string,
      path?: string
    },
    whisper: {
      installed: boolean,
      modelsAvailable: string[]
    }
  }
}
```

#### `get-app-info`

Retrieve application information and configuration.

```javascript
// Request
ipcRenderer.invoke('get-app-info')

// Response
{
  success: boolean,
  appInfo: {
    version: string,
    platform: string,
    arch: string,
    supportedFormats: string[],
    availableModels: string[]
  }
}
```

## SelfContainedTranscriber API

The `SelfContainedTranscriber` class provides the core transcription functionality.

### Constructor

```javascript
new SelfContainedTranscriber(options)
```

#### Options

```javascript
{
  modelPath?: string,      // Custom path to Whisper models
  ffmpegPath?: string,     // Custom path to FFmpeg binary
  outputDir?: string,      // Default output directory
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}
```

### Methods

#### `checkDependencies()`

Check if required dependencies are installed.

```javascript
// Returns
Promise<{
  ffmpeg: boolean,
  whisper: boolean,
  python: boolean
}>
```

#### `extractAudio(videoPath, outputPath)`

Extract audio from video file.

```javascript
// Parameters
videoPath: string,         // Path to video file
outputPath: string         // Path for output audio file

// Returns
Promise<{
  success: boolean,
  outputPath?: string,
  error?: string
}>
```

#### `transcribeAudio(audioPath, options)`

Transcribe audio file using Whisper.

```javascript
// Parameters
audioPath: string,         // Path to audio file
options: {
  model: string,          // Whisper model name
  language?: string,      // Target language
  enableTimestamps?: boolean,
  enableSpeakerDiarization?: boolean
}

// Returns
Promise<{
  success: boolean,
  transcription?: string,
  segments?: Array<{
    start: number,
    end: number,
    text: string,
    speaker?: string
  }>,
  error?: string
}>
```

#### `transcribeVideo(videoPath, outputPath, options)`

Complete video transcription workflow.

```javascript
// Parameters
videoPath: string,         // Path to video file
outputPath: string,        // Path for output transcription
options: {
  model: string,
  language?: string,
  enableTimestamps?: boolean,
  enableSpeakerDiarization?: boolean,
  format?: 'txt' | 'srt' | 'vtt' | 'json'
}

// Returns
Promise<{
  success: boolean,
  outputPath?: string,
  duration?: number,
  error?: string
}>
```

## Theme API

### Theme Management

```javascript
// Get current theme
const currentTheme = localStorage.getItem('theme') || 'dark'

// Set theme
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  setTheme(newTheme)
}
```

### Theme Variables

#### Dark Theme
```css
:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --accent: #0066cc;
  --border: #404040;
}
```

#### Light Theme
```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --accent: #0066cc;
  --border: #e0e0e0;
}
```

## Error Handling

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `E_NO_FFMPEG` | FFmpeg not found | Install FFmpeg or specify path |
| `E_NO_WHISPER` | Whisper not available | Install Whisper package |
| `E_INVALID_FILE` | Invalid video file | Check file format and permissions |
| `E_TRANSCRIPTION_FAILED` | Transcription failed | Check model and audio quality |
| `E_OUTPUT_ERROR` | Output write failed | Check disk space and permissions |

### Error Response Format

```javascript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

## Events

### Custom Events

#### `file-selected`

Fired when files are selected in the file browser.

```javascript
document.addEventListener('file-selected', (event) => {
  const files = event.detail.files
  // Handle selected files
})
```

#### `transcription-started`

Fired when transcription begins.

```javascript
document.addEventListener('transcription-started', (event) => {
  const jobId = event.detail.jobId
  // Handle transcription start
})
```

## Extension Points

### Custom Transcription Engines

Implement a custom transcription engine by extending the base class:

```javascript
class CustomTranscriber extends SelfContainedTranscriber {
  async transcribeAudio(audioPath, options) {
    // Custom implementation
  }
}
```

### Custom File Handlers

Add support for additional file formats:

```javascript
// Register custom file handler
ipcRenderer.handle('process-custom-format', async (event, filePath) => {
  // Custom processing logic
})
```

## Integration Examples

### Basic Usage

```javascript
// In renderer process
async function startTranscription() {
  const files = await ipcRenderer.invoke('select-files')
  if (files.success && files.files.length > 0) {
    const result = await ipcRenderer.invoke('start-transcription', {
      files: files.files,
      outputFolder: '/path/to/output',
      model: 'base'
    })
    
    if (result.success) {
      console.log('Transcription started:', result.jobId)
    }
  }
}
```

### Progress Monitoring

```javascript
// Listen for progress updates
ipcRenderer.on('transcription-progress', (event, data) => {
  console.log(`Progress: ${data.progress}% - ${data.message}`)
  updateProgressBar(data.progress)
})

// Listen for completion
ipcRenderer.on('transcription-complete', (event, data) => {
  console.log(`Completed: ${data.successful}/${data.totalProcessed}`)
  showCompletionNotification(data)
})
```

## Security Considerations

1. **File Path Validation**: Always validate file paths to prevent directory traversal
2. **Input Sanitization**: Sanitize all user inputs before processing
3. **Resource Limits**: Implement limits on file sizes and concurrent operations
4. **Error Information**: Avoid exposing sensitive system information in error messages

## Performance Considerations

1. **Batch Processing**: Process multiple files in parallel when possible
2. **Memory Management**: Clean up temporary files and release resources
3. **Progress Throttling**: Throttle progress updates to avoid UI lag
4. **Model Caching**: Cache Whisper models in memory for repeated use