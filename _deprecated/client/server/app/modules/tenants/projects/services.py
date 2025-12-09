from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException

from app.common.service import BaseService
from app.modules.tenants.projects.models import Project
from app.modules.tenants.projects.repository import ProjectRepository
from app.modules.tenants.projects.schemas import (
    ProjectCreateSchema,
    ProjectUpdateSchema,
    ProjectResponseSchema,
)
from app.modules.tenants.project_users.schemas import ProjectUserCreate
from app.modules.tenants.constants.tenant_enums import ProjectRole


class ProjectService(
    BaseService[
        Project,
        ProjectCreateSchema,
        ProjectUpdateSchema,
        ProjectResponseSchema,
    ]
):
    repository: ProjectRepository

    def __init__(self):
        self.repository = ProjectRepository()

    async def create_project(
        self, project_data: ProjectCreateSchema, user_id: UUID, organization_id: UUID
    ) -> ProjectResponseSchema:
        """Create a new project with organization connection and add the creator as admin"""

        # Generate a schema name for the project (used for multi-tenant schema)
        schema_name = f"project_{UUID(organization_id).hex[:8]}"

        # Set organization_id and schema_name in the project data
        project_dict = project_data.dict()
        project_dict["organization_id"] = organization_id
        project_dict["schema_name"] = schema_name

        # Create the project
        project = await self.repository.create(project_dict)

        # Add the creator as a project admin
        from app.modules.tenants.project_users.services import ProjectUserService

        project_user_service = ProjectUserService()

        user_data = ProjectUserCreate(
            project_id=project.id, user_id=user_id, role=ProjectRole.ADMIN
        )

        await project_user_service.add_user_to_project(user_data)

        return ProjectResponseSchema.from_orm(project)

    async def get_user_projects(
        self, user_id: UUID, organization_id: Optional[UUID] = None
    ) -> List[ProjectResponseSchema]:
        """Get all projects a user has access to, optionally filtered by organization"""

        # Build filters
        filters = [Project.users.any(user_id=user_id)]

        if organization_id:
            filters.append(Project.organization_id == organization_id)

        # Get projects
        projects = await self.repository.get_by_filters(filters)

        return [ProjectResponseSchema.from_orm(project) for project in projects]

    async def update_project(
        self, project_id: UUID, project_data: ProjectUpdateSchema, user_id: UUID
    ) -> ProjectResponseSchema:
        """Update a project if the user has admin access"""

        # Check if user has admin access
        from app.modules.tenants.project_users.services import ProjectUserService

        project_user_service = ProjectUserService()

        user_role = await project_user_service.get_user_project_role(
            project_id, user_id
        )
        if user_role.role != ProjectRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Only project admins can update project details",
            )

        # Update the project
        project = await self.repository.update(
            project_id, project_data.dict(exclude_unset=True)
        )

        return ProjectResponseSchema.from_orm(project)

    async def delete_project(self, project_id: UUID, user_id: UUID) -> dict:
        """Delete a project if the user has admin access"""

        # Check if user has admin access
        from app.modules.tenants.project_users.services import ProjectUserService

        project_user_service = ProjectUserService()

        user_role = await project_user_service.get_user_project_role(
            project_id, user_id
        )
        if user_role.role != ProjectRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Only project admins can delete projects",
            )

        # Delete the project
        await self.repository.delete(project_id)

        return {"message": "Project successfully deleted"}

    async def search_projects(
        self, search_term: str, tenant_id: Optional[UUID] = None
    ) -> list[ProjectResponseSchema]:
        """
        Search projects by name or description.
        """
        return await self.repository.search_projects(search_term, tenant_id)
