"""
Dashboard Service - Real database operations for dashboards
Replaces mock data with actual database queries
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload

from app.modules.charts.models import Dashboard, DashboardWidget, Widget
from app.modules.charts.schemas import (
    DashboardCreateSchema, 
    DashboardUpdateSchema, 
    DashboardResponseSchema,
    WidgetCreateSchema,
    WidgetResponseSchema
)
from app.common.repository import BaseRepository

logger = logging.getLogger(__name__)

class DashboardService:
    """Service for dashboard operations with real database queries"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.dashboard_repo = BaseRepository(Dashboard, db_session)
        self.widget_repo = BaseRepository(Widget, db_session)
        self.dashboard_widget_repo = BaseRepository(DashboardWidget, db_session)
    
    async def list_dashboards(
        self, 
        project_id: int, 
        user_id: int,
        offset: int = 0, 
        limit: int = 20,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """List dashboards with real database queries"""
        try:
            logger.info(f"📊 Listing dashboards for project {project_id}, user {user_id}")
            
            # Build query
            query = select(Dashboard).where(
                and_(
                    Dashboard.project_id == project_id,
                    or_(
                        Dashboard.created_by == user_id,
                        Dashboard.is_public == True
                    )
                )
            )
            
            # Add search filter
            if search:
                query = query.where(
                    or_(
                        Dashboard.name.ilike(f"%{search}%"),
                        Dashboard.description.ilike(f"%{search}%")
                    )
                )
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_result = await self.db.execute(count_query)
            total = total_result.scalar()
            
            # Get paginated results
            query = query.offset(offset).limit(limit).order_by(Dashboard.updated_at.desc())
            result = await self.db.execute(query)
            dashboards = result.scalars().all()
            
            # Convert to response format
            dashboard_list = []
            for dashboard in dashboards:
                dashboard_data = {
                    "id": str(dashboard.id),
                    "name": dashboard.name,
                    "description": dashboard.description,
                    "project_id": dashboard.project_id,
                    "layout_config": dashboard.layout_config or {},
                    "theme_config": dashboard.theme_config or {},
                    "global_filters": dashboard.global_filters or {},
                    "refresh_interval": dashboard.refresh_interval or 300,
                    "is_public": dashboard.is_public,
                    "is_template": dashboard.is_template,
                    "created_by": dashboard.created_by,
                    "max_widgets": dashboard.max_widgets or 10,
                    "max_pages": dashboard.max_pages or 5,
                    "created_at": dashboard.created_at.isoformat() if dashboard.created_at else None,
                    "updated_at": dashboard.updated_at.isoformat() if dashboard.updated_at else None,
                    "last_viewed_at": dashboard.last_viewed_at.isoformat() if dashboard.last_viewed_at else None
                }
                dashboard_list.append(dashboard_data)
            
            return {
                "dashboards": dashboard_list,
                "total": total,
                "offset": offset,
                "limit": limit,
                "has_more": offset + limit < total
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to list dashboards: {str(e)}")
            raise e
    
    async def get_dashboard(self, dashboard_id: str, user_id: int) -> Dict[str, Any]:
        """Get a specific dashboard by ID"""
        try:
            logger.info(f"📊 Getting dashboard: {dashboard_id}")
            
            # Get dashboard with widgets
            query = select(Dashboard).options(
                selectinload(Dashboard.widgets)
            ).where(Dashboard.id == dashboard_id)
            
            result = await self.db.execute(query)
            dashboard = result.scalar_one_or_none()
            
            if not dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Check permissions
            if dashboard.created_by != user_id and not dashboard.is_public:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Convert to response format
            dashboard_data = {
                "id": str(dashboard.id),
                "name": dashboard.name,
                "description": dashboard.description,
                "project_id": dashboard.project_id,
                "layout_config": dashboard.layout_config or {},
                "theme_config": dashboard.theme_config or {},
                "global_filters": dashboard.global_filters or {},
                "refresh_interval": dashboard.refresh_interval or 300,
                "is_public": dashboard.is_public,
                "is_template": dashboard.is_template,
                "created_by": dashboard.created_by,
                "max_widgets": dashboard.max_widgets or 10,
                "max_pages": dashboard.max_pages or 5,
                "created_at": dashboard.created_at.isoformat() if dashboard.created_at else None,
                "updated_at": dashboard.updated_at.isoformat() if dashboard.updated_at else None,
                "last_viewed_at": dashboard.last_viewed_at.isoformat() if dashboard.last_viewed_at else None,
                "widgets": []
            }
            
            # Add widgets
            for widget in dashboard.widgets:
                widget_data = {
                    "id": str(widget.id),
                    "title": widget.title,
                    "type": widget.type,
                    "config": widget.config or {},
                    "position": widget.position or {},
                    "size": widget.size or {},
                    "created_at": widget.created_at.isoformat() if widget.created_at else None,
                    "updated_at": widget.updated_at.isoformat() if widget.updated_at else None
                }
                dashboard_data["widgets"].append(widget_data)
            
            return dashboard_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to get dashboard {dashboard_id}: {str(e)}")
            raise e
    
    async def create_dashboard(
        self, 
        dashboard_data: DashboardCreateSchema, 
        user_id: int
    ) -> Dict[str, Any]:
        """Create a new dashboard"""
        try:
            logger.info(f"📊 Creating dashboard: {dashboard_data.name}")
            
            # Create dashboard
            dashboard = Dashboard(
                name=dashboard_data.name,
                description=dashboard_data.description,
                project_id=dashboard_data.project_id,
                layout_config=dashboard_data.layout_config or {},
                theme_config=dashboard_data.theme_config or {},
                global_filters=dashboard_data.global_filters or {},
                refresh_interval=dashboard_data.refresh_interval or 300,
                is_public=dashboard_data.is_public or False,
                is_template=dashboard_data.is_template or False,
                created_by=user_id,
                max_widgets=dashboard_data.max_widgets or 10,
                max_pages=dashboard_data.max_pages or 5
            )
            
            self.db.add(dashboard)
            await self.db.commit()
            await self.db.refresh(dashboard)
            
            # Convert to response format
            return {
                "id": str(dashboard.id),
                "name": dashboard.name,
                "description": dashboard.description,
                "project_id": dashboard.project_id,
                "layout_config": dashboard.layout_config,
                "theme_config": dashboard.theme_config,
                "global_filters": dashboard.global_filters,
                "refresh_interval": dashboard.refresh_interval,
                "is_public": dashboard.is_public,
                "is_template": dashboard.is_template,
                "created_by": dashboard.created_by,
                "max_widgets": dashboard.max_widgets,
                "max_pages": dashboard.max_pages,
                "created_at": dashboard.created_at.isoformat(),
                "updated_at": dashboard.updated_at.isoformat(),
                "last_viewed_at": None,
                "widgets": []
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create dashboard: {str(e)}")
            await self.db.rollback()
            raise e
    
    async def update_dashboard(
        self, 
        dashboard_id: str, 
        dashboard_data: DashboardUpdateSchema, 
        user_id: int
    ) -> Dict[str, Any]:
        """Update an existing dashboard"""
        try:
            logger.info(f"📊 Updating dashboard: {dashboard_id}")
            
            # Get dashboard
            query = select(Dashboard).where(Dashboard.id == dashboard_id)
            result = await self.db.execute(query)
            dashboard = result.scalar_one_or_none()
            
            if not dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Check permissions
            if dashboard.created_by != user_id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Update fields
            update_data = dashboard_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(dashboard, field, value)
            
            dashboard.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(dashboard)
            
            # Convert to response format
            return {
                "id": str(dashboard.id),
                "name": dashboard.name,
                "description": dashboard.description,
                "project_id": dashboard.project_id,
                "layout_config": dashboard.layout_config,
                "theme_config": dashboard.theme_config,
                "global_filters": dashboard.global_filters,
                "refresh_interval": dashboard.refresh_interval,
                "is_public": dashboard.is_public,
                "is_template": dashboard.is_template,
                "created_by": dashboard.created_by,
                "max_widgets": dashboard.max_widgets,
                "max_pages": dashboard.max_pages,
                "created_at": dashboard.created_at.isoformat(),
                "updated_at": dashboard.updated_at.isoformat(),
                "last_viewed_at": dashboard.last_viewed_at.isoformat() if dashboard.last_viewed_at else None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to update dashboard {dashboard_id}: {str(e)}")
            await self.db.rollback()
            raise e
    
    async def delete_dashboard(self, dashboard_id: str, user_id: int) -> bool:
        """Delete a dashboard"""
        try:
            logger.info(f"📊 Deleting dashboard: {dashboard_id}")
            
            # Get dashboard
            query = select(Dashboard).where(Dashboard.id == dashboard_id)
            result = await self.db.execute(query)
            dashboard = result.scalar_one_or_none()
            
            if not dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Check permissions
            if dashboard.created_by != user_id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Delete dashboard (cascade will handle widgets)
            await self.db.delete(dashboard)
            await self.db.commit()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to delete dashboard {dashboard_id}: {str(e)}")
            await self.db.rollback()
            raise e
