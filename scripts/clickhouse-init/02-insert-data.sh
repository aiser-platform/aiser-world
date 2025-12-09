#!/bin/sh
# ClickHouse Data Population Script
# This script runs the Python data insertion script on container initialization
# It waits for ClickHouse to be ready, checks if data exists, and populates if needed

set -e

echo "🚀 Starting ClickHouse data population..."

# Wait for ClickHouse to be ready (up to 60 seconds)
MAX_WAIT=60
WAITED=0
until wget --no-verbose --tries=1 --spider http://127.0.0.1:8123/ping 2>/dev/null; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "❌ ClickHouse did not become ready within ${MAX_WAIT} seconds"
        exit 1
    fi
    echo "⏳ Waiting for ClickHouse to be ready... (${WAITED}s/${MAX_WAIT}s)"
    sleep 2
    WAITED=$((WAITED + 2))
done

echo "✅ ClickHouse is ready"

# Wait a bit more for database to be fully initialized
sleep 3

# Check if data already exists
DATA_EXISTS=$(clickhouse-client --user "${CLICKHOUSE_USER:-aiser}" --password "${CLICKHOUSE_PASSWORD:-aiser_warehouse_password}" --query "SELECT count() FROM ${CLICKHOUSE_DB:-aiser_warehouse}.customers" 2>/dev/null || echo "0")

if [ "$DATA_EXISTS" != "0" ] && [ "$DATA_EXISTS" != "" ]; then
    echo "ℹ️  Data already exists in ClickHouse (${DATA_EXISTS} customers), skipping population"
    exit 0
fi

echo "📊 Populating ClickHouse with sample data..."

# Install Python and required packages if not available
if ! command -v python3 >/dev/null 2>&1; then
    echo "📦 Installing Python3..."
    apk add --no-cache python3 py3-pip
fi

# Install required Python packages using apk (Alpine package manager)
if ! python3 -c "import aiohttp" 2>/dev/null; then
    echo "📦 Installing Python dependencies..."
    # Use apk to install aiohttp if available, otherwise use pip with --break-system-packages
    if apk info py3-aiohttp >/dev/null 2>&1; then
        apk add --no-cache py3-aiohttp
    else
        # Fallback to pip with --break-system-packages for Alpine
        # Suppress externally-managed-environment error (it's just a warning in containers)
        python3 -m pip install --break-system-packages --no-cache-dir aiohttp 2>&1 | grep -v "externally-managed-environment" || \
        pip3 install --break-system-packages --no-cache-dir aiohttp 2>&1 | grep -v "externally-managed-environment" || true
    fi
fi

# Run the data insertion script
if [ -f /docker-entrypoint-initdb.d/02-insert-data.py ]; then
    python3 /docker-entrypoint-initdb.d/02-insert-data.py
    echo "✅ ClickHouse data population completed!"
else
    echo "⚠️  Data insertion script not found at /docker-entrypoint-initdb.d/02-insert-data.py"
    exit 1
fi
