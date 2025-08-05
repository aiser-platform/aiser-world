#!/bin/bash

# Simple development script for Aiser World

set -e

echo "🚀 Starting Aiser World development environment (Simple Mode)..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

if ! command_exists poetry; then
    echo "📝 Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "✅ Prerequisites check passed"

case "$1" in
    "start")
        echo "🗄️  Starting databases..."
        docker-compose -f docker-compose.simple.yml up -d
        
        echo "⏳ Waiting for databases to be ready..."
        sleep 10
        
        echo "📦 Installing Python dependencies..."
        cd packages/auth && poetry install && cd ../..
        cd packages/chat2chart/server && poetry install && cd ../../..
        
        echo "📦 Installing Node.js dependencies..."
        npm install
        cd packages/shared && npm run build && cd ../..
        
        echo "✅ Setup complete! Now you can run services:"
        echo ""
        echo "🔐 Auth Service:"
        echo "  cd packages/auth && poetry run uvicorn src.app.main:app --reload --port 5000"
        echo ""
        echo "🤖 Chat2Chart Server:"
        echo "  cd packages/chat2chart/server && poetry run uvicorn app.main:app --reload --port 8000"
        echo ""
        echo "⚛️  Chat2Chart Client:"
        echo "  cd packages/chat2chart/client && npm run dev"
        echo ""
        echo "💼 Enterprise Client:"
        echo "  cd packages/client/client && npm run dev --port 3001"
        ;;
    "stop")
        echo "🛑 Stopping services..."
        docker-compose -f docker-compose.simple.yml down
        ;;
    "clean")
        echo "🧹 Cleaning up..."
        docker-compose -f docker-compose.simple.yml down -v
        docker system prune -f
        ;;
    "auth")
        echo "🔐 Starting Auth service..."
        cd packages/auth
        poetry run uvicorn src.app.main:app --reload --host 0.0.0.0 --port 5000
        ;;
    "chat2chart")
        echo "🤖 Starting Chat2Chart server..."
        cd packages/chat2chart/server
        poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
        ;;
    "client")
        echo "⚛️  Starting Chat2Chart client..."
        cd packages/chat2chart/client
        npm run dev
        ;;
    "enterprise")
        echo "💼 Starting Enterprise client..."
        cd packages/client/client
        npm run dev -- --port 3001
        ;;
    *)
        echo "🚀 Aiser World Simple Development"
        echo ""
        echo "Setup:"
        echo "  ./scripts/dev-simple.sh start    # Setup databases and dependencies"
        echo ""
        echo "Run services (after setup):"
        echo "  ./scripts/dev-simple.sh auth     # Auth service (port 5000)"
        echo "  ./scripts/dev-simple.sh chat2chart # Chat2Chart server (port 8000)"
        echo "  ./scripts/dev-simple.sh client   # Chat2Chart client (port 3000)"
        echo "  ./scripts/dev-simple.sh enterprise # Enterprise client (port 3001)"
        echo ""
        echo "Management:"
        echo "  ./scripts/dev-simple.sh stop     # Stop databases"
        echo "  ./scripts/dev-simple.sh clean    # Clean up everything"
        echo ""
        echo "🌐 Service URLs:"
        echo "  📊 Chat2Chart: http://localhost:3000"
        echo "  💼 Enterprise: http://localhost:3001"
        echo "  🔌 API: http://localhost:8000"
        echo "  🔐 Auth: http://localhost:5000"
        ;;
esac