"""
Enterprise Configuration Module
Handles enterprise deployment configurations and settings
"""

import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum


class DeploymentMode(str, Enum):
    """Deployment modes for the platform"""

    CLOUD = "cloud"
    ON_PREMISE = "on_premise"
    HYBRID = "hybrid"


class AuthProvider(str, Enum):
    """Authentication providers"""

    INTERNAL = "internal"
    KEYCLOAK = "keycloak"
    AZURE_AD = "azure_ad"
    OKTA = "okta"
    SAML = "saml"


@dataclass
class EnterpriseConfig:
    """Enterprise configuration settings"""

    # Deployment settings
    deployment_mode: DeploymentMode = DeploymentMode.CLOUD
    auth_provider: AuthProvider = AuthProvider.INTERNAL

    # Multi-tenancy settings
    enable_multi_tenancy: bool = True
    default_organization_name: str = "Default Organization"
    auto_create_organizations: bool = True

    # Security settings
    enforce_mfa: bool = False
    password_policy: Dict[str, Any] = field(
        default_factory=lambda: {
            "min_length": 8,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special_chars": True,
            "max_age_days": 90,
        }
    )

    # Session settings
    session_timeout_minutes: int = 480  # 8 hours
    max_concurrent_sessions: int = 5

    # API settings
    rate_limiting: Dict[str, Any] = field(
        default_factory=lambda: {
            "enabled": True,
            "requests_per_minute": 1000,
            "burst_limit": 100,
        }
    )

    # Audit settings
    enable_audit_logging: bool = True
    audit_retention_days: int = 365

    # Data settings
    data_encryption_at_rest: bool = True
    data_encryption_in_transit: bool = True
    backup_retention_days: int = 30

    # Integration settings
    webhook_endpoints: List[str] = field(default_factory=list)
    api_keys: Dict[str, str] = field(default_factory=dict)

    # Compliance settings
    gdpr_compliance: bool = True
    hipaa_compliance: bool = False
    sox_compliance: bool = False

    # Monitoring settings
    enable_metrics: bool = True
    enable_health_checks: bool = True
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "EnterpriseConfig":
        """Load enterprise config from environment variables"""
        return cls(
            deployment_mode=DeploymentMode(os.getenv("DEPLOYMENT_MODE", "cloud")),
            auth_provider=AuthProvider(os.getenv("AUTH_PROVIDER", "internal")),
            enable_multi_tenancy=os.getenv("ENABLE_MULTI_TENANCY", "true").lower()
            == "true",
            default_organization_name=os.getenv(
                "DEFAULT_ORG_NAME", "Default Organization"
            ),
            auto_create_organizations=os.getenv("AUTO_CREATE_ORGS", "true").lower()
            == "true",
            enforce_mfa=os.getenv("ENFORCE_MFA", "false").lower() == "true",
            session_timeout_minutes=int(os.getenv("SESSION_TIMEOUT_MINUTES", "480")),
            max_concurrent_sessions=int(os.getenv("MAX_CONCURRENT_SESSIONS", "5")),
            enable_audit_logging=os.getenv("ENABLE_AUDIT_LOGGING", "true").lower()
            == "true",
            audit_retention_days=int(os.getenv("AUDIT_RETENTION_DAYS", "365")),
            data_encryption_at_rest=os.getenv("DATA_ENCRYPTION_AT_REST", "true").lower()
            == "true",
            data_encryption_in_transit=os.getenv(
                "DATA_ENCRYPTION_IN_TRANSIT", "true"
            ).lower()
            == "true",
            backup_retention_days=int(os.getenv("BACKUP_RETENTION_DAYS", "30")),
            gdpr_compliance=os.getenv("GDPR_COMPLIANCE", "true").lower() == "true",
            hipaa_compliance=os.getenv("HIPAA_COMPLIANCE", "false").lower() == "true",
            sox_compliance=os.getenv("SOX_COMPLIANCE", "false").lower() == "true",
            enable_metrics=os.getenv("ENABLE_METRICS", "true").lower() == "true",
            enable_health_checks=os.getenv("ENABLE_HEALTH_CHECKS", "true").lower()
            == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )

    def is_on_premise(self) -> bool:
        """Check if running in on-premise mode"""
        return self.deployment_mode == DeploymentMode.ON_PREMISE

    def is_enterprise_auth(self) -> bool:
        """Check if using enterprise authentication"""
        return self.auth_provider != AuthProvider.INTERNAL

    def get_compliance_requirements(self) -> List[str]:
        """Get list of enabled compliance requirements"""
        requirements = []
        if self.gdpr_compliance:
            requirements.append("GDPR")
        if self.hipaa_compliance:
            requirements.append("HIPAA")
        if self.sox_compliance:
            requirements.append("SOX")
        return requirements


