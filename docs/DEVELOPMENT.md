# Development Guide

This guide covers setting up a development environment for Video Transcriber.

## Prerequisites

### System Requirements
- **Node.js**: 16.0 or higher
- **npm**: 7.0 or higher
- **Python**: 3.7 or higher
- **Git**: Latest version
- **IDE**: VS Code (recommended) or similar

### Platform-Specific Requirements

#### macOS
- Xcode Command Line Tools
- macOS 10.14 or higher

```bash
# Install Xcode CLI
xcode-select --install
```

#### Windows
- Visual Studio Build Tools 2019 or later
- Windows 10 SDK

```cmd
# Install via npm
npm install --global --production windows-build-tools
```

#### Linux
- Build essentials
- Python development headers

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3-dev

# Fedora/CentOS
sudo dnf groupinstall "Development Tools"
sudo dnf install python3-devel
```

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/your-username/video-transcriber.git
cd video-transcriber
```

### 2. Install Node Dependencies
```bash
npm install
```

### 3. Install Python Dependencies
```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 4. Install FFmpeg
```bash
# macOS
brew install ffmpeg

# Windows (using Chocolatey)
choco install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg

# Linux (Fedora)
sudo dnf install ffmpeg
```

## Development Workflow

### Running in Development Mode

#### Option 1: Using npm scripts
```bash
# Development with hot reload
npm run dev

# Standard development mode
npm start
```

#### Option 2: Using platform scripts
```bash
# macOS
./run-source-macos.sh

# Linux
./run-source-linux.sh

# Windows
run-source-windows.bat
```

### Development Features

When running in development mode:
- **Hot Reload**: Changes to source files automatically reload
- **DevTools**: Chrome DevTools opened automatically
- **Verbose Logging**: Detailed console output
- **Unminified Code**: Easier debugging

## Project Structure

```
video-transcriber/
├── src/                    # Source code
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload script
│   ├── renderer.js        # Renderer process
│   ├── index.html         # Main UI
│   ├── styles.css         # Application styles
│   └── transcription-engine.js  # Transcription logic
├── assets/               # Static assets
│   ├── icons/           # Application icons
│   └── images/          # UI images
├── build_resources/       # Build assets
│   ├── icon.icns        # macOS icon
│   ├── icon.ico         # Windows icon
│   └── icons/           # Linux icons
├── scripts/              # Utility scripts
├── docs/                # Documentation
└── tests/               # Test files
```

## Coding Standards

### JavaScript Style Guide

#### Formatting
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons at end of statements
- Maximum line length: 100 characters

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userName = 'john';
function getUserData() {}

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Classes: PascalCase
class TranscriptionEngine {}

// Files: kebab-case
// transcription-engine.js
// file-manager.js
```

#### Best Practices
```javascript
// Use async/await instead of callbacks
async function transcribeFile(filePath) {
  try {
    const result = await whisper.transcribe(filePath);
    return result;
  } catch (error) {
    console.error('Transcription failed:', error);
    throw error;
  }
}

// Use destructuring
const { name, size, duration } = videoFile;

// Use template literals
const message = `Processing ${name} (${formatSize(size)})`;
```

### Code Organization

#### Module Structure
```javascript
// transcription-engine.js
class TranscriptionEngine {
  constructor(options) {
    this.options = options;
    this.isRunning = false;
  }

  // Public methods
  async start() {}
  async stop() {}
  async transcribe(filePath) {}

  // Private methods
  _validateFile(filePath) {}
  _updateProgress(percent) {}
  _handleError(error) {}
}

module.exports = TranscriptionEngine;
```

#### Error Handling
```javascript
// Always handle errors gracefully
async function processFiles(files) {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await transcribeFile(file);
      results.push({ file, result, success: true });
    } catch (error) {
      results.push({ file, error: error.message, success: false });
      logger.error(`Failed to process ${file}:`, error);
    }
  }
  
  return results;
}
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- transcription-engine.test.js
```

### Writing Tests

