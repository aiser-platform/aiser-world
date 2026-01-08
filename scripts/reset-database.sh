#!/bin/bash
# Reset database script - drops all tables and runs migrations from scratch
# Usage: ./scripts/reset-database.sh

set -e

echo "⚠️  WARNING: This will drop ALL tables in the database!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

# Get database connection details from environment or use defaults
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-aiser_world}"
DB_USER="${DB_USER:-aiser}"
DB_PASSWORD="${DB_PASSWORD:-aiser_password}"

export PGPASSWORD="$DB_PASSWORD"

echo "📊 Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT"

# Drop all tables
echo "🗑️  Dropping all existing tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
-- Drop all tables in public schema
DO \$\$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;

-- Drop all functions
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid) 
              WHERE ns.nspname = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
END \$\$;
EOF

echo "✅ All tables dropped"

# Run Alembic migrations
echo "🔄 Running Alembic migrations..."
cd packages/chat2chart/server
poetry run alembic -c alembic.ini upgrade head

echo "✅ Database reset complete!"
echo "📋 Verifying tables exist..."

# Verify 4 tables exist
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('conversation', 'message', 'data_sources', 'file_storage')
ORDER BY tablename;
"

echo "✅ Database reset and verification complete!"




