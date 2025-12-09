# Aiser Platform - Developer Setup Guide

This guide helps new developers set up the Aiser development environment quickly.

## Prerequisites

- Docker and Docker Compose
- Git

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/aiser/world.git
   cd aiser-world
   ```

2. **Run the setup script**
   ```bash
   ./scripts/migrate-dev.sh
   ```

This script will:
- Start PostgreSQL
- Run all fabric migrations for auth and chat2chart services
- Seed the admin user
- Verify service health

## Login Credentials

After setup, you can login with:
- **Email**: `admin@aiser.app`
- **Password**: `admin123`

## Services

- **Frontend**: http://localhost:3000
- **Chat2Chart API**: http://localhost:8000 (docs: http://localhost:8000/docs)
- **Auth Service**: http://localhost:5000 (docs: http://localhost:5000/docs)
- **PostgreSQL**: localhost:5432 (user: `aiser`, password: `aiser`, db: `aiser_world`)

## Manual Setup (if script fails)

### 1. Start services
```bash
docker compose -f docker-compose.dev.yml up -d postgres
sleep 5
```

### 2. Run auth migrations
```bash
docker exec -e DATABASE_URL="postgresql://aiser:aiser@postgres:5432/aiser_world" aiser-auth poetry run alembic upgrade head
```

### 3. Run chat2chart migrations
```bash
docker exec -e DATABASE_URL="postgresql://aiser:aiser@postgres:5432/aiser_world" aiser-chat2chart-dev poetry run alembic upgrade head
```

### 4. Start all services
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 5. Verify schema (optional)
```bash
docker exec aiser-postgres psql -U aiser -d aiser_world -c "\dt"
```

## Troubleshooting

### Database connection errors
Ensure PostgreSQL is running:
```bash
docker ps | grep postgres
```

### Migration errors
Drop and recreate the database:
```bash
docker exec aiser-postgres dropdb -U aiser aiser_world
docker exec aiser-postgres createdb -U aiser aiser_world
```

Then run migrations again.

### Login issues
Check admin user exists:
```bash
docker exec aiser-postgres psql -U aiser -d aiser_world -c "SELECT email FROM users WHERE email='admin@aiser.app';"
```

## Architecture Notes

- **auth-service**: Handles authentication, device sessions, JWT tokens
- **chat2chart-server**: Main API service for charts, dashboards, data sources
- Both services share the same PostgreSQL database
- Migrations are isolated per service but target the same database schema

## Next Steps

- Read the main project README
- Review the API documentation at `/docs` endpoints
- Check the `aiser-platform-context.md` for architecture details

