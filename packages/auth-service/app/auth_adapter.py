"""Adapter to reuse canonical Auth implementation from `packages/auth`.

This module imports the existing Auth class and exposes the methods used by
the auth-service (signJWT, decodeJWT, password hashing, etc.)
"""
import os
import sys

# Add packages/auth/src to sys.path so we can import the canonical Auth implementation
_here = os.path.dirname(__file__)
_auth_src = os.path.abspath(os.path.join(_here, '..', '..', 'auth', 'src'))
if os.path.isdir(_auth_src) and _auth_src not in sys.path:
    sys.path.insert(0, _auth_src)

try:
    # Import canonical Auth: app.modules.authentication.auth.Auth
    from app.modules.authentication.auth import Auth as CanonicalAuth
except Exception:
    # Fallback minimal shim
    class CanonicalAuth:
        def signJWT(self, **kwargs):
            from app.auth_jwt import sign_jwt
            return sign_jwt(kwargs)

        def decodeJWT(self, token: str):
            from app.auth_jwt import decode_jwt
            return decode_jwt(token)

        def verify_password(self, plain: str, hashed: str) -> bool:
            # naive fallback: compare plain to hashed (only for dev)
            return plain == hashed

        def hash_password(self, password: str) -> str:
            return password


auth = CanonicalAuth()


def sign_jwt_wrapper(**kwargs):
    return auth.signJWT(**kwargs)


def decode_jwt_wrapper(token: str):
    return auth.decodeJWT(token)


def verify_password_wrapper(plain: str, hashed: str) -> bool:
    return auth.verify_password(plain, hashed)


def hash_password_wrapper(password: str) -> str:
    return auth.hash_password(password)


