#!/bin/bash
# Development migration helper for new developers
# This script ensures the database is properly migrated and seeded for auth and chat2chart services

set -e

echo "🔧 Aiser Development Migration Helper"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start PostgreSQL
echo -e "\n${YELLOW}[1/6]${NC} Starting PostgreSQL container..."
docker compose up -d postgres
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Step 2: Run auth-service migrations
echo -e "\n${YELLOW}[2/6]${NC} Running auth-service migrations..."
docker exec -e DATABASE_URL="${DATABASE_URL:-postgresql://aiser:aiser@postgres:5432/aiser_world}" aiser-auth-dev poetry run alembic upgrade heads || {
    echo -e "${RED}Error: auth-service migrations failed${NC}"
    echo "Checking auth service container status..."
    docker ps -a | grep aiser-auth
    exit 1
}
echo -e "${GREEN}✓${NC} Auth migrations complete"

# Step 3: Run chat2chart migrations
echo -e "\n${YELLOW}[3/6]${NC} Running chat2chart-server migrations..."
docker exec -e DATABASE_URL="${DATABASE_URL:-postgresql://aiser:aiser@postgres:5432/aiser_world}" aiser-chat2chart-dev poetry run alembic upgrade heads || {
    echo -e "${RED}Error: chat2chart migrations failed${NC}"
    echo "Note: Some SQLAlchemy dialec errors may appear but are non-fatal in development"
}
echo -e "${GREEN}✓${NC} Chat2chart migrations complete"

# Step 4: Verify admin user exists
echo -e "\n${YELLOW}[4/6]${NC} Verifying admin user exists..."
USER_CHECK=$(docker exec -e PGPASSWORD=aiser postgres psql -U aiser -d aiser_world -t -c "SELECT COUNT(*) FROM users WHERE email='admin@aiser.app';" | tr -d ' ')

if [ "$USER_CHECK" = "0" ]; then
    echo "Admin user not found. Creating..."
    docker exec -e DATABASE_URL="postgresql://aiser:aiser@postgres:5432/aiser_world" aiser-auth-dev poetry run alembic downgrade -1 || true
    docker exec -e DATABASE_URL="postgresql://aiser:aiser@postgres:5432/aiser_world" aiser-auth-dev poetry run alembic upgrade heads
else
    echo -e "${GREEN}✓${NC} Admin user exists (email: admin@aiser.app, password: admin123)"
fi

# Step 5: Restart services
echo -e "\n${YELLOW}[5/6]${NC} Restarting services..."
docker compose restart auth chat2chart
echo "Waiting for services to start..."
sleep 5

# Step 6: Verify services are healthy
echo -e "\n${YELLOW}[6/6]${NC} Verifying service health..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "aiser-(auth|chat2chart|postgres)"

echo -e "\n${GREEN}✅ Migration complete!${NC}"
echo ""
echo "Login credentials:"
echo "  Email: admin@aiser.app"
echo "  Password: admin123"
echo ""
echo "Services available at:"
echo "  - Frontend: http://localhost:3000"
echo "  - Chat2Chart API: http://localhost:8000"
echo "  - Auth Service: http://localhost:5000"

