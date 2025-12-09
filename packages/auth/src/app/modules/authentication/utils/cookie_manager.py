from fastapi import Response  # type: ignore[reportMissingImports]
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

    # If SameSite=None is requested and we're not on localhost, ensure Secure is True
    try:
        samesite_lower = str(cookie_settings.get("samesite", "")).lower()
    except Exception:
        samesite_lower = ""

    if samesite_lower == "none":
        # only force secure when not running on localhost to avoid dev HTTPS requirement
        is_localhost = str(settings.COOKIE_DOMAIN or "").lower().startswith("localhost") or str(settings.COOKIE_DOMAIN or "").strip() == ""
        if not is_localhost and not cookie_settings.get("secure"):
            # enforce secure for SameSite=None in non-localhost environments
            cookie_settings["secure"] = True
            # log for debugging
            try:
                print("cookie_manager: forcing Secure=true because SameSite=None and domain is not localhost")
            except Exception:
                pass

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
