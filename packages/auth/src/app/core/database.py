from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Import all models to ensure they are registered with SQLAlchemy
# This is necessary for SQLAlchemy to detect all models

# Create database engine
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    echo=False,  # Set to True for SQL debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    This will be used with FastAPI's Depends() to inject database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# For backward compatibility with existing code
def get_session():
    """Legacy function for getting database session"""
    return SessionLocal()
