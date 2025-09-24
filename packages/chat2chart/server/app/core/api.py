from app.core.config import settings
from app.modules.charts.api import router as chart_router
from app.modules.chats.api import router as chat_router
from app.modules.chats.conversations.api import router as conversation_router
from app.modules.files import file_router
from app.modules.user import user_router
from app.modules.data.api import router as data_router
from app.modules.ai.api import router as ai_router
from app.modules.cube.api import router as cube_router
from app.modules.projects.api import router as projects_router
from app.modules.onboarding.api import router as onboarding_router
from app.modules.queries.api import router as queries_router
from app.modules.authentication.api import router as auth_api_router
from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "contact": settings.APP_CONTACT,
    }


api_router.include_router(
    router=user_router,
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=file_router,
    prefix="/files",
    tags=["files"],
    responses={404: {"description": "Not found"}},
)


api_router.include_router(router=auth_api_router, prefix="", tags=["auth"]) 

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

api_router.include_router(
    router=ai_router,
    prefix="",
    tags=["ai"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=cube_router,
    prefix="/cube",
    tags=["cube", "schema", "analytics"],
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


