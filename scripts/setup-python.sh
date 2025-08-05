#!/bin/bash

# Setup Python dependencies for all services

set -e

echo "🐍 Setting up Python dependencies for Aiser World..."

# Function to setup Python environment
setup_python_env() {
    local service_dir=$1
    local service_name=$2
    
    if [ -f "$service_dir/requirements.txt" ]; then
        echo "📦 Setting up $service_name..."
        cd "$service_dir"
        
        # Remove existing venv if it exists
        if [ -d "venv" ]; then
            echo "Removing existing virtual environment..."
            rm -rf venv
        fi
        
        # Create new virtual environment
        echo "Creating virtual environment..."
        python3 -m venv venv
        
        # Activate and install dependencies
        echo "Installing dependencies..."
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        deactivate
        
        echo "✅ $service_name setup complete"
        cd - > /dev/null
    else
        echo "⚠️  No requirements.txt found for $service_name"
    fi
}

# Setup Auth service
setup_python_env "packages/auth" "Authentication Service"

# Setup Chat2Chart server
setup_python_env "packages/chat2chart/server" "Chat2Chart Server"

echo "🎉 All Python environments set up successfully!"
echo ""
echo "To run services:"
echo "  ./scripts/dev.sh chat2chart  # Start Chat2Chart"
echo "  ./scripts/dev.sh auth        # Start Auth service"
echo "  ./scripts/dev.sh all         # Start all services"