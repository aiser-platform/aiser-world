#!/bin/bash

# Aicser Platform Documentation - Quick Start Script
# This script quickly starts the documentation service

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Aicser Platform Documentation...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "docusaurus.config.js" ]; then
    echo -e "${YELLOW}⚠️  Please run this script from the packages/docs directory${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}⚠️  npm is not installed. Please install npm${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

echo -e "${BLUE}🔧 Building documentation...${NC}"
npm run build

echo -e "${BLUE}🌐 Starting documentation server...${NC}"
echo -e "${GREEN}✅ Documentation will be available at: http://localhost:3005${NC}"
echo -e "${GREEN}✅ Press Ctrl+C to stop the server${NC}"

# Start the documentation server
npm start
