"""
Authentication Provider Abstraction Layer

This module provides a unified interface for different authentication providers:
- AuthServiceProvider: Wraps the existing /packages/auth service
- SupabaseAuthProvider: Uses Supabase Auth for cloud SaaS deployments
- KeycloakAuthProvider: Uses Keycloak for on-premise deployments
"""

from .base import AuthProvider
from .factory import get_auth_provider, AuthProviderType
from .auth_service import AuthServiceProvider

# Lazy imports for optional providers (only import if dependencies are installed)
try:
    from .supabase import SupabaseAuthProvider
except ImportError:
    SupabaseAuthProvider = None

try:
    from .keycloak import KeycloakAuthProvider
except ImportError:
    KeycloakAuthProvider = None

__all__ = [
    'AuthProvider',
    'get_auth_provider',
    'AuthProviderType',
    'AuthServiceProvider',
    'SupabaseAuthProvider',
    'KeycloakAuthProvider',
]

