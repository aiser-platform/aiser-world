#!/bin/bash

# Aiser Platform Documentation Deployment Test Script
# This script tests the local build and deployment configuration

set -e

echo "🚀 Testing Aiser Platform Documentation Deployment Configuration"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

echo ""
echo "📋 Configuration Check"
echo "----------------------"

# Check if we're in the right directory
if [ ! -f "docusaurus.config.js" ]; then
    print_status "ERROR" "Not in docs directory. Please run from packages/docs/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status "OK" "Node.js version: $(node --version)"
else
    print_status "ERROR" "Node.js version $(node --version) is too old. Requires 18+"
    exit 1
fi

# Check npm version
print_status "OK" "npm version: $(npm --version)"

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    print_status "OK" "Dependencies are installed"
else
    print_status "WARN" "Dependencies not found. Run 'npm install' first"
fi

echo ""
echo "🔧 Build Test"
echo "-------------"

# Clean previous build
if [ -d "build" ]; then
    echo "Cleaning previous build..."
    rm -rf build
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the documentation
echo "Building documentation..."
if npm run build; then
    print_status "OK" "Build completed successfully"
else
    print_status "ERROR" "Build failed"
    exit 1
fi

echo ""
echo "📁 Build Output Check"
echo "---------------------"

# Check for essential files
if [ -f "build/docs/index.html" ]; then
    print_status "OK" "Main index.html found in docs directory"
else
    print_status "ERROR" "Main index.html missing from docs directory - critical for GitHub Pages"
fi

if [ -f "build/CNAME" ]; then
    print_status "OK" "CNAME file found"
    echo "  CNAME content: $(cat build/CNAME)"
else
    print_status "ERROR" "CNAME file missing"
fi

if [ -d "build/docs" ]; then
    print_status "OK" "Documentation directory found"
    echo "  Number of doc pages: $(find build/docs -name "*.html" | wc -l)"
else
    print_status "ERROR" "Documentation directory missing"
fi

# Check for 404 page
if [ -f "build/404.html" ]; then
    print_status "OK" "404 page found"
else
    print_status "WARN" "404 page missing"
fi

echo ""
echo "🌐 Local Server Test"
echo "-------------------"

# Start local server in background
echo "Starting local server on port 3005..."
npm run serve > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test local access
if curl -s -f http://localhost:3005/docs/ > /dev/null 2>&1; then
    print_status "OK" "Local server accessible at http://localhost:3005/docs/"
    
    # Test main page content
    if curl -s http://localhost:3005/docs/ | grep -q "Aiser Platform"; then
        print_status "OK" "Main page content loaded correctly"
    else
        print_status "WARN" "Main page content may not be loading properly"
    fi
else
    print_status "ERROR" "Local server not accessible at /docs/"
fi

# Stop local server
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "🔗 Link Validation"
echo "------------------"

# Check for broken links in the build
echo "Checking for broken links..."
BROKEN_LINKS=$(npm run build 2>&1 | grep -c "Broken link" || echo "0")

if [ "$BROKEN_LINKS" -eq 0 ]; then
    print_status "OK" "No broken links found"
else
    print_status "WARN" "Found $BROKEN_LINKS broken links (see build output above)"
fi

echo ""
echo "📋 GitHub Pages Configuration"
echo "----------------------------"

# Check GitHub Actions workflow
if [ -f ".github/workflows/deploy-docs.yml" ]; then
    print_status "OK" "GitHub Actions workflow found"
    
    # Check workflow configuration
    if grep -q "cname: aiser-docs.dataticon.com" .github/workflows/deploy-docs.yml; then
        print_status "OK" "Custom domain configured in workflow"
    else
        print_status "ERROR" "Custom domain not configured in workflow"
    fi
    
    if grep -q "destination_dir: /" .github/workflows/deploy-docs.yml; then
        print_status "OK" "Root deployment directory configured"
    else
        print_status "WARN" "Deployment directory not set to root"
    fi
else
    print_status "ERROR" "GitHub Actions workflow not found"
fi

# Check CNAME file in static directory
if [ -f "static/CNAME" ]; then
    print_status "OK" "CNAME file in static directory"
    echo "  Static CNAME content: $(cat static/CNAME)"
else
    print_status "ERROR" "CNAME file missing from static directory"
fi

echo ""
echo "🚀 Deployment Test Summary"
echo "=========================="

if [ -f "build/docs/index.html" ] && [ -f "build/CNAME" ] && [ -d "build/docs" ]; then
    print_status "OK" "✅ Documentation is ready for deployment!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Commit and push your changes to the main branch"
    echo "2. GitHub Actions will automatically deploy to GitHub Pages"
    echo "3. Configure DNS for aiser-docs.dataticon.com to point to your-username.github.io"
    echo "4. Wait 24-48 hours for SSL certificate to be issued"
    echo ""
    echo "🔗 Expected URLs:"
    echo "  - GitHub Pages: https://your-username.github.io/aiser-world/"
    echo "  - Custom Domain: https://aiser-docs.dataticon.com/"
    echo "  - Documentation: https://aiser-docs.dataticon.com/getting-started/"
else
    print_status "ERROR" "❌ Documentation is NOT ready for deployment"
    echo "Please fix the issues above before deploying"
    exit 1
fi

echo ""
echo "🎯 Configuration Recommendations"
echo "==============================="

echo "1. Ensure your GitHub repository has GitHub Pages enabled"
echo "2. Set GitHub Pages source to 'GitHub Actions'"
echo "3. Verify DNS configuration for aiser-docs.dataticon.com"
echo "4. Check that the gh-pages branch is created after first deployment"
echo "5. Monitor GitHub Actions for deployment status"

echo ""
echo "✨ Test completed!"
