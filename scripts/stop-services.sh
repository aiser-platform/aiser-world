#!/bin/bash

echo "🛑 Stopping Aiser World Services..."

# Stop Backend
echo "Stopping Chat2Chart Server..."
pkill -f uvicorn

# Stop Auth Service
echo "Stopping Auth Service..."
pkill -f "uvicorn.*5000"

# Stop Frontend
echo "Stopping React Client..."
pkill -f "next dev"

# Wait a moment
sleep 2

# Check if services are stopped
if ! ss -tlnp | grep -q :8000; then
    echo "✅ Backend (port 8000) stopped"
else
    echo "⚠️  Backend still running on port 8000"
fi

if ! ss -tlnp | grep -q :5000; then
    echo "✅ Auth Service (port 5000) stopped"
else
    echo "⚠️  Auth Service still running on port 5000"
fi

if ! ss -tlnp | grep -q :3000; then
    echo "✅ Frontend (port 3000) stopped"
else
    echo "⚠️  Frontend still running on port 3000"
fi

echo "🛑 All services stopped!"

