from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings

# Create database engine
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    echo=False,  # Set to True for SQL debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()


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


# Create a working database session class that can be used by repositories
class DatabaseSession:
    def __init__(self):
        self._session = SessionLocal()

    def __getattr__(self, name):
        # Delegate to the actual session
        return getattr(self._session, name)

    def close(self):
        if self._session:
            self._session.close()

    def commit(self):
        if self._session:
            self._session.commit()

    def rollback(self):
        if self._session:
            self._session.rollback()


# Create a working database instance
db = DatabaseSession()
