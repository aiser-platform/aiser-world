from fastapi import APIRouter

from app.modules.user.api import router as user_router
from app.modules.email.api import router as email_router
from app.core.config import settings

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
    router=email_router,
    prefix="/email",
    tags=["email"],
    responses={404: {"description": "Not found"}},
)
