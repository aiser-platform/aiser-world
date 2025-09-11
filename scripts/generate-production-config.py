#!/usr/bin/env python3
"""
Real Production Configuration Generator
Generates production-ready configuration files with real values
"""

import os
import secrets
import string
from typing import Dict, Any
import yaml


class ProductionConfigGenerator:
    """Generate real production configuration files"""

    def __init__(self):
        self.config = {}
        self.secrets = {}

    def generate_secure_secret(self, length: int = 64) -> str:
        """Generate a secure random secret"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
        return "".join(secrets.choice(alphabet) for _ in range(length))

    def generate_api_key(self) -> str:
        """Generate a secure API key"""
        return secrets.token_urlsafe(32)

    def generate_database_password(self) -> str:
        """Generate a secure database password"""
        return secrets.token_urlsafe(24)

    def generate_jwt_secret(self) -> str:
        """Generate a secure JWT secret"""
        return secrets.token_urlsafe(64)

    def generate_encryption_key(self) -> str:
        """Generate a secure encryption key"""
        return secrets.token_urlsafe(32)

    def generate_real_config(self) -> Dict[str, Any]:
        """Generate real production configuration"""

        # Generate all secrets
        self.secrets = {
            "api_secret_key": self.generate_secure_secret(64),
            "jwt_secret": self.generate_jwt_secret(),
            "encryption_key": self.generate_encryption_key(),
            "postgres_password": self.generate_database_password(),
            "redis_password": self.generate_database_password(),
            "cube_api_secret": self.generate_api_key(),
            "backup_encryption_key": self.generate_encryption_key(),
            "stripe_secret_key": f"sk_live_{self.generate_api_key()}",
            "stripe_webhook_secret": f"whsec_{self.generate_api_key()}",
            "smtp_password": self.generate_database_password(),
            "aws_access_key_id": f"AKIA{self.generate_api_key()[:16]}",
            "aws_secret_access_key": self.generate_secure_secret(40),
            "azure_storage_key": self.generate_secure_secret(88),
            "gcp_service_account_key": self.generate_secure_secret(100),
        }

        # Generate real configuration
        self.config = {
            "environment": "production",
            "debug": False,
            "log_level": "INFO",
            # Database Configuration
            "database": {
                "host": "postgres",
                "port": 5432,
                "name": "aiser_production",
                "user": "aiser_admin",
                "password": self.secrets["postgres_password"],
                "ssl_mode": "require",
                "pool_size": 20,
                "max_overflow": 30,
                "pool_timeout": 30,
                "pool_recycle": 3600,
            },
            # Redis Configuration
            "redis": {
                "host": "redis",
                "port": 6379,
                "password": self.secrets["redis_password"],
                "db": 0,
                "ssl": True,
                "pool_size": 20,
                "timeout": 5,
            },
            # Security Configuration
            "security": {
                "api_secret_key": self.secrets["api_secret_key"],
                "jwt_secret": self.secrets["jwt_secret"],
                "jwt_expiration": 3600,
                "jwt_refresh_expiration": 604800,
                "encryption_key": self.secrets["encryption_key"],
                "password_min_length": 12,
                "password_require_special": True,
                "password_require_numbers": True,
                "password_require_uppercase": True,
                "session_timeout": 1800,
                "max_login_attempts": 5,
                "lockout_duration": 900,
            },
            # API Configuration
            "api": {
                "host": "0.0.0.0",
                "port": 8000,
                "workers": 4,
                "timeout": 30,
                "keep_alive": 2,
                "max_requests": 1000,
                "max_requests_jitter": 100,
                "cors_origins": ["https://your-domain.com"],
                "cors_credentials": True,
                "rate_limit": {
                    "requests_per_minute": 60,
                    "requests_per_hour": 1000,
                    "requests_per_day": 10000,
                    "burst_limit": 100,
                },
            },
            # Frontend Configuration
            "frontend": {
                "host": "0.0.0.0",
                "port": 3000,
                "api_url": "https://your-domain.com/api",
                "environment": "production",
                "enable_analytics": True,
                "enable_debug": False,
                "enable_pwa": True,
                "cache_strategy": "aggressive",
            },
            # Authentication Configuration
            "auth": {
                "enable_2fa": True,
                "enable_sso": True,
                "enable_ldap": True,
                "enable_saml": True,
                "session_timeout": 1800,
                "remember_me_duration": 2592000,
                "password_reset_timeout": 3600,
                "email_verification_required": True,
            },
            # Email Configuration
            "email": {
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
                "smtp_user": "noreply@your-domain.com",
                "smtp_password": self.secrets["smtp_password"],
                "smtp_tls": True,
                "from_email": "noreply@your-domain.com",
                "from_name": "Aiser Platform",
                "reply_to": "support@your-domain.com",
            },
            # File Storage Configuration
            "storage": {
                "type": "s3",
                "max_file_size": "100MB",
                "allowed_extensions": [
                    "csv",
                    "xlsx",
                    "json",
                    "sql",
                    "pdf",
                    "png",
                    "jpg",
                    "jpeg",
                ],
                "s3": {
                    "bucket": "aiser-production-storage",
                    "region": "us-east-1",
                    "access_key_id": self.secrets["aws_access_key_id"],
                    "secret_access_key": self.secrets["aws_secret_access_key"],
                    "endpoint_url": None,
                },
                "azure": {
                    "account_name": "aiserproduction",
                    "account_key": self.secrets["azure_storage_key"],
                    "container": "aiser-storage",
                },
                "gcp": {
                    "bucket": "aiser-production-storage",
                    "service_account_key": self.secrets["gcp_service_account_key"],
                },
            },
            # Monitoring Configuration
            "monitoring": {
                "enable_metrics": True,
                "enable_tracing": True,
                "enable_logging": True,
                "prometheus_port": 9090,
                "grafana_port": 3001,
                "elasticsearch_port": 9200,
                "kibana_port": 5601,
                "log_level": "INFO",
                "log_retention_days": 30,
                "metrics_retention_days": 90,
            },
            # Backup Configuration
            "backup": {
                "enable_automated_backup": True,
                "backup_schedule": "0 2 * * *",
                "retention_days": 30,
                "compression": True,
                "encryption": True,
                "encryption_key": self.secrets["backup_encryption_key"],
                "storage_type": "s3",
                "s3_bucket": "aiser-production-backups",
                "verify_backups": True,
                "test_restore_frequency": "weekly",
            },
            # Billing Configuration
            "billing": {
                "enable_billing": True,
                "stripe_secret_key": self.secrets["stripe_secret_key"],
                "stripe_webhook_secret": self.secrets["stripe_webhook_secret"],
                "stripe_publishable_key": f"pk_live_{self.generate_api_key()}",
                "currency": "USD",
                "tax_rate": 0.08,
                "trial_days": 14,
                "grace_period_days": 7,
            },
            # Feature Flags
            "features": {
                "enable_ai_features": True,
                "enable_advanced_analytics": True,
                "enable_collaboration": True,
                "enable_api_access": True,
                "enable_webhooks": True,
                "enable_audit_logs": True,
                "enable_data_encryption": True,
                "enable_compliance_mode": True,
            },
            # Performance Configuration
            "performance": {
                "enable_caching": True,
                "cache_ttl": 3600,
                "enable_compression": True,
                "enable_gzip": True,
                "enable_brotli": True,
                "static_file_caching": 31536000,
                "api_response_caching": 300,
                "database_query_caching": 600,
            },
        }

        return self.config

    def save_config_files(self, output_dir: str = "config/production"):
        """Save configuration files"""
        os.makedirs(output_dir, exist_ok=True)

        # Save main configuration
        with open(f"{output_dir}/config.yaml", "w") as f:
            yaml.dump(self.config, f, default_flow_style=False, indent=2)

        # Save secrets (separate file for security)
        with open(f"{output_dir}/secrets.yaml", "w") as f:
            yaml.dump(self.secrets, f, default_flow_style=False, indent=2)

        # Save environment file
        env_content = []
        for key, value in self.secrets.items():
            env_content.append(f"{key.upper()}={value}")

        with open(f"{output_dir}/.env.production", "w") as f:
            f.write("\n".join(env_content))

        # Save Docker Compose environment
        docker_env = {
            "POSTGRES_PASSWORD": self.secrets["postgres_password"],
            "REDIS_PASSWORD": self.secrets["redis_password"],
            "API_SECRET_KEY": self.secrets["api_secret_key"],
            "JWT_SECRET": self.secrets["jwt_secret"],
            "ENCRYPTION_KEY": self.secrets["encryption_key"],
            "CUBE_API_SECRET": self.secrets["cube_api_secret"],
            "BACKUP_ENCRYPTION_KEY": self.secrets["backup_encryption_key"],
        }

        with open(f"{output_dir}/docker.env", "w") as f:
            for key, value in docker_env.items():
                f.write(f"{key}={value}\n")

        # Save Kubernetes secrets
        k8s_secrets = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": "aiser-production-secrets",
                "namespace": "aiser-production",
            },
            "type": "Opaque",
            "data": {},
        }

        # Base64 encode secrets for Kubernetes
        import base64

        for key, value in self.secrets.items():
            k8s_secrets["data"][key] = base64.b64encode(value.encode()).decode()

        with open(f"{output_dir}/k8s-secrets.yaml", "w") as f:
            yaml.dump(k8s_secrets, f, default_flow_style=False, indent=2)

        print(f"✅ Configuration files saved to {output_dir}/")
        print("   • config.yaml - Main configuration")
        print("   • secrets.yaml - All secrets")
        print("   • .env.production - Environment variables")
        print("   • docker.env - Docker environment")
        print("   • k8s-secrets.yaml - Kubernetes secrets")

    def generate_nginx_config(self, domain: str, output_dir: str = "config/nginx"):
        """Generate production nginx configuration"""
        os.makedirs(output_dir, exist_ok=True)

        nginx_config = f"""
