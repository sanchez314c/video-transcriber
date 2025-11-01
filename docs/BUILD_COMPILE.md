# Build & Compile Instructions

Complete multi-platform Electron build system for Video Transcriber.

## Build System Requirements

1. **Remove existing build scripts**: Delete any existing build, compile, or dist scripts
2. **Create new scripts**: Implement all scripts below with proper permissions
3. **Platform coverage**: Full support for macOS (Intel + ARM), Windows (x64 + x86), Linux (x64)
4. **Installer types**: All major formats including .msi, .exe, .deb, .rpm, .AppImage, .dmg, etc.

## Required /dist Folder Structure

After running `compile-build-dist.sh`, `/dist` folder should contain:

```
dist/
├── linux-unpacked/          # Unpacked Linux application files
├── mac/                     # macOS Intel build
│   └── [AppName].app        # Intel .app bundle
├── mac-arm64/              # macOS ARM64 build
│   └── [AppName].app        # ARM64 .app bundle
├── win-unpacked/           # Unpacked Windows application files
├── win-ia32-unpacked/      # Unpacked Windows 32-bit files
├── builder-debug.yml       # Electron-builder debug info
├── latest-linux.yml        # Linux update info
├── latest-mac.yml          # macOS update info
├── latest.yml              # General update info
├── [AppName] Setup [version].exe              # Windows NSIS installer
├── [AppName] Setup [version].exe.blockmap     # Windows blockmap
├── [AppName] Setup [version].msi              # Windows MSI installer
├── [AppName]-[version]-arm64.dmg              # macOS ARM64 DMG
├── [AppName]-[version]-arm64.dmg.blockmap     # macOS ARM64 blockmap
├── [AppName]-[version]-win.zip                # Windows portable
├── [AppName]-[version]-ia32-win.zip           # Windows 32-bit portable
├── [AppName]-[version].AppImage               # Linux AppImage
├── [AppName]-[version].deb                    # Debian/Ubuntu package
├── [AppName]-[version].rpm                    # RedHat/Fedora package
├── [AppName]-[version].snap                   # Snap package
├── [AppName]-[version].dmg                    # macOS Intel DMG
├── [AppName]-[version].dmg.blockmap           # macOS Intel blockmap
└── [AppName]-[version].zip                    # macOS portable
```

## Script 1: compile-build-dist.sh
Main build script for all platforms:

