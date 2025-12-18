import logging
import os
import sys

# Ensure project root is on sys.path so 'app' package imports work even if PYTHONPATH isn't set in container
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.core.api import api_router
from app.core.config import settings
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.sql import func
from datetime import datetime
from app.db.session import get_async_session
from app.core.cache import cache
import time
try:
	import socketio
	from app.modules.collaboration.socketio_manager import sio
	_SOCKET_ENABLED = True
except Exception as _sio_err:
	logger = logging.getLogger(__name__)
	logger.warning(f"Socket.IO disabled: {str(_sio_err)}")
	socketio = None
	sio = None
	_SOCKET_ENABLED = False

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url="/docs/json",
    docs_url="/docs",
    redoc_url="/redoc",
    contact=settings.APP_CONTACT,
)


# Temporary request tracing middleware removed (debugging complete)



# Configure CORS from settings for stricter control
allowed_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
# Ensure local dev frontend ports commonly used in this repo are allowed (3000 and 3001)
# This protects against local port remapping where the frontend is served on 3001.
for extra_origin in ("http://localhost:3001", "http://127.0.0.1:3001"):
    if extra_origin not in allowed_origins:
        allowed_origins.append(extra_origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "X-Embed-Token",
    ],
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
)

app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return structured JSON for request body/parameter validation errors.

    This gives the frontend precise feedback about which fields failed
    validation so we can surface user-friendly messages instead of opaque 422s.
    """
    # Log the validation error with context
    logger.warning(f"Validation error for path={request.url.path}: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Request validation failed",
            "details": exc.errors(),
        },
    )


@app.on_event("startup")
async def startup_event():
    """Create database tables on startup if they don't exist."""
    try:
        logger.info("Running startup: Creating database tables if they don't exist...")
        from app.common.model import Base
        from app.db.session import async_engine
        from sqlalchemy import text
        
        # Import all models to ensure they're registered with Base.metadata
        try:
            import app.modules  # noqa: F401
            logger.info("✅ All database models imported successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to import some models: {e}")
        
        # Add missing columns to existing tables (safe for existing databases)
        async with async_engine.begin() as conn:
            # Fix conversation table - add all missing BaseModel columns one by one
            conversation_columns = [
                ("json_metadata", "TEXT"),
                ("deleted_at", "TIMESTAMP WITHOUT TIME ZONE"),
                ("is_active", "BOOLEAN DEFAULT TRUE"),
                ("is_deleted", "BOOLEAN DEFAULT FALSE"),
                ("created_at", "TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"),
                ("updated_at", "TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"),
            ]
            
            for col_name, col_type in conversation_columns:
                try:
                    await conn.execute(text(f"""
                        ALTER TABLE conversation 
                        ADD COLUMN IF NOT EXISTS {col_name} {col_type};
                    """))
                except Exception as e:
                    logger.debug(f"Column {col_name} may already exist: {e}")
            
            logger.info("✅ Added missing columns to conversation table (if needed)")
            
            # Create any missing tables
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database tables created successfully")
        
        # Start background tasks
        try:
            import asyncio
            asyncio.create_task(schedule_retention_cleanup())
            logger.info("✅ Background retention cleanup task started")
        except Exception as e:
            logger.warning(f"⚠️ Failed to start retention cleanup task: {e}")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        # Don't fail startup - let the app try to run anyway


async def schedule_retention_cleanup():
    """Background task to run data retention cleanup daily"""
    import asyncio
    from app.db.session import get_async_session
    from app.modules.data.services.data_retention_service import DataRetentionService
    
    while True:
        try:
            # Wait 24 hours (86400 seconds) before first run, then daily
            await asyncio.sleep(86400)  # 24 hours
            
            logger.info("🧹 Starting scheduled data retention cleanup...")
            async with get_async_session() as db:
                retention_service = DataRetentionService(db)
                affected = await retention_service.cleanup_expired_file_sources()
                logger.info(f"✅ Retention cleanup completed: {affected} data sources affected")
        except Exception as e:
            logger.error(f"❌ Retention cleanup task failed: {e}", exc_info=True)
            # Continue running even if one cleanup fails
            await asyncio.sleep(3600)  # Wait 1 hour before retry on error


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("shutdown")
async def shutdown_event():
    print("Performing cleanup before shutdown...")


