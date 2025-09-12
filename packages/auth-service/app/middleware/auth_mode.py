from fastapi import Request
from app.config import AuthConfig


def is_enterprise_mode() -> bool:
    return AuthConfig.AUTH_MODE.lower() == 'enterprise'


async def require_enterprise(request: Request):
    if not is_enterprise_mode():
        # For OSS/basic deployments, certain endpoints should return 404/disabled
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail='Endpoint available in enterprise mode only')