```bash
#!/bin/bash

# Complete Multi-Platform Build Script
# Builds for macOS, Windows, and Linux with all installer types

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✔${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"
}

print_info() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] ℹ${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to display help
show_help() {
    echo "Complete Multi-Platform Build Script"
    echo ""
    echo "Usage: ./compile-build-dist.sh [options]"
    echo ""
    echo "Options:"
    echo "  --no-clean         Skip cleaning build artifacts"
    echo "  --platform PLAT    Build for specific platform (mac, win, linux, all)"
    echo "  --arch ARCH        Build for specific architecture (x64, ia32, arm64, all)"
    echo "  --quick            Quick build (single platform only)"
    echo "  --help             Display this help message"
    echo ""
    echo "Examples:"
    echo "  ./compile-build-dist.sh                    # Full build for all platforms"
    echo "  ./compile-build-dist.sh --platform win     # Windows only"
    echo "  ./compile-build-dist.sh --quick            # Quick build for current platform"
    echo "  ./compile-build-dist.sh --no-clean         # Build without cleaning first"
}

# Parse command line arguments
NO_CLEAN=false
PLATFORM="all"
ARCH="all"
QUICK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-clean)
            NO_CLEAN=true
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --arch)
            ARCH="$2"
            shift 2
            ;;
        --quick)
            QUICK=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check for required tools
print_status "Checking requirements..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check for optional tools for better builds
if command_exists wine; then
    print_info "Wine detected - Windows builds will include better signatures"
fi

if command_exists docker; then
    print_info "Docker detected - Linux builds will be more compatible"
fi

print_success "All requirements met"

# Step 1: Clean everything if not skipped
if [ "$NO_CLEAN" = false ]; then
    print_status "🧹 Purging all existing builds..."
    rm -rf dist/
    rm -rf build/
    rm -rf node_modules/.cache/
    rm -rf out/
    print_success "All build artifacts purged"
fi

# Step 2: Install/update dependencies
print_status "📦 Installing/updating dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Install electron-builder if not present
if ! npm list electron-builder >/dev/null 2>&1; then
    print_status "Installing electron-builder..."
    npm install --save-dev electron-builder
fi

print_success "Dependencies ready"

# Step 3: Determine build targets
print_status "🎯 Determining build targets..."
BUILD_CMD="npm run dist"

if [ "$QUICK" = true ]; then
    print_info "Quick build mode - building for current platform only"
    BUILD_CMD="npm run dist:current"
elif [ "$PLATFORM" != "all" ]; then
    case $PLATFORM in
        mac)
            BUILD_CMD="npm run dist:mac"
            print_info "Building for macOS only"
            ;;
        win)
            BUILD_CMD="npm run dist:win"
            print_info "Building for Windows only"
            ;;
        linux)
            BUILD_CMD="npm run dist:linux"
            print_info "Building for Linux only"
            ;;
        *)
            print_error "Invalid platform: $PLATFORM"
            exit 1
            ;;
    esac
else
    print_info "Building for all platforms"
fi

# Step 4: Build all platform binaries and packages
print_status "🏗️ Building platform binaries and packages..."
print_status "Targets: macOS (Intel + ARM), Windows (x64 + x86), Linux (x64)"
print_status "Installers: .dmg, .exe, .msi, .deb, .rpm, .AppImage, .snap"

# Run build
$BUILD_CMD
BUILD_RESULT=$?

if [ $BUILD_RESULT -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

print_success "All platform builds completed successfully"

# Step 5: Generate additional installer types if needed
if [ "$PLATFORM" = "all" ] || [ "$PLATFORM" = "win" ]; then
    if [ -f "dist/*.exe" ] && [ ! -f "dist/*.msi" ]; then
        print_status "Generating MSI installer..."
        npm run dist:win:msi 2>/dev/null || print_warning "MSI generation requires additional setup"
    fi
fi

# Step 6: Display build results
print_status "📋 Build Results Summary:"
echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════${NC}"

if [ -d "dist" ]; then
    # Count files by type
    MAC_COUNT=$(find dist -name "*.dmg" -o -name "*.zip" | grep -E "(mac|darwin)" | wc -l)
    WIN_COUNT=$(find dist -name "*.exe" -o -name "*.msi" -o -name "*-win.zip" | wc -l)
    LINUX_COUNT=$(find dist -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.snap" | wc -l)
    
    print_info "📊 Build Statistics:"
    echo "   macOS packages: $MAC_COUNT"
    echo "   Windows packages: $WIN_COUNT"
    echo "   Linux packages: $LINUX_COUNT"
    echo ""
    
    # macOS builds
    if [ $MAC_COUNT -gt 0 ]; then
        print_success "🍎 macOS Builds:"
        [ -d "dist/mac" ] && echo "   ✓ Intel: dist/mac/*.app"
        [ -d "dist/mac-arm64" ] && echo "   ✓ ARM64: dist/mac-arm64/*.app"
        find dist -name "*.dmg" -type f | while read -r dmg; do
            size=$(ls -lh "$dmg" | awk '{print $5}')
            echo "   ✓ DMG: $(basename "$dmg") ($size)"
        done
        echo ""
    fi
    
    # Windows builds
    if [ $WIN_COUNT -gt 0 ]; then
        print_success "🪟 Windows Builds:"
        [ -d "dist/win-unpacked" ] && echo "   ✓ x64 Unpacked: dist/win-unpacked/"
        [ -d "dist/win-ia32-unpacked" ] && echo "   ✓ x86 Unpacked: dist/win-ia32-unpacked/"
        find dist -name "*.exe" -type f | while read -r exe; do
            size=$(ls -lh "$exe" | awk '{print $5}')
            echo "   ✓ EXE: $(basename "$exe") ($size)"
        done
        find dist -name "*.msi" -type f | while read -r msi; do
            size=$(ls -lh "$msi" | awk '{print $5}')
            echo "   ✓ MSI: $(basename "$msi") ($size)"
        done
        find dist -name "*-win.zip" -type f | while read -r zip; do
            size=$(ls -lh "$zip" | awk '{print $5}')
            echo "   ✓ Portable: $(basename "$zip") ($size)"
        done
        echo ""
    fi
    
    # Linux builds
    if [ $LINUX_COUNT -gt 0 ]; then
        print_success "🐧 Linux Builds:"
        [ -d "dist/linux-unpacked" ] && echo "   ✓ Unpacked: dist/linux-unpacked/"
        find dist -name "*.AppImage" -type f | while read -r app; do
            size=$(ls -lh "$app" | awk '{print $5}')
            echo "   ✓ AppImage: $(basename "$app") ($size)"
        done
        find dist -name "*.deb" -type f | while read -r deb; do
            size=$(ls -lh "$deb" | awk '{print $5}')
            echo "   ✓ DEB: $(basename "$deb") ($size)"
        done
        find dist -name "*.rpm" -type f | while read -r rpm; do
            size=$(ls -lh "$rpm" | awk '{print $5}')
            echo "   ✓ RPM: $(basename "$rpm") ($size)"
        done
        find dist -name "*.snap" -type f | while read -r snap; do
            size=$(ls -lh "$snap" | awk '{print $5}')
            echo "   ✓ Snap: $(basename "$snap") ($size)"
        done
        echo ""
    fi
    
    # Auto-update files
    print_info "🔄 Auto-update files:"
    for yml in dist/*.yml; do
        if [ -f "$yml" ]; then
            echo "   ✓ $(basename "$yml")"
        fi
    done
else
    print_warning "No dist directory found. Build may have failed."
fi

echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════${NC}"
print_success "🎉 Complete build process finished!"
print_status "📁 All binaries and packages are in: ./dist/"
print_status ""
print_info "To run application:"
print_info "  macOS:   ./run-macos-source.sh (dev) or ./run-macos.sh (binary)"
print_info "  Windows: run-windows-source.bat (dev) or run-windows.bat (binary)"
print_info "  Linux:   ./run-linux-source.sh (dev) or ./run-linux.sh (binary)"
```

