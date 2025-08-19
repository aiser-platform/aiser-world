"""
Simple Enterprise Configuration (without YAML dependency)
"""

import os
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel


class DeploymentMode(str, Enum):
    CLOUD = "cloud"
    ON_PREMISE = "on_premise"
    HYBRID = "hybrid"
    AIRGAPPED = "airgapped"


class AuthMode(str, Enum):
    INTERNAL = "internal"
    KEYCLOAK = "keycloak"


class SimpleEnterpriseConfig(BaseModel):
    # Basic deployment settings
    deployment_mode: DeploymentMode = DeploymentMode.ON_PREMISE
    organization_name: str = "Aiser Enterprise"
    admin_email: str = "admin@company.com"
    
    # Auth settings
    auth_mode: AuthMode = AuthMode.INTERNAL
    jwt_secret_key: str = "your-super-secret-jwt-key-change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Keycloak settings (if using Keycloak)
    keycloak_server_url: Optional[str] = None
    keycloak_realm: Optional[str] = None
    keycloak_client_id: Optional[str] = None
    keycloak_client_secret: Optional[str] = None
    
    # Security settings
    require_mfa: bool = False
    audit_logging: bool = True
    session_timeout_minutes: int = 480
    
    # Database settings
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "aiser_world"
    db_user: str = "aiser"
    db_password: str = "aiser123"
    
    # Features
    auto_provision_users: bool = True
    default_user_role: str = "member"
    enable_sso: bool = False
    data_privacy_mode: bool = True


def load_simple_config() -> SimpleEnterpriseConfig:
    """Load configuration from environment variables"""
    config_data = {}
    
    # Basic settings
    if os.getenv('AISER_DEPLOYMENT_MODE'):
        config_data['deployment_mode'] = os.getenv('AISER_DEPLOYMENT_MODE')
    if os.getenv('AISER_ORG_NAME'):
        config_data['organization_name'] = os.getenv('AISER_ORG_NAME')
    if os.getenv('AISER_ADMIN_EMAIL'):
        config_data['admin_email'] = os.getenv('AISER_ADMIN_EMAIL')
    
    # Auth settings
    if os.getenv('AUTH_MODE'):
        config_data['auth_mode'] = os.getenv('AUTH_MODE')
    if os.getenv('JWT_SECRET_KEY'):
        config_data['jwt_secret_key'] = os.getenv('JWT_SECRET_KEY')
    if os.getenv('KEYCLOAK_SERVER_URL'):
        config_data['keycloak_server_url'] = os.getenv('KEYCLOAK_SERVER_URL')
    if os.getenv('KEYCLOAK_REALM'):
        config_data['keycloak_realm'] = os.getenv('KEYCLOAK_REALM')
    if os.getenv('KEYCLOAK_CLIENT_ID'):
        config_data['keycloak_client_id'] = os.getenv('KEYCLOAK_CLIENT_ID')
    if os.getenv('KEYCLOAK_CLIENT_SECRET'):
        config_data['keycloak_client_secret'] = os.getenv('KEYCLOAK_CLIENT_SECRET')
    
    # Security settings
    if os.getenv('REQUIRE_MFA'):
        config_data['require_mfa'] = os.getenv('REQUIRE_MFA').lower() == 'true'
    if os.getenv('AUDIT_LOGGING'):
        config_data['audit_logging'] = os.getenv('AUDIT_LOGGING').lower() == 'true'
    
    # Database settings
    if os.getenv('DB_HOST'):
        config_data['db_host'] = os.getenv('DB_HOST')
    if os.getenv('DB_PORT'):
        config_data['db_port'] = int(os.getenv('DB_PORT'))
    if os.getenv('DB_NAME'):
        config_data['db_name'] = os.getenv('DB_NAME')
    if os.getenv('DB_USER'):
        config_data['db_user'] = os.getenv('DB_USER')
    if os.getenv('DB_PASSWORD'):
        config_data['db_password'] = os.getenv('DB_PASSWORD')
    
    # Features
    if os.getenv('DATA_PRIVACY_MODE'):
        config_data['data_privacy_mode'] = os.getenv('DATA_PRIVACY_MODE').lower() == 'true'
    
    return SimpleEnterpriseConfig(**config_data)


# Global configuration instance
_simple_config: Optional[SimpleEnterpriseConfig] = None


def get_simple_enterprise_config() -> SimpleEnterpriseConfig:
    """Get the global simple enterprise configuration instance"""
    global _simple_config
    
    if _simple_config is None:
        _simple_config = load_simple_config()
    
    return _simple_config