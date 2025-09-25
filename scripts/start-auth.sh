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

# Run database migrations: try upgrade, fallback to stamping head to avoid DuplicateTable in dev
echo "🚧 Applying alembic migrations (upgrade head)"
if python -m alembic upgrade head; then
    echo "✅ Alembic upgrade applied"
else
    echo "⚠️ Alembic upgrade failed; stamping current DB as head to avoid re-applying migrations"
    # Stamp the DB to head so alembic won't attempt to recreate existing tables in dev environments
    python -m alembic stamp head || true
fi

echo "🚀 Starting auth service..."
uvicorn src.app.main:app --host 0.0.0.0 --port 5000 --reload