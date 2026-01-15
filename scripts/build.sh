#!/bin/bash

echo "Building StrataDesk Desktop App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not available"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies"
        exit 1
    fi
fi

# Detect platform and build accordingly
case "$(uname -s)" in
    Darwin*)
        echo "Building application for macOS..."
        npm run build-mac
        ;;
    Linux*)
        echo "Building application for Linux..."
        npm run build-linux
        ;;
    *)
        echo "Building application for current platform..."
        npm run build
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "The application can be found in the 'dist' folder:"
    ls -la dist/ 2>/dev/null || echo "No dist folder found"
    echo ""
else
    echo ""
    echo "❌ Build failed!"
    echo "Check the error messages above for details."
    echo ""
fi