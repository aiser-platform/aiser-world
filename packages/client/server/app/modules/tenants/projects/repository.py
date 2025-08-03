from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload

from app.common.repository import BaseRepository
from app.modules.tenants.projects.models import Project
from app.modules.tenants.project_users.models import ProjectUser


class ProjectRepository(BaseRepository[Project]):
    def __init__(self):
        super().__init__(Project)

    async def get_by_name(self, name: str) -> Optional[Project]:
        """Get project by name"""
        query = select(self.model).where(self.model.name == name)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def update_project_status(
        self, project_id: UUID, is_active: bool
    ) -> Optional[Project]:
        """Update project active status"""
        project = await self.get_by_id(project_id)
        if project:
            project.is_active = is_active
            await self.db.commit()
            await self.db.refresh(project)
        return project

    async def get_by_organization_id(self, organization_id: UUID) -> List[Project]:
        """Get all projects for an organization"""
        query = select(self.model).where(self.model.organization_id == organization_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_user_id(self, user_id: UUID) -> List[Project]:
        """Get all projects a user has access to"""
        query = (
            select(self.model)
            .join(ProjectUser, ProjectUser.project_id == self.model.id)
            .where(ProjectUser.user_id == user_id)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_user_and_organization(
        self, user_id: UUID, organization_id: UUID
    ) -> List[Project]:
        """Get all projects a user has access to in a specific organization"""
        query = (
            select(self.model)
            .join(ProjectUser, ProjectUser.project_id == self.model.id)
            .where(
                and_(
                    ProjectUser.user_id == user_id,
                    self.model.organization_id == organization_id,
                )
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_with_users(self, project_id: UUID) -> Optional[Project]:
        """Get a project with its users loaded"""
        query = (
            select(self.model)
            .where(self.model.id == project_id)
            .options(joinedload(self.model.users))
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_active_projects(
        self, organization_id: Optional[UUID] = None
    ) -> List[Project]:
        """Get all active projects, optionally filtered by organization"""
        filters = [self.model.is_active == True]

        if organization_id:
            filters.append(self.model.organization_id == organization_id)

        query = select(self.model).where(and_(*filters))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search_projects(
        self,
        search_term: str,
        organization_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Project]:
        """Search for projects by name or description"""
        filters = [
            or_(
                self.model.name.ilike(f"%{search_term}%"),
                self.model.description.ilike(f"%{search_term}%"),
            )
        ]

        if organization_id:
            filters.append(self.model.organization_id == organization_id)

        if user_id:
            query = (
                select(self.model)
                .join(ProjectUser, ProjectUser.project_id == self.model.id)
                .where(and_(*filters, ProjectUser.user_id == user_id))
            )
        else:
            query = select(self.model).where(and_(*filters))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_project_with_schema(
        self, project_data: Dict[str, Any], organization_id: UUID
    ) -> Project:
        """Create a project and generate its schema name"""
        # Generate schema name if not provided
        if "schema_name" not in project_data:
            # Create a deterministic schema name based on org ID
            schema_name = f"project_{str(organization_id).replace('-', '')[:8]}"
            project_data["schema_name"] = schema_name

        project_data["organization_id"] = organization_id
        return await self.create(project_data)
