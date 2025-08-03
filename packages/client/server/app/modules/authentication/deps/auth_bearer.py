import typing as t

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.modules.authentication import Auth

get_bearer_token = HTTPBearer(auto_error=False)


known_tokens = set(["api_token_abc123"])


class UnauthorizedMessage(BaseModel):
    detail: str = "Bearer token missing or unknown"


async def get_token(
    auth: t.Optional[HTTPAuthorizationCredentials] = Depends(get_bearer_token),
) -> str:
    # Simulate a database query to find a known token
    if auth is None or (token := auth.credentials) not in known_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=UnauthorizedMessage().detail,
        )
    return token


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(
            JWTBearer, self
        ).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(
                    status_code=403, detail="Invalid authentication scheme."
                )
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(
                    status_code=403, detail="Invalid token or expired token."
                )
            return credentials.credentials
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code.")

    def verify_jwt(self, jwtoken: str) -> bool:
        isTokenValid: bool = False

        try:
            payload = Auth().decodeJWT(jwtoken)
        except:
            payload = None
        if payload:
            isTokenValid = True
        return isTokenValid


TokenDep = Depends(JWTBearer())


class JWTCookieBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTCookieBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        token = request.cookies.get("access_token")
        try:
            auth_header = await super(JWTCookieBearer, self).__call__(request)
            if auth_header and auth_header.credentials:
                token = auth_header.credentials
        except HTTPException:
            if not token:
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized.",
                )

        if not self.verify_jwt(token):
            raise HTTPException(
                status_code=403, detail="Invalid token or expired token."
            )
        return token

    def verify_jwt(self, jwtoken: str) -> bool:
        isTokenValid: bool = False

        try:
            payload = Auth().decodeJWT(jwtoken)
        except:
            payload = None
        if payload:
            isTokenValid = True
        return isTokenValid


CookieDep = Depends(JWTCookieBearer())


class JWTCookie(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTCookie, self).__init__(auto_error=auto_error)
        self.payload = None

    async def __call__(self, request: Request):
        token = request.cookies.get("access_token")
        try:
            auth_header = await super(JWTCookie, self).__call__(request)
            if auth_header and auth_header.credentials:
                token = auth_header.credentials
        except HTTPException:
            if not token:
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized.",
                )

        if not self.verify_jwt(token):
            raise HTTPException(
                status_code=403, detail="Invalid token or expired token."
            )

        request.state.jwt_payload = token
        return token

    def verify_jwt(self, jwtoken: str) -> bool:
        try:
            self.payload = Auth().decodeJWT(jwtoken)
            return bool(self.payload)
        except:
            return False


CookieTokenDep = Depends(JWTCookie())
