from functools import wraps
from fastapi import Response
from app.core.config import settings


def manage_auth_cookies(response: Response, tokens: dict = None, clear: bool = False):
    """Manage authentication cookies - set or clear them"""
    cookie_settings = {
        "path": "/",
        "httponly": settings.COOKIE_HTTPONLY,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
    }

    if clear:
        response.delete_cookie("access_token", **cookie_settings)
        response.delete_cookie("refresh_token", **cookie_settings)
        return

    if tokens and tokens.get("access_token"):
        response.set_cookie(
            key="access_token",
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
