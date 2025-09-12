from typing import Callable
from fastapi import Request, HTTPException


class RBACMiddleware:
    """Simple RBAC middleware skeleton.

    Usage: instantiate with a callable that maps user -> roles and attach
    to FastAPI via dependency injection or use in routes.
    """

    def __init__(self, get_user_roles: Callable[[Request], list]):
        self.get_user_roles = get_user_roles

    async def require_role(self, request: Request, allowed_roles: list):
        roles = await self.get_user_roles(request)
        if not any(r in roles for r in allowed_roles):
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return True


