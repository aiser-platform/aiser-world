#!/bin/bash
set -e

echo "🔧 Setting up chat2chart service..."

# Set non-interactive mode to avoid debconf prompts
export DEBIAN_FRONTEND=noninteractive
export DEBCONF_NONINTERACTIVE_SEEN=true

# Fix any interrupted dpkg operations
echo "🔧 Fixing interrupted package installations..."
dpkg --configure -a || true

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    gnupg \
    lsb-release \
    wget

echo "🚀 Running database migrations..."
cd /app

# NOTE: Python dependencies are installed at image build time via Dockerfile. Avoid
# installing large wheels at container runtime to prevent OOMs and long startup.
export PYTHONPATH=/app:$PYTHONPATH
echo "Python path: $PYTHONPATH"
echo "Testing Python import..."
python -c "import sys; print('Python path:', sys.path); import app.core.config; print('Import successful')"

# Run database migrations (fail fast if migrations fail)
echo "Running alembic upgrade head..."
if ! command -v alembic >/dev/null 2>&1; then
    echo "alembic not found in PATH; ensure migrations are run in your environment" >&2
else
    alembic upgrade head || { echo "alembic upgrade head failed" >&2; exit 1; }
fi

# Run quick schema sanity checks to fail fast on startup if migrations incomplete
echo "Running quick schema sanity checks..."
if python -c "import app.scripts.check_schema as c; import sys; sys.exit(c.run_checks())"; then
    echo "Schema sanity checks passed"
else
    echo "Schema sanity checks failed; exiting" >&2
    exit 1
fi


echo "🚀 Starting chat2chart service..."
# Run uvicorn without --reload in container to avoid multiple bind attempts by PID1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info


