#!/bin/bash

# Build script for Chat2Chart Server
# This script helps build the chat2chart-server with proper dependency management

set -e  # Exit on any error

echo "🚀 Building Chat2Chart Server with Docker Compose..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from env.example..."
    cp env.example .env
    echo "📝 Please update .env file with your actual configuration values."
fi

# Function to build with specific configuration
build_service() {
    local config_file=$1
    local service_name=$2
    
    echo "🔨 Building $service_name using $config_file..."
    
    if [ -f "$config_file" ]; then
        docker-compose -f "$config_file" build "$service_name"
        echo "✅ $service_name built successfully!"
    else
        echo "❌ Configuration file $config_file not found!"
        exit 1
    fi
}

# Function to start services
start_services() {
    local config_file=$1
    
    echo "🚀 Starting services using $config_file..."
    
    if [ -f "$config_file" ]; then
        docker-compose -f "$config_file" up -d
        echo "✅ Services started successfully!"
    else
        echo "❌ Configuration file $config_file not found!"
        exit 1
    fi
}

# Function to check service health
check_health() {
    echo "🔍 Checking service health..."
    
    # Wait a bit for services to start
    sleep 10
    
    # Check if chat2chart-server is responding
    if curl -f http://localhost:8000/health &> /dev/null; then
        echo "✅ Chat2Chart Server is healthy!"
    else
        echo "⚠️  Chat2Chart Server health check failed. Check logs with: docker-compose logs chat2chart-server"
    fi
    
    # Check if postgres is responding
    if docker-compose exec postgres pg_isready -U aiser &> /dev/null; then
        echo "✅ PostgreSQL is healthy!"
    else
        echo "⚠️  PostgreSQL health check failed. Check logs with: docker-compose logs postgres"
    fi
}

# Function to show logs
show_logs() {
    local service_name=$1
    echo "📋 Showing logs for $service_name..."
    docker-compose logs -f "$service_name"
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose down
    echo "✅ Cleanup completed!"
}

# Main script logic
case "${1:-build}" in
    "build")
        echo "🔨 Building Chat2Chart Server..."
        build_service "docker-compose.dev.yml" "chat2chart-server"
        ;;
    "build-all")
        echo "🔨 Building all services..."
        build_service "docker-compose.dev.yml" ""
        ;;
    "start")
        echo "🚀 Starting services..."
        start_services "docker-compose.dev.yml"
        check_health
        ;;
    "up")
        echo "🚀 Building and starting services..."
        build_service "docker-compose.dev.yml" "chat2chart-server"
        start_services "docker-compose.dev.yml"
        check_health
        ;;
    "logs")
        show_logs "${2:-chat2chart-server}"
        ;;
    "health")
        check_health
        ;;
    "clean")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  build      Build only chat2chart-server (default)"
        echo "  build-all  Build all services"
        echo "  start      Start all services"
        echo "  up         Build and start services"
        echo "  logs       Show logs for a service (default: chat2chart-server)"
        echo "  health     Check service health"
        echo "  clean      Stop and remove containers"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 build                    # Build chat2chart-server"
        echo "  $0 up                       # Build and start all services"
        echo "  $0 logs chat2chart-server   # Show chat2chart-server logs"
        echo "  $0 health                   # Check service health"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac

echo "🎉 Script completed successfully!"