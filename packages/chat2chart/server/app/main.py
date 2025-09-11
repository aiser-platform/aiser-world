import logging

from app.core.api import api_router
from app.core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
