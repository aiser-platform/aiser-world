from fastapi import APIRouter, Request, Response, HTTPException  # type: ignore[reportMissingImports]

router = APIRouter(prefix="/api/v1/auth")


@router.post('/logout')
async def logout(request: Request, response: Response):
    # Read refresh token from cookie or body
    body = None
    try:
        body = await request.json()
    except Exception:
        body = {}

    refresh = request.cookies.get('refresh_token') or body.get('refresh_token')

    try:
        # Prefer canonical repository if available
        try:
            from app.modules.device_session.repository import DeviceSessionRepository  # type: ignore[reportMissingImports]
            repo = DeviceSessionRepository()
            if refresh:
                # deactivate by refresh token
                # repository may not have a direct method for refresh lookup; fall back below
                raise RuntimeError("no_repo_method")
            else:
                auth = request.headers.get('authorization') or request.headers.get('Authorization')
                if auth and auth.lower().startswith('bearer '):
                    token = auth.split(' ', 1)[1]
                    from app.auth_adapter import decode_jwt_wrapper
                    decoded = decode_jwt_wrapper(token)
                    user_id = decoded.get('user_id')
                    if user_id:
                        # deactivate all sessions for user
                        # repo.get_active_sessions is async; safe fallback to raw SQL below
                        raise RuntimeError("use_raw_sql")
        except Exception:
            # fallback raw SQL path
            from app.main import get_db_conn
            conn = get_db_conn()
            cur = conn.cursor()
            if refresh:
                cur.execute("UPDATE device_sessions SET is_active=FALSE WHERE refresh_token=%s", (refresh,))
            else:
                auth = request.headers.get('authorization') or request.headers.get('Authorization')
                if auth and auth.lower().startswith('bearer '):
                    token = auth.split(' ', 1)[1]
                    try:
                        from app.auth_adapter import decode_jwt_wrapper
                        decoded = decode_jwt_wrapper(token)
                        user_id = decoded.get('user_id')
                        if user_id:
                            cur.execute("UPDATE device_sessions SET is_active=FALSE WHERE user_id=%s", (user_id,))
                    except Exception:
                        pass

            conn.commit()
            cur.close()
            conn.close()
    except Exception:
        # ignore errors to avoid blocking logout
        pass

    # Clear cookie
    response.delete_cookie('refresh_token', path='/')
    return {"success": True}


