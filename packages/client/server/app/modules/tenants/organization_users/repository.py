from typing import List, Optional
from sqlalchemy import and_
from uuid import UUID

from app.common.repository import BaseRepository
from app.modules.tenants.organization_users.models import OrganizationUser
from app.modules.tenants.organization_users.schemas import (
    OrganizationUserCreate,
    OrganizationUserUpdate,
)
from app.modules.tenants.constants.tenant_enums import OrganizationRole


class OrganizationUserRepository(
    BaseRepository[OrganizationUser, OrganizationUserCreate, OrganizationUserUpdate]
):
    def __init__(self):
        super().__init__(OrganizationUser)

    async def get_by_user_and_tenant(
        self, user_id: UUID, tenant_id: UUID
    ) -> Optional[OrganizationUser]:
        """Get organization user by user ID and tenant ID"""
        return (
            self.db._session.query(self.model)
            .filter(
                and_(self.model.user_id == user_id, self.model.tenant_id == tenant_id)
            )
            .first()
        )

    async def get_users_by_tenant(self, tenant_id: UUID) -> List[OrganizationUser]:
        """Get all users in an organization"""
        return (
            self.db._session.query(self.model)
            .filter(self.model.tenant_id == tenant_id)
            .all()
        )

    async def get_users_by_role(
        self, tenant_id: UUID, role: OrganizationRole
    ) -> List[OrganizationUser]:
        """Get all users with a specific role in an organization"""
        return (
            self.db._session.query(self.model)
            .filter(and_(self.model.tenant_id == tenant_id, self.model.role == role))
            .all()
        )

    async def get_user_organizations(self, user_id: UUID) -> List[OrganizationUser]:
        """Get all organizations a user belongs to"""
        return (
            self.db._session.query(self.model)
            .filter(self.model.user_id == user_id)
            .all()
        )

    async def update_user_role(
        self, user_id: UUID, tenant_id: UUID, new_role: OrganizationRole
    ) -> Optional[OrganizationUser]:
        """Update a user's role in an organization"""
        org_user = await self.get_by_user_and_tenant(user_id, tenant_id)
        if org_user:
            org_user.role = new_role
            self.db.commit()
            self.db.refresh(org_user)
        return org_user

    async def remove_user_from_organization(
        self, user_id: UUID, tenant_id: UUID
    ) -> bool:
        """Remove a user from an organization"""
        result = (
            self.db._session.query(self.model)
            .filter(
                and_(self.model.user_id == user_id, self.model.tenant_id == tenant_id)
            )
            .delete()
        )
        self.db.commit()
        return result > 0
