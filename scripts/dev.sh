#!/bin/bash

# Enhanced Development script for Aiser World monorepo with Poetry + Docker support
# Version: 2.0 - Enhanced with comprehensive logging and error handling

set -e

# Global configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/dev.log"
VERBOSE=false
CLEAN_CACHE=false
FORCE_REINSTALL=false

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Write to log file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Display to console with colors
    case "$level" in
        "INFO")
            echo -e "${BLUE}ℹ️  [$timestamp] $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ [$timestamp] $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  [$timestamp] $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ [$timestamp] $message${NC}"
            ;;
        "DEBUG")
            if [ "$VERBOSE" = true ]; then
                echo -e "${PURPLE}🔍 [$timestamp] $message${NC}"
            fi
            ;;
        "STEP")
            echo -e "${CYAN}🚀 [$timestamp] $message${NC}"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check for port conflicts
check_port_conflicts() {
    log "INFO" "Checking for port conflicts..."
    
    local ports=(3000 5000 5432 6379 8000)
    local conflicts=0
    
    for port in "${ports[@]}"; do
        if command_exists netstat; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                log "WARNING" "Port $port is already in use"
                conflicts=$((conflicts + 1))
            fi
        elif command_exists ss; then
            if ss -tuln 2>/dev/null | grep -q ":$port "; then
                log "WARNING" "Port $port is already in use"
                conflicts=$((conflicts + 1))
            fi
        fi
    done
    
    if [ $conflicts -gt 0 ]; then
        log "WARNING" "Found $conflicts port conflicts. Consider stopping other services or changing ports."
        log "INFO" "You can stop existing containers with: $0 stop"
    else
        log "SUCCESS" "No port conflicts detected"
    fi
}

# Function to parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose|-v)
                VERBOSE=true
                log "DEBUG" "Verbose mode enabled"
                shift
                ;;
            --clean-cache)
                CLEAN_CACHE=true
                log "DEBUG" "Clean cache mode enabled"
                shift
                ;;
            --force-reinstall)
                FORCE_REINSTALL=true
                log "DEBUG" "Force reinstall mode enabled"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                # Store the command for later processing
                COMMAND="$1"
                shift
                ;;
        esac
    done
}

# Function to show help
show_help() {
    echo "🚀 Aiser World Development Commands"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  docker                    Start all services with Docker Compose"
    echo "  docker-prod              Start production services"
    echo "  poetry                   Setup Poetry development environment"
    echo "  chat2chart               Start Chat2Chart backend services only"
    echo "  auth                     Start Auth service only"
    echo "  db                       Start database services only"
    echo "  stop                     Stop all Docker services"
    echo "  clean                    Clean up Docker resources"
    echo "  status                   Check service health and status"
    echo ""
    echo "Options:"
    echo "  -v, --verbose            Enable verbose logging"
    echo "  --clean-cache            Clean dependency caches before starting"
    echo "  --force-reinstall        Force reinstall of all dependencies"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "🌐 Service URLs:"
    echo "  📊 Chat2Chart Frontend: http://localhost:3000"
    echo "  💼 Enterprise Client: http://localhost:3001"
    echo "  🔌 Chat2Chart API: http://localhost:8000"
    echo "  🔐 Auth API: http://localhost:5000"
    echo "  🗄️  PostgreSQL: localhost:5432"
    echo "  🔴 Redis: localhost:6379"
}

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    local errors=0
    
    if ! command_exists docker; then
        log "ERROR" "Docker is not installed"
        log "INFO" "Install Docker: https://docs.docker.com/get-docker/"
        errors=$((errors + 1))
    else
        log "DEBUG" "Docker found: $(docker --version)"
    fi
    
    if ! command_exists docker-compose; then
        log "ERROR" "Docker Compose is not installed"
        log "INFO" "Install Docker Compose: https://docs.docker.com/compose/install/"
        errors=$((errors + 1))
    else
        log "DEBUG" "Docker Compose found: $(docker-compose --version)"
    fi
    
    # Check if Docker daemon is running
    if command_exists docker && ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker daemon is not running"
        log "INFO" "Start Docker daemon and try again"
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        log "SUCCESS" "Prerequisites check passed"
        return 0
    else
        log "ERROR" "Prerequisites check failed with $errors errors"
        return 1
    fi
}

