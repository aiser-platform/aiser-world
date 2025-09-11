"""
Enterprise Configuration Management
Handles loading and validation of enterprise deployment configurations
"""

import os
import yaml
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DeploymentMode(str, Enum):
    CLOUD = "cloud"
    ON_PREMISE = "on_premise"
    HYBRID = "hybrid"
    AIRGAPPED = "airgapped"


class AuthMode(str, Enum):
    INTERNAL = "internal"
    KEYCLOAK = "keycloak"
    AZURE_AD = "azure_ad"
    OKTA = "okta"
    LDAP = "ldap"
    SAML = "saml"


class SecurityConfig(BaseModel):
    enable_encryption_at_rest: bool = True
    enable_encryption_in_transit: bool = True
    require_mfa: bool = False
    session_timeout_minutes: int = 480
    password_policy: Dict[str, Any] = Field(
        default_factory=lambda: {
            "min_length": 12,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special_chars": True,
            "max_age_days": 90,
            "history_count": 12,
        }
    )
    allowed_origins: Optional[List[str]] = None
    rate_limiting: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": True,
            "requests_per_minute": 100,
            "burst_size": 200,
        }
    )
    audit_logging: bool = True
    data_retention_days: int = 2555  # 7 years


class DatabaseConfig(BaseModel):
    type: str = "postgresql"
    host: str = "localhost"
    port: int = 5432
    database: str = "aiser_enterprise"
    username: str = "aiser"
    password: str = "password"
    ssl_mode: str = "prefer"
    connection_pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    backup_enabled: bool = True
    backup_schedule: str = "0 2 * * *"
    high_availability: bool = False
    read_replicas: List[str] = Field(default_factory=list)


class AuthConfig(BaseModel):
    mode: AuthMode = AuthMode.INTERNAL

    # Keycloak Configuration
    keycloak_server_url: Optional[str] = None
    keycloak_realm: Optional[str] = None
    keycloak_client_id: Optional[str] = None
    keycloak_client_secret: Optional[str] = None

    # Internal JWT Configuration
    jwt_secret_key: str = "your-super-secret-jwt-key-change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # SSO Configuration
    enable_sso: bool = False
    auto_provision_users: bool = True
    default_user_role: str = "member"


class ScalingConfig(BaseModel):
    enable_horizontal_scaling: bool = False
    min_replicas: int = 1
    max_replicas: int = 10
    cpu_threshold: int = 70
    memory_threshold: int = 80
    enable_caching: bool = True
    redis_cluster: bool = False
    redis_nodes: List[str] = Field(default_factory=list)
    cdn_enabled: bool = False
    cdn_url: Optional[str] = None
    load_balancer_type: str = "nginx"


class MonitoringConfig(BaseModel):
    enable_metrics: bool = True
    metrics_endpoint: str = "/metrics"
    enable_tracing: bool = True
    jaeger_endpoint: Optional[str] = None
    enable_logging: bool = True
    log_level: str = "INFO"
    log_format: str = "json"
    enable_health_checks: bool = True
    health_check_interval: int = 30
    enable_alerts: bool = True
    alert_webhook_url: Optional[str] = None
    prometheus_enabled: bool = True
    grafana_enabled: bool = True


class AIConfig(BaseModel):
    enable_local_models: bool = False
    local_model_path: Optional[str] = None
    openai_api_key: Optional[str] = None
    azure_openai_endpoint: Optional[str] = None
    azure_openai_api_key: Optional[str] = None
    custom_model_endpoints: List[str] = Field(default_factory=list)
    enable_model_caching: bool = True
    model_cache_ttl: int = 3600
    max_tokens_per_request: int = 4000
    rate_limit_per_user: int = 100
    enable_content_filtering: bool = True
    data_privacy_mode: bool = True


class ComplianceConfig(BaseModel):
    gdpr_enabled: bool = False
    hipaa_enabled: bool = False
    sox_enabled: bool = False
    pci_enabled: bool = False
    enable_data_classification: bool = False
    enable_data_masking: bool = False
    enable_right_to_be_forgotten: bool = False
    data_residency_region: Optional[str] = None
    audit_trail_immutable: bool = False
    encryption_key_rotation_days: int = 90


class CustomBrandingConfig(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#1976d2"
    secondary_color: str = "#dc004e"
    company_name: str = "Your Company"
    support_email: str = "support@company.com"
    support_url: str = "https://support.company.com"


class CustomFeaturesConfig(BaseModel):
    enable_custom_dashboard: bool = True
    enable_advanced_analytics: bool = True
    enable_api_access: bool = True
    max_api_calls_per_day: int = 10000


class IntegrationsConfig(BaseModel):
    slack: Dict[str, Any] = Field(
        default_factory=lambda: {"enabled": False, "webhook_url": None}
    )
    teams: Dict[str, Any] = Field(
        default_factory=lambda: {"enabled": False, "webhook_url": None}
    )
    jira: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": False,
            "server_url": None,
            "username": None,
            "api_token": None,
        }
    )


