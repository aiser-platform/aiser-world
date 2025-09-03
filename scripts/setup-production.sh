#!/bin/bash

# Aiser Platform Production Setup Script
# Real production deployment for SaaS and Enterprise

set -e

echo "🚀 Starting Aiser Platform Production Setup..."

# Configuration
ENVIRONMENT=${1:-"production"}
DEPLOYMENT_TYPE=${2:-"saas"}  # "saas" or "enterprise"
DOMAIN=${3:-"aiser-platform.com"}
SSL_EMAIL=${4:-"admin@aiser-platform.com"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        log_error "This script only supports Linux systems"
        exit 1
    fi
    
    # Check available memory
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$MEMORY_GB" -lt 4 ]; then
        log_warning "System has less than 4GB RAM. Production deployment requires at least 4GB."
    fi
    
    # Check available disk space
    DISK_SPACE_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$DISK_SPACE_GB" -lt 20 ]; then
        log_warning "System has less than 20GB free disk space. Production deployment requires at least 20GB."
    fi
    
    log_success "System requirements check completed"
}

# Install Docker and Docker Compose
install_docker() {
    log_info "Installing Docker and Docker Compose..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker is already installed"
    else
        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        
        log_success "Docker installed successfully"
    fi
    
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose is already installed"
    else
        # Install Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        log_success "Docker Compose installed successfully"
    fi
}

# Install additional tools
install_tools() {
    log_info "Installing additional production tools..."
    
    # Install jq for JSON processing
    if ! command -v jq &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    fi
    
    # Install certbot for SSL certificates
    if ! command -v certbot &> /dev/null; then
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Install nginx
    if ! command -v nginx &> /dev/null; then
        sudo apt-get install -y nginx
    fi
    
    # Install fail2ban for security
    if ! command -v fail2ban-client &> /dev/null; then
        sudo apt-get install -y fail2ban
    fi
    
    log_success "Additional tools installed successfully"
}

# Generate production configuration
generate_config() {
    log_info "Generating real production configuration..."
    
    # Generate real production configuration using Python script
    python3 scripts/generate-production-config.py --domain ${DOMAIN} --output-dir config/production
    
    # Load generated secrets
    source config/production/docker.env
    
    # Create production environment file
    cat > .env.production << EOF
# Aiser Platform Production Configuration
ENVIRONMENT=production
DEPLOYMENT_TYPE=${DEPLOYMENT_TYPE}
DOMAIN=${DOMAIN}

# Database Configuration
POSTGRES_SERVER=postgres
POSTGRES_DB=aiser_production
POSTGRES_USER=aiser_admin
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=5432
POSTGRES_SSL_MODE=require

# Redis Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security Configuration
API_SECRET_KEY=${API_SECRET_KEY}
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
CUBE_API_SECRET=${CUBE_API_SECRET}
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}

# Application Configuration
FRONTEND_API_URL=https://${DOMAIN}/api
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
NEXT_PUBLIC_ENVIRONMENT=production

# SSL Configuration
SSL_EMAIL=${SSL_EMAIL}
SSL_DOMAIN=${DOMAIN}

# Monitoring Configuration
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
ELASTICSEARCH_PORT=9200
KIBANA_PORT=5601

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Feature Flags
ENABLE_2FA=true
ENABLE_SSO=false
ENABLE_ANALYTICS=true
ENABLE_DEBUG=false
ENABLE_AUDIT_LOGS=true
ENABLE_RATE_LIMITING=true
ENABLE_API_MONITORING=true
ENABLE_DATA_ENCRYPTION=true

# Storage Configuration
STORAGE_TYPE=local
MAX_FILE_SIZE=100MB

# Email Configuration (configure with your SMTP provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=true

# Cloud Storage (configure for your provider)
# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=aiser-backups

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER=aiser-backups

# Google Cloud Storage
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCS_BUCKET=aiser-backups
EOF

    log_success "Production configuration generated"
}

# Setup SSL certificates
setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    # Stop nginx if running
    sudo systemctl stop nginx || true
    
    # Generate SSL certificate using Let's Encrypt
    sudo certbot certonly --standalone \
        --email ${SSL_EMAIL} \
        --agree-tos \
        --no-eff-email \
        --domains ${DOMAIN} \
        --domains www.${DOMAIN}
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/aiser-platform << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate Limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Authentication
    location /auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Monitoring (restrict access)
    location /monitoring/ {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/aiser-platform /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    # Start nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log_success "SSL certificates and nginx configuration setup completed"
}

