#!/bin/sh
set -e

echo "🔧 Setting up client..."

# Install system dependencies
apk add --no-cache libc6-compat

cd /app

echo "📦 Installing Node.js dependencies..."
npm install --silent

echo "🚀 Starting client..."
npm run dev