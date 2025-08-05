#!/bin/bash

# Simple start script for Aiser World development

set -e

echo "🚀 Starting Aiser World Development Environment"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your OpenAI API key before the services start properly"
    echo ""
fi

# Clean up any existing containers to avoid conflicts
echo "🧹 Cleaning up any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

echo "🐳 Starting databases first..."
docker-compose up -d postgres redis

echo "⏳ Waiting for databases to be ready..."
sleep 10

# Check database health
echo "🔍 Checking database connection..."
until docker exec aiser-postgres pg_isready -U aiser -d aiser_world > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

until docker exec aiser-redis redis-cli ping > /dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done

echo "✅ Databases are ready!"

echo "🚀 Starting application services..."
docker-compose up -d auth-service chat2chart-server

echo ""
echo "⏳ Services are starting up (this may take a few minutes for first run)..."
echo "   Installing Python dependencies and starting servers..."
echo ""
echo "📊 To monitor startup progress:"
echo "   docker-compose logs -f auth-service"
echo "   docker-compose logs -f chat2chart-server"
echo ""
echo "🌐 Services will be available at:"
echo "  • Auth Service:      http://localhost:5000"
echo "  • Chat2Chart API:    http://localhost:8000"
echo "  • PostgreSQL:        localhost:5432 (aiser/aiser_password)"
echo "  • Redis:             localhost:6379"
echo ""
echo "📝 To develop the frontend:"
echo "  cd packages/chat2chart/client"
echo "  npm install && npm run dev"
echo ""
echo "🛑 To stop: docker-compose down"
echo "📊 To view logs: docker-compose logs -f [service-name]"