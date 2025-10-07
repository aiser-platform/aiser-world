from fastapi import Response
from app.core.config import settings


def manage_auth_cookies(response: Response, tokens: dict | None = None, clear: bool = False):
    """Manage authentication cookies - set or clear them"""
    # Build cookie settings. Avoid forcing a domain for localhost so the
    # browser creates host-only cookies which work for both `localhost` and
    # `127.0.0.1` during local development.
    cookie_settings: dict = {
        "path": "/",
        "httponly": settings.COOKIE_HTTPONLY,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
    }

    # Only set explicit domain when configured and not localhost (to avoid
    # host/port mismatches during local development).
    if settings.COOKIE_DOMAIN and settings.COOKIE_DOMAIN.lower() != "localhost":
        cookie_settings["domain"] = settings.COOKIE_DOMAIN

    # For local development we avoid forcing SameSite=None since modern
    # browsers may require Secure for SameSite=None; keep settings as-is.

    if clear:
        response.delete_cookie("access_token", **cookie_settings)
        response.delete_cookie("c2c_access_token", **cookie_settings)
        response.delete_cookie("refresh_token", **cookie_settings)
        return

    if tokens and tokens.get("access_token"):
        # Set both access_token and c2c_access_token for compatibility
        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],
            max_age=settings.JWT_EXP_TIME_MINUTES * 60,
            **cookie_settings,
        )
        response.set_cookie(
            key="c2c_access_token",
            value=tokens["access_token"],
            max_age=settings.JWT_EXP_TIME_MINUTES * 60,
            **cookie_settings,
        )

    if tokens and tokens.get("refresh_token"):
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
            **cookie_settings,
        )
