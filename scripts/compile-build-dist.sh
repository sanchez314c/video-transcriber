#!/bin/bash

# Complete Multi-Platform Build Script for Video Transcriber
# Builds for macOS, Windows, and Linux with all installer types

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

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
    echo "Video Transcriber - Complete Multi-Platform Build Script"
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
    echo "  ./compile-build-dist.sh --no-clean   # Build without cleaning first"
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

print_success "All requirements met"


# Step 1: Clean everything if not skipped
if [ "$NO_CLEAN" = false ]; then
    print_status "🧹 Purging all existing builds..."
    rm -rf dist/
    rm -rf build/
    rm -rf node_modules/.cache/
    print_success "All build artifacts purged"
fi

# Step 2: Install/update dependencies
print_status "📦 Installing/updating dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_success "Dependencies ready"

# Step 3: Determine build targets
print_status "🎯 Determining build targets..."
BUILD_CMD=""

if [ "$QUICK" = true ]; then
    print_info "Quick build mode - building for current platform only"
    BUILD_CMD="npm run build"
elif [ "$PLATFORM" != "all" ]; then
    case $PLATFORM in
        mac)
            if [ "$ARCH" = "arm64" ]; then
                BUILD_CMD="npm run build:mac-arm"
            elif [ "$ARCH" = "x64" ]; then
                BUILD_CMD="npm run build:mac-intel"
            else
                BUILD_CMD="npm run build:mac-universal"
            fi
            print_info "Building for macOS"
            ;;
        win)
            BUILD_CMD="npm run build:win"
            print_info "Building for Windows"
            ;;
        linux)
            BUILD_CMD="npm run build:linux"
            print_info "Building for Linux"
            ;;
        *)
            print_error "Invalid platform: $PLATFORM"
            exit 1
            ;;
    esac
else
    print_info "Building for all platforms"
    BUILD_CMD="npm run dist:all"
fi

# Step 4: Build all platform binaries and packages
print_status "🏗️  Building Video Transcriber..."
print_status "Targets: macOS (Intel + ARM), Windows (x64), Linux (x64)"
print_status "Installers: .dmg, .exe, .msi, .deb, .rpm, .AppImage"

# Run the build
$BUILD_CMD
BUILD_RESULT=$?

if [ $BUILD_RESULT -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

print_success "All platform builds completed successfully"

# Step 4: Display build results
print_status "📋 Build Results:"
if [ -d "dist" ]; then
    echo ""
    print_status "📁 Generated binaries and packages:"
    
    # List all files in dist with details
    find dist -type f \( -name "*.app" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.dmg" -o -name "*.zip" \) -exec ls -lh {} \; | while read -r line; do
        filename=$(echo "$line" | awk '{print $NF}' | sed 's|.*/||')
        filesize=$(echo "$line" | awk '{print $5}')
        echo -e "   ${GREEN}✓${NC} $filename ($filesize)"
    done
    
    echo ""
    print_status "📊 Platform Summary:"
    
    # Check for each platform
    if [ -d "dist/mac" ] || [ -d "dist/mac-arm64" ]; then
        print_success "macOS builds: ✓"
        [ -d "dist/mac" ] && echo "   - Intel: dist/mac/Video Transcriber.app"
        [ -d "dist/mac-arm64" ] && echo "   - ARM64: dist/mac-arm64/Video Transcriber.app"
    fi
    
    if find dist -name "*.exe" -type f | grep -q .; then
        print_success "Windows build: ✓"
        find dist -name "*.exe" -type f | head -1 | sed 's|^|   - |'
    fi
    
    if find dist -name "*.AppImage" -type f | grep -q .; then
        print_success "Linux build: ✓"
        find dist -name "*.AppImage" -type f | head -1 | sed 's|^|   - |'
    fi
else
    print_warning "No dist directory found. Build may have failed."
fi

echo ""
print_success "🎉 Complete build process finished!"
print_status "📁 All binaries and packages are in: ./dist/"
print_status "🌍 Platforms built: macOS (Intel+ARM), Windows (x64), Linux (x64)"
print_status ""
print_status "To run the app:"
print_status "  From source: ./run-macos-source.sh"
print_status "  From binary: ./run-macos.sh"