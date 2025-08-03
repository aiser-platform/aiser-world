#!/bin/bash

# Development script for Aiser monorepo

set -e

echo "🚀 Starting Aiser World development environment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed"
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build shared package
echo "🏗️  Building shared package..."
cd packages/shared && npm run build && cd ../..

# Start services based on argument
case "$1" in
    "chat2chart")
        echo "🎯 Starting Chat2Chart service..."
        cd packages/chat2chart
        echo "Starting FastAPI server..."
        cd server && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
        echo "Starting Next.js client..."
        cd ../client && npm run dev &
        ;;
    "client")
        echo "🎯 Starting Client service..."
        cd packages/client/client && npm run dev &
        ;;
    "auth")
        echo "🎯 Starting Auth service..."
        cd packages/auth && python -m uvicorn src.app.main:app --reload --host 0.0.0.0 --port 5000 &
        ;;
    "all")
        echo "🎯 Starting all services..."
        # Auth service
        cd packages/auth && python -m uvicorn src.app.main:app --reload --host 0.0.0.0 --port 5000 &
        cd ../..
        
        # Chat2Chart server
        cd packages/chat2chart/server && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
        cd ../../..
        
        # Chat2Chart client
        cd packages/chat2chart/client && npm run dev &
        cd ../../..
        
        # Main client
        cd packages/client/client && npm run dev &
        cd ../../..
        ;;
    *)
        echo "Usage: $0 {chat2chart|client|auth|all}"
        echo "  chat2chart - Start Chat2Chart service (FastAPI + Next.js)"
        echo "  client     - Start main Client service"
        echo "  auth       - Start Authentication service"
        echo "  all        - Start all services"
        exit 1
        ;;
esac

echo "✅ Services started successfully!"
echo "📝 Check the logs above for service URLs"
echo "🛑 Press Ctrl+C to stop all services"

# Wait for user interrupt
wait