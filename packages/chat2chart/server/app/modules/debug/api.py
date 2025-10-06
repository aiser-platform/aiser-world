from fastapi import APIRouter, Request
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for last client log payload (dev only)
_last_client_log: dict | None = None


@router.post("/client-error")
async def client_error(request: Request):
    """Receive client-side JS errors for debugging during development."""
    try:
        payload = await request.json()
    except Exception:
        payload = {"error": "invalid json"}
    # store last payload in memory for easier retrieval during dev
    global _last_client_log
    try:
        _last_client_log = payload
    except Exception:
        _last_client_log = {"error": "failed to store payload"}
    logger.error("ClientError: %s", payload)
    return {"success": True}


@router.get("/client-error/last")
async def client_error_last():
    """Return the last received client log payload (dev only)."""
    return {"last": _last_client_log}


