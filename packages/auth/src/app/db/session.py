from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# async_engine = create_async_engine(
#     settings.SQLALCHEMY_DATABASE_URI, future=True, echo=True
# )
# async_session = sessionmaker(
#     bind=async_engine, class_=AsyncSession, expire_on_commit=False
# )

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
db_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def get_session():
    yield db_session()


# async def get_db() -> AsyncGenerator[AsyncSession, None]:
#     """Dependency for getting async database session"""
#     async with async_session() as session:
#         try:
#             yield session
#             await session.commit()
#         except Exception:
#             await session.rollback()
#             raise
#         finally:
#             await session.close()


# # Example usage of get_db function
# async def example_usage():
#     async for db in get_db():
#         # Use db here
#         pass


class AsyncDatabaseSession:
    def __init__(self):
        self._engine = create_async_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            future=True,
            echo=True,
        )
        async_session = sessionmaker(
            self._engine, class_=AsyncSession, expire_on_commit=False
        )
        self._session = async_session()

    def __getattr__(self, name):
        return getattr(self._session, name)

    # def init(self):
    #     self._engine = create_async_engine(
    #         settings.SQLALCHEMY_DATABASE_URI,
    #         future=True,
    #         echo=True,
    #     )
    #     async_session = sessionmaker(
    #         self._engine, class_=AsyncSession, expire_on_commit=False
    #     )
    #     self._session = async_session()

    async def create_all(self, metadata):
        async with self._engine.begin() as conn:
            await conn.run_sync(metadata.create_all)

    async def close(self):
        if self._session:
            await self._session.close()

    async def commit(self):
        if self._session:
            await self._session.commit()

    async def rollback(self):
        if self._session:
            await self._session.rollback()


db = AsyncDatabaseSession()

database = create_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
