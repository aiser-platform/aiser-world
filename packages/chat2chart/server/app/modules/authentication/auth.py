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
    def encodeJWT(self, **kwargs) -> str:
        # access token
        exp = round(time.time() + self.JWT_EXP * 60, 0)
        payload = {
            **kwargs,
            "exp": exp,
            "iat": self.JWT_IAT,
            "scope": "access_token",
        }
        token = jwt.encode(payload, self.SECRET, algorithm=self.JWT_ALGORITHM)

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

        jwe_token = jwe.encrypt(
            refresh_jwt, self.SECRET, algorithm="dir", encryption="A256GCM"
        )

        return jwe_token

    def signJWT(self, **kwargs) -> Dict[str, str]:
        access_token = self.encodeJWT(**kwargs)

        refresh_token = self.encodeRefreshJWT(**kwargs)

        return {
            "access_token": access_token,
            "expires_in": self.JWT_EXP * 60,
            "refresh_token": refresh_token,
        }

    def decodeJWT(self, token: str) -> dict:
        try:
            decoded_token = jwt.decode(
                token, self.SECRET, algorithms=[self.JWT_ALGORITHM]
            )
            return decoded_token if decoded_token["exp"] >= time.time() else None
        except:
            return {}

    def decodeRefreshJWE(self, token: str) -> dict:
        try:
            decoded_token = jwe.decrypt(token, self.SECRET)
            return decoded_token
        except:
            return {}

    def decodeRefreshJWT(self, token: str) -> dict:
        try:
            decoded_token = jwt.decode(
                token, self.SECRET, algorithms=[self.JWT_ALGORITHM]
            )
            expired = decoded_token["exp"] >= time.time()

            return decoded_token if expired else None
        except:
            return {}
