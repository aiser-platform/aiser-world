---
id: config-reference
title: Configuration Reference
sidebar_label: Configuration
description: Complete configuration reference for Aiser Platform - environment variables, settings, and customization options
---

# ⚙️ Configuration Reference

**Configure Aiser Platform for your specific needs with comprehensive configuration options.**

## 🚀 Quick Configuration

### **Environment File Setup**
```bash
# Copy example environment file
cp env.example .env

# Edit with your settings
nano .env
```

### **Minimal Configuration**
```bash
# Required settings
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
POSTGRES_PASSWORD=your_database_password

# Optional but recommended
DEBUG=false
LOG_LEVEL=INFO
ENVIRONMENT=production
```

## 🔐 Core Configuration

### **AI Provider Configuration**

**OpenAI:**
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TEMPERATURE=0.1
```

**Azure OpenAI:**
```bash
AI_PROVIDER=azure_openai
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
```

**Google AI:**
```bash
AI_PROVIDER=google_ai
GOOGLE_AI_API_KEY=your-google-api-key
GOOGLE_AI_MODEL=gemini-2.5
```

### **Security Configuration**

**JWT Settings:**
```bash
JWT_SECRET=your-very-long-random-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
```

**Encryption:**
```bash
ENCRYPTION_KEY=your-very-long-random-encryption-key-here
ENCRYPTION_ALGORITHM=AES-256-GCM
```

### **Database Configuration**

**PostgreSQL:**
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aiser_platform
POSTGRES_USER=aiser_user
POSTGRES_PASSWORD=your_secure_database_password_here
POSTGRES_SSL_MODE=prefer
```

**Redis:**
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_secure_redis_password_here
```

## 🏗️ Application Configuration

### **Server Settings**
```bash
HOST=0.0.0.0
PORT=8000
WORKERS=4
ENVIRONMENT=production
DEBUG=false
```

### **CORS Configuration**
```bash
CORS_ENABLED=true
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

### **Frontend Configuration**
```bash
NEXT_PUBLIC_API_URL=https://your-aiser-instance.com/api/v1
NEXT_PUBLIC_AUTH_URL=https://your-aiser-instance.com/api/v1
NEXT_PUBLIC_CUBE_URL=https://your-aiser-instance.com
```

## 📊 Performance Configuration

### **Caching Settings**
```bash
CACHE_ENABLED=true
CACHE_BACKEND=redis
CACHE_DEFAULT_TTL=3600
QUERY_CACHE_TTL=1800
CHART_CACHE_TTL=7200
```

### **Rate Limiting**
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=20
RATE_LIMIT_STORAGE_BACKEND=redis
```

### **Database Optimization**
```bash
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

## 🔒 Security Configuration

### **Authentication & Authorization**
```bash
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_DIGITS=true
PASSWORD_REQUIRE_SPECIAL_CHARS=true
```

### **OAuth Configuration**
```bash
OAUTH_ENABLED=true
OAUTH_PROVIDERS=google,github,azure
OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **SAML Configuration**
```bash
SAML_ENABLED=true
SAML_ENTITY_ID=https://your-domain.com
SAML_SSO_URL=https://your-idp.com/sso
SAML_CERT_FILE=path/to/cert.pem
```

## 📈 Monitoring Configuration

### **Logging Settings**
```bash
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=logs/aiser.log
LOG_FILE_MAX_SIZE=100MB
LOG_FILE_BACKUP_COUNT=5
```

### **Metrics Configuration**
```bash
METRICS_ENABLED=true
METRICS_BACKEND=prometheus
METRICS_PORT=9090
METRICS_PATH=/metrics
METRICS_COLLECTION_INTERVAL=15
```

### **Health Checks**
```bash
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_ENDPOINT=/health
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10
```

## 🌐 Network Configuration

### **Proxy Settings**
```bash
PROXY_ENABLED=true
PROXY_TRUSTED_HOSTS=127.0.0.1,::1,10.0.0.0/8
PROXY_FORWARDED_FOR_HEADER=X-Forwarded-For
PROXY_FORWARDED_PROTO_HEADER=X-Forwarded-Proto
```

### **SSL/TLS Configuration**
```bash
SSL_ENABLED=true
SSL_CERT_FILE=path/to/cert.pem
SSL_KEY_FILE=path/to/key.pem
SSL_CA_CERT_FILE=path/to/ca.pem
SSL_MIN_VERSION=TLSv1.2
SSL_MAX_VERSION=TLSv1.3
```

## 🔧 Development Configuration

### **Development Mode**
```bash
DEBUG=true
ENVIRONMENT=development
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ALLOWED_HOSTS=localhost,127.0.0.1,::1
```

### **Testing Configuration**
```bash
TESTING_ENABLED=true
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/aiser_test
TEST_REDIS_URL=redis://localhost:6379/1
TEST_AI_PROVIDER=mock
```

## 📁 Configuration Files

### **Complete .env Example**
```bash
# =============================================================================
# AI SERVER CONFIGURATION
# =============================================================================

# AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=4000

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_api_key_here
GOOGLE_AI_MODEL=gemini-2.5

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

# JWT Configuration
JWT_SECRET=your_very_long_random_jwt_secret_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Encryption Configuration
ENCRYPTION_KEY=your_very_long_random_encryption_key_here
ENCRYPTION_ALGORITHM=AES-256-GCM

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aiser_platform
POSTGRES_USER=aiser_user
POSTGRES_PASSWORD=your_secure_database_password_here
POSTGRES_SSL_MODE=prefer

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_secure_redis_password_here

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

# Server Settings
HOST=0.0.0.0
PORT=8000
WORKERS=4
ENVIRONMENT=production
DEBUG=false

# CORS Configuration
CORS_ENABLED=true
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# =============================================================================
# LOGGING & MONITORING
# =============================================================================

# Logging Settings
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=logs/aiser.log

# Metrics Settings
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# =============================================================================
# PERFORMANCE CONFIGURATION
# =============================================================================

# Cache Settings
CACHE_ENABLED=true
CACHE_BACKEND=redis
CACHE_DEFAULT_TTL=3600

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=20
```

## 🔄 Configuration Management

### **Environment-Specific Configuration**

**Development:**
```bash
# .env.development
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ALLOWED_HOSTS=localhost,127.0.0.1,::1
```

**Production:**
```bash
# .env.production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
ALLOWED_HOSTS=your-domain.com,app.your-domain.com
```

### **Configuration Validation**

**Validation Script:**
```bash
#!/bin/bash
# validate-config.sh

echo "🔍 Validating Aiser Platform configuration..."

# Check required environment variables
required_vars=(
  "AI_PROVIDER"
  "JWT_SECRET"
  "ENCRYPTION_KEY"
  "POSTGRES_PASSWORD"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: Required environment variable $var is not set"
    exit 1
  fi
done

# Validate AI provider configuration
case "$AI_PROVIDER" in
  "openai")
    if [ -z "$OPENAI_API_KEY" ]; then
      echo "❌ Error: OPENAI_API_KEY required for OpenAI provider"
      exit 1
    fi
    ;;
  "azure_openai")
    if [ -z "$AZURE_OPENAI_API_KEY" ] || [ -z "$AZURE_OPENAI_ENDPOINT" ]; then
      echo "❌ Error: AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT required for Azure OpenAI"
      exit 1
    fi
    ;;
  "google_ai")
    if [ -z "$GOOGLE_AI_API_KEY" ]; then
      echo "❌ Error: GOOGLE_AI_API_KEY required for Google AI provider"
      exit 1
    fi
    ;;
  *)
    echo "❌ Error: Invalid AI_PROVIDER: $AI_PROVIDER"
    exit 1
    ;;
esac

echo "✅ Configuration validation passed!"
```

## 🚀 Configuration Best Practices

### **Security Best Practices**
- **Use environment variables** for secrets
- **Never commit secrets** to version control
- **Validate configuration** on startup
- **Use secret management services** in production

### **Performance Best Practices**
- **Enable Redis caching** for better performance
- **Configure connection pools** appropriately
- **Use appropriate TTL values** for different data types
- **Monitor performance metrics** regularly

### **Monitoring Best Practices**
- **Enable structured logging** with JSON format
- **Include relevant context** in logs
- **Enable Prometheus metrics** for monitoring
- **Configure health checks** for dependencies

## 📚 Next Steps

1. **🔐 [Security Configuration](../security/configuration)** - Advanced security settings
2. **📊 [Performance Tuning](../performance/tuning)** - Optimize for your workload
3. **🔍 [Monitoring Setup](../monitoring/setup)** - Comprehensive monitoring
4. **🌐 [Production Deployment](../deployment/production)** - Production configuration

---

**Need help with configuration?** [Check our troubleshooting guide →](../troubleshooting/configuration)
