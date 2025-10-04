#!/bin/bash
set -e

echo "🔧 Setting up chat2chart service..."

# Set non-interactive mode to avoid debconf prompts
export DEBIAN_FRONTEND=noninteractive
export DEBCONF_NONINTERACTIVE_SEEN=true

# Avoid re-running heavy runtime package installs on container restarts.
# Use SKIP_RUNTIME_SETUP=1 to force-skip, or the presence of marker file
# /tmp/.start_sh_done will also skip the install step.
if [ -n "$SKIP_RUNTIME_SETUP" ] || [ -f /tmp/.start_sh_done ]; then
    echo "⚠️ Skipping runtime system setup (SKIP_RUNTIME_SETUP or marker present)"
else
    # Fix any interrupted dpkg operations
    echo "🔧 Fixing interrupted package installations..."
    dpkg --configure -a || true

    # Install system dependencies (kept short; prefer building these into the image)
    echo "📦 Installing system dependencies..."
    apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        gnupg \
        lsb-release \
        wget

    # Mark that runtime setup ran to avoid repeated installs on restart
    touch /tmp/.start_sh_done || true
fi

echo "🚀 Running database migrations..."
cd /app

# NOTE: Python dependencies are installed at image build time via Dockerfile. Avoid
# installing large wheels at container runtime to prevent OOMs and long startup.
export PYTHONPATH=/app:$PYTHONPATH
echo "Python path: $PYTHONPATH"
echo "Testing Python import..."
# If core imports fail, attempt a one-time pip install of Python deps (safe, no apt-get).
DEPS_MARKER=/tmp/.deps_installed
if [ -f "$DEPS_MARKER" ]; then
    echo "✅ Dependencies marker found; skipping pip install"
else
    # Try importing a core module; if it fails, install requirements
    python -c "import app.core.config" 2>/dev/null || {
        echo "⚠️ Core Python import failed; installing Python dependencies from requirements.txt..."
        if [ -f requirements.txt ]; then
            pip install --no-cache-dir -r requirements.txt || {
                echo "❌ pip install failed" >&2
                exit 1
            }
            touch "$DEPS_MARKER" || true
        else
            echo "❌ requirements.txt not found; cannot install dependencies" >&2
            exit 1
        fi
    }
    # Re-run import check to confirm
    python -c "import app.core.config" || { echo "❌ Import still failing after install" >&2; exit 1; }
    echo "✅ Python imports OK"
fi

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


