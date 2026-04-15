#!/bin/bash

# Sphinx Build Script
# This script builds the Sphinx documentation site

set -e

echo "🔨 Building Sphinx site..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build

# Build HTML
echo "📚 Building HTML..."
./venv/bin/sphinx-build -b html source build/html

echo "✅ Build complete!"
echo "📂 Output: build/html/index.html"
