from fastapi import APIRouter, Depends, Request
from app.middleware.auth_mode import require_enterprise
from app.modules.oidc import OIDCClient

router = APIRouter(prefix="/api/v1/enterprise/oidc")


@router.post('/exchange')
async def exchange_code(request: Request, _=Depends(require_enterprise)):
    body = await request.json()
    code = body.get('code')
    client = OIDCClient()
    tokens = client.exchange_code(code)
    return {"success": True, "tokens": tokens}


@router.get('/callback')
async def callback(request: Request, _=Depends(require_enterprise)):
    # TODO: callback handling for OIDC providers
    return {"success": True, "message": "callback received"}