@dataclass
class DatabaseConfig:
    """Database configuration for enterprise deployment"""

    # Connection settings
    host: str = "localhost"
    port: int = 5432
    database: str = "aiser_enterprise"
    username: str = "aiser"
    password: str = ""

    # Connection pool settings
    pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    pool_recycle: int = 3600

    # SSL settings
    ssl_mode: str = "require"
    ssl_cert_path: Optional[str] = None
    ssl_key_path: Optional[str] = None
    ssl_ca_path: Optional[str] = None

    # Backup settings
    backup_enabled: bool = True
    backup_schedule: str = "0 2 * * *"  # Daily at 2 AM
    backup_retention_days: int = 30

    # Replication settings
    read_replicas: List[str] = field(default_factory=list)
    enable_read_write_split: bool = False

    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        """Load database config from environment variables"""
        return cls(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", "aiser_enterprise"),
            username=os.getenv("DB_USER", "aiser"),
            password=os.getenv("DB_PASSWORD", ""),
            pool_size=int(os.getenv("DB_POOL_SIZE", "20")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "30")),
            pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
            ssl_mode=os.getenv("DB_SSL_MODE", "require"),
            ssl_cert_path=os.getenv("DB_SSL_CERT_PATH"),
            ssl_key_path=os.getenv("DB_SSL_KEY_PATH"),
            ssl_ca_path=os.getenv("DB_SSL_CA_PATH"),
            backup_enabled=os.getenv("DB_BACKUP_ENABLED", "true").lower() == "true",
            backup_schedule=os.getenv("DB_BACKUP_SCHEDULE", "0 2 * * *"),
            backup_retention_days=int(os.getenv("DB_BACKUP_RETENTION_DAYS", "30")),
            enable_read_write_split=os.getenv("DB_READ_WRITE_SPLIT", "false").lower()
            == "true",
        )

    def get_connection_url(self, include_password: bool = True) -> str:
        """Get database connection URL"""
        password_part = (
            f":{self.password}" if include_password and self.password else ""
        )
        ssl_part = f"?sslmode={self.ssl_mode}" if self.ssl_mode != "disable" else ""

        return f"postgresql://{self.username}{password_part}@{self.host}:{self.port}/{self.database}{ssl_part}"


@dataclass
class RedisConfig:
    """Redis configuration for enterprise deployment"""

    # Connection settings
    host: str = "localhost"
    port: int = 6379
    password: Optional[str] = None
    database: int = 0

    # SSL settings
    ssl_enabled: bool = False
    ssl_cert_path: Optional[str] = None
    ssl_key_path: Optional[str] = None
    ssl_ca_path: Optional[str] = None

    # Cluster settings
    cluster_enabled: bool = False
    cluster_nodes: List[str] = field(default_factory=list)

    # Performance settings
    max_connections: int = 100
    connection_timeout: int = 5
    socket_keepalive: bool = True

    @classmethod
    def from_env(cls) -> "RedisConfig":
        """Load Redis config from environment variables"""
        return cls(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            password=os.getenv("REDIS_PASSWORD"),
            database=int(os.getenv("REDIS_DB", "0")),
            ssl_enabled=os.getenv("REDIS_SSL_ENABLED", "false").lower() == "true",
            ssl_cert_path=os.getenv("REDIS_SSL_CERT_PATH"),
            ssl_key_path=os.getenv("REDIS_SSL_KEY_PATH"),
            ssl_ca_path=os.getenv("REDIS_SSL_CA_PATH"),
            cluster_enabled=os.getenv("REDIS_CLUSTER_ENABLED", "false").lower()
            == "true",
            max_connections=int(os.getenv("REDIS_MAX_CONNECTIONS", "100")),
            connection_timeout=int(os.getenv("REDIS_CONNECTION_TIMEOUT", "5")),
            socket_keepalive=os.getenv("REDIS_SOCKET_KEEPALIVE", "true").lower()
            == "true",
        )

    def get_connection_url(self) -> str:
        """Get Redis connection URL"""
        password_part = f":{self.password}@" if self.password else ""
        protocol = "rediss" if self.ssl_enabled else "redis"

        return f"{protocol}://{password_part}{self.host}:{self.port}/{self.database}"


# Global enterprise configuration
enterprise_config = EnterpriseConfig.from_env()
database_config = DatabaseConfig.from_env()
redis_config = RedisConfig.from_env()
