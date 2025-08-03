from functools import wraps
from fastapi import Response
from app.modules.authentication.utils.cookie_manager import manage_auth_cookies


def handle_auth_cookies():
    """Decorator to handle authentication cookies"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            response = kwargs.get("response")
            if not response or not isinstance(response, Response):
                raise ValueError("Response object required")

            result = await func(*args, **kwargs)

            # Handle different response types
            tokens = None
            if hasattr(result, "access_token"):
                tokens = {
                    "access_token": result.access_token,
                    "refresh_token": result.refresh_token,
                }

            # Set or clear cookies based on response
            manage_auth_cookies(
                response=response,
                tokens=tokens,
                clear=kwargs.get("clear_cookies", False),
            )

            return result

        return wrapper

    return decorator
