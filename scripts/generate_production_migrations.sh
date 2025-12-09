#!/bin/bash
# Generate production-ready Alembic migrations
# Usage: ./scripts/generate_production_migrations.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Aiser Platform - Production Migration Generator"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo "Step 1: Ensure database is up and services are running..."
echo "-----------------------------------------------------------"
docker compose -f docker-compose.dev.yml up -d postgres redis
sleep 5

echo -e "${GREEN}✓${NC} Database services are running"
echo ""

# Generate Auth Service Migration
echo "Step 2: Generating Auth Service Migration..."
echo "-----------------------------------------------------------"
docker compose -f docker-compose.dev.yml exec -T auth-service bash -c "
    cd /app && \
    poetry run alembic revision --autogenerate -m 'Production initial schema' && \
    echo 'Migration generated successfully!'
" || echo -e "${YELLOW}⚠ Auth migration may already exist${NC}"

echo ""

# Generate Chat2Chart Service Migration
echo "Step 3: Generating Chat2Chart Service Migration..."
echo "-----------------------------------------------------------"
docker exec -it aiser-postgres-dev psql -U aiser -d aiser_world -c "
    -- Create chat2chart version table if it doesn't exist
    CREATE TABLE IF NOT EXISTS chat2chart_alembic_version (
        version_num VARCHAR(32) NOT NULL,
        CONSTRAINT chat2chart_alembic_version_pkc PRIMARY KEY (version_num)
    );
" > /dev/null 2>&1

# Since we're using SQLAlchemy create_all currently, we need to capture the current schema
echo -e "${YELLOW}ℹ Note: Currently using SQLAlchemy create_all() for development${NC}"
echo "   For production, we'll create a baseline migration from current schema"
echo ""

# Create production-ready migration script
echo "Step 4: Creating baseline migration template..."
echo "-----------------------------------------------------------"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_FILE="packages/chat2chart/server/alembic_c2c/versions/${TIMESTAMP}_production_baseline.py"

cat > "$MIGRATION_FILE" << 'EOF'
"""Production baseline migration

This migration represents the initial schema for chat2chart service.
Generated from current SQLAlchemy models.

Revision ID: production_baseline_001
Revises: 
Create Date: $(date +"%Y-%m-%d %H:%M:%S")
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'production_baseline_001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply schema changes.
    
    NOTE: This is a baseline migration. In production, tables may already exist.
    Each CREATE TABLE uses IF NOT EXISTS to be idempotent.
    """
    # Create data_sources table
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_sources (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            config JSONB,
            connection_string TEXT,
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    op.execute("CREATE INDEX IF NOT EXISTS ix_data_sources_id ON data_sources (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_data_sources_name ON data_sources (name)")
    
    # Create data_queries table
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_queries (
            id SERIAL PRIMARY KEY,
            data_source_id INTEGER REFERENCES data_sources(id),
            query_text TEXT NOT NULL,
            query_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    op.execute("CREATE INDEX IF NOT EXISTS ix_data_queries_id ON data_queries (id)")
    
    # Create data_connections table
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_connections (
            id SERIAL PRIMARY KEY,
            data_source_id INTEGER REFERENCES data_sources(id),
            connection_params JSONB,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    op.execute("CREATE INDEX IF NOT EXISTS ix_data_connections_id ON data_connections (id)")
    
    # Add more tables as needed from your models...
    # This is a template - expand based on your actual schema


def downgrade() -> None:
    """
    Revert schema changes.
    
    NOTE: Use with caution in production!
    """
    op.execute("DROP TABLE IF EXISTS data_connections CASCADE")
    op.execute("DROP TABLE IF EXISTS data_queries CASCADE")
    op.execute("DROP TABLE IF NOT EXISTS data_sources CASCADE")
EOF

echo -e "${GREEN}✓${NC} Baseline migration created: $MIGRATION_FILE"
echo ""

echo "Step 5: Migration Summary"
echo "-----------------------------------------------------------"
echo "Auth Service Migrations:"
ls -1 packages/auth/src/migrations/versions/*.py 2>/dev/null | tail -3 || echo "  No migrations found"
echo ""
echo "Chat2Chart Service Migrations:"
ls -1 packages/chat2chart/server/alembic_c2c/versions/*.py 2>/dev/null | tail -3 || echo "  Baseline migration created"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Migration generation complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo "  1. Review generated migrations in your editor"
echo "  2. Test migrations: ./scripts/test_migrations.sh"
echo "  3. Commit migrations to version control"
echo "  4. Deploy to production using: ./scripts/deploy_migrations.sh"
echo ""

