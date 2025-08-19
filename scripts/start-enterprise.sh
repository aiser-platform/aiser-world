#!/bin/bash

# Aiser Enterprise Startup Script
set -e

echo "🚀 Starting Aiser Enterprise Authentication System..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p nginx/ssl
mkdir -p logs

# Check if enterprise config exists
if [ ! -f "packages/auth/enterprise-config.yml" ]; then
    echo "⚠️  Enterprise config not found. Copying example config..."
    cp packages/auth/enterprise-config.example.yml packages/auth/enterprise-config.yml
    echo "📝 Please edit packages/auth/enterprise-config.yml with your settings"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml down

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml pull

# Start the enterprise stack
echo "🏗️  Starting enterprise services..."
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml exec -T auth-service bash -c "cd /app && PYTHONPATH=/app/src alembic upgrade head"

# Create initial admin user if needed
echo "👤 Setting up initial admin user..."
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml exec -T auth-service bash -c "cd /app && PYTHONPATH=/app/src python scripts/create_admin_user.py"

# Check service health
echo "🏥 Checking service health..."
sleep 10

# Check auth service
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Auth service is healthy"
else
    echo "❌ Auth service is not responding"
fi

# Check Keycloak
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Keycloak is healthy"
else
    echo "⚠️  Keycloak may still be starting up"
fi

# Check Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus is healthy"
else
    echo "⚠️  Prometheus may still be starting up"
fi

# Check Grafana
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Grafana is healthy"
else
    echo "⚠️  Grafana may still be starting up"
fi

echo ""
echo "🎉 Aiser Enterprise Authentication System is starting up!"
echo ""
echo "📊 Service URLs:"
echo "   • Auth Service: http://localhost:8000"
echo "   • API Documentation: http://localhost:8000/docs"
echo "   • Keycloak Admin: http://localhost:8080 (admin/admin123)"
echo "   • Grafana: http://localhost:3001 (admin/admin123)"
echo "   • Prometheus: http://localhost:9090"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your enterprise settings in packages/auth/enterprise-config.yml"
echo "   2. Set up your authentication provider (Keycloak, Azure AD, etc.)"
echo "   3. Configure SSL certificates in nginx/ssl/"
echo "   4. Review security settings and update default passwords"
echo ""
echo "📖 For more information, see the enterprise documentation."