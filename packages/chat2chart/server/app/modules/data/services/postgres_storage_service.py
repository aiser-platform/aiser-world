"""
PostgreSQL-based object storage service
Stores file binary data in PostgreSQL using BYTEA type
"""

import logging
import uuid
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session
from app.modules.data.models import FileStorage

logger = logging.getLogger(__name__)


class PostgresStorageService:
    """PostgreSQL-based object storage service"""
    
    def generate_object_key(self, user_id: str, filename: str) -> str:
        """Generate object key: user_files/<user_id>/<uuid>"""
        file_uuid = str(uuid.uuid4())
        return f"user_files/{user_id}/{file_uuid}"
    
    async def store_file(
        self, 
        file_content: bytes, 
        user_id: str, 
        original_filename: str, 
        content_type: str
    ) -> str:
        """Store file in PostgreSQL and return object_key"""
        object_key = self.generate_object_key(user_id, original_filename)
        
        async with async_session() as session:
            try:
                # Check if object_key already exists (shouldn't happen with UUID, but be safe)
                existing = await session.execute(
                    select(FileStorage).where(FileStorage.object_key == object_key)
                )
                if existing.scalar_one_or_none():
                    # If somehow exists, generate new key
                    object_key = self.generate_object_key(user_id, original_filename)
                
                # Create new FileStorage record
                file_storage = FileStorage(
                    object_key=object_key,
                    file_data=file_content,
                    file_size=len(file_content),
                    content_type=content_type,
                    original_filename=original_filename,
                    user_id=user_id,
                    is_active=True
                )
                
                session.add(file_storage)
                await session.commit()
                await session.refresh(file_storage)
                
                logger.info(f"✅ Stored file in PostgreSQL: {object_key} ({len(file_content)} bytes)")
                return object_key
                
            except Exception as e:
                await session.rollback()
                logger.error(f"❌ Failed to store file in PostgreSQL: {str(e)}")
                raise
    
    async def get_file(self, object_key: str, user_id: str) -> bytes:
        """Retrieve file from PostgreSQL with ownership verification"""
        async with async_session() as session:
            try:
                result = await session.execute(
                    select(FileStorage).where(
                        FileStorage.object_key == object_key,
                        FileStorage.user_id == user_id,
                        FileStorage.is_active == True
                    )
                )
                file_storage = result.scalar_one_or_none()
                
                if not file_storage:
                    raise ValueError(f"File not found or access denied: {object_key}")
                
                logger.info(f"✅ Retrieved file from PostgreSQL: {object_key}")
                return file_storage.file_data
                
            except Exception as e:
                logger.error(f"❌ Failed to retrieve file from PostgreSQL: {str(e)}")
                raise
    
    async def delete_file(self, object_key: str, user_id: str) -> bool:
        """Soft delete file (set is_active=False)"""
        async with async_session() as session:
            try:
                result = await session.execute(
                    select(FileStorage).where(
                        FileStorage.object_key == object_key,
                        FileStorage.user_id == user_id
                    )
                )
                file_storage = result.scalar_one_or_none()
                
                if not file_storage:
                    logger.warning(f"⚠️ File not found for deletion: {object_key}")
                    return False
                
                # Soft delete
                await session.execute(
                    update(FileStorage)
                    .where(FileStorage.object_key == object_key)
                    .values(is_active=False)
                )
                await session.commit()
                
                logger.info(f"✅ Soft deleted file: {object_key}")
                return True
                
            except Exception as e:
                await session.rollback()
                logger.error(f"❌ Failed to delete file: {str(e)}")
                raise