# Simple rate limiting for AI endpoints (per-identifier per minute)
_ai_rl_fallback_store = {}


@app.middleware("http")
async def ai_rate_limiting_middleware(request: Request, call_next):
    try:
        path = request.url.path or ""
        if path.startswith("/ai/"):
            # Identifier: prefer user id via Authorization header presence; else IP
            identifier = request.client.host if request.client else "unknown"
            # Window and limit
            window_seconds = 60
            limit = 60  # 60 requests/minute per identifier

            allowed = True
            remaining = None
            reset_epoch = None
            retry_after = None

            # Try Redis if available
            try:
                rc = cache.redis_client if cache else None
                if rc is not None:
                    key = f"ai_rl:{identifier}:{int(time.time() // window_seconds)}"
                    current = rc.incr(key)
                    if current == 1:
                        rc.expire(key, window_seconds)
                    ttl = rc.ttl(key)
                    allowed = current <= limit
                    remaining = max(0, limit - int(current))
                    reset_epoch = int(time.time()) + (ttl if ttl and ttl > 0 else window_seconds)
                    retry_after = max(1, ttl) if not allowed and ttl else None
                else:
                    raise RuntimeError("Redis unavailable")
            except Exception:
                # Fallback in-memory window counter
                now = int(time.time())
                bucket = now // window_seconds
                key = f"{identifier}:{bucket}"
                entry = _ai_rl_fallback_store.get(key)
                if not entry:
                    _ai_rl_fallback_store.clear()  # clear previous window buckets
                    entry = {"count": 0, "reset": (bucket + 1) * window_seconds}
                    _ai_rl_fallback_store[key] = entry
                entry["count"] += 1
                allowed = entry["count"] <= limit
                remaining = max(0, limit - int(entry["count"]))
                reset_epoch = entry["reset"]
                retry_after = max(1, reset_epoch - now) if not allowed else None

            if not allowed:
                resp = JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": retry_after,
                        "reset_time": reset_epoch,
                    },
                )
                resp.headers["X-RateLimit-Limit"] = str(limit)
                resp.headers["X-RateLimit-Remaining"] = str(remaining if remaining is not None else 0)
                resp.headers["X-RateLimit-Reset"] = str(reset_epoch or 0)
                if retry_after:
                    resp.headers["Retry-After"] = str(retry_after)
                return resp

            response = await call_next(request)
            # Add headers on success path too
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining if remaining is not None else 0)
            response.headers["X-RateLimit-Reset"] = str(reset_epoch or 0)
            return response
        else:
            return await call_next(request)
    except Exception:
        # If limiter fails, do not block request
        return await call_next(request)


# NOTE: request-level DB lock removed. We rely on finer-grained repository/session
# level locks to avoid deadlocks and to keep middleware lightweight. If tests
# still show concurrency errors, prefer adding per-session locks in `db.session` or
# repository helpers rather than a global request-level lock.


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


@app.exception_handler(Exception)
async def exception_handler(request: Request, exc: Exception):
    """Global exception handler to catch unexpected errors, log full traceback
    and return structured JSON instead of allowing the server process to crash.
    This helps E2E tests and dev environments by making failures visible
    and avoiding process exit on unhandled exceptions.
    """
    import traceback

    tb = "\n".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    logger.error(f"Unhandled exception for path={request.url.path}: {tb}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc),
            "trace": tb if bool(os.getenv("EXPOSE_TRACES", "false").lower() in ("1", "true")) else "<hidden>",
        },
    )


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

# Mount Socket.io for real-time collaboration (optional)
if _SOCKET_ENABLED and socketio is not None and sio is not None:
	socket_app = socketio.ASGIApp(
		sio,
		other_asgi_app=app,
		socketio_path='/socket.io'
	)
	# Replace the exported ASGI app so existing uvicorn target works
	app = socket_app
