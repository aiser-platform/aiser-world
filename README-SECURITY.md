# 🔒 Security Configuration Guide

## Environment Variables Setup

This project uses environment variables to secure sensitive credentials. **Never commit actual credentials to version control!**

### 1. Create Your Environment File

Copy the example file and fill in your actual credentials:

```bash
cp env.example .env
```

### 2. Required Environment Variables

#### Database Configuration
```bash
POSTGRES_DB=aiser_world
POSTGRES_USER=aiser
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_PORT=5432
```

#### Azure OpenAI Configuration
```bash
AZURE_OPENAI_API_KEY=your_actual_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini
```

#### OpenAI Configuration
```bash
OPENAI_API_KEY=your_actual_openai_api_key
OPENAI_MODEL_ID=gpt-4o-mini
```

#### Security Keys
```bash
SECRET_KEY=your_secure_secret_key_here
CUBE_API_SECRET=your_secure_cube_api_secret_here
```

### 3. Security Best Practices

✅ **DO:**
- Use strong, unique passwords
- Rotate API keys regularly
- Use environment variables for all secrets
- Keep `.env` file in `.gitignore`

❌ **DON'T:**
- Commit `.env` files to version control
- Use default/weak passwords
- Share API keys in public repositories
- Hardcode credentials in source code

### 4. Docker Compose Usage

The `docker-compose.yml` file now uses environment variables:

```yaml
environment:
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-default_password}
  - AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
```

### 5. Production Deployment

For production, use proper secret management:
- Docker secrets
- Kubernetes secrets
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

### 6. File Structure

```
project/
├── docker-compose.yml      # Uses env vars
├── env.example            # Template (safe to commit)
├── .env                   # Your actual credentials (NEVER commit)
└── .gitignore            # Should include .env
```

### 7. Quick Start

```bash
# 1. Copy example file
cp env.example .env

# 2. Edit .env with your credentials
nano .env

# 3. Start services
docker-compose up -d
```

## 🚨 Security Checklist

- [ ] `.env` file created with real credentials
- [ ] `.env` added to `.gitignore`
- [ ] No hardcoded credentials in source code
- [ ] Strong passwords used
- [ ] API keys are secure and unique
- [ ] Production secrets properly managed
