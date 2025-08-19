# Aiser Enterprise Authentication System

A comprehensive enterprise-grade authentication and authorization system with multi-provider support, advanced security features, and enterprise compliance capabilities.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- 4GB+ RAM available
- Ports 80, 443, 8000, 8080, 3001, 9090 available

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd aiser-world
   ```

2. **Start enterprise stack**:
   ```bash
   ./scripts/start-enterprise.sh
   ```

3. **Access the system**:
   - Auth Service: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Keycloak: http://localhost:8080 (admin/admin123)
   - Grafana: http://localhost:3001 (admin/admin123)

## 🏗️ Architecture

### Core Components

- **Auth Service**: FastAPI-based authentication service
- **PostgreSQL**: Primary database with enterprise features
- **Redis**: Session management and caching
- **Keycloak**: Enterprise SSO provider (optional)
- **Nginx**: Reverse proxy with rate limiting
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

### Authentication Providers

- **Internal JWT**: Built-in username/password authentication
- **Keycloak**: Enterprise SSO with SAML/OIDC support
- **Azure AD**: Microsoft Active Directory integration
- **LDAP**: Directory service integration
- **Custom**: Extensible provider framework

## ⚙️ Configuration

### Enterprise Configuration File

Copy and customize the enterprise configuration:

```bash
cp packages/auth/enterprise-config.example.yml packages/auth/enterprise-config.yml
```

Key configuration sections:

#### Deployment Mode
```yaml
deployment_mode: \"on_premise\"  # cloud, on_premise, hybrid, airgapped
organization_name: \"Your Company Name\"
```

#### Authentication
```yaml
auth:
  mode: \"keycloak\"  # internal, keycloak, azure_ad, okta, ldap
  keycloak_server_url: \"https://keycloak.yourcompany.com\"
  keycloak_realm: \"aiser\"
  auto_provision_users: true
```

#### Security
```yaml
security:
  require_mfa: true
  session_timeout_minutes: 480
  audit_logging: true
  password_policy:
    min_length: 12
    require_uppercase: true
    max_age_days: 90
```

#### Compliance
```yaml
compliance:
  gdpr_enabled: true
  hipaa_enabled: false
  sox_enabled: false
  audit_trail_immutable: true
```

### Environment Variables

Key environment variables for deployment:

```bash
# Deployment
AISER_DEPLOYMENT_MODE=on_premise
AISER_ORG_NAME=\"Your Company\"
AISER_CONFIG_FILE=/etc/aiser/config.yml

# Authentication
AUTH_MODE=keycloak
JWT_SECRET_KEY=your-secret-key
KEYCLOAK_SERVER_URL=https://keycloak.company.com

# Database
DB_HOST=postgres
DB_NAME=aiser_enterprise
DB_USER=aiser
DB_PASSWORD=secure-password

# Security
REQUIRE_MFA=true
AUDIT_LOGGING=true
DATA_PRIVACY_MODE=true
```

## 🔐 Security Features

### Authentication & Authorization
- Multi-provider authentication support
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management with timeout
- JWT token validation and refresh

### Data Protection
- Encryption at rest and in transit
- Password policy enforcement
- Audit logging and trail
- Data masking and classification
- GDPR compliance features

### Network Security
- Rate limiting and DDoS protection
- CORS configuration
- Security headers
- SSL/TLS termination
- IP whitelisting support

## 📊 Monitoring & Observability

### Metrics Collection
- Application performance metrics
- Authentication success/failure rates
- User activity tracking
- System resource utilization
- Custom business metrics

### Dashboards
- Real-time system health
- User authentication patterns
- Security incident tracking
- Performance analytics
- Compliance reporting

### Alerting
- Failed authentication attempts
- System performance degradation
- Security policy violations
- Service availability issues

## 🏢 Enterprise Features

### Multi-Tenancy
- Organization-based isolation
- Role inheritance
- Resource quotas
- Custom branding per organization

### Compliance
- GDPR, HIPAA, SOX support
- Audit trail immutability
- Data retention policies
- Right to be forgotten
- Data residency controls

### Scalability
- Horizontal scaling support
- Load balancing
- Database read replicas
- Redis clustering
- CDN integration

### Integration
- REST API with OpenAPI docs
- Webhook notifications
- SCIM provisioning
- Directory sync
- Custom integrations

## 🔧 Administration

### User Management
```bash
# Create admin user
docker-compose exec auth-service python scripts/create_admin_user.py

# List users
curl -H \"Authorization: Bearer <token>\" http://localhost:8000/api/v1/enterprise/auth/admin/users

# Activate/deactivate user
curl -X POST -H \"Authorization: Bearer <token>\" \
  http://localhost:8000/api/v1/enterprise/auth/admin/users/123/activate
```

### Database Management
```bash
# Run migrations
docker-compose exec auth-service alembic upgrade head

# Backup database
docker-compose exec postgres pg_dump -U aiser aiser_enterprise > backup.sql

# Restore database
docker-compose exec -T postgres psql -U aiser aiser_enterprise < backup.sql
```

### Monitoring
```bash
# View logs
docker-compose logs -f auth-service

# Check service health
curl http://localhost:8000/api/v1/enterprise/auth/health

# Prometheus metrics
curl http://localhost:8000/metrics
```

## 🚀 Deployment Options

### On-Premise Deployment
- Full control over data and infrastructure
- Air-gapped deployment support
- Custom security policies
- Local compliance requirements

### Cloud Deployment
- AWS, Azure, GCP support
- Managed database services
- Auto-scaling capabilities
- Global CDN integration

### Hybrid Deployment
- On-premise auth with cloud services
- Data residency compliance
- Gradual cloud migration
- Multi-region support

## 🔄 Backup & Recovery

### Database Backup
```bash
# Automated daily backups
docker-compose exec postgres pg_dump -U aiser aiser_enterprise | \
  gzip > backups/aiser_$(date +%Y%m%d).sql.gz

# Point-in-time recovery
docker-compose exec postgres pg_restore -U aiser -d aiser_enterprise backup.sql
```

### Configuration Backup
```bash
# Backup configuration
tar -czf config_backup.tar.gz packages/auth/enterprise-config.yml nginx/ monitoring/

# Restore configuration
tar -xzf config_backup.tar.gz
```

## 🛠️ Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Check auth service logs
docker-compose logs auth-service

# Verify configuration
docker-compose exec auth-service python -c \"from app.core.enterprise_config import get_enterprise_config; print(get_enterprise_config())\"
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec auth-service pg_isready -h postgres -p 5432

# View database logs
docker-compose logs postgres
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# View Prometheus metrics
curl http://localhost:9090/api/v1/query?query=up
```

### Support

For enterprise support:
- Email: enterprise-support@aiser.com
- Documentation: https://docs.aiser.com/enterprise
- Status Page: https://status.aiser.com

## 📝 License

Enterprise License - See LICENSE.ENTERPRISE for details.

## 🤝 Contributing

See CONTRIBUTING.md for development guidelines and contribution process.