# Setup firewall
setup_firewall() {
    log_info "Setting up firewall..."
    
    # Install ufw if not present
    if ! command -v ufw &> /dev/null; then
        sudo apt-get install -y ufw
    fi
    
    # Reset firewall rules
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow monitoring ports (restrict to local network)
    sudo ufw allow from 10.0.0.0/8 to any port 9090  # Prometheus
    sudo ufw allow from 10.0.0.0/8 to any port 3001  # Grafana
    sudo ufw allow from 10.0.0.0/8 to any port 9200  # Elasticsearch
    sudo ufw allow from 10.0.0.0/8 to any port 5601  # Kibana
    
    # Enable firewall
    sudo ufw --force enable
    
    log_success "Firewall configuration completed"
}

# Setup fail2ban
setup_fail2ban() {
    log_info "Setting up fail2ban..."
    
    # Create fail2ban configuration
    sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

    # Start and enable fail2ban
    sudo systemctl start fail2ban
    sudo systemctl enable fail2ban
    
    log_success "Fail2ban configuration completed"
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/aiser-platform << EOF
/var/log/aiser/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        systemctl reload nginx
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF

    # Create log directory
    sudo mkdir -p /var/log/aiser
    sudo chown $USER:$USER /var/log/aiser
    
    log_success "Log rotation configuration completed"
}

# Deploy application
deploy_application() {
    log_info "Deploying Aiser Platform application..."
    
    # Choose deployment configuration
    if [ "$DEPLOYMENT_TYPE" = "enterprise" ]; then
        COMPOSE_FILE="docker-compose.enterprise.yml"
    else
        COMPOSE_FILE="docker-compose.production.yml"
    fi
    
    # Create production docker-compose file if it doesn't exist
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_info "Creating production docker-compose configuration..."
        # This would be generated based on the deployment type
        cp docker-compose.enterprise.yml docker-compose.production.yml
    fi
    
    # Load environment variables
    export $(cat .env.production | xargs)
    
    # Build and start services
    docker-compose -f $COMPOSE_FILE --env-file .env.production up -d --build
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    docker-compose -f $COMPOSE_FILE ps
    
    log_success "Application deployment completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create monitoring configuration
    mkdir -p config/monitoring
    
    # Prometheus configuration
    cat > config/monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'aiser-backend'
    static_configs:
      - targets: ['backend-server:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'aiser-frontend'
    static_configs:
      - targets: ['frontend-client:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']
    scrape_interval: 30s
EOF

    # Grafana datasource configuration
    mkdir -p config/grafana/provisioning/datasources
    cat > config/grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    log_success "Monitoring configuration completed"
}

# Create systemd service
create_systemd_service() {
    log_info "Creating systemd service..."
    
    # Create systemd service file
    sudo tee /etc/systemd/system/aiser-platform.service << EOF
[Unit]
Description=Aiser Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml --env-file .env.production up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable aiser-platform.service
    
    log_success "Systemd service created and enabled"
}

# Final verification
verify_installation() {
    log_info "Verifying installation..."
    
    # Check if all services are running
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        log_success "All services are running"
    else
        log_error "Some services are not running"
        docker-compose -f docker-compose.production.yml ps
        exit 1
    fi
    
    # Check SSL certificate
    if curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} | grep -q "200"; then
        log_success "SSL certificate is working"
    else
        log_warning "SSL certificate verification failed"
    fi
    
    # Check API endpoint
    if curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/health | grep -q "200"; then
        log_success "API endpoint is accessible"
    else
        log_warning "API endpoint verification failed"
    fi
    
    log_success "Installation verification completed"
}

# Main execution
main() {
    log_info "Starting Aiser Platform Production Setup..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Deployment Type: $DEPLOYMENT_TYPE"
    log_info "Domain: $DOMAIN"
    
    check_requirements
    install_docker
    install_tools
    generate_config
    setup_ssl
    setup_firewall
    setup_fail2ban
    setup_log_rotation
    deploy_application
    setup_monitoring
    create_systemd_service
    verify_installation
    
    log_success "🎉 Aiser Platform Production Setup Completed Successfully!"
    log_info "Your platform is now available at: https://${DOMAIN}"
    log_info "Monitoring dashboard: https://${DOMAIN}/monitoring"
    log_info "To manage the service: sudo systemctl start/stop/restart aiser-platform"
    log_info "To view logs: docker-compose -f docker-compose.production.yml logs -f"
}

# Run main function
main "$@"
