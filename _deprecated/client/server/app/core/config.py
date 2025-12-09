from pydantic_settings import BaseSettings
from typing import Dict
from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # Environment Settings
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

    # API Settings
    APP_HOST: str = os.getenv("APP_HOST", "127.0.0.1")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    APP_URL: str = os.getenv("APP_URL", f"http://{APP_HOST}:{APP_PORT}")
    APP_NAME: str = os.getenv("APP_NAME", "AISER")
    APP_DESCRIPTION: str = os.getenv("APP_DESCRIPTION", "AI Service for Everyone")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")
    APP_CONTACT: Dict[str, str] = {
        "name": "Kimseng Duong",
        "email": "duong.kim.seng@gmail.com",
    }

    # Database Settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "aiser_client")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Security Settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "9e25a2588fcee7d21ea15fb1a63d5135"
    )  # openssl rand -hex 16
    JWT_ALGORITHM: str = "HS256"
    JWT_EXP_TIME_MINUTES: int = 60
    JWT_REFRESH_EXP_TIME_MINUTES: int = 7 * 24 * 60

    # File Upload Settings
    UPLOAD_TYPE: str = os.getenv("UPLOAD_TYPE", "local")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_UPLOAD_SIZE: int = int(
        os.getenv("MAX_UPLOAD_SIZE", str(10485760))  # 10 * 1024 * 1024
    )  # 10MB

    # AWS Settings
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")

    # Azure Settings
    AZURE_STORAGE_ACCOUNT_NAME: str = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "")
    AZURE_STORAGE_ACCOUNT_KEY: str = os.getenv("AZURE_STORAGE_ACCOUNT_KEY", "")
    AZURE_STORAGE_CONTAINER_NAME: str = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "")

    # Cookie Settings
    COOKIE_DOMAIN: str = os.getenv("COOKIE_DOMAIN", "localhost")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "False").lower() == "true"
    COOKIE_HTTPONLY: bool = os.getenv("COOKIE_HTTPONLY", "True").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "your_openai_api_key")
    OPENAI_MODEL_ID: str = os.getenv("OPENAI_MODEL_ID", "gpt-4o-mini")

    # AISER Service Settings
    AISER_AUTH_SERVICE_URL: str = os.getenv(
        "AISER_AUTH_SERVICE_URL", "http://localhost:5000"
    )

    class Config:
        case_sensitive = True
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
