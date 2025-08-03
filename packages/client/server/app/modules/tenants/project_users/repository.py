from typing import List, Optional
from sqlalchemy import and_, or_
from uuid import UUID

from app.common.repository import BaseRepository
from app.modules.tenants.project_users.models import ProjectUser
from app.modules.tenants.project_users.schemas import (
    ProjectUserCreate,
    ProjectUserUpdate,
)
from app.modules.tenants.constants.tenant_enums import ProjectRole


class ProjectUserRepository(
    BaseRepository[ProjectUser, ProjectUserCreate, ProjectUserUpdate]
):
    def __init__(self):
        super().__init__(ProjectUser)

    async def get_by_user_and_project(
        self, user_id: UUID, project_id: UUID
    ) -> Optional[ProjectUser]:
        """Get project user by user ID and project ID"""
        return (
            self.db._session.query(self.model)
            .filter(
                and_(self.model.user_id == user_id, self.model.project_id == project_id)
            )
            .first()
        )

    async def get_project_users(
        self, project_id: UUID, role: Optional[ProjectRole] = None
    ) -> List[ProjectUser]:
        """Get all users in a project, optionally filtered by role"""
        query = self.db._session.query(self.model).filter(
            self.model.project_id == project_id
        )

        if role:
            query = query.filter(self.model.role == role)

        return query.all()

    async def get_user_projects(
        self, user_id: UUID, tenant_id: Optional[UUID] = None
    ) -> List[ProjectUser]:
        """Get all projects a user has access to"""
        query = self.db._session.query(self.model).filter(self.model.user_id == user_id)

        if tenant_id:
            query = query.filter(self.model.tenant_id == tenant_id)

        return query.all()

    async def update_user_role(
        self, user_id: UUID, project_id: UUID, new_role: ProjectRole
    ) -> Optional[ProjectUser]:
        """Update a user's role in a project"""
        project_user = await self.get_by_user_and_project(user_id, project_id)
        if project_user:
            project_user.role = new_role
            await self.db.commit()
            await self.db.refresh(project_user)
        return project_user

    async def remove_user_from_project(self, user_id: UUID, project_id: UUID) -> bool:
        """Remove a user from a project"""
        result = (
            self.db._session.query(self.model)
            .filter(
                and_(self.model.user_id == user_id, self.model.project_id == project_id)
            )
            .delete()
        )
        await self.db.commit()
        return result > 0

    async def get_users_by_roles(
        self, project_id: UUID, roles: List[ProjectRole]
    ) -> List[ProjectUser]:
        """Get users with specific roles in a project"""
        return (
            self.db._session.query(self.model)
            .filter(
                and_(self.model.project_id == project_id, self.model.role.in_(roles))
            )
            .all()
        )
