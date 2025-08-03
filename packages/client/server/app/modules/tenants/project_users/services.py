from uuid import UUID
from fastapi import HTTPException

from app.common.service import BaseService
from app.modules.tenants.constants.tenant_enums import ProjectRole
from app.modules.tenants.project_users.models import ProjectUser
from app.modules.tenants.project_users.repository import ProjectUserRepository
from app.modules.tenants.project_users.schemas import (
    ProjectUserCreate,
    ProjectUserUpdate,
    ProjectUserResponse,
    ProjectUserDetailResponse,
)


class ProjectUserService(
    BaseService[
        ProjectUser,
        ProjectUserCreate,
        ProjectUserUpdate,
        ProjectUserResponse,
    ]
):
    repository: ProjectUserRepository

    def __init__(self):
        super().__init__(ProjectUserRepository())

    async def add_user_to_project(self, data: ProjectUserCreate) -> ProjectUserResponse:
        """Add a user to a project with specified role"""
        # Check if user already exists in project
        existing = await self.repository.get_by_user_and_project(
            data.user_id, data.project_id
        )
        if existing:
            raise HTTPException(
                status_code=400, detail="User is already a member of this project"
            )

        return await self.repository.create(data)

    async def get_project_members(
        self, project_id: UUID
    ) -> list[ProjectUserDetailResponse]:
        """Get all members of a project"""
        return await self.repository.get_project_users(project_id)

    async def get_user_project_role(
        self, project_id: UUID, user_id: UUID
    ) -> ProjectUserResponse:
        """Get user's role in a specific project"""
        user_project = await self.repository.get_by_user_and_project(
            user_id, project_id
        )
        if not user_project:
            raise HTTPException(
                status_code=404, detail="User is not a member of this project"
            )
        return user_project

    async def update_user_role(
        self,
        project_id: UUID,
        user_id: UUID,
        new_role: ProjectRole,
        current_user_id: UUID,
    ) -> ProjectUserResponse:
        """Update a user's role in a project"""
        # Check if current user is admin
        current_user = await self.repository.get_by_user_and_project(
            current_user_id, project_id
        )
        if not current_user or current_user.role != ProjectRole.ADMIN:
            raise HTTPException(
                status_code=403, detail="Only project admins can update roles"
            )

        # Check if trying to change the last admin
        if new_role != ProjectRole.ADMIN:
            admins = await self.repository.get_users_by_roles(
                project_id, [ProjectRole.ADMIN]
            )
            if len(admins) == 1 and admins[0].user_id == user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot change role of the last project admin",
                )

        result = await self.repository.update_user_role(user_id, project_id, new_role)
        if not result:
            raise HTTPException(status_code=404, detail="User not found in project")
        return result

    async def remove_user_from_project(
        self, project_id: UUID, user_id: UUID, current_user_id: UUID
    ) -> bool:
        """Remove a user from a project"""
        # Check if current user is admin
        current_user = await self.repository.get_by_user_and_project(
            current_user_id, project_id
        )
        if not current_user or current_user.role != ProjectRole.ADMIN:
            raise HTTPException(
                status_code=403, detail="Only project admins can remove users"
            )

        # Prevent removing the last admin
        if user_id == current_user_id:
            admins = await self.repository.get_users_by_roles(
                project_id, [ProjectRole.ADMIN]
            )
            if len(admins) == 1:
                raise HTTPException(
                    status_code=400, detail="Cannot remove the last project admin"
                )

        return await self.repository.remove_user_from_project(user_id, project_id)

    async def get_user_projects(
        self, user_id: UUID, tenant_id: UUID = None
    ) -> list[ProjectUserResponse]:
        """Get all projects a user belongs to"""
        return await self.repository.get_user_projects(user_id, tenant_id)
