#!/bin/bash

# Build shared package script
echo "🔧 Building shared package..."

cd packages/shared

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing shared package dependencies..."
    npm install
fi

# Build the package
echo "🏗️ Building shared package..."
npx tsc

echo "✅ Shared package built successfully!"