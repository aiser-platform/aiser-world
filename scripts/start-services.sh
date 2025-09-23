#!/bin/bash

echo "🚀 Starting Aiser World Services..."

# Start Backend (Port 8000)
echo "Starting Chat2Chart Server on port 8000..."
cd packages/chat2chart/server
source venv/bin/activate
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > server.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

# Start Auth Service (Port 5000)
echo "Starting Auth Service on port 5000..."
cd ../../auth
poetry run uvicorn src.app.main:app --reload --host 0.0.0.0 --port 5000 > auth.log 2>&1 &
AUTH_PID=$!
echo "Auth Service started with PID: $AUTH_PID"

# Wait a moment for auth service to start
sleep 3

# Start Frontend (Port 3000)
echo "Starting React Client on port 3000..."
cd ../client
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "✅ Services started!"
echo "Backend: http://localhost:8000"
echo "Auth Service: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "To stop services, run: ./scripts/stop-services.sh"

