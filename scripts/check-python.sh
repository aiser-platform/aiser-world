#!/bin/bash

# Check Python setup for Aiser World

echo "🐍 Checking Python setup..."

# Check Python version
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found: $(python3 --version)"
else
    echo "❌ Python3 not found"
    exit 1
fi

# Check pip
if command -v pip3 &> /dev/null; then
    echo "✅ pip3 found: $(pip3 --version)"
else
    echo "❌ pip3 not found"
    exit 1
fi

# Check virtual environment capability
if python3 -m venv --help &> /dev/null; then
    echo "✅ venv module available"
else
    echo "❌ venv module not available"
    echo "Install with: sudo apt-get install python3-venv"
    exit 1
fi

# Check if pandas can be installed
echo "🧪 Testing pandas installation..."
python3 -c "import pandas" 2>/dev/null && echo "✅ pandas already available" || echo "⚠️  pandas not installed (will be installed by setup script)"

echo "🎉 Python environment check complete!"
echo ""
echo "Next steps:"
echo "1. Run: ./scripts/setup-python.sh"
echo "2. Run: ./scripts/dev.sh chat2chart"