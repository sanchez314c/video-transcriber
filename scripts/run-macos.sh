#!/bin/bash

# Run VideoTranscriber from Compiled Binary - macOS
# Launches the compiled application from dist folder

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="VideoTranscriber"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"
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

# Function to detect architecture
detect_arch() {
    local arch=$(uname -m)
    if [ "$arch" = "arm64" ]; then
        echo "arm64"
    else
        echo "x64"
    fi
}

print_status "🚀 Launching compiled VideoTranscriber application..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    print_error "No dist/ directory found. Please run ./scripts/compile-build-dist.sh first."
    exit 1
fi

# Detect architecture
ARCH=$(detect_arch)
print_info "Detected architecture: $ARCH"

# Look for the appropriate binary
APP_PATH=""
DMG_PATH=""

if [ "$ARCH" = "arm64" ]; then
    # Look for ARM64 app
    if [ -d "dist/mac-arm64/${APP_NAME}.app" ]; then
        APP_PATH="dist/mac-arm64/${APP_NAME}.app"
        print_success "Found ARM64 application"
    elif [ -f "dist/${APP_NAME}-1.0.0-arm64.dmg" ]; then
        DMG_PATH="dist/${APP_NAME}-1.0.0-arm64.dmg"
        print_success "Found ARM64 DMG installer"
    fi
else
    # Look for Intel app
    if [ -d "dist/mac/${APP_NAME}.app" ]; then
        APP_PATH="dist/mac/${APP_NAME}.app"
        print_success "Found Intel application"
    elif [ -f "dist/${APP_NAME}-1.0.0.dmg" ]; then
        DMG_PATH="dist/${APP_NAME}-1.0.0.dmg"
        print_success "Found Intel DMG installer"
    fi
fi

# Launch the application if found
if [ -n "$APP_PATH" ]; then
    print_success "Launching $APP_NAME..."
    open "$APP_PATH"
    print_success "Application launched successfully!"
    print_info "The app is now running. Check your dock to interact with it."
elif [ -n "$DMG_PATH" ]; then
    print_warning "No .app found, but DMG installer is available at:"
    print_info "  $DMG_PATH"
    print_info "To install, double-click the DMG file."
    print_info ""
    print_info "Opening DMG now..."
    open "$DMG_PATH"
else
    print_error "Could not find $APP_NAME for your architecture ($ARCH)"
    print_info "To build the app first, run:"
    print_info "  ./scripts/compile-build-dist.sh"
    print_info ""
    print_info "To run from source instead:"
    print_info "  ./scripts/run-macos-source.sh"
    
    exit 1
fi