# Function to start Docker services
start_docker_services() {
    log "STEP" "Starting all services with Docker Compose..."
    
    if [ "$CLEAN_CACHE" = true ]; then
        log "INFO" "Cleaning Docker cache before starting..."
        docker system prune -f >/dev/null 2>&1 || true
    fi
    
    # Check if docker-compose.dev.yml exists
    if [ ! -f "docker-compose.dev.yml" ]; then
        log "ERROR" "docker-compose.dev.yml not found in current directory"
        log "INFO" "Make sure you're running this script from the project root"
        return 1
    fi
    
    log "DEBUG" "Running: docker-compose -f docker-compose.dev.yml up --build"
    
    # Try to start services with better error handling and retry logic
    local max_retries=2
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if docker-compose -f docker-compose.dev.yml up --build; then
            log "SUCCESS" "Docker services started successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            log "WARNING" "Docker build failed (attempt $retry_count/$max_retries)"
            
            if [ $retry_count -lt $max_retries ]; then
                log "INFO" "Cleaning up and retrying..."
                docker-compose -f docker-compose.dev.yml down --remove-orphans >/dev/null 2>&1 || true
                docker system prune -f >/dev/null 2>&1 || true
                sleep 5
            fi
        fi
    done
    
    log "ERROR" "Failed to start Docker services after $max_retries attempts"
    log "INFO" "Checking for common issues..."
    
    # Check for port conflicts
    check_port_conflicts
    
    # Show recent logs
    log "INFO" "Recent Docker logs:"
    docker-compose -f docker-compose.dev.yml logs --tail=20 || true
    
    return 1
}

# Function to start production services
start_production_services() {
    log "STEP" "Starting production services with Docker Compose..."
    
    log "DEBUG" "Running: docker-compose up --build"
    docker-compose up --build
}

# Function to setup Poetry environment
setup_poetry_environment() {
    log "STEP" "Setting up Poetry development environment..."
    
    # Check if Poetry is installed
    if ! command_exists poetry; then
        log "INFO" "Installing Poetry..."
        curl -sSL https://install.python-poetry.org | python3 -
        export PATH="$HOME/.local/bin:$PATH"
        log "SUCCESS" "Poetry installed successfully"
    else
        log "DEBUG" "Poetry found: $(poetry --version)"
    fi
    
    # Install Python dependencies with Poetry
    log "INFO" "Installing Python dependencies with Poetry..."
    
    if [ -d "packages/auth" ]; then
        log "DEBUG" "Installing auth service dependencies..."
        cd packages/auth && poetry install && cd ../..
        log "SUCCESS" "Auth service dependencies installed"
    fi
    
    if [ -d "packages/chat2chart/server" ]; then
        log "DEBUG" "Installing chat2chart server dependencies..."
        cd packages/chat2chart/server && poetry install && cd ../../..
        log "SUCCESS" "Chat2Chart server dependencies installed"
    fi
    
    # Install Node.js dependencies
    log "INFO" "Installing Node.js dependencies..."
    npm install
    
    if [ -d "packages/shared" ]; then
        log "DEBUG" "Building shared package..."
        cd packages/shared && npm run build && cd ../..
        log "SUCCESS" "Shared package built"
    fi
    
    log "SUCCESS" "All dependencies installed with Poetry!"
    log "INFO" "You can now run individual services:"
    log "INFO" "  cd packages/auth && poetry run uvicorn src.app.main:app --reload --port 5000"
    log "INFO" "  cd packages/chat2chart/server && poetry run uvicorn app.main:app --reload --port 8000"
}

