---
id: docker-compose
title: Docker Compose Deployment
sidebar_label: Docker Compose
description: Deploy Aiser Platform with Docker Compose for production-ready, scalable analytics infrastructure
---

# 🐳 Docker Compose Deployment

**Deploy Aiser Platform in production with Docker Compose - the simplest way to get enterprise-grade analytics running.**

## 🎯 Quick Start

### **1. Prerequisites**
```bash
# System requirements
- 4+ CPU cores, 8GB+ RAM, 100GB+ storage
- Docker 24.0+ and Docker Compose 2.20+
- Linux/Ubuntu 20.04+ recommended
```

### **2. Clone and Setup**
```bash
git clone https://github.com/aiser-platform/aiser-world
cd aiser-world
cp env.example .env
cp docker-compose.yml docker-compose.prod.yml
```

### **3. Configure Environment**
```bash
# Edit .env file with your settings
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
JWT_SECRET=$(openssl rand -hex 64)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

### **4. Deploy**
```bash
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml ps
```

## 🏗️ Production Architecture

### **Service Overview**
- **PostgreSQL**: Primary database (port 5432)
- **Redis**: Caching and sessions (port 6379)
- **Auth Service**: Authentication API (port 5000)
- **Chat2Chart Server**: AI analytics API (port 8000)
- **Cube.js**: Analytics engine (port 4000)
- **Chat2Chart Client**: Web interface (port 3000)
- **NGINX**: Load balancer and SSL (ports 80/443)
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Monitoring dashboards (port 3001)

### **Network Security**
- Internal services bind to localhost only
- External access through NGINX load balancer
- SSL/TLS termination at NGINX
- Rate limiting and security headers

## 🔒 Security Configuration

### **SSL Setup**
```bash
# Let's Encrypt (recommended)
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

### **Firewall**
```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

## 📊 Monitoring

### **Health Checks**
```bash
# Service health
curl http://localhost:3000/health
curl http://localhost:8000/health
curl http://localhost:5000/health

# Database
docker-compose exec postgres psql -U aiser_user -d aiser_platform -c "SELECT 1;"
```

### **Metrics & Logs**
- **Prometheus**: Time-series metrics collection
- **Grafana**: Visualization and dashboards
- **Centralized logging**: All service logs
- **Alerting**: Automated notifications

## 🔄 Maintenance

### **Updates**
```bash
# Backup database
docker-compose exec postgres pg_dump -U aiser_user aiser_platform > backup.sql

# Update and restart
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### **Backup Strategy**
- **Daily database backups** with retention
- **Configuration backups** in version control
- **Automated backup scripts** with monitoring
- **Disaster recovery** procedures

## 🚀 Scaling

### **Horizontal Scaling**
```yaml
# docker-compose.override.yml
services:
  chat2chart-server:
    deploy:
      replicas: 3
    environment:
      - WORKER_PROCESSES=4
```

### **Performance Optimization**
- **Database indexing** and query optimization
- **Redis clustering** for high availability
- **CDN integration** for static assets
- **Load balancing** across multiple instances

## 🐛 Troubleshooting

### **Common Issues**
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs chat2chart-server

# Verify configuration
docker-compose -f docker-compose.prod.yml config

# Monitor resources
docker stats
```

### **Debug Mode**
```bash
export DEBUG=true
export LOG_LEVEL=DEBUG
docker-compose -f docker-compose.prod.yml restart
```

## 📚 Next Steps

1. **🔐 [SSL & Security](./ssl-certificates)** - Advanced security setup
2. **💾 [Backup & Recovery](./backups)** - Backup strategies
3. **📊 [Monitoring Setup](../monitoring)** - Production monitoring
4. **🚀 [Kubernetes](../kubernetes)** - Enterprise scaling

---

**Ready to deploy?** [Start with SSL configuration →](./ssl-certificates)
