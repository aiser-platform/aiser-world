import logging
import time
from typing import Dict

from app.core.config import settings
from jose import jwe, jwt
from passlib.hash import pbkdf2_sha256

logger = logging.getLogger(__name__)


class Auth:
    SECRET = settings.SECRET_KEY

    JWT_ALGORITHM = settings.JWT_ALGORITHM
    JWT_EXP = settings.JWT_EXP_TIME_MINUTES
    JWT_IAT = round(time.time())
    JWT_REFRESH_EXP_TIME_MINUTES = settings.JWT_REFRESH_EXP_TIME_MINUTES

    def hash_password(self, password):
        return pbkdf2_sha256.hash(password)

    def verify_password(self, password, hashed_password):
        try:
            return pbkdf2_sha256.verify(password, hashed_password)
        except ValueError as e:
            # Handle invalid hash format
            logger.error(f"Invalid hash format: {e}")
            return False
        except Exception as e:
            # Handle any other unexpected errors
            logger.error(f"Password verification error: {e}")
            return False

    @classmethod
    def encodeJWT(cls, **kwargs) -> str:
        # access token
        exp = round(time.time() + cls.JWT_EXP * 60, 0)
        payload = {
            **kwargs,
            "exp": exp,
            "iat": cls.JWT_IAT,
            "scope": "access_token",
        }
        token = jwt.encode(payload, cls.SECRET, algorithm=cls.JWT_ALGORITHM)

        return token

    def encodeRefreshJWT(self, **kwargs) -> str:
        # refresh token
        refresh_exp = round(time.time() + self.JWT_REFRESH_EXP_TIME_MINUTES * 60, 0)
        refresh_payload = {
            **kwargs,
            "exp": refresh_exp,
            "iat": self.JWT_IAT,
            "scope": "refresh_token",
        }
        refresh_jwt = jwt.encode(
            refresh_payload,
            self.SECRET,
            algorithm=self.JWT_ALGORITHM,
        )

        jwe_token_bytes = jwe.encrypt(
            refresh_jwt, self.SECRET, algorithm="dir", encryption="A256GCM"
        )
        # Ensure string return type
        return jwe_token_bytes.decode("utf-8") if isinstance(jwe_token_bytes, (bytes, bytearray)) else jwe_token_bytes

    def signJWT(self, **kwargs) -> Dict[str, str]:
        access_token = self.encodeJWT(**kwargs)

        refresh_token = self.encodeRefreshJWT(**kwargs)

        return {
            "access_token": access_token,
            "expires_in": str(self.JWT_EXP * 60),
            "refresh_token": refresh_token,
        }

    def decodeJWT(self, token: str) -> dict | None:
        try:
            decoded_token = jwt.decode(
                token, self.SECRET, algorithms=[self.JWT_ALGORITHM]
            )
            return decoded_token if decoded_token["exp"] >= time.time() else None
        except Exception:
            return None

    def decodeRefreshJWE(self, token: str) -> str | None:
        try:
            decoded_bytes = jwe.decrypt(token, self.SECRET)
            return decoded_bytes.decode("utf-8") if isinstance(decoded_bytes, (bytes, bytearray)) else decoded_bytes
        except Exception:
            return None

    def decodeRefreshJWT(self, token: str) -> dict | None:
        try:
            decoded_token = jwt.decode(
                token, self.SECRET, algorithms=[self.JWT_ALGORITHM]
            )
            expired = decoded_token["exp"] >= time.time()

            return decoded_token if expired else None
        except Exception:
            return None
