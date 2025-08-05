#!/bin/bash
set -e

echo "🔧 Setting up chat2chart service..."

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get update -qq && apt-get install -y -qq build-essential libpq-dev curl

# Install dependencies directly with pip
echo "📦 Installing Python dependencies..."
cd /app

pip install fastapi uvicorn alembic asyncpg psycopg2-binary sqlalchemy cryptography passlib python-jose email-validator pydantic pydantic-settings openai litellm boto3 colorama pandas numpy pillow redis python-dotenv python-multipart

echo "🚀 Running database migrations..."
export PYTHONPATH=/app:$PYTHONPATH
echo "Python path: $PYTHONPATH"
echo "Testing Python import..."
python -c "import sys; print('Python path:', sys.path); import app.core.config; print('Import successful')"

# Run database migrations
alembic upgrade head

echo "🚀 Starting chat2chart service..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload