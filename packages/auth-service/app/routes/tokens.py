from fastapi import APIRouter, HTTPException  # type: ignore[reportMissingImports]
from pydantic import BaseModel  # type: ignore[reportMissingImports]
from typing import Optional
import uuid
import secrets

from app.auth_adapter import sign_jwt_wrapper, decode_jwt_wrapper

router = APIRouter(prefix="/api/v1/auth")


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


@router.post('/refresh')
async def refresh_token(req: RefreshRequest):
    # For now, decode refresh token and issue new access token
    # If refresh token not in body, try cookie
    token = req.refresh_token
    if not token:
        # FastAPI Request cookies not available here; expect client to send token in body or cookie via header
        raise HTTPException(status_code=401, detail='Missing refresh token')

    decoded = decode_jwt_wrapper(token)
    if not decoded:
        raise HTTPException(status_code=401, detail='Invalid refresh token')

    user_id = decoded.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail='Invalid token payload')

    # Validate refresh token exists in device_sessions
    try:
        # Prefer canonical DeviceSession repository / SQLAlchemy models when available
        try:
            from app.modules.device_session.repository import DeviceSessionRepository  # type: ignore[reportMissingImports]
            repo = DeviceSessionRepository()
            # repo methods are async in the canonical package; try to use the sync DB session instead
            raise RuntimeError("use_sync_db")
        except Exception:
            # use SQLAlchemy session from canonical auth package if available
            try:
                from app.core.database import get_db as auth_get_db  # type: ignore[reportMissingImports]
                from app.modules.device_session.models import DeviceSession  # type: ignore[reportMissingImports]
                db = next(auth_get_db())
                session_row = db.query(DeviceSession).filter(
                    DeviceSession.refresh_token == token,
                    DeviceSession.user_id == user_id,
                    DeviceSession.is_active == True,
                ).first()
                if not session_row:
                    raise HTTPException(status_code=401, detail='Refresh token not found')

                # Rotate refresh token
                new_refresh = secrets.token_urlsafe(48)
                session_row.refresh_token = new_refresh
                try:
                    session_row.last_active = None
                except Exception:
                    pass
                db.commit()
            except HTTPException:
                raise
            except Exception:
                # fallback to raw DB via main.get_db_conn
                # Try canonical DB/models first
                try:
                    from app.core.database import get_db as auth_get_db_local  # type: ignore[reportMissingImports]
                    from app.modules.device_session.models import DeviceSession as AuthDeviceSession  # type: ignore[reportMissingImports]
                    db = next(auth_get_db_local())
                    session_row = db.query(AuthDeviceSession).filter(
                        AuthDeviceSession.refresh_token == token,
                        AuthDeviceSession.user_id == user_id,
                        AuthDeviceSession.is_active == True,
                    ).first()
                    if not session_row:
                        raise HTTPException(status_code=401, detail='Refresh token not found')

                    new_refresh = secrets.token_urlsafe(48)
                    session_row.refresh_token = new_refresh
                    try:
                        session_row.last_active = None
                    except Exception:
                        pass
                    db.commit()
                except HTTPException:
                    raise
                except Exception:
                    # fallback to raw DB
                    from app.main import get_db_conn as main_get_db_conn
                    conn = main_get_db_conn()
                    cur = conn.cursor()
                    cur.execute("SELECT id FROM device_sessions WHERE refresh_token=%s AND user_id=%s AND is_active=TRUE", (token, user_id))
                    row = cur.fetchone()
                    if not row:
                        cur.close()
                        conn.close()
                        raise HTTPException(status_code=401, detail='Refresh token not found')

                    # Rotate refresh token: generate new token, update DB row
                    new_refresh = secrets.token_urlsafe(48)
                    cur.execute("UPDATE device_sessions SET refresh_token=%s, last_active=NOW() WHERE id=%s", (new_refresh, row[0]))
                    conn.commit()
                    cur.close()
                    conn.close()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail='Failed to validate refresh token')

    # Issue new access token and return new refresh via cookie
    tokens = sign_jwt_wrapper(user_id=user_id)
    response = {"access_token": tokens.get('access_token'), "expires_in": tokens.get('expires_in')}
    # include rotation return value
    response['rotated_refresh_token'] = new_refresh
    return response



