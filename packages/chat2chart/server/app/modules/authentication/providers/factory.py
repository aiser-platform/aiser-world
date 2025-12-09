"""
Authentication Provider Factory

Factory function to get the appropriate auth provider based on configuration.
"""

import os
import logging
from typing import Optional
from enum import Enum

from .base import AuthProvider
from .auth_service import AuthServiceProvider

logger = logging.getLogger(__name__)


class AuthProviderType(str, Enum):
    """Supported authentication provider types"""
    AUTH_SERVICE = "auth_service"  # Default: existing /packages/auth service
    SUPABASE = "supabase"          # Supabase Auth for cloud SaaS
    KEYCLOAK = "keycloak"          # Keycloak for on-premise


# Lazy import providers to avoid import errors if dependencies are missing
_provider_cache: Optional[AuthProvider] = None


def get_auth_provider() -> AuthProvider:
    """
    Factory function to get the appropriate auth provider based on configuration.
    
    Uses AUTH_PROVIDER environment variable to determine which provider to use.
    Defaults to 'auth_service' if not specified.
    
    Returns:
        AuthProvider instance
        
    Raises:
        ValueError: If provider type is invalid or dependencies are missing
    """
    global _provider_cache
    
    # Return cached provider if available
    if _provider_cache is not None:
        return _provider_cache
    
    # Get provider type from environment
    auth_type = os.getenv('AUTH_PROVIDER', 'auth_service').lower()
    
    try:
        provider_type = AuthProviderType(auth_type)
    except ValueError:
        logger.warning(f"Invalid AUTH_PROVIDER '{auth_type}', defaulting to 'auth_service'")
        provider_type = AuthProviderType.AUTH_SERVICE
    
    # Instantiate provider based on type
    if provider_type == AuthProviderType.AUTH_SERVICE:
        logger.info("Using AuthServiceProvider (existing /packages/auth service)")
        _provider_cache = AuthServiceProvider()
    
    elif provider_type == AuthProviderType.SUPABASE:
        logger.info("Using SupabaseAuthProvider")
        try:
            from .supabase import SupabaseAuthProvider
            _provider_cache = SupabaseAuthProvider()
        except ImportError as e:
            logger.error(f"Failed to import SupabaseAuthProvider: {e}")
            logger.error("Install supabase package: pip install supabase")
            raise ValueError(f"Supabase provider not available: {e}")
    
    elif provider_type == AuthProviderType.KEYCLOAK:
        logger.info("Using KeycloakAuthProvider")
        try:
            from .keycloak import KeycloakAuthProvider
            _provider_cache = KeycloakAuthProvider()
        except ImportError as e:
            logger.error(f"Failed to import KeycloakAuthProvider: {e}")
            logger.error("Install python-keycloak package: pip install python-keycloak")
            raise ValueError(f"Keycloak provider not available: {e}")
    
    else:
        # Fallback to auth service
        logger.warning(f"Unknown provider type '{auth_type}', defaulting to auth_service")
        _provider_cache = AuthServiceProvider()
    
    return _provider_cache


def reset_provider_cache():
    """Reset the provider cache (useful for testing)"""
    global _provider_cache
    _provider_cache = None



