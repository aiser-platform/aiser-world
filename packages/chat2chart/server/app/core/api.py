from app.core.config import settings
from app.modules.charts.api import router as chart_router
from app.modules.chats.api import router as chat_router
from app.modules.chats.conversations.api import router as conversation_router
from app.modules.files import file_router
from app.modules.user import user_router
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
