#!/bin/bash

# Aicser Platform Documentation Deployment Script
# This script handles building, testing, and deploying the documentation

set -e  # Exit on any error

# Configuration
DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$DOCS_DIR/../.." && pwd)"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
CUSTOM_DOMAIN="aicser-docs.dataticon.com"
GITHUB_REPO="aicser-platform/aicser-world"
GITHUB_BRANCH="main"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed. Please install Python 3.8+"
        exit 1
    fi
    
    # Check Docker (optional)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Some features may not work"
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$DOCS_DIR"
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing Node.js dependencies..."
        npm ci
    else
        log_info "Updating Node.js dependencies..."
        npm ci
    fi
    
    log_success "Dependencies installed successfully"
}

# Generate documentation
generate_docs() {
    log_info "Generating documentation..."
    
    cd "$DOCS_DIR"
    
    # Try to run the Python script first
    if [ -f "scripts/generate_docs.py" ]; then
        log_info "Running Python documentation generator..."
        if python3 scripts/generate_docs.py; then
            log_success "Python documentation generation completed"
        else
            log_warning "Python documentation generation failed, continuing with existing content"
        fi
    fi
    
    # Build the documentation
    log_info "Building documentation..."
    npm run build
    
    log_success "Documentation built successfully"
}

# Test documentation
test_docs() {
    log_info "Testing documentation..."
    
    cd "$DOCS_DIR"
    
    # Check if build was successful
    if [ ! -d "build" ]; then
        log_error "Build directory not found. Build failed."
        exit 1
    fi
    
    # Test local serving
    log_info "Testing local documentation server..."
    timeout 30s npm run serve &
    SERVE_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:3005/ > /dev/null 2>&1; then
        log_success "Local documentation server is working"
    else
        log_warning "Local documentation server test failed"
    fi
    
    # Stop the server
    kill $SERVE_PID 2>/dev/null || true
    
    log_success "Documentation testing completed"
}

# Deploy to GitHub Pages
deploy_github_pages() {
    log_info "Deploying to GitHub Pages..."
    
    cd "$DOCS_DIR"
    
    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        log_error "Not in a git repository. Cannot deploy to GitHub Pages."
        exit 1
    fi
    
    # Check if we have the right remote
    if ! git remote get-url origin | grep -q "$GITHUB_REPO"; then
        log_error "Git remote origin is not set to $GITHUB_REPO"
        exit 1
    fi
    
    # Deploy using Docusaurus
    log_info "Running Docusaurus deployment..."
    GIT_USER="$(git config user.name)" \
    GIT_PASS="$(git config user.email)" \
    npm run deploy
    
    log_success "Deployment to GitHub Pages completed"
}

# Deploy to custom domain
deploy_custom_domain() {
    log_info "Deploying to custom domain: $CUSTOM_DOMAIN..."
    
    cd "$DOCS_DIR"
    
    # Create CNAME file for custom domain
    echo "$CUSTOM_DOMAIN" > build/CNAME
    
    # Check if we have deployment credentials
    if [ -z "$DEPLOY_SSH_KEY" ] && [ -z "$DEPLOY_USER" ]; then
        log_warning "No deployment credentials found. Skipping custom domain deployment."
        log_info "To deploy to custom domain, set DEPLOY_SSH_KEY and DEPLOY_USER environment variables"
        return 0
    fi
    
    # Deploy to custom domain server
    log_info "Uploading to custom domain server..."
    
    # This is a placeholder for actual deployment logic
    # You would implement the actual deployment based on your hosting setup
    log_info "Custom domain deployment completed (placeholder)"
}

# Deploy to Docker
deploy_docker() {
    log_info "Deploying documentation using Docker..."
    
    cd "$PROJECT_ROOT"
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_warning "docker-compose not found. Skipping Docker deployment."
        return 0
    fi
    
    # Build and start documentation service
    log_info "Building documentation Docker image..."
    docker-compose -f docker-compose.yml build docs
    
    log_info "Starting documentation service..."
    docker-compose -f docker-compose.yml up -d docs
    
    log_success "Docker deployment completed"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3005/ > /dev/null 2>&1; then
            log_success "Documentation is accessible at http://localhost:3005/"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for documentation to be ready..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Main deployment function
main_deploy() {
    local target="${1:-all}"
    
    log_info "Starting Aicser Platform documentation deployment..."
    log_info "Target: $target"
    log_info "Environment: $DEPLOY_ENV"
    log_info "Documentation directory: $DOCS_DIR"
    
    # Check prerequisites
    check_prerequisites
    
    # Install dependencies
    install_dependencies
    
    # Generate documentation
    generate_docs
    
    # Test documentation
    test_docs
    
    # Deploy based on target
    case "$target" in
        "github")
            deploy_github_pages
            ;;
        "custom")
            deploy_custom_domain
            ;;
        "docker")
            deploy_docker
            health_check
            ;;
        "all")
            deploy_github_pages
            deploy_custom_domain
            deploy_docker
            health_check
            ;;
        *)
            log_error "Unknown deployment target: $target"
            log_info "Available targets: github, custom, docker, all"
            exit 1
            ;;
    esac
    
    log_success "Documentation deployment completed successfully!"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS] [TARGET]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -e, --env      Set deployment environment (default: production)"
    echo "  -v, --verbose  Enable verbose output"
    echo ""
    echo "Targets:"
    echo "  github         Deploy to GitHub Pages"
    echo "  custom         Deploy to custom domain ($CUSTOM_DOMAIN)"
    echo "  docker         Deploy using Docker"
    echo "  all            Deploy to all targets (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to all targets"
    echo "  $0 github            # Deploy only to GitHub Pages"
    echo "  $0 -e staging docker # Deploy to Docker in staging environment"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -e|--env)
                DEPLOY_ENV="$2"
                shift 2
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            *)
                TARGET="$1"
                shift
                ;;
        esac
    done
}

# Main execution
main() {
    parse_args "$@"
    
    if [ "$DEPLOY_ENV" = "production" ]; then
        log_warning "Deploying to PRODUCTION environment"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    main_deploy "${TARGET:-all}"
}

# Run main function with all arguments
main "$@"
