from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from app.common.repository import BaseRepository
from app.modules.projects.models import (
    Project, Organization, ProjectDataSource, ProjectConversation, OrganizationUser
)
from app.modules.projects.schemas import (
    ProjectCreate, ProjectUpdate, OrganizationCreate, OrganizationUpdate
)


class ProjectRepository(BaseRepository[Project, ProjectCreate, ProjectUpdate]):
    """Repository for Project operations"""
    
    def __init__(self):
        super().__init__(Project)
    
    async def get_user_projects(self, user_id: str, db: AsyncSession) -> List[Project]:
        """Get all projects for a specific user"""
        try:
            # Get projects where user is owner or has access
            query = select(Project).where(
                (Project.created_by == user_id) |  # Changed from owner_id to created_by
                (Project.is_public == True)
            )
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"Error getting user projects: {e}")
            return []
    
    async def get_all(self, db: AsyncSession) -> List[Project]:
        """Get all projects"""
        try:
            query = select(Project).where(Project.is_active == True)
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"Error getting all projects: {e}")
            return []
    
    async def get_project_with_data_sources(self, project_id: str, user_id: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
        """Get project with data source counts"""
        try:
            query = select(Project).where(Project.id == project_id)
            result = await db.execute(query)
            project = result.scalar_one_or_none()
            
            if not project:
                return None
            
            # Check if user has access
            if project.owner_id != user_id and not project.is_public:
                return None
            
            # Get data source count
            ds_query = select(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.is_active == True
            )
            ds_result = await db.execute(ds_query)
            data_sources = ds_result.scalars().all()
            
            return {
                "id": project.id,  # Changed from str(project.id) to project.id
                "name": project.name,
                "description": project.description,
                "organization_id": project.organization_id,  # Changed from str(project.organization_id) to project.organization_id
                "created_by": project.created_by,  # Changed from owner_id to created_by
                "is_public": project.is_public,
                "is_active": project.is_active,
                "settings": project.settings,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
                "data_source_count": len(data_sources)
            }
        except Exception as e:
            print(f"Error getting project with data sources: {e}")
            return None
    
    async def add_data_source_to_project(self, project_id: str, data_source_id: str, data_source_type: str, user_id: str, db: AsyncSession) -> bool:
        """Add a data source to a project"""
        try:
            # Verify user has access to project
            project_query = select(Project).where(
                Project.id == project_id,
                (Project.created_by == user_id) | (Project.is_public == True)  # Changed from owner_id to created_by
            )
            project_result = await db.execute(project_query)
            project = project_result.scalar_one_or_none()
            
            if not project:
                return False
            
            # Check if data source already exists
            existing_query = select(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.data_source_id == data_source_id
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()
            
            if existing:
                # Update existing
                update_query = update(ProjectDataSource).where(
                    ProjectDataSource.id == existing.id
                ).values(
                    is_active=True,
                    data_source_type=data_source_type
                )
                await db.execute(update_query)
            else:
                # Create new
                new_ds = ProjectDataSource(
                    project_id=project_id,
                    data_source_id=data_source_id,
                    data_source_type=data_source_type
                )
                db.add(new_ds)
            
            await db.commit()
            return True
        except Exception as e:
            print(f"Error adding data source to project: {e}")
            await db.rollback()
            return False
    
    async def get_project_data_sources(self, project_id: str, user_id: str, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get all data sources in a project"""
        try:
            # Verify user has access to project
            project_query = select(Project).where(
                Project.id == project_id,
                (Project.owner_id == user_id) | (Project.is_public == True)
            )
            project_result = await db.execute(project_query)
            project = project_result.scalar_one_or_none()
            
            if not project:
                return []
            
            # Get data sources
            ds_query = select(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.is_active == True
            )
            ds_result = await db.execute(ds_query)
            data_sources = ds_result.scalars().all()
            
            return [
                {
                    "id": str(ds.id),
                    "project_id": str(ds.project_id),
                    "data_source_id": ds.data_source_id,
                    "data_source_type": ds.data_source_type,
                    "is_active": ds.is_active,
                    "added_at": ds.added_at.isoformat() if ds.added_at else None
                }
                for ds in data_sources
            ]
        except Exception as e:
            print(f"Error getting project data sources: {e}")
            return []
    
    async def remove_data_source_from_project(self, project_id: str, data_source_id: str, user_id: str, db: AsyncSession) -> bool:
        """Remove a data source from a project"""
        try:
            # Verify user has access to project
            project_query = select(Project).where(
                Project.id == project_id,
                Project.created_by == user_id  # Changed from owner_id to created_by
            )
            project_result = await db.execute(project_query)
            project = project_result.scalar_one_or_none()
            
            if not project:
                return False
            
            # Remove data source
            delete_query = delete(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.data_source_id == data_source_id
            )
            await db.execute(delete_query)
            await db.commit()
            return True
        except Exception as e:
            print(f"Error removing data source from project: {e}")
            await db.rollback()
            return False


class OrganizationRepository(BaseRepository[Organization, OrganizationCreate, OrganizationUpdate]):
    """Repository for Organization operations"""
    
    def __init__(self):
        super().__init__(Organization)
    
    async def get_all(self, db: AsyncSession) -> List[Organization]:
        """Get all active organizations"""
        try:
            query = select(Organization).where(Organization.is_active == True)
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"Error getting all organizations: {e}")
            return []
    
    async def get_organization_summary(self, organization_id: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
        """Get organization summary with counts"""
        try:
            query = select(Organization).where(Organization.id == organization_id)
            result = await db.execute(query)
            org = result.scalar_one_or_none()
            
            if not org:
                return None
            
            # Get project count
            project_query = select(Project).where(
                Project.organization_id == organization_id,
                Project.is_active == True
            )
            project_result = await db.execute(project_query)
            projects = project_result.scalars().all()
            
            # Get user count
            user_query = select(OrganizationUser).where(
                OrganizationUser.organization_id == organization_id,
                OrganizationUser.is_active == True
            )
            user_result = await db.execute(user_query)
            users = user_result.scalars().all()
            
            return {
                "id": str(org.id),
                "name": org.name,
                "description": org.description,
                "domain": org.domain,
                "is_active": org.is_active,
                "plan_type": org.plan_type,
                "max_projects": org.max_projects,
                "project_count": len(projects),
                "user_count": len(users),
                "created_at": org.created_at.isoformat() if org.created_at else None,
                "updated_at": org.updated_at.isoformat() if org.updated_at else None
            }
        except Exception as e:
            print(f"Error getting organization summary: {e}")
            return None
