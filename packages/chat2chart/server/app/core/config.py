from pydantic_settings import BaseSettings
from typing import Dict
from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # API Settings
    APP_HOST: str = "localhost"
    APP_PORT: int = 8000
    APP_NAME: str = "Aiser Chat2Chart Platform"
    APP_VERSION: str = "0.0.1"
    APP_CONTACT: Dict[str, str] = {
        "name": "DataTicon Dev Team",
        "email": "support@dataticon.com",
    }

    # Database Settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "aiser_world")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Always use async driver for the main database URI
        # This ensures SQLAlchemy uses asyncpg instead of auto-detecting psycopg2
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            # Convert sync URL to async URL if needed
            url = self.DATABASE_URL
            if url.startswith("postgresql://") and "+asyncpg" not in url:
                url = url.replace("postgresql://", "postgresql+asyncpg://")
            return url
        # Fall back to individual POSTGRES_* variables with async driver
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def SYNC_DATABASE_URI(self) -> str:
        """Get sync database URI for migrations and sync operations"""
        # Convert async URL to sync URL for migrations
        async_url = self.SQLALCHEMY_DATABASE_URI
        if "+asyncpg" in async_url:
            return async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
        elif "+psycopg2" not in async_url:
            return async_url.replace("postgresql://", "postgresql+psycopg2://")
        return async_url

    # Security Settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "9e25a2588fcee7d21ea15fb1a63d5135"
    )  # openssl rand -hex 16
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-jwt-secret-here")
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

    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL_ID: str = os.getenv("OPENAI_MODEL_ID", "gpt-4o-mini")

    # Azure OpenAI Settings
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")

    # Cube.js Settings
    CUBE_API_URL: str = os.getenv("CUBE_API_URL", "http://localhost:4000/cubejs-api/v1")
    CUBE_API_SECRET: str = os.getenv("CUBE_API_SECRET", "dev-cube-secret-key")

    # Feature Flags
    ENABLE_AI_ANALYSIS: bool = os.getenv("ENABLE_AI_ANALYSIS", "true").lower() == "true"
    ENABLE_CUBE_INTEGRATION: bool = os.getenv("ENABLE_CUBE_INTEGRATION", "true").lower() == "true"
    ENABLE_MCP_CHARTS: bool = os.getenv("ENABLE_MCP_CHARTS", "false").lower() == "true"
    ENABLE_FUNCTION_CALLING: bool = os.getenv("ENABLE_FUNCTION_CALLING", "true").lower() == "true"
    ENABLE_INTELLIGENT_MODELING: bool = os.getenv("ENABLE_INTELLIGENT_MODELING", "true").lower() == "true"

    # CORS Settings
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    # File Upload Settings (Additional)
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))

    # Database URL (Alternative format)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Redis Cache Settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    # MCP Settings
    MCP_ECHARTS_ENABLED: bool = os.getenv("MCP_ECHARTS_ENABLED", "false").lower() == "true"

    # Cookie Settings
    COOKIE_DOMAIN: str = os.getenv("COOKIE_DOMAIN", "localhost")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "False").lower() == "true"
    COOKIE_HTTPONLY: bool = os.getenv("COOKIE_HTTPONLY", "True").lower() == "true"
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    class Config:
        case_sensitive = True
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
