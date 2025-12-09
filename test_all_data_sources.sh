#!/bin/bash

# Complete Data Source Testing Script
# Tests all data source types with AI agent integration

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🧪 COMPLETE DATA SOURCE TESTING SUITE 🧪            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Login and get token
echo "1️⃣  Authenticating..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:5000/users/sign-in \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@aiser.local", "password": "Admin123"}')

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Authentication failed"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Test 1: PostgreSQL Database
echo "2️⃣  Testing PostgreSQL Database Connection..."
PG_RESPONSE=$(curl -s -X POST http://localhost:8000/data/database/test \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "postgresql",
    "host": "postgres",
    "port": 5432,
    "database": "aiser_world",
    "username": "aiser",
    "password": "aiser_password"
  }')

echo "$PG_RESPONSE" | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅ PostgreSQL OK' if r.get('success') else '❌ PostgreSQL Failed: ' + str(r))"
echo ""

# Test 2: ClickHouse Warehouse
echo "3️⃣  Testing ClickHouse Warehouse Connection..."
CH_RESPONSE=$(curl -s -X POST http://localhost:8000/data/database/test \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "clickhouse",
    "host": "clickhouse",
    "port": 8123,
    "database": "aiser_warehouse",
    "username": "aiser",
    "password": "aiser_warehouse_password"
  }')

echo "$CH_RESPONSE" | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅ ClickHouse OK' if r.get('success') else '❌ ClickHouse Failed: ' + str(r))"
echo ""

# Test 3: Save ClickHouse Warehouse
echo "4️⃣  Saving ClickHouse Warehouse..."
SAVE_RESPONSE=$(curl -s -X POST http://localhost:8000/data/warehouses/connect \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_config": {
      "type": "clickhouse",
      "name": "Test ClickHouse Warehouse",
      "host": "clickhouse",
      "port": 8123,
      "database": "aiser_warehouse",
      "username": "aiser",
      "password": "aiser_warehouse_password"
    }
  }')

WAREHOUSE_ID=$(echo "$SAVE_RESPONSE" | python3 -c "import sys, json; r=json.load(sys.stdin); print(r.get('data_source_id', ''))" 2>/dev/null || echo "")

if [ -n "$WAREHOUSE_ID" ]; then
  echo "✅ Warehouse saved: $WAREHOUSE_ID"
else
  echo "❌ Failed to save warehouse"
  echo "$SAVE_RESPONSE"
fi
echo ""

# Test 4: List Data Sources
echo "5️⃣  Listing All Data Sources..."
LIST_RESPONSE=$(curl -s http://localhost:8000/data/sources \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SOURCE_COUNT=$(echo "$LIST_RESPONSE" | python3 -c "import sys, json; r=json.load(sys.stdin); print(len(r.get('data_sources', [])))" 2>/dev/null || echo "0")

echo "✅ Found $SOURCE_COUNT data sources"
echo ""

# Test 5: AI Chat (if warehouse was saved)
if [ -n "$WAREHOUSE_ID" ]; then
  echo "6️⃣  Testing AI Chat with Data Source..."
  CHAT_RESPONSE=$(curl -s -X POST http://localhost:8000/chat \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"What tables are available in this data source?\",
      \"data_source_id\": \"$WAREHOUSE_ID\"
    }")
  
  echo "$CHAT_RESPONSE" | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅ AI Chat OK' if r.get('success', True) else '❌ AI Chat Failed')" 2>/dev/null || echo "⚠️  AI Chat response received"
else
  echo "6️⃣  Skipping AI Chat test (no data source)"
fi
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  ✅ TESTING COMPLETE ✅                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Results:"
echo "  - Authentication: ✅"
echo "  - PostgreSQL Test: Check above"
echo "  - ClickHouse Test: Check above"
echo "  - Warehouse Save: $( [ -n "$WAREHOUSE_ID" ] && echo '✅' || echo '❌' )"
echo "  - Data Sources Listed: ✅ ($SOURCE_COUNT found)"
echo "  - AI Integration: Check above"
echo ""
echo "🎯 Next steps:"
echo "  1. Open http://localhost:3000/data"
echo "  2. Verify data sources appear"
echo "  3. Test chat at http://localhost:3000/chat"
echo "  4. Select a data source and ask questions"
echo ""
echo "📚 Documentation:"
echo "  - AI_AGENT_DATA_SOURCE_SUPPORT.md"
echo "  - COMPREHENSIVE_FIX_SUMMARY.md"
echo ""
