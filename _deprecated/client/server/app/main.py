import asyncio
import logging

from app.core import g
from app.core.api import api_router
from app.core.config import settings
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    openapi_url="/docs/json",
    docs_url="/docs",
    redoc_url="/redoc",
    contact=settings.APP_CONTACT,
    debug=settings.DEBUG,
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


@app.middleware("http")
async def set_context(request: Request, call_next):
    try:
        # Check if route is public
        # if any(request.url.path.startswith(route) for route in PUBLIC_ROUTES):
        #     return await call_next(request)

        # Extract the session cookie

        # Initialize globals for this request

        user = request.cookies.get("user")

        g.set({"user": user})
        response = await call_next(request)
        return response

    except Exception as e:
        logger.error(f"Error setting context: {e}")


# Define an async shutdown handler using FastAPI's shutdown event
@app.on_event("shutdown")
async def shutdown():
    logger.info("Cleaning up before shutdown...")
    await asyncio.sleep(1)  # Simulate async cleanup tasks
