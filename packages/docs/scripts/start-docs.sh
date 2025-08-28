#!/bin/bash
set -e

echo "🔧 Setting up Aiser Documentation..."

# Check if we're in the right directory
if [ ! -f "docusaurus.config.js" ]; then
    echo "❌ Error: Please run this script from the docs package directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clear any previous builds
echo "🧹 Clearing previous builds..."
npm run clear

# Build the documentation
echo "🏗️ Building documentation..."
npm run build

# Start the development server
echo "🚀 Starting documentation server on port 3005..."
echo "📖 Documentation will be available at: http://localhost:3005"
echo "🌐 Custom domain: https://aiser-docs.dataticon.com"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run serve
