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

            # Handle different response types and extract tokens robustly
            tokens = None
            try:
                # Pydantic model or object with attributes
                if hasattr(result, "access_token") and getattr(result, "access_token"):
                    tokens = {
                        "access_token": getattr(result, "access_token"),
                        "refresh_token": getattr(result, "refresh_token", None),
                    }
                # Plain dict result
                elif isinstance(result, dict) and result.get("access_token"):
                    tokens = {
                        "access_token": result.get("access_token"),
                        "refresh_token": result.get("refresh_token"),
                    }
                else:
                    # JSONResponse or Response with JSON body - try to parse
                    import json
                    content = None
                    if hasattr(result, "body") and result.body is not None:
                        content = result.body
                    elif hasattr(result, "content") and result.content is not None:
                        content = result.content

                    if content is not None:
                        # content may be bytes, str, or already a dict
                        parsed = None
                        if isinstance(content, (bytes, bytearray)):
                            try:
                                parsed = json.loads(content.decode("utf-8"))
                            except Exception:
                                parsed = None
                        elif isinstance(content, str):
                            try:
                                parsed = json.loads(content)
                            except Exception:
                                parsed = None
                        elif isinstance(content, dict):
                            parsed = content

                        if isinstance(parsed, dict) and parsed.get("access_token"):
                            tokens = {
                                "access_token": parsed.get("access_token"),
                                "refresh_token": parsed.get("refresh_token"),
                            }
            except Exception:
                # Be permissive: if any extraction fails, leave tokens as None
                tokens = None

            # Set or clear cookies based on response
            manage_auth_cookies(
                response=response,
                tokens=tokens,
                clear=kwargs.get("clear_cookies", False),
            )

            return result

        return wrapper

    return decorator
