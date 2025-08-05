#!/bin/bash

# Troubleshooting script for Aiser World development

echo "🔧 Aiser World Troubleshooting"
echo ""

# Check Docker status
echo "🐳 Docker Status:"
if docker info > /dev/null 2>&1; then
    echo "  ✅ Docker is running"
    echo "  📊 Docker version: $(docker --version)"
else
    echo "  ❌ Docker is not running"
    exit 1
fi
echo ""

# Check containers
echo "📦 Container Status:"
docker-compose ps
echo ""

# Check database connectivity
echo "🗄️  Database Connectivity:"
if docker exec aiser-postgres pg_isready -U aiser -d aiser_world > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL is ready"
else
    echo "  ❌ PostgreSQL is not ready"
    echo "  📊 PostgreSQL logs:"
    docker-compose logs --tail=10 postgres
fi

if docker exec aiser-redis redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis is ready"
else
    echo "  ❌ Redis is not ready"
    echo "  📊 Redis logs:"
    docker-compose logs --tail=10 redis
fi
echo ""

# Check service logs for common errors
echo "🔍 Recent Service Logs:"
echo ""
echo "Auth Service (last 10 lines):"
docker-compose logs --tail=10 auth-service 2>/dev/null || echo "  Service not running"
echo ""
echo "Chat2Chart Service (last 10 lines):"
docker-compose logs --tail=10 chat2chart-server 2>/dev/null || echo "  Service not running"
echo ""

# Check environment
echo "🌍 Environment:"
if [ -f .env ]; then
    echo "  ✅ .env file exists"
    if grep -q "OPENAI_API_KEY=your-openai-key" .env 2>/dev/null; then
        echo "  ⚠️  OpenAI API key needs to be updated in .env"
    else
        echo "  ✅ OpenAI API key appears to be set"
    fi
else
    echo "  ❌ .env file missing"
    echo "  💡 Run: cp .env.example .env"
fi
echo ""

# Common fixes
echo "🛠️  Common Fixes:"
echo "  1. Reset everything: docker-compose down --volumes && ./scripts/start.sh"
echo "  2. View live logs: docker-compose logs -f [service-name]"
echo "  3. Rebuild containers: docker-compose build --no-cache"
echo "  4. Check disk space: df -h"
echo "  5. Update .env file with your OpenAI API key"