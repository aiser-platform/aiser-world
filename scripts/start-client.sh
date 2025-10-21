#!/bin/sh
set -e

echo "🔧 Setting up client..."

# Install system dependencies
apk add --no-cache libc6-compat

cd /app

echo "🚀 Starting client with host binding..."
# Install dependencies first to ensure correct Next.js version
npm install
# Start Next.js development server with proper host binding using project's Next.js version
exec npm run dev -- -p 3000 -H 0.0.0.0