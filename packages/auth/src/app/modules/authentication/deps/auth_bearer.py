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
        # Only accept a fully valid JWT payload. Developer/test shortcuts are
        # disabled here to avoid accidental bypass of authentication in dev.
        if payload:
            isTokenValid = True
            return isTokenValid


TokenDep = Depends(JWTBearer())


class JWTCookie(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTCookie, self).__init__(auto_error=auto_error)
        self.payload = None

    async def __call__(self, request: Request):
        # SECURITY: Do not log full tokens, only presence check
        token = request.cookies.get("access_token")
        
        # Also check for c2c_access_token
        if not token:
            token = request.cookies.get("c2c_access_token")
        
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
        # SECURITY: Do not log tokens
        try:
            # First try regular JWT decoding
            self.payload = Auth().decodeJWT(jwtoken)
            # Check if payload is empty (demo token case)
            if not self.payload and jwtoken.startswith("demo_token_"):
                return self._handle_demo_token(jwtoken)
            return bool(self.payload)
        except Exception:
            # Fallback: Handle enterprise demo tokens
            if jwtoken and jwtoken.startswith("demo_token_"):
                return self._handle_demo_token(jwtoken)
            return False

    def _handle_demo_token(self, jwtoken: str) -> bool:
        """Handle demo token processing"""
        # SECURITY: Do not log tokens
        try:
            # Extract user ID from demo token format: demo_token_{user_id}_{timestamp}
            parts = jwtoken.split("_")
            if len(parts) >= 3:
                user_id = parts[2]  # Keep as string for UUID support
                # Create a mock payload for demo tokens
                self.payload = {
                    "user_id": user_id,
                    "email": "test@dataticon.com",  # Default for demo
                    "exp": 9999999999,  # Far future expiry
                }
                return True
        except Exception:
            pass
        return False


CookieTokenDep = Depends(JWTCookie())