class EnterpriseConfig(BaseModel):
    # Basic deployment settings
    deployment_mode: DeploymentMode = DeploymentMode.ON_PREMISE
    organization_name: str = "Aiser Enterprise"
    admin_email: str = "admin@company.com"
    license_key: Optional[str] = None

    # Configuration sections
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    auth: AuthConfig = Field(default_factory=AuthConfig)
    scaling: ScalingConfig = Field(default_factory=ScalingConfig)
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    compliance: ComplianceConfig = Field(default_factory=ComplianceConfig)
    custom_branding: CustomBrandingConfig = Field(default_factory=CustomBrandingConfig)
    custom_features: CustomFeaturesConfig = Field(default_factory=CustomFeaturesConfig)
    integrations: IntegrationsConfig = Field(default_factory=IntegrationsConfig)


def load_config_from_file(config_path: str) -> Dict[str, Any]:
    """Load configuration from YAML file"""
    try:
        with open(config_path, "r") as file:
            return yaml.safe_load(file) or {}
    except FileNotFoundError:
        print(f"Config file not found: {config_path}")
        return {}
    except yaml.YAMLError as e:
        print(f"Error parsing config file: {e}")
        return {}


def load_config_from_env() -> Dict[str, Any]:
    """Load configuration from environment variables"""
    config = {}

    # Basic settings
    if os.getenv("AISER_DEPLOYMENT_MODE"):
        config["deployment_mode"] = os.getenv("AISER_DEPLOYMENT_MODE")
    if os.getenv("AISER_ORG_NAME"):
        config["organization_name"] = os.getenv("AISER_ORG_NAME")
    if os.getenv("AISER_ADMIN_EMAIL"):
        config["admin_email"] = os.getenv("AISER_ADMIN_EMAIL")
    if os.getenv("AISER_LICENSE_KEY"):
        config["license_key"] = os.getenv("AISER_LICENSE_KEY")

    # Auth settings
    auth_config = {}
    if os.getenv("AUTH_MODE"):
        auth_config["mode"] = os.getenv("AUTH_MODE")
    if os.getenv("JWT_SECRET_KEY"):
        auth_config["jwt_secret_key"] = os.getenv("JWT_SECRET_KEY")
    if os.getenv("KEYCLOAK_SERVER_URL"):
        auth_config["keycloak_server_url"] = os.getenv("KEYCLOAK_SERVER_URL")
    if os.getenv("KEYCLOAK_REALM"):
        auth_config["keycloak_realm"] = os.getenv("KEYCLOAK_REALM")
    if os.getenv("KEYCLOAK_CLIENT_ID"):
        auth_config["keycloak_client_id"] = os.getenv("KEYCLOAK_CLIENT_ID")
    if os.getenv("KEYCLOAK_CLIENT_SECRET"):
        auth_config["keycloak_client_secret"] = os.getenv("KEYCLOAK_CLIENT_SECRET")

    if auth_config:
        config["auth"] = auth_config

    # Security settings
    security_config = {}
    if os.getenv("REQUIRE_MFA"):
        security_config["require_mfa"] = os.getenv("REQUIRE_MFA").lower() == "true"
    if os.getenv("AUDIT_LOGGING"):
        security_config["audit_logging"] = os.getenv("AUDIT_LOGGING").lower() == "true"

    if security_config:
        config["security"] = security_config

    # Database settings
    db_config = {}
    if os.getenv("DB_HOST"):
        db_config["host"] = os.getenv("DB_HOST")
    if os.getenv("DB_PORT"):
        db_config["port"] = int(os.getenv("DB_PORT"))
    if os.getenv("DB_NAME"):
        db_config["database"] = os.getenv("DB_NAME")
    if os.getenv("DB_USER"):
        db_config["username"] = os.getenv("DB_USER")
    if os.getenv("DB_PASSWORD"):
        db_config["password"] = os.getenv("DB_PASSWORD")

    if db_config:
        config["database"] = db_config

    # AI settings
    ai_config = {}
    if os.getenv("DATA_PRIVACY_MODE"):
        ai_config["data_privacy_mode"] = (
            os.getenv("DATA_PRIVACY_MODE").lower() == "true"
        )

    if ai_config:
        config["ai"] = ai_config

    return config


def merge_configs(
    base_config: Dict[str, Any], override_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Recursively merge two configuration dictionaries"""
    merged = base_config.copy()

    for key, value in override_config.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = merge_configs(merged[key], value)
        else:
            merged[key] = value

    return merged


# Global configuration instance
_enterprise_config: Optional[EnterpriseConfig] = None


def get_enterprise_config() -> EnterpriseConfig:
    """Get the global enterprise configuration instance"""
    global _enterprise_config

    if _enterprise_config is None:
        # Load configuration from multiple sources
        config_data = {}

        # 1. Load from file (if specified)
        config_file = os.getenv("AISER_CONFIG_FILE", "/etc/aiser/config.yml")
        if os.path.exists(config_file):
            config_data = load_config_from_file(config_file)

        # 2. Load from environment variables and merge
        env_config = load_config_from_env()
        config_data = merge_configs(config_data, env_config)

        # 3. Create configuration instance
        _enterprise_config = EnterpriseConfig(**config_data)

    return _enterprise_config


def reload_enterprise_config():
    """Reload the enterprise configuration"""
    global _enterprise_config
    _enterprise_config = None
    return get_enterprise_config()
