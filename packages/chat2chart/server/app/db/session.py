from typing import AsyncGenerator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Create async engine for async operations
# Explicitly specify asyncpg driver to prevent auto-detection of psycopg2
async_url = settings.SQLALCHEMY_DATABASE_URI
if "postgresql+asyncpg://" not in async_url:
    # Ensure we're using the async driver
    async_url = async_url.replace("postgresql://", "postgresql+asyncpg://")

async_engine = create_async_engine(
    async_url,
    future=True,
    echo=True,
    poolclass=None,  # Use default pool
    # Explicitly specify driver to prevent conflicts
    connect_args={"server_settings": {"application_name": "chat2chart_async"}}
)

# Create async session factory
async_session = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create sync engine for sync operations (like migrations) - lazy initialization
_sync_engine = None
_sync_session = None

def get_sync_engine():
    """Get sync engine with lazy initialization to prevent psycopg2 import during startup"""
    global _sync_engine
    if _sync_engine is None:
        # Use the new SYNC_DATABASE_URI property
        sync_url = settings.SYNC_DATABASE_URI
        _sync_engine = create_engine(sync_url, echo=True)
    return _sync_engine

def get_sync_session():
    """Get sync database session for migrations"""
    global _sync_session
    if _sync_session is None:
        _sync_session = sessionmaker(autocommit=False, autoflush=False, bind=get_sync_engine())
    return _sync_session()

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session with proper cleanup

    Implemented as an async generator (yield) so FastAPI correctly treats it as a
    dependency that yields a session and performs cleanup. Using
    @asynccontextmanager here returns a context manager object which FastAPI may
    not unwrap correctly and can lead to the dependency receiving an
    AsyncGeneratorContextManager instead of the actual session. Using a plain
    async generator is the recommended FastAPI pattern.
    """
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Removed duplicate function definition

# Global async database session instance - lazy initialization
_db_instance = None

def get_db():
    """Get the global database instance with lazy initialization"""
    global _db_instance
    if _db_instance is None:
        _db_instance = AsyncDatabaseSession()
    return _db_instance

class AsyncDatabaseSession:
    """Async database session wrapper for repository operations"""
    
    def __init__(self):
        self._engine = async_engine
        self._session_factory = async_session
    
    async def get_session(self):
        """Get a new async session"""
        return self._session_factory()
    
    async def execute(self, query):
        """Execute a query using a new session"""
        async with self._session_factory() as session:
            try:
                result = await session.execute(query)
                await session.commit()
                return result
            except Exception:
                await session.rollback()
                raise
    
    async def add(self, obj):
        """Add an object to the database"""
        async with self._session_factory() as session:
            try:
                session.add(obj)
                await session.commit()
                await session.refresh(obj)
                return obj
            except Exception:
                await session.rollback()
                raise
    
    async def delete(self, obj):
        """Delete an object from the database"""
        async with self._session_factory() as session:
            try:
                await session.delete(obj)
                await session.commit()
                return True
            except Exception:
                await session.rollback()
                raise
    
    async def create_all(self, metadata):
        """Create all tables"""
        async with self._engine.begin() as conn:
            await conn.run_sync(metadata.create_all)
    
    async def close(self):
        """Close the engine"""
        await self._engine.close()

# Export sync engine for migrations - lazy initialization
def get_database():
    """Get sync database engine for migrations"""
    return get_sync_engine()

# For backward compatibility
database = get_database
