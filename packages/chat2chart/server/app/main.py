import logging

from app.core import g
from app.core.api import api_router
from app.core.config import settings
from app.modules.user.services import UserService
from app.modules.user.utils import current_user_from_service
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.sql import func
from datetime import datetime
from app.db.session import get_async_session

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url="/docs/json",
    docs_url="/docs",
    redoc_url="/redoc",
    contact=settings.APP_CONTACT,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("shutdown")
async def shutdown_event():
    print("Performing cleanup before shutdown...")


@app.middleware("http")
async def embed_token_middleware(request: Request, call_next):
    """Validate embed tokens for embed routes and attach embed metadata to request.state.
    This increments access_count and updates last_accessed_at when a valid token is presented.
    """
    try:
        if request.url.path.startswith("/embed/dashboards/"):
            token = request.query_params.get("token") or request.headers.get("x-embed-token")
            if not token:
                return JSONResponse(status_code=401, content={"detail": "Embed token required"})

            # Validate token and increment access count
            from app.modules.charts.models import DashboardEmbed
            async with get_async_session() as db:
                res = await db.execute(select(DashboardEmbed).where(DashboardEmbed.embed_token == token, DashboardEmbed.is_active == True))
                embed = res.scalar_one_or_none()
                if not embed:
                    return JSONResponse(status_code=403, content={"detail": "Invalid or inactive embed token"})

                # expiry check
                if embed.expires_at and isinstance(embed.expires_at, datetime):
                    if embed.expires_at < datetime.utcnow():
                        return JSONResponse(status_code=403, content={"detail": "Embed token expired"})

                embed.access_count = (embed.access_count or 0) + 1
                embed.last_accessed_at = func.now()
                await db.flush()
                # attach to request for downstream handlers
                request.state.embed = embed

    except Exception as e:
        # Log but allow call_next to handle normal errors
        import logging
        logging.getLogger(__name__).error(f"Error in embed middleware: {e}")

    response = await call_next(request)
    return response


# @app.exception_handler(Exception)
# async def exception_handler(request: Request, exc: Exception):
#     return JSONResponse(
#         status_code=500,
#         content={"error": "An internal error occurred"},
#     )


# @app.middleware("http")
# async def set_context(request: Request, call_next):
#     try:
#         # For now, just pass through requests without setting context
#         # TODO: Implement proper context management later
#         response = await call_next(request)
#         return response

#     except Exception as e:
#         logger.error(f"Error in middleware: {e}")
#         # Return a proper error response instead of None
#         return JSONResponse(
#             status_code=500,
#             content={"error": "Internal server error in middleware"}
#         )
