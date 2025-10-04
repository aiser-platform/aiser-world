# 🚀 Aiser Platform Setup Guide

This guide will help you set up the Aiser Platform for development and production.

## 📋 Prerequisites

- Docker and Docker Compose
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

## 🏗️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd aiser-world

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d
```

### 2. Database Setup

The database will be automatically initialized with the basic tables. For the complete multi-tenant setup:

```bash
# Run the database setup script
cd packages/chat2chart/server
python scripts/setup_database.py
```

This script will:
- ✅ Check for missing tables
- ✅ Create missing tables (organizations, projects, data_sources, dashboards, etc.)
- ✅ Seed demo data for development
- ✅ Verify the setup

### Developer shortcuts

- **Default admin user**: `scripts/setup_database.py` will create a dev admin when no users exist. Defaults:
  - Email: `admin@aiser.local`
  - Username: `admin`
  - Password: `Admin123`
  Override via `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` env vars.

- **DB health-check & utilities**: the setup script now includes a `--health` flag that prints a JSON health report and a `--prune-demo N` flag to keep only `N` demo data sources.

- **Cube.js**: you can replace the local Cube helper with the official Cube Docker image for a more complete modeling experience; set `CUBE_API_URL` and `CUBE_API_SECRET` in `.env`.

### 3. Verify Setup

```bash
# Check if all services are running
docker-compose ps

# Test the API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/organizations
curl http://localhost:8000/api/projects
```

## 🗄️ Database Schema

### Core Tables

- **organizations** - Multi-tenant organization management
- **projects** - Project organization within organizations
- **data_sources** - Data source metadata and configuration
- **project_data_source** - Many-to-many relationship between projects and data sources
- **dashboards** - Dashboard configurations
- **dashboard_widgets** - Individual widgets within dashboards

### API Endpoints

#### Organizations
- `GET /api/organizations` - List all organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/{id}` - Get organization details
- `PUT /api/organizations/{id}` - Update organization

#### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project

#### Project-Scoped Data Sources
- `GET /data/api/organizations/{org_id}/projects/{project_id}/data-sources` - List project data sources
- `POST /data/api/organizations/{org_id}/projects/{project_id}/data-sources` - Create project data source
- `GET /data/api/organizations/{org_id}/projects/{project_id}/data-sources/{id}` - Get data source details
- `POST /data/api/organizations/{org_id}/projects/{project_id}/data-sources/{id}/query` - Execute query
- `GET /data/api/organizations/{org_id}/projects/{project_id}/data-sources/{id}/data` - Get data

#### Project-Scoped Dashboards
- `GET /charts/api/organizations/{org_id}/projects/{project_id}/dashboards` - List project dashboards
- `POST /charts/api/organizations/{org_id}/projects/{project_id}/dashboards` - Create dashboard
- `GET /charts/api/organizations/{org_id}/projects/{project_id}/dashboards/{id}` - Get dashboard details
- `PUT /charts/api/organizations/{org_id}/projects/{project_id}/dashboards/{id}` - Update dashboard

## 🔧 Development

### Frontend Development

```bash
cd packages/chat2chart/client
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Development

```bash
cd packages/chat2chart/server
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### Database Migrations

```bash
# Run migrations
cd packages/chat2chart/server
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migration
alembic upgrade head
```

## 🧪 Testing

### API Testing

```bash
# Test project-scoped data sources
curl http://localhost:8000/data/api/organizations/1/projects/1/data-sources

# Test project-scoped dashboards
curl http://localhost:8000/charts/api/organizations/1/projects/1/dashboards

# Test enterprise connections
curl http://localhost:8000/data/enterprise/connections
```

### Frontend Testing

```bash
cd packages/chat2chart/client
npm test
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Database
POSTGRES_DB=aiser_world
POSTGRES_USER=aiser
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432

# API
API_SECRET_KEY=your_secret_key
CUBE_API_SECRET=your_cube_secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose logs postgres
   
   # Restart database
   docker-compose restart postgres
   ```

2. **Missing Tables**
   ```bash
   # Run setup script
   python scripts/setup_database.py
   ```

3. **API Endpoints Not Working**
   ```bash
   # Check backend logs
   docker-compose logs backend-server
   
   # Verify database tables exist
   docker-compose exec postgres psql -U aiser -d aiser_world -c "\dt"
   ```

4. **Frontend Build Issues**
   ```bash
   # Clear node modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

## Schema management & deployment

- **Centralized schemas**: Generated Cube YAML schemas are stored in `packages/chat2chart/server/cube_schemas/`. Treat this directory as the canonical source for Aiser-managed schemas; add generated schemas to PRs for review where appropriate.
- **Generation flow**: The modeling service (`CubeDataModelingService`) produces YAML with Aiser-specific metadata and saves it to the central directory. Use the `deploy_schema_to_cube` helper to push schemas to the Cube API.
- **Branding & overrides**: Post-process generated YAML to add Aiser annotations, naming conventions, and any UI widget metadata before merging into `cube_schemas/`.
- **Recommended**: Run the modeling locally, review generated YAML, and open a PR to include approved schemas in `cube_schemas/` to maintain a curated set for Aiser customers.

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend-client
docker-compose logs backend-server
docker-compose logs postgres
```

## 📚 Additional Resources

- [API Documentation](http://localhost:8000/docs)
- [Frontend Documentation](./client/README.md)
- [Backend Documentation](./server/README.md)
- [Database Schema](./server/migrations/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Happy coding! 🎉**

## Developer Onboarding Admin User

The setup script will create a default admin user for local development to make onboarding and testing faster. By default the credentials are:

- Email: `admin@aiser.local`
- Username: `admin`
- Password: `Admin123`

You can override these values by setting environment variables before running the setup script:

```bash
export ADMIN_EMAIL=admin100@aiser.local
export ADMIN_PASSWORD=Admin123
export ADMIN_USERNAME=admin100
python scripts/setup_database.py
```

The script will also provision a default organization and project for the admin user (`Aiser Organization` / `Default Project`) and add the user to `user_organizations` with the `owner` role.

Please only use these defaults for local development. In production, create admin users through secure, audited processes.
