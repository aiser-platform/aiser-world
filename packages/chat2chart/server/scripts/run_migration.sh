#!/bin/bash
# Run onboarding enhancements migration
# Usage: ./scripts/run_migration.sh

set -e

echo "🚀 Running Onboarding Enhancements Migration..."

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "📦 Running inside Docker container"
    cd /app
    poetry run python scripts/run_onboarding_migrations.py
else
    echo "💻 Running locally"
    # Check if Docker container is running
    if docker ps | grep -q aiser-chat2chart-dev; then
        echo "🐳 Executing migration in Docker container..."
        docker exec aiser-chat2chart-dev poetry run python /app/scripts/run_onboarding_migrations.py
    else
        echo "⚠️  Docker container not found. Running locally..."
        cd packages/chat2chart/server
        poetry run python scripts/run_onboarding_migrations.py
    fi
fi

echo "✅ Migration script completed"


