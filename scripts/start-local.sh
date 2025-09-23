#!/bin/bash

# Aiser World Local Development Startup Script
# This script sets up and runs all services locally without Docker

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/local-dev.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "STEP")
            echo -e "${CYAN}🚀 $message${NC}"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
check_port() {
    local port="$1"
    if command_exists netstat; then
        netstat -tuln 2>/dev/null | grep -q ":$port " && return 0
    elif command_exists ss; then
        ss -tuln 2>/dev/null | grep -q ":$port " && return 0
    fi
    return 1
}

# Function to wait for service to be ready
wait_for_service() {
    local host="$1"
    local port="$2"
    local service_name="$3"
    local max_attempts=30
    local attempt=1
    
    log "INFO" "Waiting for $service_name to be ready on $host:$port..."
    
    while [ $attempt -le $max_attempts ]; do
        if check_port "$port"; then
            log "SUCCESS" "$service_name is ready!"
            return 0
        fi
        
        log "INFO" "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log "ERROR" "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Function to check prerequisites
check_prerequisites() {
    log "STEP" "Checking prerequisites..."
    
    local errors=0
    
    # Check Node.js
    if ! command_exists node; then
        log "ERROR" "Node.js is not installed. Please install Node.js >= 18.0.0"
        errors=$((errors + 1))
    else
        local node_version=$(node --version | sed 's/v//')
        log "INFO" "Node.js found: v$node_version"
    fi
    
    # Check npm
    if ! command_exists npm; then
        log "ERROR" "npm is not installed"
        errors=$((errors + 1))
    else
        log "INFO" "npm found: $(npm --version)"
    fi
    
    # Check Python
    if ! command_exists python3; then
        log "ERROR" "Python 3 is not installed. Please install Python >= 3.11"
        errors=$((errors + 1))
    else
        local python_version=$(python3 --version | sed 's/Python //')
        log "INFO" "Python found: $python_version"
    fi
    
    # Check Poetry
    if ! command_exists poetry; then
        log "WARNING" "Poetry is not installed. Installing Poetry..."
        curl -sSL https://install.python-poetry.org | python3 -
        export PATH="$HOME/.local/bin:$PATH"
        log "SUCCESS" "Poetry installed successfully"
    else
        log "INFO" "Poetry found: $(poetry --version)"
    fi
    
    # Check PostgreSQL
    if ! command_exists psql; then
        log "ERROR" "PostgreSQL client (psql) is not installed"
        log "INFO" "Install with: sudo apt install postgresql-client"
        errors=$((errors + 1))
    else
        log "INFO" "PostgreSQL client found"
    fi
    
    # Check Redis
    if ! command_exists redis-cli; then
        log "ERROR" "Redis client is not installed"
        log "INFO" "Install with: sudo apt install redis-tools"
        errors=$((errors + 1))
    else
        log "INFO" "Redis client found"
    fi
    
    if [ $errors -eq 0 ]; then
        log "SUCCESS" "All prerequisites are satisfied"
        return 0
    else
        log "ERROR" "Prerequisites check failed with $errors errors"
        return 1
    fi
}

# Function to setup environment
setup_environment() {
    log "STEP" "Setting up environment..."
    
    cd "$PROJECT_ROOT"
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        log "INFO" "Creating .env file from template..."
        cp env.example .env
        log "WARNING" "Please edit .env file with your actual API keys and secrets"
    else
        log "INFO" ".env file already exists"
    fi
    
    # Source environment variables
    if [ -f ".env" ]; then
        set -a
        set -a; source .env; set +a
        set +a
        log "SUCCESS" "Environment variables loaded"
    fi
}

# Function to start database services
start_databases() {
    log "STEP" "Starting database services..."
    
    # Check if PostgreSQL is running
    if ! check_port 5432; then
        log "INFO" "Starting PostgreSQL..."
        if command_exists systemctl; then
            sudo systemctl start postgresql
        else
            log "WARNING" "Please start PostgreSQL manually"
        fi
    else
        log "INFO" "PostgreSQL is already running"
    fi
    
    # Check if Redis is running
    if ! check_port 6379; then
        log "INFO" "Starting Redis..."
        if command_exists systemctl; then
            sudo systemctl start redis-server
        else
            log "WARNING" "Please start Redis manually"
        fi
    else
        log "INFO" "Redis is already running"
    fi
    
    # Wait for services to be ready
    wait_for_service "localhost" 5432 "PostgreSQL"
    wait_for_service "localhost" 6379 "Redis"
}

# Function to setup databases
setup_databases() {
    log "STEP" "Setting up databases..."
    
    # Create databases if they don't exist
    log "INFO" "Creating databases..."
    
    # Create aiser_world database
    psql -U postgres -c "CREATE DATABASE aiser_world;" 2>/dev/null || log "INFO" "Database aiser_world already exists"
    psql -U postgres -c "CREATE DATABASE aiser_chat2chart;" 2>/dev/null || log "INFO" "Database aiser_chat2chart already exists"
    
    # Create user if it doesn't exist
    psql -U postgres -c "CREATE USER aiser WITH PASSWORD 'aiser_password';" 2>/dev/null || log "INFO" "User aiser already exists"
    
    # Grant privileges
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE aiser_world TO aiser;"
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE aiser_chat2chart TO aiser;"
    
    # Initialize database schema
    log "INFO" "Initializing database schema..."
    psql -U aiser -d aiser_world -f scripts/init-db.sql
    
    # Insert default roles if the script exists
    if [ -f "insert_default_roles.sql" ]; then
        log "INFO" "Inserting default roles..."
        psql -U aiser -d aiser_world -f insert_default_roles.sql
    fi
    
    log "SUCCESS" "Databases setup completed"
}

# Function to install dependencies
install_dependencies() {
    log "STEP" "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    log "INFO" "Installing root dependencies..."
    npm install
    
    # Install and build shared package
    log "INFO" "Installing shared package..."
    cd packages/shared
    npm install
    npm run build
    cd "$PROJECT_ROOT"
    
    # Install auth service dependencies
    log "INFO" "Installing auth service dependencies..."
    cd packages/auth
    poetry install
    cd "$PROJECT_ROOT"
    
    # Install chat2chart server dependencies
    log "INFO" "Installing chat2chart server dependencies..."
    cd packages/chat2chart/server
    poetry install
    cd "$PROJECT_ROOT"
    
    # Install chat2chart client dependencies
    log "INFO" "Installing chat2chart client dependencies..."
    cd packages/chat2chart/client
    npm install
    cd "$PROJECT_ROOT"
    
    # Install enterprise client dependencies
    log "INFO" "Installing enterprise client dependencies..."
    cd packages/client/client
    npm install
    cd "$PROJECT_ROOT"
    
    log "SUCCESS" "All dependencies installed"
}

# Function to start services
start_services() {
    log "STEP" "Starting all services..."
    
    cd "$PROJECT_ROOT"
    
    # Create logs directory
    mkdir -p logs
    
    # Start Auth Service
    log "INFO" "Starting Auth Service on port 5000..."
    cd packages/auth
    nohup poetry run uvicorn src.app.main:app --reload --host 0.0.0.0 --port 5000 > ../../logs/auth.log 2>&1 &
    AUTH_PID=$!
    echo $AUTH_PID > ../../logs/auth.pid
    cd "$PROJECT_ROOT"
    
    # Start Chat2Chart Server
    log "INFO" "Starting Chat2Chart Server on port 8000..."
    cd packages/chat2chart/server
    nohup poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../../logs/chat2chart-server.log 2>&1 &
    CHAT2CHART_PID=$!
    echo $CHAT2CHART_PID > ../../logs/chat2chart-server.pid
    cd "$PROJECT_ROOT"
    
    # Start Chat2Chart Client
    log "INFO" "Starting Chat2Chart Client on port 3000..."
    cd packages/chat2chart/client
    nohup npm run dev > ../../logs/chat2chart-client.log 2>&1 &
    CLIENT_PID=$!
    echo $CLIENT_PID > ../../logs/chat2chart-client.pid
    cd "$PROJECT_ROOT"
    
    # Start Enterprise Client
    log "INFO" "Starting Enterprise Client on port 3001..."
    cd packages/client/client
    nohup npm run dev -- --port 3001 > ../../logs/enterprise-client.log 2>&1 &
    ENTERPRISE_PID=$!
    echo $ENTERPRISE_PID > ../../logs/enterprise-client.pid
    cd "$PROJECT_ROOT"
    
    # Wait for services to be ready
    log "INFO" "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if check_port 5000; then
        log "SUCCESS" "Auth Service is running on http://localhost:5000"
    else
        log "WARNING" "Auth Service may not be running properly"
    fi
    
    if check_port 8000; then
        log "SUCCESS" "Chat2Chart Server is running on http://localhost:8000"
    else
        log "WARNING" "Chat2Chart Server may not be running properly"
    fi
    
    if check_port 3000; then
        log "SUCCESS" "Chat2Chart Client is running on http://localhost:3000"
    else
        log "WARNING" "Chat2Chart Client may not be running properly"
    fi
    
    if check_port 3001; then
        log "SUCCESS" "Enterprise Client is running on http://localhost:3001"
    else
        log "WARNING" "Enterprise Client may not be running properly"
    fi
}

# Function to stop services
stop_services() {
    log "STEP" "Stopping all services..."
    
    cd "$PROJECT_ROOT"
    
    # Kill services by PID files
    for pid_file in logs/*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            local service_name=$(basename "$pid_file" .pid)
            
            if kill -0 "$pid" 2>/dev/null; then
                log "INFO" "Stopping $service_name (PID: $pid)..."
                kill "$pid"
            else
                log "INFO" "$service_name is not running"
            fi
        fi
    done
    
    # Clean up PID files
    rm -f logs/*.pid
    
    log "SUCCESS" "All services stopped"
}

# Function to show service status
show_status() {
    log "STEP" "Checking service status..."
    
    local services=(
        "5000:Auth Service"
        "8000:Chat2Chart Server"
        "3000:Chat2Chart Client"
        "3001:Enterprise Client"
        "5432:PostgreSQL"
        "6379:Redis"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r port name <<< "$service_info"
        
        if check_port "$port"; then
            log "SUCCESS" "$name is running on port $port"
        else
            log "WARNING" "$name is not running"
        fi
    done
    
    echo ""
    log "INFO" "Service URLs:"
    log "INFO" "  📊 Chat2Chart Frontend: http://localhost:3000"
    log "INFO" "  💼 Enterprise Client: http://localhost:3001"
    log "INFO" "  🔌 Chat2Chart API: http://localhost:8000"
    log "INFO" "  🔐 Auth API: http://localhost:5000"
    log "INFO" "  🗄️  PostgreSQL: localhost:5432"
    log "INFO" "  🔴 Redis: localhost:6379"
}

# Function to show help
show_help() {
    echo "🚀 Aiser World Local Development"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     Setup environment and install dependencies"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  logs      Show service logs"
    echo "  clean     Clean up logs and temporary files"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup    # First time setup"
    echo "  $0 start    # Start all services"
    echo "  $0 status   # Check what's running"
    echo "  $0 logs     # View service logs"
}

# Function to show logs
show_logs() {
    log "STEP" "Showing service logs..."
    
    cd "$PROJECT_ROOT"
    
    if [ -d "logs" ]; then
        for log_file in logs/*.log; do
            if [ -f "$log_file" ]; then
                local service_name=$(basename "$log_file" .log)
                echo ""
                log "INFO" "=== $service_name logs ==="
                tail -20 "$log_file"
            fi
        done
    else
        log "WARNING" "No logs directory found"
    fi
}

# Function to clean up
clean_up() {
    log "STEP" "Cleaning up..."
    
    cd "$PROJECT_ROOT"
    
    # Stop services first
    stop_services
    
    # Remove logs
    rm -rf logs/
    
    # Remove node_modules (optional)
    read -p "Do you want to remove node_modules? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
        log "INFO" "node_modules directories removed"
    fi
    
    log "SUCCESS" "Cleanup completed"
}

# Main execution logic
main() {
    # Initialize log file
    echo "=== Aiser World Local Development Started at $(date) ===" > "$LOG_FILE"
    
    # Parse command
    local command="${1:-help}"
    
    case "$command" in
        "setup")
            check_prerequisites
            setup_environment
            start_databases
            setup_databases
            install_dependencies
            log "SUCCESS" "Setup completed! Run '$0 start' to start services."
            ;;
        "start")
            setup_environment
            start_databases
            start_services
            show_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 2
            setup_environment
            start_databases
            start_services
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            clean_up
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Call main function with all arguments
main "$@"



