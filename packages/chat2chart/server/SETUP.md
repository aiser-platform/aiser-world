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