# Function to start specific services
start_service() {
    local service="$1"
    
    case "$service" in
        "chat2chart")
            log "STEP" "Starting Chat2Chart backend services..."
            log "DEBUG" "Running: docker-compose -f docker-compose.dev.yml up postgres redis chat2chart-server --build"
            docker-compose -f docker-compose.dev.yml up postgres redis chat2chart-server --build &
            log "INFO" "Chat2Chart backend started. In another terminal, run:"
            log "INFO" "  cd packages/chat2chart/client && npm run dev"
            ;;
        "auth")
            log "STEP" "Starting Auth service..."
            log "DEBUG" "Running: docker-compose -f docker-compose.dev.yml up postgres auth-service --build"
            docker-compose -f docker-compose.dev.yml up postgres auth-service --build
            ;;
        "db")
            log "STEP" "Starting database services..."
            log "DEBUG" "Running: docker-compose -f docker-compose.dev.yml up postgres redis"
            docker-compose -f docker-compose.dev.yml up postgres redis
            ;;
    esac
}

# Function to stop services
stop_services() {
    log "STEP" "Stopping all Docker services..."
    
    log "DEBUG" "Stopping development services..."
    docker-compose -f docker-compose.dev.yml down >/dev/null 2>&1 || true
    
    log "DEBUG" "Stopping production services..."
    docker-compose down >/dev/null 2>&1 || true
    
    log "SUCCESS" "All services stopped"
}

# Function to check service health
check_service_health() {
    log "STEP" "Checking service health..."
    
    local services=(
        "postgres:5432:PostgreSQL"
        "redis:6379:Redis"
        "auth-service:5000:Auth API"
        "chat2chart-server:8000:Chat2Chart API"
        "chat2chart-client:3000:Frontend"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service port name <<< "$service_info"
        
        if docker-compose -f docker-compose.dev.yml ps "$service" 2>/dev/null | grep -q "Up"; then
            log "SUCCESS" "$name is running on port $port"
        else
            log "WARNING" "$name is not running"
        fi
    done
    
    log "INFO" "Service URLs:"
    log "INFO" "  📊 Chat2Chart Frontend: http://localhost:3000"
    log "INFO" "  🔌 Chat2Chart API: http://localhost:8000"
    log "INFO" "  🔐 Auth API: http://localhost:5000"
    log "INFO" "  🗄️  PostgreSQL: localhost:5432"
    log "INFO" "  🔴 Redis: localhost:6379"
}

# Function to clean up Docker resources
clean_docker_resources() {
    log "STEP" "Cleaning up Docker resources..."
    
    log "DEBUG" "Removing development containers and volumes..."
    docker-compose -f docker-compose.dev.yml down -v >/dev/null 2>&1 || true
    
    log "DEBUG" "Removing production containers and volumes..."
    docker-compose down -v >/dev/null 2>&1 || true
    
    log "DEBUG" "Pruning Docker system..."
    docker system prune -f >/dev/null 2>&1 || true
    
    log "SUCCESS" "Docker cleanup completed"
}

# Main execution logic
main() {
    # Initialize log file
    echo "=== Aiser World Development Script Started at $(date) ===" > "$LOG_FILE"
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi
    
    # Execute command
    case "$COMMAND" in
    "docker")
        start_docker_services
        ;;
    "docker-prod")
        start_production_services
        ;;
    "poetry")
        setup_poetry_environment
        ;;
    "chat2chart")
        start_service "chat2chart"
        ;;
    "auth")
        start_service "auth"
        ;;
    "db")
        start_service "db"
        ;;
    "stop")
        stop_services
        ;;
    "clean")
        clean_docker_resources
        ;;
    "status")
        check_service_health
        ;;
    *)
        show_help
        exit 1
        ;;
esac
}

# Call main function with all arguments
main "$@"