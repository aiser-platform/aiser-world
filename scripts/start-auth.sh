#!/bin/bash
set -e

echo "🔧 Setting up auth service..."

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get update -qq && apt-get install -y -qq build-essential libpq-dev curl

# Install dependencies directly with pip
echo "📦 Installing Python dependencies..."
cd /app

pip install fastapi uvicorn alembic asyncpg psycopg2-binary sqlalchemy cryptography passlib python-jose email-validator pydantic pydantic-settings colorama python-dotenv pandas python-multipart pillow emails jinja2

echo "🚀 Running database migrations..."
export PYTHONPATH=/app/src:$PYTHONPATH
echo "Python path: $PYTHONPATH"
echo "Testing Python import..."
python -c "import sys; print('Python path:', sys.path); import app.core.config; print('Import successful')"

# Run database migrations
python -m alembic upgrade head

echo "🚀 Starting auth service..."
uvicorn src.app.main:app --host 0.0.0.0 --port 5000 --reload