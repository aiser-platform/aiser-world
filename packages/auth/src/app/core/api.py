from fastapi import APIRouter

from app.modules.user.api import router as user_router
from app.modules.email.api import router as email_router
from app.modules.organizations.api import router as organizations_router
from app.modules.authentication.api import router as auth_router
from app.modules.enterprise.api import router as enterprise_router
from app.modules.billing.api import router as billing_router
from app.modules.teams.api import router as teams_router
from app.core.config import settings

api_router = APIRouter()


@api_router.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "contact": settings.APP_CONTACT,
    }


@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "auth"}


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

api_router.include_router(
    router=organizations_router,
    prefix="/api/v1",
    tags=["organizations", "projects", "subscriptions"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=enterprise_router,
    prefix="/api/v1",
    tags=["enterprise"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=billing_router,
    prefix="/api/v1/billing",
    tags=["billing", "usage"],
    responses={404: {"description": "Not found"}},
)

api_router.include_router(
    router=teams_router,
    prefix="/api/v1/teams",
    tags=["teams", "members"],
    responses={404: {"description": "Not found"}},
)

# Authentication routes (refresh/logout)
api_router.include_router(
    router=auth_router,
    prefix="/api/v1",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)
