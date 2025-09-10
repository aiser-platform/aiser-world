from fastapi import FastAPI, Request, Response, HTTPException  # type: ignore[reportMissingImports]

app = FastAPI(title="Aiser Auth Service (dev)")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post('/users/signout', response_model=None)
async def signout_user(request: Request, response: Response):
    """Sign out current user by clearing refresh cookie."
    try:
        response.delete_cookie('refresh_token', path='/')
    except Exception:
        pass
    return {"success": True}

from fastapi import FastAPI, Request, HTTPException  # type: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[reportMissingImports]
from pydantic import BaseModel  # type: ignore[reportMissingImports]
from typing import Optional, Any, Dict, cast
import os
import secrets
import psycopg2  # type: ignore[reportMissingImports]
from psycopg2.extras import RealDictCursor  # type: ignore[reportMissingImports]

app = FastAPI(title="Aiser Auth Service (dev)")

# Adapter to reuse canonical auth implementation
from app.auth_adapter import (
    sign_jwt_wrapper,
    decode_jwt_wrapper,
    verify_password_wrapper,
    hash_password_wrapper,
)

# Try to import canonical services from packages/auth
try:
    # Ensure packages/auth/src is on sys.path via auth_adapter; then import
    from app.modules.user.services import UserService  # type: ignore[reportMissingImports]
    from app.core.database import get_db as auth_get_db  # type: ignore[reportMissingImports]
    from app.modules.device_session.schemas import DeviceInfo as AuthDeviceInfo  # type: ignore[reportMissingImports]
except Exception:
    UserService = None
    auth_get_db = None
    AuthDeviceInfo = None

# Add CORS for local frontend (allow credentials for cookie session flows)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/version")
async def version():
    return {"service": "auth-service", "version": "dev"}


class SignInRequest(BaseModel):
    identifier: str
    password: str


class EnterpriseSignInRequest(BaseModel):
    # Accept either `identifier` (legacy) or `username` (frontend) for enterprise login
    identifier: Optional[str] = None
    username: Optional[str] = None
    password: str


def get_db_conn():
    host = os.environ.get('POSTGRES_SERVER', 'postgres')
    user = os.environ.get('POSTGRES_USER', 'aiser')
    password = os.environ.get('POSTGRES_PASSWORD', 'aiser_password')
    db = os.environ.get('POSTGRES_DB', 'aiser_world')
    return psycopg2.connect(host=host, user=user, password=password, dbname=db, cursor_factory=RealDictCursor)




from fastapi import Response  # type: ignore[reportMissingImports]


@app.post('/users/signin')
async def signin(payload: SignInRequest, request: Request, response: Response):
    identifier = payload.identifier

    # Prefer canonical UserService when available
    if UserService and auth_get_db and AuthDeviceInfo:
        try:
            db = next(auth_get_db())
            service = UserService()
            device_info = AuthDeviceInfo(
                device_type=request.headers.get("sec-ch-ua-platform", "unknown"),
                device_name=request.headers.get("sec-ch-ua", "unknown"),
                user_agent=request.headers.get("user-agent", "unknown"),
                ip_address=request.client.host,
            )
            sign_in_response = await service.signin(payload, device_info, db)
            # set refresh cookie if present
            refresh = None
            if isinstance(sign_in_response, dict):
                refresh = sign_in_response.get('refresh_token')
            else:
                refresh = getattr(sign_in_response, 'refresh_token', None)
            if refresh:
                cast(Any, response).set_cookie(
                    key='refresh_token',
                    value=refresh,
                    httponly=True,
                    secure=os.environ.get('ENVIRONMENT', 'development') == 'production',
                    samesite='lax',
                    path='/',
                )
            return sign_in_response if isinstance(sign_in_response, dict) else sign_in_response.__dict__
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auth backend error: {e}")

    # Fallback legacy path (use SQLAlchemy from canonical auth package when available, else raw SQL)
    try:
        # Try canonical SQLAlchemy DB and models first
        try:
            from app.core.database import get_db as auth_get_db_local  # type: ignore[reportMissingImports]
            from app.modules.user.models import User as AuthUser  # type: ignore[reportMissingImports]
            db = next(auth_get_db_local())
            # Query by email or username
            from sqlalchemy import or_  # type: ignore[reportMissingImports]
            user_obj = db.query(AuthUser).filter(
                or_(AuthUser.email == identifier, AuthUser.username == identifier)
            ).first()
            if not user_obj:
                raise HTTPException(status_code=401, detail="Invalid credentials")

            stored_password = getattr(user_obj, 'password', None)
            if stored_password is None or not verify_password_wrapper(payload.password, stored_password):
                # if stored password was plaintext, migrate to hashed
                is_plain = not (isinstance(stored_password, str) and stored_password.startswith("$"))
                if is_plain and payload.password == stored_password:
                    try:
                        new_hashed = hash_password_wrapper(payload.password)
                        user_obj.password = new_hashed
                        db.add(user_obj)
                        db.commit()
                    except Exception:
                        pass
                else:
                    raise HTTPException(status_code=401, detail="Invalid credentials")

            user_id = user_obj.id
            user_email = user_obj.email
            user_username = user_obj.username

            tokens = sign_jwt_wrapper(user_id=user_id, email=user_email)
            refresh_token = tokens.get('refresh_token') if tokens.get('refresh_token') else None
            if refresh_token:
                try:
                    from app.modules.device_session.models import DeviceSession as AuthDeviceSession  # type: ignore[reportMissingImports]
                    ds = AuthDeviceSession(
                        user_id=user_id,
                        device_id=secrets.token_urlsafe(16),
                        device_type='browser',
                        device_name='web',
                        ip_address=None,
                        user_agent=None,
                        refresh_token=refresh_token,
                        is_active=True,
                    )
                    db.add(ds)
                    db.commit()
                except Exception:
                    # fallback to raw SQL insert
                    conn2 = get_db_conn()
                    cur2 = conn2.cursor()
                    device_id = secrets.token_urlsafe(16)
                    cur2.execute(
                        "INSERT INTO device_sessions (user_id, device_id, device_type, device_name, ip_address, user_agent, refresh_token, is_active, last_active) VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE,NOW())",
                        (user_id, device_id, 'browser', 'web', None, None, refresh_token),
                    )
                    conn2.commit()
                    cur2.close()
                    conn2.close()

                cast(Any, response).set_cookie(
                    key="refresh_token",
                    value=refresh_token,
                    httponly=True,
                    secure=os.environ.get('ENVIRONMENT', 'development') == 'production',
                    samesite="lax",
                    path="/",
                )

            user_obj = {"id": user_id, "email": user_email, "username": user_username}
            result = {"access_token": tokens.get('access_token') or tokens.get('access_token', ''), "user": user_obj}
            return result
        except HTTPException:
            raise
        except Exception:
            # fallthrough to raw SQL fallback below
            pass

        # Raw SQL fallback
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT id,email,username,password FROM users WHERE email=%s OR username=%s LIMIT 1", (identifier, identifier))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Normalize row into explicit variables for type safety
        if isinstance(row, dict):
            row_id = cast(int, row.get('id'))
            row_email = cast(str, row.get('email'))
            row_username = cast(str, row.get('username'))
            row_password = cast(str, row.get('password')) if isinstance(row.get('password'), str) else row.get('password')
        else:
            row_id = cast(int, row[0])
            row_email = cast(str, row[1])
            row_username = cast(str, row[2])
            row_password = row[3]

        user_password = row_password

        stored_password_str: str = cast(str, user_password) if isinstance(user_password, str) else ""
        if not verify_password_wrapper(payload.password, stored_password_str):
            is_plain = not (isinstance(user_password, str) and user_password.startswith("$"))
            if is_plain and payload.password == user_password:
                try:
                    new_hashed = hash_password_wrapper(payload.password)
                    conn_upd = get_db_conn()
                    cur_upd = conn_upd.cursor()
                    user_id = row_id
                    cur_upd.execute("UPDATE users SET password=%s WHERE id=%s", (new_hashed, user_id))
                    conn_upd.commit()
                    cur_upd.close()
                    conn_upd.close()
                except Exception:
                    pass
            else:
                raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = row_id
        user_email = row_email
        user_username = row_username

        tokens = sign_jwt_wrapper(user_id=user_id, email=user_email)
        refresh_token = tokens.get('refresh_token') if tokens.get('refresh_token') else None
        if refresh_token:
            try:
                conn2 = get_db_conn()
                cur2 = conn2.cursor()
                device_id = secrets.token_urlsafe(16)
                cur2.execute(
                    "INSERT INTO device_sessions (user_id, device_id, device_type, device_name, ip_address, user_agent, refresh_token, is_active, last_active) VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE,NOW())",
                    (user_id, device_id, 'browser', 'web', None, None, refresh_token),
                )
                conn2.commit()
                cur2.close()
                conn2.close()
                cast(Any, response).set_cookie(
                    key="refresh_token",
                    value=refresh_token,
                    httponly=True,
                    secure=os.environ.get('ENVIRONMENT', 'development') == 'production',
                    samesite="lax",
                    path="/",
                )
            except Exception:
                pass

        user_obj = {"id": user_id, "email": user_email, "username": user_username}
        result = {"access_token": tokens.get('access_token') or tokens.get('access_token', ''), "user": user_obj}
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Auth backend error")


@app.post('/api/v1/enterprise/auth/login')
async def enterprise_login(payload: EnterpriseSignInRequest, request: Request, response: Response):
    # Frontend may send { username, password } while the signin endpoint expects { identifier, password }.
    # Normalize to SignInRequest and reuse signin logic for dev convenience.
    identifier = payload.identifier or payload.username
    if not identifier:
        raise HTTPException(status_code=422, detail="Missing username or identifier")

    signin_payload = SignInRequest(identifier=identifier, password=payload.password)
    return await signin(signin_payload, request, response)


# Explicit CORS preflight handler for enterprise login
@app.options('/api/v1/enterprise/auth/login')
async def options_enterprise_login():
    return Response(status_code=200)


class SignUpRequest(BaseModel):
    email: str
    username: str
    password: str


@app.post('/users/signup')
async def signup(payload: SignUpRequest, request: Request, response: Response):
    # Prefer canonical UserService when available
    if UserService and auth_get_db:
        try:
            db = next(auth_get_db())
            service = UserService()
            # create_user expects UserCreate (pydantic) — delegate to service.signup style
            sign_up_response = service.signup(payload)
            return sign_up_response
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Fallback: try to use SQLAlchemy DB models if available, otherwise raw SQL
    try:
        try:
            from app.core.database import get_db as auth_get_db_local  # type: ignore[reportMissingImports]
            from app.modules.user.models import User as AuthUser  # type: ignore[reportMissingImports]
            db = next(auth_get_db_local())
            # Check existing by email or username
            from sqlalchemy import or_  # type: ignore[reportMissingImports]
            exists = db.query(AuthUser).filter(
                or_(AuthUser.email == payload.email, AuthUser.username == payload.username)
            ).first()
            if exists:
                raise HTTPException(status_code=400, detail="User already exists")

            hashed = hash_password_wrapper(payload.password)
            new_user = AuthUser(email=payload.email, username=payload.username, password=hashed)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return {"user": {"id": new_user.id, "email": new_user.email, "username": new_user.username}}
        except HTTPException:
            raise
        except Exception:
            # fallback to raw SQL
            conn = get_db_conn()
            cur = conn.cursor()
            # Check existing
            cur.execute("SELECT id FROM users WHERE email=%s OR username=%s", (payload.email, payload.username))
            if cur.fetchone():
                cur.close()
                conn.close()
                raise HTTPException(status_code=400, detail="User already exists")
            # Hash password before storing
            hashed = hash_password_wrapper(payload.password)
            # Insert into the users table - use `password` column used by init-db.sql
            cur.execute("INSERT INTO users (email, username, password, created_at) VALUES (%s,%s,%s,NOW()) RETURNING id", (payload.email, payload.username, hashed))
            row = cur.fetchone()
            if not row:
                cur.close()
                conn.close()
                raise HTTPException(status_code=500, detail="Failed to create user")
            # RealDictCursor returns a dict
            if isinstance(row, dict):
                new_id = cast(int, row.get('id'))
            else:
                new_id = cast(int, row[0])
            conn.commit()
            cur.close()
            conn.close()
            return {"user": {"id": new_id, "email": payload.email, "username": payload.username}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Signup failed")


@app.post('/verify-email')
async def verify_email(payload: dict):
    """Delegate email verification to canonical UserService when available."""
    if UserService and auth_get_db:
        try:
            db = next(auth_get_db())
            service = UserService()
            return await service.verify_email(payload)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail='Not implemented')


@app.post('/resend-verification')
async def resend_verification(payload: dict):
    if UserService and auth_get_db:
        try:
            db = next(auth_get_db())
            service = UserService()
            return await service.resend_verification_email(payload)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail='Not implemented')


@app.post('/forgot-password')
async def forgot_password(payload: dict):
    if UserService and auth_get_db:
        try:
            db = next(auth_get_db())
            service = UserService()
            return await service.forgot_password(payload)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail='Not implemented')


@app.post('/reset-password')
async def reset_password(payload: dict):
    if UserService and auth_get_db:
        try:
            db = next(auth_get_db())
            service = UserService()
            return await service.reset_password(payload)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail='Not implemented')


@app.post('/users/signout')
async def signout_user(payload: Optional[dict] = None, request: Optional[Request] = None, response: Optional[Response] = None):
    """Delegate signout to canonical UserService if available, otherwise fallback to logout logic.
    """
    try:
        # Prefer canonical service
        if UserService and auth_get_db:
            db = next(auth_get_db())
            service = UserService()
            # service.signout expects a token or similar; try header first
            token = None
            if request:
                auth = request.headers.get('authorization') or request.headers.get('Authorization')
                if auth and auth.lower().startswith('bearer '):
                    token = auth.split(' ', 1)[1]
            if not token and payload:
                token = payload.get('token') or payload.get('refresh_token')
            return await service.signout(token)

        # Fallback: attempt to call logout handler
        # Reuse existing logout logic by calling the logout route
        from fastapi.testclient import TestClient  # type: ignore[reportMissingImports]
        client = TestClient(app)
        body = payload or {}
        r = client.post('/api/v1/auth/logout', json=body)
        return r.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get('/api/v1/enterprise/auth/me')
async def enterprise_me(request: Request):
    # Check Authorization header for Bearer token
    auth = request.headers.get('authorization') or request.headers.get('Authorization')
    if not auth or not auth.lower().startswith('bearer '):
        return {"detail": "Unauthorized"}, 401
    token = auth.split(' ', 1)[1]
    decoded = decode_jwt_wrapper(token)
    if not decoded:
        return {"detail": "Invalid or expired token"}, 401
    # If canonical UserService available, use it
    user_id = decoded.get('user_id')
    if UserService and auth_get_db:
        try:
            db = next(auth_get_db())
            service = UserService()
            user = service.get_user(user_id, db)
            if not user:
                return {"detail": "User not found"}, 404
            # UserResponse or dict
            return user if isinstance(user, dict) else getattr(user, '__dict__', user)
        except Exception:
            return {"detail": "User lookup failed"}, 500

    # Fallback raw DB lookup
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT id,email,username FROM users WHERE id=%s LIMIT 1", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {"detail": "User not found"}, 404
        if isinstance(row, dict):
            rd_id = cast(int, row.get('id'))
            rd_email = cast(str, row.get('email'))
            rd_username = cast(str, row.get('username'))
        else:
            rd_id = cast(int, row[0])
            rd_email = cast(str, row[1])
            rd_username = cast(str, row[2])
        return {"id": rd_id, "email": rd_email, "username": rd_username}
    except Exception:
        return {"detail": "User lookup failed"}, 500


@app.get('/users/me')
async def users_me(request: Request):
    # Same behavior as enterprise/me for dev
    return await enterprise_me(request)


from app.routes.enterprise_oidc import router as enterprise_oidc_router
from app.services.user_service import get_user_roles_from_request
from app.routes.stripe import router as stripe_router
from app.routes.tokens import router as tokens_router
from app.routes.logout import router as logout_router

app.include_router(enterprise_oidc_router)
app.include_router(stripe_router)
app.include_router(tokens_router)
app.include_router(logout_router)


@app.get('/admin/health-check')
async def admin_health_check(request: Request):
    # Example admin route protected by RBAC
    roles = get_user_roles_from_request(request)
    if 'admin' not in roles:
        raise HTTPException(status_code=403, detail='Forbidden')
    return {"status": "ok", "admin": True}


@app.post('/organizations/{org_id}/upgrade')
async def upgrade_organization(org_id: int, payload: dict):
    """Placeholder upgrade handler: creates or updates a subscription record.

    Expected payload: { "plan_type": "pro|team|enterprise", "payment_method_id": "pm_..." }
    This is a simple dev implementation. In production, integrate with billing service (Stripe)
    and the canonical subscription repository.
    """
    plan_type = payload.get('plan_type')
    payment_method_id = payload.get('payment_method_id')
    if not plan_type:
        raise HTTPException(status_code=422, detail='Missing plan_type')

    # Prefer canonical PricingService when available
    try:
        if auth_get_db:
            try:
                from app.modules.organizations.services import PricingService  # type: ignore[reportMissingImports]
                db = next(auth_get_db())
                pricing = PricingService()
                # delegate to pricing service which performs checks and creates subscription
                subscription = pricing.upgrade_organization_plan(org_id, plan_type, 1, db)
                return subscription if isinstance(subscription, dict) else getattr(subscription, '__dict__', subscription)
            except Exception:
                # fallback to raw SQL below
                pass

        # Fallback raw SQL
        try:
            conn = get_db_conn()
            cur = conn.cursor()

            # Check existing subscription
            cur.execute("SELECT id FROM subscriptions WHERE organization_id=%s LIMIT 1", (org_id,))
            row = cur.fetchone()
            import uuid
            if row:
                sub_id = row[0]
                cur.execute(
                    "UPDATE subscriptions SET plan_type=%s, status=%s, billing_cycle=%s, updated_at=NOW() WHERE id=%s",
                    (plan_type, 'active', 'monthly', sub_id)
                )
            else:
                sub_id = str(uuid.uuid4())
                cur.execute(
                    "INSERT INTO subscriptions (id, organization_id, plan_type, status, billing_cycle, created_at, updated_at) VALUES (%s,%s,%s,%s,%s,NOW(),NOW())",
                    (sub_id, org_id, plan_type, 'active', 'monthly')
                )

            conn.commit()
            cur.close()
            conn.close()

            return {"success": True, "subscription_id": sub_id, "plan_type": plan_type}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upgrade: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upgrade: {str(e)}")



