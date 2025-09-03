"""
Complete Projects CRUD Operations
Production-ready project management with full CRUD functionality
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
from app.modules.projects.models import Project, ProjectUser, Organization
from app.modules.user.models import User
from app.modules.data.models import DataSource
from app.modules.charts.models import Dashboard

logger = logging.getLogger(__name__)

@dataclass
class ProjectCreate:
    """Project creation request"""
    name: str
    description: Optional[str] = None
    organization_id: str = None
    is_public: bool = False
    settings: Dict[str, Any] = None

@dataclass
class ProjectUpdate:
    """Project update request"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None

@dataclass
class ProjectResponse:
    """Project response"""
    id: str
    name: str
    description: Optional[str]
    organization_id: str
    created_by: str
    is_public: bool
    is_active: bool
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    member_count: int
    dashboard_count: int
    data_source_count: int
    last_activity: Optional[datetime]

@dataclass
class ProjectMemberResponse:
    """Project member response"""
    user_id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    joined_at: datetime
    last_accessed: Optional[datetime]

class ProjectsCRUD:
    """Complete CRUD operations for project management"""
    
    def __init__(self):
        pass
    
    async def create_project(
        self,
        project_data: ProjectCreate,
        created_by_user_id: str,
        session: AsyncSession
    ) -> ProjectResponse:
        """Create a new project"""
        try:
            # Generate unique ID
            project_id = str(uuid.uuid4())
            
            # Create project
            project = Project(
                id=project_id,
                name=project_data.name,
                description=project_data.description,
                organization_id=project_data.organization_id,
                created_by=created_by_user_id,
                is_public=project_data.is_public,
                is_active=True,
                settings=project_data.settings or {},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            session.add(project)
            await session.flush()
            
            # Add creator as admin
            project_user = ProjectUser(
                user_id=created_by_user_id,
                project_id=project_id,
                role="admin",
                is_active=True,
                joined_at=datetime.now(timezone.utc)
            )
            session.add(project_user)
            
            await session.commit()
            
            return ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                organization_id=project.organization_id,
                created_by=project.created_by,
                is_public=project.is_public,
                is_active=project.is_active,
                settings=project.settings,
                created_at=project.created_at,
                updated_at=project.updated_at,
                member_count=1,
                dashboard_count=0,
                data_source_count=0,
                last_activity=project.created_at
            )
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating project: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create project: {str(e)}"
            )
    
    async def get_project(
        self,
        project_id: str,
        user_id: str,
        session: AsyncSession
    ) -> Optional[ProjectResponse]:
        """Get a project by ID"""
        try:
            # Check if user has access to project
            project_access = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.user_id == user_id,
                        ProjectUser.is_active == True
                    )
                )
            )
            
            if not project_access.scalar_one_or_none():
                # Check if project is public
                project_result = await session.execute(
                    select(Project).where(
                        and_(
                            Project.id == project_id,
                            Project.is_public == True,
                            Project.is_active == True
                        )
                    )
                )
                project = project_result.scalar_one_or_none()
                
                if not project:
                    return None
            else:
                # Get project
                project_result = await session.execute(
                    select(Project).where(
                        and_(
                            Project.id == project_id,
                            Project.is_active == True
                        )
                    )
                )
                project = project_result.scalar_one_or_none()
                
                if not project:
                    return None
            
            # Get project statistics
            member_count = await session.execute(
                select(func.count(ProjectUser.id)).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.is_active == True
                    )
                )
            )
            member_count = member_count.scalar()
            
            dashboard_count = await session.execute(
                select(func.count(Dashboard.id)).where(
                    and_(
                        Dashboard.project_id == project_id,
                        Dashboard.is_active == True
                    )
                )
            )
            dashboard_count = dashboard_count.scalar()
            
            data_source_count = await session.execute(
                select(func.count(DataSource.id)).where(
                    and_(
                        DataSource.tenant_id == project.organization_id,
                        DataSource.is_active == True
                    )
                )
            )
            data_source_count = data_source_count.scalar()
            
            return ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                organization_id=project.organization_id,
                created_by=project.created_by,
                is_public=project.is_public,
                is_active=project.is_active,
                settings=project.settings,
                created_at=project.created_at,
                updated_at=project.updated_at,
                member_count=member_count,
                dashboard_count=dashboard_count,
                data_source_count=data_source_count,
                last_activity=project.updated_at
            )
            
        except Exception as e:
            logger.error(f"Error getting project: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get project: {str(e)}"
            )
    
    async def list_projects(
        self,
        user_id: str,
        organization_id: Optional[str] = None,
        is_public: Optional[bool] = None,
        session: AsyncSession
    ) -> List[ProjectResponse]:
        """List projects accessible to user"""
        try:
            # Get user's projects
            user_projects_query = select(Project).join(
                ProjectUser, Project.id == ProjectUser.project_id
            ).where(
                and_(
                    ProjectUser.user_id == user_id,
                    ProjectUser.is_active == True,
                    Project.is_active == True
                )
            )
            
            if organization_id:
                user_projects_query = user_projects_query.where(
                    Project.organization_id == organization_id
                )
            
            if is_public is not None:
                user_projects_query = user_projects_query.where(
                    Project.is_public == is_public
                )
            
            user_projects_result = await session.execute(user_projects_query)
            user_projects = user_projects_result.scalars().all()
            
            # Get public projects (if not filtering by organization)
            public_projects = []
            if not organization_id:
                public_projects_query = select(Project).where(
                    and_(
                        Project.is_public == True,
                        Project.is_active == True
                    )
                )
                
                if is_public is not None:
                    public_projects_query = public_projects_query.where(
                        Project.is_public == is_public
                    )
                
                public_projects_result = await session.execute(public_projects_query)
                public_projects = public_projects_result.scalars().all()
            
            # Combine and deduplicate
            all_projects = list(set(user_projects + public_projects))
            
            # Convert to response objects
            project_responses = []
            for project in all_projects:
                # Get project statistics
                member_count = await session.execute(
                    select(func.count(ProjectUser.id)).where(
                        and_(
                            ProjectUser.project_id == project.id,
                            ProjectUser.is_active == True
                        )
                    )
                )
                member_count = member_count.scalar()
                
                dashboard_count = await session.execute(
                    select(func.count(Dashboard.id)).where(
                        and_(
                            Dashboard.project_id == project.id,
                            Dashboard.is_active == True
                        )
                    )
                )
                dashboard_count = dashboard_count.scalar()
                
                data_source_count = await session.execute(
                    select(func.count(DataSource.id)).where(
                        and_(
                            DataSource.tenant_id == project.organization_id,
                            DataSource.is_active == True
                        )
                    )
                )
                data_source_count = data_source_count.scalar()
                
                project_responses.append(ProjectResponse(
                    id=project.id,
                    name=project.name,
                    description=project.description,
                    organization_id=project.organization_id,
                    created_by=project.created_by,
                    is_public=project.is_public,
                    is_active=project.is_active,
                    settings=project.settings,
                    created_at=project.created_at,
                    updated_at=project.updated_at,
                    member_count=member_count,
                    dashboard_count=dashboard_count,
                    data_source_count=data_source_count,
                    last_activity=project.updated_at
                ))
            
            # Sort by last activity
            project_responses.sort(key=lambda x: x.last_activity or x.created_at, reverse=True)
            
            return project_responses
            
        except Exception as e:
            logger.error(f"Error listing projects: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list projects: {str(e)}"
            )
    
    async def update_project(
        self,
        project_id: str,
        update_data: ProjectUpdate,
        user_id: str,
        session: AsyncSession
    ) -> ProjectResponse:
        """Update a project"""
        try:
            # Check if user has admin access to project
            project_access = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.user_id == user_id,
                        ProjectUser.role == "admin",
                        ProjectUser.is_active == True
                    )
                )
            )
            
            if not project_access.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to update project"
                )
            
            # Get project
            project_result = await session.execute(
                select(Project).where(
                    and_(
                        Project.id == project_id,
                        Project.is_active == True
                    )
                )
            )
            project = project_result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            # Update fields
            if update_data.name is not None:
                project.name = update_data.name
            
            if update_data.description is not None:
                project.description = update_data.description
            
            if update_data.is_public is not None:
                project.is_public = update_data.is_public
            
            if update_data.settings is not None:
                project.settings = update_data.settings
            
            project.updated_at = datetime.now(timezone.utc)
            
            await session.flush()
            
            # Get updated statistics
            member_count = await session.execute(
                select(func.count(ProjectUser.id)).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.is_active == True
                    )
                )
            )
            member_count = member_count.scalar()
            
            dashboard_count = await session.execute(
                select(func.count(Dashboard.id)).where(
                    and_(
                        Dashboard.project_id == project_id,
                        Dashboard.is_active == True
                    )
                )
            )
            dashboard_count = dashboard_count.scalar()
            
            data_source_count = await session.execute(
                select(func.count(DataSource.id)).where(
                    and_(
                        DataSource.tenant_id == project.organization_id,
                        DataSource.is_active == True
                    )
                )
            )
            data_source_count = data_source_count.scalar()
            
            await session.commit()
            
            return ProjectResponse(
                id=project.id,
                name=project.name,
                description=project.description,
                organization_id=project.organization_id,
                created_by=project.created_by,
                is_public=project.is_public,
                is_active=project.is_active,
                settings=project.settings,
                created_at=project.created_at,
                updated_at=project.updated_at,
                member_count=member_count,
                dashboard_count=dashboard_count,
                data_source_count=data_source_count,
                last_activity=project.updated_at
            )
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating project: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update project: {str(e)}"
            )
    
    async def delete_project(
        self,
        project_id: str,
        user_id: str,
        session: AsyncSession
    ) -> bool:
        """Delete a project (soft delete)"""
        try:
            # Check if user has admin access to project
            project_access = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.user_id == user_id,
                        ProjectUser.role == "admin",
                        ProjectUser.is_active == True
                    )
                )
            )
            
            if not project_access.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to delete project"
                )
            
            # Get project
            project_result = await session.execute(
                select(Project).where(
                    and_(
                        Project.id == project_id,
                        Project.is_active == True
                    )
                )
            )
            project = project_result.scalar_one_or_none()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            # Soft delete project
            project.is_active = False
            project.updated_at = datetime.now(timezone.utc)
            
            # Deactivate all project memberships
            project_members = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.is_active == True
                    )
                )
            )
            
            for member in project_members.scalars():
                member.is_active = False
            
            await session.commit()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting project: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete project: {str(e)}"
            )
    
    async def get_project_members(
        self,
        project_id: str,
        user_id: str,
        session: AsyncSession
    ) -> List[ProjectMemberResponse]:
        """Get project members"""
        try:
            # Check if user has access to project
            project_access = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.user_id == user_id,
                        ProjectUser.is_active == True
                    )
                )
            )
            
            if not project_access.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to project"
                )
            
            # Get project members
            members_query = select(ProjectUser, User).join(
                User, ProjectUser.user_id == User.id
            ).where(
                and_(
                    ProjectUser.project_id == project_id,
                    ProjectUser.is_active == True
                )
            )
            
            members_result = await session.execute(members_query)
            members = members_result.all()
            
            project_members = []
            for member_data, user in members:
                project_members.append(ProjectMemberResponse(
                    user_id=user.id,
                    username=user.username,
                    email=user.email,
                    full_name=user.full_name,
                    role=member_data.role,
                    is_active=member_data.is_active,
                    joined_at=member_data.joined_at,
                    last_accessed=user.last_login
                ))
            
            return project_members
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting project members: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get project members: {str(e)}"
            )
    
    async def add_project_member(
        self,
        project_id: str,
        user_id: str,
        role: str,
        added_by_user_id: str,
        session: AsyncSession
    ) -> ProjectMemberResponse:
        """Add member to project"""
        try:
            # Check if user adding member has admin access
            admin_access = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.user_id == added_by_user_id,
                        ProjectUser.role == "admin",
                        ProjectUser.is_active == True
                    )
                )
            )
            
            if not admin_access.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to add project members"
                )
            
            # Check if user exists
            user_result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Check if user is already a member
            existing_member = await session.execute(
                select(ProjectUser).where(
                    and_(
                        ProjectUser.project_id == project_id,
                        ProjectUser.user_id == user_id
                    )
                )
            )
            
            if existing_member.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already a member of this project"
                )
            
            # Add member
            project_user = ProjectUser(
                user_id=user_id,
                project_id=project_id,
                role=role,
                is_active=True,
                joined_at=datetime.now(timezone.utc)
            )
            session.add(project_user)
            
            await session.commit()
            
            return ProjectMemberResponse(
                user_id=user.id,
                username=user.username,
                email=user.email,
                full_name=user.full_name,
                role=role,
                is_active=True,
                joined_at=datetime.now(timezone.utc),
                last_accessed=user.last_login
            )
            
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Error adding project member: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add project member: {str(e)}"
            )

# Global instance
projects_crud = ProjectsCRUD()
