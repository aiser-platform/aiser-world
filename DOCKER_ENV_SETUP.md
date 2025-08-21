# Docker Environment Variables Setup Guide

This guide explains how to properly set up environment variables for the Aiser World Docker deployment.

## Overview

All Docker Compose files now use environment variables from a `.env` file instead of hardcoded values. This ensures:
- ✅ **Security**: No secrets in version control
- ✅ **Flexibility**: Easy configuration across environments
- ✅ **Maintainability**: Centralized configuration management

## Quick Setup

### 1. Create `.env` File

Copy the example file and fill in your values:

```bash
cp env.example .env
```

### 2. Edit `.env` File

Update the `.env` file with your actual values:

```bash
# Database Configuration
POSTGRES_DB=aiser_world
POSTGRES_USER=aiser
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_PORT=5432

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your_resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_ID=gpt-4o-mini

# Security Keys
SECRET_KEY=your_secure_secret_key_here
CUBE_API_SECRET=your_cube_api_secret_here

# Cube.js Configuration
CUBE_DB_TYPE=postgres
CUBE_DB_HOST=postgres
CUBE_DB_SCHEMA=public
CUBE_DB_SSL=false
CUBE_DB_POOL_MIN=2
CUBE_DB_POOL_MAX=10
CUBE_REDIS_URL=redis://redis:6379
CUBE_DEV_MODE=true
CUBE_LOG_LEVEL=info
CUBEJS_EXTERNAL_DEFAULT=true
CUBEJS_SCHEDULED_REFRESH_DEFAULT=true
CUBEJS_SKIP_NATIVE_EXTENSIONS=true

# Development Settings
NODE_ENV=development
DEBUG=True

# Enterprise Configuration (if using enterprise features)
AISER_DEPLOYMENT_MODE=on_premise
AISER_ORG_NAME=Your Company Name
AISER_ADMIN_EMAIL=admin@yourcompany.com
AUTH_MODE=internal
JWT_SECRET_KEY=your_super_secure_jwt_key_here
REQUIRE_MFA=false
AUDIT_LOGGING=true
DATA_PRIVACY_MODE=true

# Monitoring (if using enterprise monitoring)
GRAFANA_ADMIN_PASSWORD=your_grafana_admin_password
REDIS_PASSWORD=your_redis_password
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=your_keycloak_admin_password
```

### 3. Run Docker Compose

The `.env` file will be automatically loaded:

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# Enterprise
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml up -d
```

## How It Works

### Docker Compose Integration

All docker-compose files now include:

```yaml
# Load environment variables from .env file
env_file:
  - .env
```

This automatically loads all variables from `.env` into the Docker environment.

### Environment Variable Usage

Services use variables with fallbacks:

```yaml
environment:
  - POSTGRES_DB: ${POSTGRES_DB:-aiser_world}
  - POSTGRES_USER: ${POSTGRES_USER:-aiser}
  - POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-aiser_password}
```

**Syntax**: `${VARIABLE_NAME:-default_value}`
- If `VARIABLE_NAME` is set in `.env`, use that value
- If not set, use `default_value`

### Required vs Optional Variables

#### Required Variables (no fallback)
```bash
# These MUST be set in .env
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SECRET_KEY=${SECRET_KEY}
AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}
```

#### Optional Variables (with fallbacks)
```bash
# These can use defaults if not set
POSTGRES_DB=${POSTGRES_DB:-aiser_world}
POSTGRES_USER=${POSTGRES_USER:-aiser}
DEBUG=${DEBUG:-True}
```

## Environment-Specific Configuration

### Development
```bash
# Use docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml up -d
```

### Production
```bash
# Use docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

### Enterprise
```bash
# Use both dev and enterprise configs
docker-compose -f docker-compose.dev.yml -f docker-compose.enterprise.yml up -d
```

## Security Best Practices

### 1. Never Commit `.env` Files
```bash
# .gitignore should include:
.env
.env.local
.env.production
```

### 2. Use Strong Passwords
```bash
# Generate secure passwords
openssl rand -base64 32
```

### 3. Rotate Secrets Regularly
- Update API keys periodically
- Change database passwords
- Rotate JWT secrets

### 4. Environment-Specific Files
```bash
# For different environments
.env.development
.env.staging
.env.production
```

## Troubleshooting

### Environment Variables Not Loading

1. **Check file location**: `.env` must be in the same directory as `docker-compose.yml`
2. **Check file permissions**: Ensure `.env` is readable
3. **Verify syntax**: No spaces around `=` in `.env`

### Missing Variables

1. **Check required variables**: Some variables have no fallbacks
2. **Verify variable names**: Case-sensitive, no spaces
3. **Check docker-compose logs**: Look for environment-related errors

### Testing Configuration

Use the test script to verify Azure OpenAI setup:

```bash
# Install python-dotenv if needed
pip install python-dotenv

# Run the test
python test_azure_openai.py
```

## File Structure

```
aiser-world/
├── .env                          # Your environment variables (create this)
├── env.example                   # Template file
├── docker-compose.yml            # Base configuration
├── docker-compose.dev.yml        # Development overrides
├── docker-compose.prod.yml       # Production overrides
├── docker-compose.enterprise.yml # Enterprise overrides
└── packages/
    ├── auth/                     # Authentication service
    ├── chat2chart/              # Chat2Chart service
    └── cube/                    # Cube.js service
```

## Advanced Configuration

### Multiple Environment Files

You can use multiple `.env` files:

```bash
# Load multiple env files
env_file:
  - .env
  - .env.local
  - .env.${ENVIRONMENT:-development}
```

### Docker Secrets (Production)

For production, consider using Docker secrets:

```yaml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  secret_key:
    file: ./secrets/secret_key.txt
```

### Environment Variable Validation

Add validation to your startup scripts:

```bash
#!/bin/bash
# Check required environment variables
required_vars=("POSTGRES_PASSWORD" "SECRET_KEY" "AZURE_OPENAI_API_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is required but not set"
    exit 1
  fi
done
```

## Support

If you encounter issues:

1. Check Docker Compose logs: `docker-compose logs`
2. Verify environment variables: `docker-compose exec service env`
3. Test individual services: `docker-compose exec service echo $VARIABLE_NAME`
4. Review this guide and the `env.example` file

## Migration from Hardcoded Values

If you're migrating from hardcoded values:

1. **Backup your current configuration**
2. **Create `.env` file** with your current values
3. **Update docker-compose files** (already done)
4. **Test with new configuration**
5. **Remove hardcoded values** from version control

This ensures a smooth transition to environment-based configuration.
