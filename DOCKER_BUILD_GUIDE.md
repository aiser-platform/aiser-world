# Docker Compose Build Guide for Chat2Chart Server

This guide provides step-by-step instructions for building the chat2chart-server using Docker Compose to ensure all dependencies are working correctly.

## Prerequisites

1. **Docker and Docker Compose installed**
   ```bash
   # Check if Docker is installed
   docker --version
   docker-compose --version
   ```

2. **Environment Configuration**
   - Copy `env.example` to `.env`
   - Update the `.env` file with your actual configuration values

## Fixed Dependencies

The following dependencies have been added to resolve import errors:

### pyproject.toml
- `sqlparse = "^0.4.4"` - SQL parsing library
- `langchain = "^0.3.0"` - LangChain framework
- `langchain-core = "^0.3.0"` - LangChain core components
- `langchain-community = "^0.3.0"` - LangChain community tools

### requirements.txt
- `sqlparse==0.4.4`
- `langchain==0.3.0`
- `langchain-core==0.3.0`
- `langchain-community==0.3.0`

## Build Commands

### 1. Build Only Chat2Chart Server
```bash
# Build the chat2chart-server service
docker-compose build chat2chart-server

# Or using the dev configuration
docker-compose -f docker-compose.dev.yml build chat2chart-server
```

### 2. Build All Services
```bash
# Build all services
docker-compose build

# Or using the dev configuration
docker-compose -f docker-compose.dev.yml build
```

### 3. Build and Run Services
```bash
# Build and start all services
docker-compose up --build

# Or using the dev configuration
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose up --build -d
```

### 4. Build Specific Service with Dependencies
```bash
# Build chat2chart-server and its dependencies
docker-compose build postgres redis chat2chart-server

# Or using the dev configuration
docker-compose -f docker-compose.dev.yml build postgres redis chat2chart-server
```

## Service Dependencies

The chat2chart-server depends on:
- **postgres**: Database service
- **redis**: Cache service
- **cube-server**: Cube.js semantic layer (optional for some features)

## Environment Variables Required

Make sure your `.env` file contains:

```env
# Database Configuration
POSTGRES_DB=aiser_world
POSTGRES_USER=aiser
POSTGRES_PASSWORD=aiser_password
POSTGRES_PORT=5432

# AI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your_resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_ID=gpt-4o-mini

# Security
SECRET_KEY=your_secret_key_here
CUBE_API_SECRET=your_cube_api_secret_here

# Development
DEBUG=True
NODE_ENV=development
```

## Troubleshooting

### 1. Dependency Installation Issues
If you encounter dependency conflicts:
```bash
# Clean build (removes cached layers)
docker-compose build --no-cache chat2chart-server

# Or for dev configuration
docker-compose -f docker-compose.dev.yml build --no-cache chat2chart-server
```

### 2. Database Connection Issues
Ensure PostgreSQL is running and accessible:
```bash
# Check if postgres service is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres
```

### 3. Port Conflicts
If ports are already in use:
```bash
# Check what's using the ports
netstat -tulpn | grep :8000  # chat2chart-server
netstat -tulpn | grep :5432  # postgres
netstat -tulpn | grep :6379  # redis
```

### 4. Memory Issues
If build fails due to memory:
```bash
# Increase Docker memory limit in Docker Desktop
# Or use build with reduced parallelism
docker-compose build --parallel 1 chat2chart-server
```

## Verification

After successful build, verify the service:

```bash
# Check if container is running
docker-compose ps chat2chart-server

# Check logs
docker-compose logs chat2chart-server

# Test API endpoint
curl http://localhost:8000/health

# Or check specific endpoint
curl http://localhost:8000/docs
```

## Development Mode

For development with hot reload:

```bash
# Use dev configuration
docker-compose -f docker-compose.dev.yml up --build

# The service will automatically reload when code changes
```

## Production Build

For production deployment:

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml build chat2chart-server
docker-compose -f docker-compose.prod.yml up -d
```

## Clean Up

To clean up after testing:

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This will delete all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Expected Build Output

A successful build should show:
- ✅ All Python dependencies installed
- ✅ Database migrations completed
- ✅ Service started on port 8000
- ✅ Health check passed
- ✅ No import errors in logs

## Common Issues and Solutions

1. **Import errors**: Fixed by adding missing dependencies to pyproject.toml and requirements.txt
2. **Database connection**: Ensure postgres service is healthy before starting chat2chart-server
3. **Memory issues**: Increase Docker memory allocation or reduce build parallelism
4. **Port conflicts**: Change port mappings in docker-compose.yml if needed
5. **Permission issues**: Ensure Docker has proper permissions to access the project directory