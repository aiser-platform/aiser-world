import os

class AuthConfig:
    """Runtime auth configuration for OSS vs Enterprise modes."""

    AUTH_MODE = os.environ.get("AUTH_MODE", "basic")  # 'basic' or 'enterprise'
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev-jwt-secret-change-in-production")
    ENABLE_OIDC = os.environ.get("ENABLE_OIDC", "false").lower() in ("1", "true", "yes")


