from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Dict
from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # API Settings
    APP_HOST: str = os.getenv("APP_HOST", "localhost")
    APP_PORT: int = os.getenv("APP_PORT", 8000)
    APP_URL: str = os.getenv("APP_URL", f"http://{APP_HOST}:{APP_PORT}")

    APP_NAME: str = os.getenv("APP_NAME", "AISER")
    APP_DESCRIPTION: str = os.getenv("APP_DESCRIPTION", "AISER API Documentation")

    APP_VERSION: str = os.getenv("APP_VERSION", "0.0.1")
    APP_CONTACT: Dict[str, str] = {
        "name": "Dataticon Team",
        "email": "support@dataticon.com",
    }
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

    # Database Settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "aiser")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "aiser_password")
    # Prefer the dev compose service name used in local setup. If the
    # environment provides the generic hostname 'postgres' (common in some
    # compose files), map it to the local test service name used in this
    # developer environment to avoid DNS resolution failures inside the
    # container network.
    _env_pg = os.getenv("POSTGRES_SERVER")
    if _env_pg:
        POSTGRES_SERVER: str = _env_pg if _env_pg != 'postgres' else os.getenv('POSTGRES_SERVER_ALIAS', 'aiser-postgres-test')
    else:
        POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "aiser-postgres-test")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "aiser_world")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def SYNC_DATABASE_URI(self) -> str:
        # Provide a sync URI alias used by migration helpers
        return self.SQLALCHEMY_DATABASE_URI

    # Security Settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "9e25a2588fcee7d21ea15fb1a63d5135"
    )  # openssl rand -hex 16
    JWT_ALGORITHM: str = "HS256"
    JWT_EXP_TIME_MINUTES: int = 60
    JWT_REFRESH_EXP_TIME_MINUTES: int = 7 * 24 * 60
    JWT_EMAIL_EXP_TIME_MINUTES: int = 24 * 60

    # Cookie Settings
    COOKIE_DOMAIN: str = os.getenv("COOKIE_DOMAIN", "localhost")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "False").lower() == "true"
    COOKIE_HTTPONLY: bool = os.getenv("COOKIE_HTTPONLY", "True").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    # Email Settings
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = os.getenv("SMTP_PORT", 587)
    SMTP_SENDER: str = os.getenv("SMTP_SENDER", "Hello AISER")

    # Use pydantic v2 model_config to allow ignoring extra environment
    # variables that may be present in developer machines (e.g. cloud
    # provider secrets). This prevents `extra_forbidden` validation
    # errors when running tests or local tools.
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

__all__ = ["settings"]
