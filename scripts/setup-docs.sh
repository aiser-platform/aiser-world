#!/bin/bash

echo "🚀 Setting up Aiser Platform Documentation..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to docs package
cd packages/docs

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "⚠️  Python not found. Installing Python dependencies..."
    
    # Try to install Python 3
    if command -v apt-get &> /dev/null; then
        echo " Installing Python 3 via apt-get..."
        sudo apt-get update
        sudo apt-get install -y python3 python3-pip python3-venv
    elif command -v yum &> /dev/null; then
        echo " Installing Python 3 via yum..."
        sudo yum install -y python3 python3-pip
    elif command -v brew &> /dev/null; then
        echo " Installing Python 3 via Homebrew..."
        brew install python3
    else
        echo "❌ Could not install Python automatically. Please install Python 3.11+ manually."
        echo "   Visit: https://www.python.org/downloads/"
        exit 1
    fi
fi

# Determine Python command
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Python still not available after installation attempt"
    exit 1
fi

echo "✅ Using Python: $($PYTHON_CMD --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
echo " Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Clean npm cache and remove node_modules
echo " Cleaning npm cache and removing old node_modules..."
rm -rf node_modules package-lock.json
npm cache clean --force

# Install Node.js dependencies
echo " Installing Node.js dependencies..."
npm install

# Verify Docusaurus installation (FIXED: Use npx instead of global CLI)
if ! npx docusaurus --version &> /dev/null; then
    echo "❌ Docusaurus not found. Checking package installation..."
    if [ ! -d "node_modules/@docusaurus" ]; then
        echo "❌ Docusaurus packages not installed. Reinstalling..."
        npm install
    fi
fi

# Create templates directory if it doesn't exist
mkdir -p scripts/templates

# Generate initial documentation (with Python from venv)
echo " Generating initial documentation..."
source venv/bin/activate && python scripts/generate_docs.py

# Build documentation
echo "🔨 Building documentation..."
npm run build

echo "✅ Documentation setup completed!"
echo ""
echo "🌐 Start development server: npm run docs:dev"
echo "🚀 Deploy to production: npm run docs:deploy"
echo ""
echo "📝 Note: Python virtual environment is located at: packages/docs/venv"
echo "   To activate it manually: source packages/docs/venv/bin/activate"
