#!/bin/bash

# Cube.js Universal Semantic Layer Startup Script
# Multi-tenant architecture with production-ready configuration

echo "🎯 Starting Cube.js Universal Semantic Layer..."
echo "🌐 Multi-tenant architecture enabled"

# Load environment variables
if [ -f .env ]; then
    echo "📄 Loading environment configuration..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript if needed
if [ ! -d "dist" ] || [ "src" -nt "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
fi

# Start the server
echo "🚀 Starting Cube.js server on port ${PORT:-4000}..."
echo "📡 API endpoint: http://localhost:${PORT:-4000}/cubejs-api/v1"
echo "🏥 Health check: http://localhost:${PORT:-4000}/health"

if [ "$NODE_ENV" = "development" ]; then
    echo "🛠️  Development mode enabled"
    echo "🎮 Dev playground: http://localhost:${PORT:-4000}"
    npm run dev
else
    echo "🏭 Production mode"
    npm start
fi