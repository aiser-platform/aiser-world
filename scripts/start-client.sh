#!/bin/sh
set -e

echo "🔧 Setting up client..."

# Install system dependencies
apk add --no-cache libc6-compat

cd /app

echo "🚀 Starting client with host binding..."
# Start Next.js development server with proper host binding
exec npx next dev -p 3000 -H 0.0.0.0