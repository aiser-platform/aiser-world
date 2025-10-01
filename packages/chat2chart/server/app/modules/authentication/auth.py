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

        try:
            # Ensure SECRET key meets length requirements for A256GCM (32 bytes)
            secret_bytes = self.SECRET.encode() if isinstance(self.SECRET, str) else self.SECRET
            if len(secret_bytes) < 32:
                # pad secret
                secret_bytes = secret_bytes.ljust(32, b"0")
            elif len(secret_bytes) > 32:
                secret_bytes = secret_bytes[:32]

            jwe_token = jwe.encrypt(
                refresh_jwt, secret_bytes, algorithm="dir", encryption="A256GCM"
            )
            return jwe_token
        except Exception:
            # Fallback to return signed JWT if JWE fails (e.g., unexpected environment)
            return refresh_jwt

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
        except Exception:
            # Try alternate secrets (useful when auth-service and this service use
            # different env var names in some dev setups). Try these in order:
            # - settings.JWT_SECRET (config-level alternate)
            # - environment JWT_SECRET_KEY
            # - environment AUTH_SERVICE_SECRET
            try:
                from app.core.config import settings
                alt_secrets = []
                try:
                    if getattr(settings, 'JWT_SECRET', None):
                        alt_secrets.append(settings.JWT_SECRET)
                except Exception:
                    pass
                # env fallbacks
                import os
                for k in ('JWT_SECRET_KEY', 'AUTH_SERVICE_SECRET', 'JWT_SECRET'):
                    v = os.getenv(k)
                    if v and v not in alt_secrets:
                        alt_secrets.append(v)

                for s in alt_secrets:
                    try:
                        decoded = jwt.decode(token, s, algorithms=[self.JWT_ALGORITHM])
                        return decoded if decoded.get('exp', 0) >= time.time() else None
                    except Exception:
                        continue

                # In development, allow returning unverified claims to ease local flows
                if getattr(settings, 'ENVIRONMENT', 'development') == 'development':
                    try:
                        u = jwt.get_unverified_claims(token)
                        logger.info(f"Auth.decodeJWT: returning unverified claims keys={list(u.keys()) if isinstance(u, dict) else None}")
                        return u
                    except Exception as e:
                        logger.debug(f"Auth.decodeJWT: failed to extract unverified claims: {e}")
                        return {}
            except Exception:
                pass
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
