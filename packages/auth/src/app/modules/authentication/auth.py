import logging
import time
from typing import Dict

from jose import JWTError, jwe, jwt
from passlib.hash import pbkdf2_sha256, bcrypt

from app.core.config import settings

logger = logging.getLogger(__name__)


class Auth:
    SECRET = settings.SECRET_KEY

    JWT_ALGORITHM = settings.JWT_ALGORITHM
    JWT_EXP = settings.JWT_EXP_TIME_MINUTES
    JWT_IAT = round(time.time())
    JWT_REFRESH_EXP_TIME_MINUTES = settings.JWT_REFRESH_EXP_TIME_MINUTES
    JWT_EMAIL_EXP_TIME_MINUTES = settings.JWT_EMAIL_EXP_TIME_MINUTES

    def hash_password(self, password):
        return pbkdf2_sha256.hash(password, salt=self.SECRET.encode("utf-8"))

    def verify_password(self, password, hashed_password):
        try:
            # First try pbkdf2_sha256 (current format)
            if pbkdf2_sha256.verify(password, hashed_password):
                return True
            
            # If that fails, try bcrypt (legacy format)
            if bcrypt.verify(password, hashed_password):
                return True
                
            return False
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

        # Temporarily return the JWT directly instead of JWE encryption
        # TODO: Fix JWE encryption when SECRET format is resolved
        return refresh_jwt
        
        # Original JWE encryption code (commented out for now)
        # try:
        #     # Convert hex string to bytes for A256GCM encryption
        #     secret_bytes = bytes.fromhex(self.SECRET)
        #     jwe_token = jwe.encrypt(
        #         refresh_jwt, secret_bytes, algorithm="dir", encryption="A256GCM"
        #     )
        #     return jwe_token
        # except Exception as e:
        #     logger.error(f"JWE encryption failed: {e}")
        #     # Fallback to plain JWT
        #     return refresh_jwt

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
            # Convert hex string to bytes for A256GCM decryption
            secret_bytes = bytes.fromhex(self.SECRET)
            decoded_token = jwe.decrypt(token, secret_bytes)
            return decoded_token
        except:
            logger.error("Error decoding JWE token")
            return {}

    def decodeRefreshJWT(self, token: str) -> dict:
        try:
            decoded_token = jwt.decode(
                token, self.SECRET, algorithms=[self.JWT_ALGORITHM]
            )
            expired = decoded_token["exp"] >= time.time()

            return decoded_token if expired else None
        except:
            logger.error("Error decoding JWT token")
            return {}

    def create_email_verification_token(self, email: str) -> str:
        """Create JWT token for email verification"""
        expire = round(time.time() + self.JWT_EMAIL_EXP_TIME_MINUTES * 60, 0)
        payload = {
            "sub": email,
            "exp": expire,
            "iat": self.JWT_IAT,
            "scope": "email_verification",
        }
        return jwt.encode(payload, self.SECRET, algorithm=self.JWT_ALGORITHM)

    def verify_email_token(self, token: str) -> str | None:
        """Verify email verification token and return email if valid"""
        try:
            payload = jwt.decode(token, self.SECRET, algorithms=[self.JWT_ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                logger.error("Email not found in token payload")
                return None
            if payload.get("scope") != "email_verification":
                logger.error("Invalid token scope")
                return None
            return email
        except JWTError as e:
            logger.error(f"JWT verification error: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None

    def create_password_reset_token(self, email: str) -> str:
        """Create JWT token for password reset"""
        expire = round(time.time() + self.JWT_EMAIL_EXP_TIME_MINUTES * 60, 0)
        payload = {
            "sub": email,
            "exp": expire,
            "iat": self.JWT_IAT,
            "scope": "password_reset",
        }
        return jwt.encode(payload, self.SECRET, algorithm=self.JWT_ALGORITHM)

    def verify_password_reset_token(self, token: str) -> str | None:
        """Verify password reset token and return email if valid"""
        try:
            payload = jwt.decode(token, self.SECRET, algorithms=[self.JWT_ALGORITHM])

            # Verify token scope
            if payload.get("scope") != "password_reset":
                logger.error("Invalid token scope")
                return None

            # Get email from payload
            email: str = payload.get("sub")
            if not email:
                logger.error("Email not found in token payload")
                return None

            return email

        except JWTError as e:
            logger.error(f"JWT verification error: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
