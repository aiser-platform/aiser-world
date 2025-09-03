# 🚀 Aiser Platform Production Deployment Guide

## Overview

This guide provides complete instructions for deploying Aiser Platform in production environments, both as a SaaS solution on Azure and as an enterprise self-hosted deployment.

## 🎯 Deployment Options

### 1. Azure SaaS Deployment
- **Target**: Cloud-hosted SaaS platform
- **Infrastructure**: Azure Container Apps, PostgreSQL, Redis, CDN
- **Scaling**: Auto-scaling, load balancing
- **Security**: SSL, WAF, Key Vault

### 2. Enterprise Self-Hosted
- **Target**: On-premises enterprise deployment
- **Infrastructure**: Docker Compose, local databases
- **Security**: SSL, firewall, fail2ban
- **Monitoring**: Prometheus, Grafana, ELK

## 🔧 Prerequisites

### System Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Python 3.9+
- Node.js 18+
- Git

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/aiser-world.git
cd aiser-world
```

### 2. Generate Production Configuration
```bash
# Generate real production configuration
python3 scripts/generate-production-config.py --domain your-domain.com

# This creates:
# - config/production/config.yaml
# - config/production/secrets.yaml
# - config/production/.env.production
# - config/nginx/aiser-production.conf
# - config/kubernetes/ (if needed)
```

### 3. Deploy to Production
```bash
# For Azure SaaS deployment
./scripts/setup-production.sh production saas your-domain.com admin@your-domain.com

# For Enterprise self-hosted
./scripts/setup-production.sh production enterprise your-domain.com admin@your-domain.com
```

## 📋 Detailed Setup Instructions

### Azure SaaS Deployment

#### 1. Azure Infrastructure Setup
```bash
# Deploy Azure infrastructure
az deployment group create \
  --resource-group aiser-saas-rg \
  --template-file azure/deploy-saas.yml \
  --parameters @azure/parameters.json
```

#### 2. Configure Azure Services
```bash
# Set up Azure Container Registry
az acr create --resource-group aiser-saas-rg --name aiseracrsaas --sku Premium

# Build and push images
docker build -t aiseracrsaas.azurecr.io/aiser-backend:latest ./packages/chat2chart/server
docker build -t aiseracrsaas.azurecr.io/aiser-frontend:latest ./packages/chat2chart/client
docker push aiseracrsaas.azurecr.io/aiser-backend:latest
docker push aiseracrsaas.azurecr.io/aiser-frontend:latest
```

#### 3. Deploy Application
```bash
# Deploy to Azure Container Apps
az containerapp create \
  --resource-group aiser-saas-rg \
  --name aiser-backend-saas \
  --environment aiser-container-env \
  --image aiseracrsaas.azurecr.io/aiser-backend:latest \
  --target-port 8000 \
  --ingress external
```

### Enterprise Self-Hosted Deployment

#### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Deploy Application
```bash
# Start services
docker-compose -f docker-compose.enterprise.yml --env-file config/production/docker.env up -d

# Verify deployment
docker-compose -f docker-compose.enterprise.yml ps
```

#### 3. Configure SSL
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔐 Security Configuration

### 1. Firewall Setup
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban Configuration
```bash
# Install fail2ban
sudo apt install fail2ban

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Security Headers
The nginx configuration includes comprehensive security headers:
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Content-Security-Policy

## 📊 Monitoring Setup

### 1. Prometheus Configuration
```bash
# Access Prometheus
curl http://localhost:9090

# Check targets
curl http://localhost:9090/api/v1/targets
```

### 2. Grafana Dashboard
```bash
# Access Grafana
# URL: https://your-domain.com/monitoring
# Default credentials: admin / (from generated passwords)
```

### 3. Log Management
```bash
# View application logs
docker-compose -f docker-compose.enterprise.yml logs -f backend-server

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Backup and Recovery

### 1. Automated Backups
```bash
# Check backup status
docker-compose -f docker-compose.enterprise.yml exec backup-service python -c "from app.core.backup_manager import backup_manager; print(backup_manager.get_backup_status())"