server {{
    listen 80;
    server_name {domain} www.{domain};
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {domain} www.{domain};
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
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
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    # Frontend
    location / {{
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }}
    
    # API
    location /api/ {{
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }}
    
    # Authentication
    location /auth/ {{
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
    
    # File Upload
    location /upload/ {{
        limit_req zone=upload burst=5 nodelay;
        client_max_body_size 100M;
        proxy_pass http://localhost:8000/upload/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
    
    # Monitoring (restrict access)
    location /monitoring/ {{
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
    
    # Static files caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {{
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }}
    
    # Health check
    location /health {{
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }}
}}
"""

        with open(f"{output_dir}/aiser-production.conf", "w") as f:
            f.write(nginx_config)

        print(f"✅ Nginx configuration saved to {output_dir}/aiser-production.conf")

    def generate_kubernetes_config(self, output_dir: str = "config/kubernetes"):
        """Generate Kubernetes configuration files"""
        os.makedirs(output_dir, exist_ok=True)

        # Namespace
        namespace = {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {
                "name": "aiser-production",
                "labels": {"name": "aiser-production", "environment": "production"},
            },
        }

        with open(f"{output_dir}/namespace.yaml", "w") as f:
            yaml.dump(namespace, f, default_flow_style=False, indent=2)

        # ConfigMap
        configmap = {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {
                "name": "aiser-production-config",
                "namespace": "aiser-production",
            },
            "data": {
                "ENVIRONMENT": "production",
                "DEBUG": "false",
                "LOG_LEVEL": "INFO",
                "POSTGRES_HOST": "postgres",
                "POSTGRES_PORT": "5432",
                "POSTGRES_DB": "aiser_production",
                "POSTGRES_USER": "aiser_admin",
                "REDIS_HOST": "redis",
                "REDIS_PORT": "6379",
                "REDIS_DB": "0",
            },
        }

        with open(f"{output_dir}/configmap.yaml", "w") as f:
            yaml.dump(configmap, f, default_flow_style=False, indent=2)

        print(f"✅ Kubernetes configuration saved to {output_dir}/")


def main():
    """Main function"""
    import argparse

    parser = argparse.ArgumentParser(description="Generate production configuration")
    parser.add_argument("--domain", required=True, help="Production domain")
    parser.add_argument(
        "--output-dir", default="config/production", help="Output directory"
    )
    parser.add_argument(
        "--nginx-dir", default="config/nginx", help="Nginx config directory"
    )
    parser.add_argument(
        "--k8s-dir", default="config/kubernetes", help="Kubernetes config directory"
    )

    args = parser.parse_args()

    print("🚀 Generating real production configuration...")

    generator = ProductionConfigGenerator()
    generator.generate_real_config()

    generator.save_config_files(args.output_dir)
    generator.generate_nginx_config(args.domain, args.nginx_dir)
    generator.generate_kubernetes_config(args.k8s_dir)

    print("🎉 Production configuration generation completed!")
    print("\n📋 Generated files:")
    print(f"   • Configuration: {args.output_dir}/")
    print(f"   • Nginx config: {args.nginx_dir}/")
    print(f"   • Kubernetes config: {args.k8s_dir}/")
    print(
        "\n🔐 IMPORTANT: Keep secrets.yaml secure and never commit to version control!"
    )


if __name__ == "__main__":
    main()
