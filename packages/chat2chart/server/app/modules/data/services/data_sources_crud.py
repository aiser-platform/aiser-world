"""
Complete Data Sources CRUD Operations
Production-ready data source management with full CRUD functionality
"""

import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
import logging
from dataclasses import dataclass, asdict
import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update, delete, func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.db.session import get_async_session
from app.modules.data.models import DataSource, DataQuery, DataConnection
from app.modules.projects.models import Organization, Project
from app.core.real_data_sources import real_data_source_manager

logger = logging.getLogger(__name__)

@dataclass
class DataSourceCreate:
    """Data source creation request"""
    name: str
    type: str  # database, file_storage, api, streaming
    format: str  # postgresql, mysql, csv, s3, etc.
    description: Optional[str] = None
    connection_config: Dict[str, Any] = None
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    is_active: bool = True

@dataclass
class DataSourceUpdate:
    """Data source update request"""
    name: Optional[str] = None
    description: Optional[str] = None
    connection_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

@dataclass
class DataSourceResponse:
    """Data source response"""
    id: str
    name: str
    type: str
    format: str
    description: Optional[str]
    connection_config: Dict[str, Any]
    organization_id: Optional[str]
    project_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_accessed: Optional[datetime]
    connection_status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class DataSourcesCRUD:
    """Complete CRUD operations for data sources"""
    
    def __init__(self):
        self.real_data_manager = real_data_source_manager
    
    async def create_data_source(
        self,
        data_source_data: DataSourceCreate,
        user_id: str,
        session: AsyncSession
    ) -> DataSourceResponse:
        """Create a new data source"""
        try:
            # Generate unique ID
            data_source_id = str(uuid.uuid4())
            
            # Create data source
            # Map description into metadata to match DataSource model fields
            metadata = {}
            if getattr(data_source_data, 'description', None):
                metadata['description'] = data_source_data.description

            data_source = DataSource(
                id=data_source_id,
                name=data_source_data.name,
                type=data_source_data.type,
                format=data_source_data.format,
                connection_config=data_source_data.connection_config or {},
                metadata=json.dumps(metadata) if metadata else None,
                user_id=user_id,
                tenant_id=data_source_data.organization_id,
                is_active=data_source_data.is_active,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            session.add(data_source)
            await session.flush()
            
            # Test connection if provided
            connection_status = "unknown"
            if data_source_data.connection_config:
                try:
                    test_result = await self.real_data_manager.test_connection(data_source)
                    connection_status = "connected" if test_result.success else "failed"
                except Exception as e:
                    logger.warning(f"Connection test failed: {e}")
                    connection_status = "failed"
            
            # Get schema if it's a database
            metadata = {}
            if data_source_data.type == "database" and connection_status == "connected":
                try:
                    schema = await self.real_data_manager.get_schema(data_source)
                    metadata = {"schema": schema}
                except Exception as e:
                    logger.warning(f"Schema retrieval failed: {e}")
            
            await session.commit()
            
            return DataSourceResponse(
                id=data_source.id,
                name=data_source.name,
                type=data_source.type,
                format=data_source.format,
                description=data_source.description,
                connection_config=data_source.connection_config,
                organization_id=data_source.tenant_id,
                project_id=data_source_data.project_id,
                is_active=data_source.is_active,
                created_at=data_source.created_at,
                updated_at=data_source.updated_at,
                last_accessed=data_source.last_accessed,
                connection_status=connection_status,
                metadata=metadata
            )
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating data source: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create data source: {str(e)}"
            )
    
    async def get_data_source(
        self,
        data_source_id: str,
        user_id: str,
        session: AsyncSession
    ) -> Optional[DataSourceResponse]:
        """Get a data source by ID"""
        try:
            result = await session.execute(
                select(DataSource).where(
                    and_(
                        DataSource.id == data_source_id,
                        DataSource.user_id == user_id
                    )
                )
            )
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                return None
            
            # Test connection status
            connection_status = "unknown"
            metadata = {}
            if data_source.connection_config:
                try:
                    test_result = await self.real_data_manager.test_connection(data_source)
                    connection_status = "connected" if test_result.success else "failed"
                    
                    # Get schema if connected
                    if connection_status == "connected" and data_source.type == "database":
                        schema = await self.real_data_manager.get_schema(data_source)
                        metadata = {"schema": schema}
                except Exception as e:
                    logger.warning(f"Connection test failed: {e}")
                    connection_status = "failed"
            
            return DataSourceResponse(
                id=data_source.id,
                name=data_source.name,
                type=data_source.type,
                format=data_source.format,
                description=data_source.description,
                connection_config=data_source.connection_config,
                organization_id=data_source.tenant_id,
                project_id=None,  # Would need to join with project_data_source table
                is_active=data_source.is_active,
                created_at=data_source.created_at,
                updated_at=data_source.updated_at,
                last_accessed=data_source.last_accessed,
                connection_status=connection_status,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Error getting data source: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get data source: {str(e)}"
            )
    
    async def list_data_sources(
        self,
        user_id: str,
        organization_id: Optional[str] = None,
        project_id: Optional[str] = None,
        data_source_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        session: AsyncSession
    ) -> List[DataSourceResponse]:
        """List data sources with filters"""
        try:
            # Build query
            query = select(DataSource).where(DataSource.user_id == user_id)
            
            if organization_id:
                query = query.where(DataSource.tenant_id == organization_id)
            
            if data_source_type:
                query = query.where(DataSource.type == data_source_type)
            
            if is_active is not None:
                query = query.where(DataSource.is_active == is_active)
            
            # Order by created_at desc
            query = query.order_by(DataSource.created_at.desc())
            
            result = await session.execute(query)
            data_sources = result.scalars().all()
            
            # Convert to response objects
            responses = []
            for data_source in data_sources:
                # Test connection status
                connection_status = "unknown"
                metadata = {}
                if data_source.connection_config:
                    try:
                        test_result = await self.real_data_manager.test_connection(data_source)
                        connection_status = "connected" if test_result.success else "failed"
                        
                        # Get schema if connected
                        if connection_status == "connected" and data_source.type == "database":
                            schema = await self.real_data_manager.get_schema(data_source)
                            metadata = {"schema": schema}
                    except Exception as e:
                        logger.warning(f"Connection test failed: {e}")
                        connection_status = "failed"
                
                responses.append(DataSourceResponse(
                    id=data_source.id,
                    name=data_source.name,
                    type=data_source.type,
                    format=data_source.format,
                    description=data_source.description,
                    connection_config=data_source.connection_config,
                    organization_id=data_source.tenant_id,
                    project_id=project_id,
                    is_active=data_source.is_active,
                    created_at=data_source.created_at,
                    updated_at=data_source.updated_at,
                    last_accessed=data_source.last_accessed,
                    connection_status=connection_status,
                    metadata=metadata
                ))
            
            return responses
            
        except Exception as e:
            logger.error(f"Error listing data sources: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list data sources: {str(e)}"
            )
    
    async def update_data_source(
        self,
        data_source_id: str,
        update_data: DataSourceUpdate,
        user_id: str,
        session: AsyncSession
    ) -> DataSourceResponse:
        """Update a data source"""
        try:
            # Get existing data source
            result = await session.execute(
                select(DataSource).where(
                    and_(
                        DataSource.id == data_source_id,
                        DataSource.user_id == user_id
                    )
                )
            )
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Data source not found"
                )
            
            # Update fields
            if update_data.name is not None:
                data_source.name = update_data.name
            
            if update_data.description is not None:
                data_source.description = update_data.description
            
            if update_data.connection_config is not None:
                data_source.connection_config = update_data.connection_config
            
            if update_data.is_active is not None:
                data_source.is_active = update_data.is_active
            
            data_source.updated_at = datetime.now(timezone.utc)
            
            await session.flush()
            
            # Test connection if config was updated
            connection_status = "unknown"
            metadata = {}
            if data_source.connection_config:
                try:
                    test_result = await self.real_data_manager.test_connection(data_source)
                    connection_status = "connected" if test_result.success else "failed"
                    
                    # Get schema if connected
                    if connection_status == "connected" and data_source.type == "database":
                        schema = await self.real_data_manager.get_schema(data_source)
                        metadata = {"schema": schema}
                except Exception as e:
                    logger.warning(f"Connection test failed: {e}")
                    connection_status = "failed"
            
            await session.commit()
            
            return DataSourceResponse(
                id=data_source.id,
                name=data_source.name,
                type=data_source.type,
                format=data_source.format,
                description=data_source.description,
                connection_config=data_source.connection_config,
                organization_id=data_source.tenant_id,
                project_id=None,
                is_active=data_source.is_active,
                created_at=data_source.created_at,
                updated_at=data_source.updated_at,
                last_accessed=data_source.last_accessed,
                connection_status=connection_status,
                metadata=metadata
            )
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating data source: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update data source: {str(e)}"
            )
    
    async def delete_data_source(
        self,
        data_source_id: str,
        user_id: str,
        session: AsyncSession
    ) -> bool:
        """Delete a data source"""
        try:
            # Get existing data source
            result = await session.execute(
                select(DataSource).where(
                    and_(
                        DataSource.id == data_source_id,
                        DataSource.user_id == user_id
                    )
                )
            )
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Data source not found"
                )
            
            # Soft delete by setting is_active to False
            data_source.is_active = False
            data_source.updated_at = datetime.now(timezone.utc)
            
            await session.commit()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting data source: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete data source: {str(e)}"
            )
    
    async def test_connection(
        self,
        data_source_id: str,
        user_id: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Test data source connection"""
        try:
            # Get data source
            result = await session.execute(
                select(DataSource).where(
                    and_(
                        DataSource.id == data_source_id,
                        DataSource.user_id == user_id
                    )
                )
            )
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Data source not found"
                )
            
            # Test connection
            test_result = await self.real_data_manager.test_connection(data_source)
            
            # Update last accessed time
            data_source.last_accessed = datetime.now(timezone.utc)
            await session.commit()
            
            return {
                "success": test_result.success,
                "message": test_result.message,
                "connection_time": test_result.connection_time,
                "metadata": test_result.metadata
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error testing connection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to test connection: {str(e)}"
            )
    
    async def execute_query(
        self,
        data_source_id: str,
        query: str,
        user_id: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Execute query on data source"""
        try:
            # Get data source
            result = await session.execute(
                select(DataSource).where(
                    and_(
                        DataSource.id == data_source_id,
                        DataSource.user_id == user_id
                    )
                )
            )
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Data source not found"
                )
            
            # Execute query
            query_result = await self.real_data_manager.execute_query(data_source, query)
            
            # Update last accessed time
            data_source.last_accessed = datetime.now(timezone.utc)
            await session.commit()
            
            return {
                "success": query_result.success,
                "data": query_result.data,
                "columns": query_result.columns,
                "row_count": query_result.row_count,
                "execution_time": query_result.execution_time,
                "error_message": query_result.error_message
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to execute query: {str(e)}"
            )
    
    async def get_schema(
        self,
        data_source_id: str,
        user_id: str,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Get data source schema"""
        try:
            # Get data source
            result = await session.execute(
                select(DataSource).where(
                    and_(
                        DataSource.id == data_source_id,
                        DataSource.user_id == user_id
                    )
                )
            )
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Data source not found"
                )
            
            # Get schema
            schema = await self.real_data_manager.get_schema(data_source)
            
            # Update last accessed time
            data_source.last_accessed = datetime.now(timezone.utc)
            await session.commit()
            
            return schema
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting schema: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get schema: {str(e)}"
            )

# Global instance
data_sources_crud = DataSourcesCRUD()
