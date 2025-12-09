from app.core.config import settings
from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "contact": settings.APP_CONTACT,
    }