# Manual backup
docker-compose -f docker-compose.enterprise.yml exec backup-service python -c "from app.core.backup_manager import backup_manager; backup_manager.run_backup()"
```

### 2. Restore from Backup
```bash
# List available backups
docker-compose -f docker-compose.enterprise.yml exec backup-service ls -la /backups/

# Restore from backup
docker-compose -f docker-compose.enterprise.yml exec backup-service python -c "from app.core.backup_manager import backup_manager; backup_manager.restore_backup('backup_job_id')"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Service Not Starting
```bash
# Check service status
docker-compose -f docker-compose.enterprise.yml ps

# View service logs
docker-compose -f docker-compose.enterprise.yml logs service-name

# Restart service
docker-compose -f docker-compose.enterprise.yml restart service-name
```

#### 2. Database Connection Issues
```bash
# Test database connection
docker-compose -f docker-compose.enterprise.yml exec postgres psql -U aiser_admin -d aiser_production -c "SELECT version();"

# Check database logs
docker-compose -f docker-compose.enterprise.yml logs postgres
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Check database performance
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database;

-- Optimize queries
EXPLAIN ANALYZE SELECT * FROM your_table WHERE condition;
```

#### 2. Application Optimization
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:8000/metrics
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale backend services
docker-compose -f docker-compose.enterprise.yml up -d --scale backend-server=3

# Scale frontend services
docker-compose -f docker-compose.enterprise.yml up -d --scale frontend-client=2
```

### Vertical Scaling
```bash
# Update resource limits in docker-compose.enterprise.yml
services:
  backend-server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

## 🔧 Maintenance

### Regular Maintenance Tasks

#### 1. Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.enterprise.yml down
docker-compose -f docker-compose.enterprise.yml up -d --build
```

#### 2. Database Maintenance
```bash
# Vacuum database
docker-compose -f docker-compose.enterprise.yml exec postgres psql -U aiser_admin -d aiser_production -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.enterprise.yml exec postgres psql -U aiser_admin -d aiser_production -c "SELECT pg_size_pretty(pg_database_size('aiser_production'));"
```

#### 3. Log Rotation
```bash
# Check log rotation status
sudo logrotate -d /etc/logrotate.d/aiser-platform

# Force log rotation
sudo logrotate -f /etc/logrotate.d/aiser-platform
```

## 📞 Support

### Getting Help
- **Documentation**: Check this guide and inline code comments
- **Logs**: Always check application logs first
- **Monitoring**: Use Grafana dashboards for system health
- **Community**: Join our Discord server for community support

### Emergency Procedures

#### 1. Service Recovery
```bash
# Restart all services
docker-compose -f docker-compose.enterprise.yml restart

# Restart specific service
docker-compose -f docker-compose.enterprise.yml restart service-name
```

#### 2. Data Recovery
```bash
# Restore from latest backup
docker-compose -f docker-compose.enterprise.yml exec backup-service python -c "from app.core.backup_manager import backup_manager; backup_manager.restore_backup('latest')"
```

#### 3. Security Incident
```bash
# Check for unauthorized access
sudo fail2ban-client status
sudo grep "Failed password" /var/log/auth.log

# Block suspicious IPs
sudo ufw deny from suspicious-ip
```

## 🎉 Success!

Your Aiser Platform is now running in production! 

### Next Steps
1. **Configure monitoring alerts** in Grafana
2. **Set up backup verification** procedures
3. **Train your team** on the platform
4. **Monitor performance** and optimize as needed
5. **Plan for scaling** based on usage patterns

### Access Points
- **Application**: https://your-domain.com
- **Monitoring**: https://your-domain.com/monitoring
- **API**: https://your-domain.com/api
- **Health Check**: https://your-domain.com/health

---

**Remember**: Keep your secrets secure and never commit them to version control!
