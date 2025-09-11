from typing import Optional

from fastapi import APIRouter, Request, Response, HTTPException  # type: ignore[reportMissingImports]
from pydantic import BaseModel  # type: ignore[reportMissingImports]

from app.modules.user.services import UserService
from app.modules.authentication.auth import Auth


router = APIRouter()


class EnterpriseSignInRequest(BaseModel):
    identifier: Optional[str] = None
    username: Optional[str] = None
    password: str


@router.options("/api/v1/enterprise/auth/login")
async def options_enterprise_login():
    return Response(status_code=200)


@router.post("/api/v1/enterprise/auth/login")
async def enterprise_login(payload: EnterpriseSignInRequest, response: Response):
    """Enterprise-style login that accepts { username, password } or { identifier, password }.
    Reuses backend auth logic and returns access token + user.
    """
    username = payload.identifier or payload.username
    if not username:
        raise HTTPException(status_code=422, detail="Missing username or identifier")

    service = UserService()
    # Authenticate via service
    user = await service.authenticate(username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Issue tokens (also set cookies for compatibility)
    auth = Auth()
    tokens = auth.signJWT(user_id=str(user.id), email=user.email)
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=False,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {
        "access_token": tokens["access_token"],
        "user": {"id": user.id, "email": user.email, "username": user.username},
    }


@router.get("/api/v1/enterprise/auth/me")
async def enterprise_me(request: Request):
    auth = Auth()
    bearer = request.headers.get("authorization") or request.headers.get(
        "Authorization"
    )
    if not bearer or not bearer.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = bearer.split(" ", 1)[1]
    decoded = auth.decodeJWT(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    service = UserService()
    user = await service.get_user(decoded["user_id"])  # returns UserResponse
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