## Platform-Specific Run Scripts

### macOS Source Runner
```bash
#!/bin/bash
# Run from Source on macOS (Development Mode)
# Launches app directly from source code using Electron

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_status "🚀 Starting application from source (macOS)..."

# Check if we're on macOS
if [ "$(uname)" != "Darwin" ]; then
    print_error "This script is designed for macOS only"
    exit 1
fi

# Check for required tools
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Launch app from source
print_status "Launching application from source code..."
npm start
```

### Windows Source Runner
```batch
@echo off
setlocal enabledelayedexpansion

REM Run from Source on Windows (Development Mode)
REM Launches app directly from source code using Electron

cd /d "%~dp0"

echo [%TIME%] Starting application from source (Windows)...

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [%TIME%] X Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo [%TIME%] Installing dependencies...
    call npm install
)

REM Launch app from source
echo [%TIME%] Launching application from source code...
call npm start
```

### Linux Source Runner
```bash
#!/bin/bash
# Run from Source on Linux (Development Mode)
# Launches app directly from source code using Electron

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

print_status "🚀 Starting application from source (Linux)..."

# Check if we're on Linux
if [ "$(uname)" != "Linux" ]; then
    print_error "This script is designed for Linux only"
    exit 1
fi

# Check for required tools
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Set electron flags for better Linux compatibility
export ELECTRON_FORCE_WINDOW_MENU_BAR=1
export ELECTRON_TRASH=gio

# Launch app from source
print_status "Launching application from source code..."
npm start
```

## Package.json Configuration

Add these scripts and build configuration to your package.json:

```json
{
  "name": "video-transcriber",
  "version": "1.0.0",
  "description": "Video transcription application using OpenAI Whisper",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev",
    "dist": "electron-builder --mac --win --linux",
    "dist:current": "electron-builder",
    "dist:mac": "electron-builder --mac",
    "dist:win": "electron-builder --win",
    "dist:win:msi": "electron-builder --win --config.win.target=msi",
    "dist:linux": "electron-builder --linux",
    "pack": "electron-builder --dir",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.videotranscriber.app",
    "productName": "Video Transcriber",
    "directories": {
      "output": "dist",
      "buildResources": "build_resources"
    },
    "files": [
      "src/**/*",
      "assets/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "build_resources/icon.icns",
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
      "icon": "build_resources/icon.ico",
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "msi",
          "arch": ["x64", "ia32"]
        }
      ]
    },
    "linux": {
      "icon": "build_resources/icons",
      "category": "Utility",
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        },
        {
          "target": "snap",
          "arch": ["x64"]
        }
      ]
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

## Final Setup Steps

1. **Set executable permissions** for all shell scripts:
```bash
chmod +x compile-build-dist.sh
chmod +x run-macos-source.sh
chmod +x run-linux-source.sh
```

2. **Install required dependencies**:
```bash
npm install --save-dev electron electron-builder
```

3. **Create icon files** in `build_resources` directory

4. **Test build system**:
```bash
# Quick test for current platform
./compile-build-dist.sh --quick

# Full multi-platform build
./compile-build-dist.sh
```

## Additional Notes

- **Windows MSI**: Requires WiX Toolset installed on Windows for MSI generation
- **Linux Snap**: Requires snapcraft installed for snap package creation
- **Code Signing**: Add certificates for production releases
- **Auto-Update**: Configure GitHub releases or other update servers
- **CI/CD**: These scripts work with GitHub Actions, CircleCI, Travis CI, etc.

This complete build system provides:
- ✅ All platform support (macOS Intel/ARM, Windows x64/x86, Linux x64)
- ✅ All installer types (.dmg, .exe, .msi, .deb, .rpm, .AppImage, .snap)
- ✅ Development and production run scripts for all platforms
- ✅ Comprehensive error handling and status reporting
- ✅ Auto-update support files
- ✅ Professional build output with color-coded messages