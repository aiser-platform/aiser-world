import time
import jwt
from typing import Dict, Any
from app.config import AuthConfig


def sign_jwt(payload: Dict[str, Any], expires_in: int = 3600) -> Dict[str, Any]:
    now = int(time.time())
    claims = {**payload, 'iat': now, 'exp': now + expires_in}
    token = jwt.encode(claims, AuthConfig.JWT_SECRET, algorithm='HS256')
    return {'access_token': token, 'expires_in': expires_in}


def decode_jwt(token: str) -> Dict[str, Any]:
    try:
        decoded = jwt.decode(token, AuthConfig.JWT_SECRET, algorithms=['HS256'])
        return decoded
    except jwt.ExpiredSignatureError:
        return {}
    except Exception:
        return {}


