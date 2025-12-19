from app.core.config import settings
from app.modules.charts.api import router as chart_router
from app.modules.chats.api import router as chat_router
from app.modules.chats.conversations.api import router as conversation_router
from app.modules.chats.assets.api import router as assets_router
from app.modules.files import file_router
# User router removed - user management will be handled by Supabase
from app.modules.data.api import router as data_router
from app.modules.ai.api import router as ai_router
from app.modules.ai.api_streaming import router as ai_streaming_router
from app.modules.projects.api import router as projects_router
from app.modules.onboarding.api import router as onboarding_router
from app.modules.queries.api import router as queries_router
from app.modules.authentication.api import router as auth_api_router
from app.modules.authentication.rbac.api import router as rbac_router
from app.modules.debug.api import router as debug_router
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from fastapi import APIRouter, Depends, Request
from typing import Union

api_router = APIRouter()


@api_router.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "contact": settings.APP_CONTACT,
    }


# User router removed - user management will be handled by Supabase

api_router.include_router(
    router=file_router,
    prefix="/files",
    tags=["files"],
    responses={404: {"description": "Not found"}},
)


api_router.include_router(router=auth_api_router, prefix="", tags=["auth"]) 

api_router.include_router(router=rbac_router, prefix="", tags=["rbac"])

api_router.include_router(
    router=chat_router,
    prefix="/chats",
    tags=["chats"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=conversation_router,
    prefix="/conversations",
    tags=["conversations"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=assets_router,
    prefix="/assets",
    tags=["assets"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=chart_router,
    prefix="/charts",
    tags=["charts"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=data_router,
    prefix="/data",
    tags=["data"],
    responses={404: {"description": "Not found"}},
)

# Proxy /api/data/sources/{id} for frontend compatibility
@api_router.get("/api/data/sources/{data_source_id}")
async def get_data_source_proxy(
    data_source_id: str,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Proxy endpoint for /data/sources/{id} with /api prefix"""
    from app.modules.data.api import get_project_data_source
    from fastapi import HTTPException, status
    
    try:
        # Extract organization_id and project_id from token or use defaults
        user_payload = current_token if isinstance(current_token, dict) else {}
        organization_id = str(user_payload.get('organization_id') or '1')
        project_id = str(user_payload.get('project_id') or '1')
        
        # Call the actual endpoint
        return await get_project_data_source(organization_id, project_id, data_source_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

api_router.include_router(
    router=ai_router,
    prefix="/ai",
    tags=["ai"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=ai_streaming_router,
    prefix="/ai",
    tags=["ai-streaming"],
    responses={404: {"description": "Not found"}},
)


api_router.include_router(
    router=projects_router,
    prefix="/api",
    tags=["projects", "organizations"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=onboarding_router,
    prefix="/api/onboarding",
    tags=["onboarding"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=queries_router,
    prefix="/api/queries",
    tags=["queries"],
    responses={404: {"description": "Not found"}},
)

# Debug endpoints (development only)
api_router.include_router(router=debug_router, prefix="/debug", tags=["debug"])

# Proxy /api/models to /ai/models for frontend compatibility
@api_router.get("/api/models")
async def get_models_proxy(current_token: dict = Depends(JWTCookieBearer())):
    """Proxy endpoint for /ai/models to support /api/models"""
    from app.modules.ai.api import get_available_models
    return await get_available_models()  # get_available_models doesn't take parameters 


# User profile endpoints removed - user management will be handled by Supabase


