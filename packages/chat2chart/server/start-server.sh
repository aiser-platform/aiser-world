#!/bin/sh
set -ex

echo "🚀 Starting chat2chart-server..."

# Explicitly activate poetry shell to ensure environment is fully loaded
. $(poetry env info --path)/bin/activate

# Execute the main command
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
