#!/bin/sh
set -e

echo "🔧 Setting up client..."

# Add host entries to bypass DNS resolution issues
echo "172.20.0.7 chat2chart-server" >> /etc/hosts
echo "172.20.0.5 auth-service" >> /etc/hosts

# Wait for backend services to be ready
until nc -z chat2chart-server 8000; do
  echo "Waiting for chat2chart-server to be ready..."
  sleep 5
done

until nc -z auth-service 5000; do
  echo "Waiting for auth-service to be ready..."
  sleep 5
done

cd /app

echo "🚀 Starting client with host binding..."
# Install dependencies first to ensure correct Next.js version
npm install
# Start Next.js development server in background and wait for it
npm run dev -- -p 3000 -H 0.0.0.0 &
wait $!