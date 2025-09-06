#!/bin/bash

# Aiser Platform - One-Command Development Setup
# This script sets up the entire development environment with one command

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    log_error "Please run this script from the root of the aiser-world project"
    exit 1
fi

log_info "🚀 Starting Aiser Platform Development Setup..."

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install Python 3.11+ first."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Create environment file
setup_environment() {
    log_info "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            log_success "Created .env file from env.example"
        else
            # Create basic .env file
            cat > .env << EOF
# Database Configuration
POSTGRES_DB=aiser_world
POSTGRES_USER=aiser
POSTGRES_PASSWORD=aiser_password_123
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432

# API Configuration
API_SECRET_KEY=your_secret_key_here_change_in_production
CUBE_API_SECRET=your_cube_secret_here

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CUBEJS_URL=http://localhost:4000
NEXT_PUBLIC_CUBEJS_TOKEN=your_cubejs_token_here

# AI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_key_here
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Development
DEBUG=True
NODE_ENV=development
EOF
            log_success "Created basic .env file"
        fi
    else
        log_info ".env file already exists, skipping creation"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    log_info "Installing root dependencies..."
    npm install
    
    # Install client dependencies
    log_info "Installing client dependencies..."
    cd packages/chat2chart/client
    npm install
    cd ../..
    
    # Install server dependencies
    log_info "Installing server dependencies..."
    cd packages/chat2chart/server
    if command -v poetry &> /dev/null; then
        poetry install
    else
        log_warning "Poetry not found, using pip instead"
        pip install -r requirements.txt
    fi
    cd ../..
    
    log_success "Dependencies installed successfully"
}

# Start services with Docker
start_services() {
    log_info "Starting services with Docker..."
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Services started successfully"
    else
        log_error "Failed to start services"
        docker-compose logs
        exit 1
    fi
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 5
    
    # Run database setup
    cd packages/chat2chart/server
    if command -v poetry &> /dev/null; then
        poetry run python create_missing_tables.py
    else
        python create_missing_tables.py
    fi
    cd ../..
    
    log_success "Database setup completed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    
    cd packages/chat2chart/client
    npm run build
    cd ../..
    
    log_success "Frontend built successfully"
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."
    
    # Check if services are accessible
    local services=(
        "http://localhost:3000:Frontend"
        "http://localhost:8000/health:Backend API"
        "http://localhost:4000/health:Cube.js"
        "http://localhost:5000/health:Auth Service"
    )
    
    for service in "${services[@]}"; do
        local url=$(echo $service | cut -d: -f1-2)
        local name=$(echo $service | cut -d: -f3)
        
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
            log_success "$name is accessible at $url"
        else
            log_warning "$name is not accessible at $url"
        fi
    done
}

# Main execution
main() {
    log_info "🎯 Aiser Platform Development Setup"
    log_info "=================================="
    
    check_prerequisites
    setup_environment
    install_dependencies
    start_services
    setup_database
    build_frontend
    verify_setup
    
    log_success "🎉 Development setup completed successfully!"
    log_info ""
    log_info "📋 Next steps:"
    log_info "1. Open http://localhost:3000 in your browser"
    log_info "2. Create an account or use test credentials:"
    log_info "   - Email: test@dataticon.com"
    log_info "   - Password: testpassword123"
    log_info "3. Start developing!"
    log_info ""
    log_info "🔧 Useful commands:"
    log_info "  - View logs: docker-compose logs -f"
    log_info "  - Stop services: docker-compose down"
    log_info "  - Restart services: docker-compose restart"
    log_info "  - Update dependencies: npm run update-deps"
    log_info ""
    log_info "📚 Documentation:"
    log_info "  - API Docs: http://localhost:8000/docs"
    log_info "  - Cube.js: http://localhost:4000"
    log_info "  - Auth Service: http://localhost:5000"
}

# Run main function
main "$@"
