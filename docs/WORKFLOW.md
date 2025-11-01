# Development Workflow

This document outlines the development workflow for Video Transcriber, including setup, coding practices, testing, and release processes.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 16 or higher
- **npm**: Version 7 or higher
- **Git**: For version control
- **FFmpeg**: For audio processing
- **Code Editor**: VS Code recommended

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/video-transcriber.git
   cd video-transcriber
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify FFmpeg**
   ```bash
   ffmpeg -version
   # If not found, install based on your OS
   ```

4. **Run Development Mode**
   ```bash
   npm run dev
   ```

### Development Environment

#### VS Code Setup

Install recommended extensions:
- ESLint
- Prettier
- GitLens
- Electron Debugger

Configure workspace settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": ["src"],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

#### Environment Variables

Create `.env` file for development:
```
NODE_ENV=development
LOG_LEVEL=debug
FFMPEG_PATH=/usr/local/bin/ffmpeg
WHISPER_MODEL_PATH=./models
```

## 📝 Coding Standards

### Code Style

Follow these conventions for consistent code:

#### JavaScript/TypeScript
- Use 2 spaces for indentation
- Use single quotes for strings
- Use camelCase for variables
- Use PascalCase for classes
- Add JSDoc comments for functions

```javascript
/**
 * Transcribes audio file using Whisper model
 * @param {string} audioPath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} Transcription result
 */
async function transcribeAudio(audioPath, options) {
  // Implementation
}
```

#### CSS
- Use kebab-case for class names
- Group related styles
- Use CSS custom properties for theming
- Mobile-first responsive design

```css
.transcription-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--color-primary);
}
```

#### File Naming
- Use kebab-case for files
- Be descriptive but concise
- Group related files in folders

```
src/
├── components/
│   ├── file-browser.js
│   ├── progress-bar.js
│   └── theme-toggle.js
├── services/
│   ├── transcription-service.js
│   └── file-service.js
└── utils/
    ├── logger.js
    └── helpers.js
```

### Git Workflow

#### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: Individual feature branches
- **hotfix/***: Critical fixes for production

#### Commit Messages

Use conventional commits format:

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
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(transcription): add speaker diarization
fix(ui): resolve theme switching flicker
docs(api): update IPC documentation
```

#### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

4. **Create Pull Request**
   - Use PR template
   - Describe changes clearly
   - Link to relevant issues
   - Request code review

## 🧪 Testing

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── components/
│   ├── services/
│   └── utils/
├── integration/       # Integration tests
│   ├── ipc/
│   └── workflows/
├── e2e/             # End-to-end tests
│   ├── scenarios/
│   └── fixtures/
└── fixtures/         # Test data
    ├── audio/
    ├── video/
    └── transcriptions/
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Writing Tests

#### Unit Tests

```javascript
// tests/unit/services/transcription-service.test.js
const { expect } = require('chai');
const TranscriptionService = require('../../../src/services/transcription-service');

describe('TranscriptionService', () => {
  let service;

  beforeEach(() => {
    service = new TranscriptionService();
  });

  it('should transcribe audio file', async () => {
    const result = await service.transcribe('test.wav', { model: 'base' });
    expect(result).to.have.property('text');
    expect(result).to.have.property('segments');
  });
});
```

#### Integration Tests

```javascript
// tests/integration/ipc/handlers.test.js
const { expect } = require('chai');
const { ipcMain } = require('electron');
const { setupIpcHandlers } = require('../../../src/main');

describe('IPC Handlers', () => {
  beforeEach(() => {
    setupIpcHandlers();
  });

  it('should handle select-files request', async () => {
    const result = await ipcMain.handle('select-files', {});
    expect(result).to.have.property('success');
  });
});
```

#### E2E Tests

```javascript
// tests/e2e/transcription-workflow.test.js
const { Application } = require('spectron');

describe('Transcription Workflow', () => {
  let app;

  beforeEach(async () => {
    app = new Application({
      path: './dist/Video Transcriber.app'
    });
    await app.start();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('should complete full transcription workflow', async () => {
    await app.client.click('#select-files');
    await app.client.chooseFile('#file-input', './test/fixtures/video.mp4');
    await app.client.click('#start-transcription');
    
    const result = await app.client.waitForExist('#transcription-complete');
    expect(result).to.be.true;
  });
});
```

## 🔧 Build Process

### Development Build

```bash
# Quick build for testing
npm run pack

# Run with hot reload
npm run dev

# Debug build
npm run build:debug
```

### Production Build

```bash
# Build for current platform
npm run dist:current

# Build for all platforms
npm run dist:all

# Platform-specific builds
npm run dist:mac
npm run dist:win
npm run dist:linux
```

### Build Configuration

`electron-builder.json`:
```json
{
  "appId": "com.videotranscriber.app",
  "productName": "Video Transcriber",
  "directories": {
    "output": "dist",
    "buildResources": "build_resources"
  },
  "files": [
    "src/**/*",
    "package.json",
    "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!**/node_modules/*.d.ts",
    "!**/node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip",
        "arch": ["x64", "arm64"]
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      },
      {
        "target": "msi",
        "arch": ["x64"]
      }
    ]
  },
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      },
      {
        "target": "deb",
        "arch": ["x64"]
      }
    ]
  }
}
```

## 📦 Release Process

### Version Management

Use semantic versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Pre-Release Checklist

1. **Code Quality**
   - [ ] All tests passing
   - [ ] Code coverage > 80%
   - [ ] No ESLint errors
   - [ ] Documentation updated

2. **Testing**
   - [ ] Manual testing on all platforms
   - [ ] E2E tests passing
   - [ ] Performance benchmarks
   - [ ] Security scan

3. **Build Verification**
   - [ ] Clean build from scratch
   - [ ] All platform builds successful
   - [ ] Installers tested
   - [ ] Signatures verified

### Release Steps

1. **Update Version**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Update Changelog**
   - Add release notes to CHANGELOG.md
   - Include breaking changes
   - List new features and fixes

3. **Create Tag**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

4. **Build Release**
   ```bash
   npm run dist:all
   ```

5. **Create GitHub Release**
   - Upload build artifacts
   - Add release notes
   - Link to changelog

6. **Publish**
   - Publish to npm (if applicable)
   - Update website
   - Send notifications

## 🔄 Continuous Integration

### GitHub Actions

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        
  build:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run dist:current
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ matrix.os }}
          path: dist/
```

## 📊 Monitoring & Analytics

### Performance Monitoring

Track key metrics:
- Build time
- Test coverage
- Bundle size
- Memory usage
- CPU usage

### Error Tracking

Implement error reporting:
- Sentry integration
- Crash reports
- User feedback
- Automatic bug reports

## 📚 Documentation Workflow

### Documentation Types

1. **Code Documentation**
   - JSDoc comments
   - README files
   - Inline comments

2. **User Documentation**
   - Quick start guide
   - User manual
   - FAQ
   - Tutorials

3. **Developer Documentation**
   - API reference
   - Architecture guide
   - Contributing guide
   - Development setup

### Documentation Updates

- Update docs with every feature
- Review docs quarterly
- Keep examples current
- Validate all links

## 🤝 Collaboration

### Code Review Process

1. **Self-Review**
   - Test your changes
   - Check for edge cases
   - Update documentation

2. **Peer Review**
   - Request at least one review
   - Address feedback promptly
   - Keep discussions constructive

3. **Approval**
   - Get approval before merging
   - Ensure CI passes
   - Resolve all conflicts

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord/Slack**: Real-time collaboration
- **Email**: Private discussions

## 🎯 Best Practices

### Security

- Validate all inputs
- Use secure IPC communication
- Keep dependencies updated
- Follow security best practices

### Performance

- Profile regularly
- Optimize critical paths
- Use lazy loading
- Monitor resource usage

### Accessibility

- Follow WCAG guidelines
- Test with screen readers
- Provide keyboard navigation
- Use semantic HTML

This workflow ensures consistent, high-quality development while maintaining a collaborative and efficient environment.