#### Unit Tests
```javascript
// tests/transcription-engine.test.js
const { expect } = require('chai');
const TranscriptionEngine = require('../src/transcription-engine');

describe('TranscriptionEngine', () => {
  let engine;
  
  beforeEach(() => {
    engine = new TranscriptionEngine({ model: 'tiny' });
  });
  
  it('should initialize with default options', () => {
    expect(engine.options.model).to.equal('tiny');
    expect(engine.isRunning).to.be.false;
  });
  
  it('should transcribe audio file', async () => {
    const result = await engine.transcribe('test.mp4');
    expect(result).to.have.property('text');
    expect(result).to.have.property('confidence');
  });
});
```

#### Integration Tests
```javascript
// tests/integration/file-processing.test.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

describe('File Processing Integration', () => {
  let window;
  
  before(async () => {
    await app.whenReady();
    window = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
  });
  
  it('should process dropped files', async () => {
    const testFile = path.join(__dirname, 'fixtures/test.mp4');
    const result = await window.webContents.executeJavaScript(`
      window.processFile('${testFile}')
    `);
    
    expect(result.success).to.be.true;
  });
});
```

## Debugging

### Main Process Debugging
```bash
# Enable Node.js debugging
npm run dev -- --inspect=9229

# Connect Chrome DevTools to chrome://inspect
```

### Renderer Process Debugging
- Open DevTools with F12
- Use `debugger;` statements
- Use `console.log()` for output

### Debugging Tips
```javascript
// Use conditional breakpoints
if (file.name.includes('test')) {
  debugger;
}

// Log with context
console.log('Processing file:', {
  name: file.name,
  size: file.size,
  type: file.type
});

// Use performance marks
performance.mark('transcription-start');
// ... do work
performance.mark('transcription-end');
performance.measure('transcription', 'transcription-start', 'transcription-end');
```

## Performance Optimization

### Profiling
```javascript
// Use Chrome DevTools Performance tab
// Or programmatically:
const { performance } = require('perf_hooks');

function startProfile() {
  performance.mark('start');
}

function endProfile(label) {
  performance.mark(label);
  performance.measure(label, 'start', label);
  const measure = performance.getEntriesByName(label)[0];
  console.log(`${label}: ${measure.duration}ms`);
}
```

### Memory Management
```javascript
// Clean up resources
class TranscriptionEngine {
  async transcribe(file) {
    const buffer = await fs.readFile(file);
    
    try {
      // Process file
      const result = await this._process(buffer);
      return result;
    } finally {
      // Clear buffer
      buffer.fill(0);
    }
  }
}
```

## Git Workflow

### Branch Strategy
- `main`: Stable releases
- `develop`: Integration branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical fixes

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Build process

Examples:
```
feat(transcription): add support for large model

Add option to use the large Whisper model for improved accuracy.
Increases memory usage but provides better results.

Closes #123
```

## Environment Configuration

### Development Variables
Create `.env` file:
```env
NODE_ENV=development
LOG_LEVEL=debug
WHISPER_MODEL=tiny
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

### Production Variables
```env
NODE_ENV=production
LOG_LEVEL=info
WHISPER_MODEL=base
UPDATE_SERVER=https://api.videotranscriber.com
```

## Common Development Tasks

### Adding New Feature
1. Create feature branch
2. Write tests first
3. Implement feature
4. Update documentation
5. Run tests
6. Submit PR

### Fixing Bug
1. Create bugfix branch
2. Write failing test
3. Fix bug
4. Verify test passes
5. Check for regressions
6. Submit PR

### Updating Dependencies
```bash
# Check for outdated packages
npm outdated

# Update specific package
npm install package@latest

# Update all packages
npm update
```

## Resources

### Documentation
- [Electron Documentation](https://electronjs.org/docs)
- [Node.js Documentation](https://nodejs.org/docs/)
- [OpenAI Whisper](https://github.com/openai/whisper)

### Tools
- [Electron Fiddle](https://electronfiddle.com/)
- [DevTools Extensions](https://chrome.google.com/webstore/category/extensions)
- [VS Code Extensions](https://marketplace.visualstudio.com/)

### Community
- [Electron Discord](https://discord.gg/electron)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/electron)
- [GitHub Discussions](https://github.com/electron/electron/discussions)