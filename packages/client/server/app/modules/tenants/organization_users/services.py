from uuid import UUID
from fastapi import HTTPException

from app.common.service import BaseService
from app.modules.tenants.constants.tenant_enums import OrganizationRole
from app.modules.tenants.organization_users.models import OrganizationUser
from app.modules.tenants.organization_users.repository import OrganizationUserRepository
from app.modules.tenants.organization_users.schemas import (
    OrganizationUserCreateSchema,
    OrganizationUserResponseSchema,
    OrganizationUserUpdateSchema,
)


class OrganizationUserService(
    BaseService[
        OrganizationUser,
        OrganizationUserCreateSchema,
        OrganizationUserUpdateSchema,
        OrganizationUserResponseSchema,
    ]
):
    repository: OrganizationUserRepository

    def __init__(self):
        super().__init__(OrganizationUserRepository())

    async def add_user_to_organization(
        self, data: OrganizationUserCreateSchema
    ) -> OrganizationUserResponseSchema:
        """Add a user to an organization with specified role"""
        # Check if user already exists in organization
        existing = await self.repository.get_by_user_and_tenant(
            data.user_id, data.tenant_id
        )
        if existing:
            raise HTTPException(
                status_code=400, detail="User is already a member of this organization"
            )

        return await self.repository.create(data)

    async def get_organization_members(
        self, tenant_id: UUID
    ) -> list[OrganizationUserResponseSchema]:
        """Get all members of an organization"""
        return await self.repository.get_users_by_tenant(tenant_id)

    async def get_user_organizations(
        self, user_id: UUID
    ) -> list[OrganizationUserResponseSchema]:
        """Get all organizations a user belongs to"""
        return await self.repository.get_user_organizations(user_id)

    async def get_organization_admins(
        self, tenant_id: UUID
    ) -> list[OrganizationUserResponseSchema]:
        """Get all admin users in an organization"""
        return await self.repository.get_users_by_role(
            tenant_id, OrganizationRole.ADMIN
        )

    async def update_user_role(
        self, tenant_id: UUID, user_id: UUID, new_role: OrganizationRole
    ) -> OrganizationUserResponseSchema:
        """Update a user's role in an organization"""
        # Check if trying to change the last owner
        if new_role != OrganizationRole.OWNER:
            current_owners = await self.repository.get_users_by_role(
                tenant_id, OrganizationRole.OWNER
            )
            if len(current_owners) == 1 and current_owners[0].user_id == user_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot change role of the last organization owner",
                )

        result = await self.repository.update_user_role(user_id, tenant_id, new_role)
        if not result:
            raise HTTPException(
                status_code=404, detail="User not found in organization"
            )
        return result

    async def remove_user_from_organization(
        self, tenant_id: UUID, user_id: UUID
    ) -> bool:
        """Remove a user from an organization"""
        # Check if trying to remove the last owner
        user = await self.repository.get_by_user_and_tenant(user_id, tenant_id)
        if not user:
            raise HTTPException(
                status_code=404, detail="User not found in organization"
            )

        if user.role == OrganizationRole.OWNER:
            owners = await self.repository.get_users_by_role(
                tenant_id, OrganizationRole.OWNER
            )
            if len(owners) == 1:
                raise HTTPException(
                    status_code=400, detail="Cannot remove the last organization owner"
                )

        return await self.repository.remove_user_from_organization(user_id, tenant_id)

    async def transfer_ownership(
        self, tenant_id: UUID, current_owner_id: UUID, new_owner_id: UUID
    ) -> tuple[OrganizationUserResponseSchema, OrganizationUserResponseSchema]:
        """
        Transfer organization ownership from current owner to new owner.

        Args:
            tenant_id: Organization/Tenant ID
            current_owner_id: Current owner's user ID
            new_owner_id: New owner's user ID

        Returns:
            tuple: (Updated previous owner, Updated new owner)

        Raises:
            HTTPException: If transfer conditions are not met
        """
        # Verify current owner
        current_owner = await self.repository.get_by_user_and_tenant(
            current_owner_id, tenant_id
        )
        if not current_owner or current_owner.role != OrganizationRole.OWNER:
            raise HTTPException(
                status_code=400, detail="Specified user is not the current owner"
            )

        # Verify new owner exists in organization
        new_owner = await self.repository.get_by_user_and_tenant(
            new_owner_id, tenant_id
        )
        if not new_owner:
            raise HTTPException(
                status_code=404, detail="New owner is not a member of this organization"
            )

        # Perform the transfer
        new_owner_updated = await self.repository.update_user_role(
            new_owner_id, tenant_id, OrganizationRole.OWNER
        )
        previous_owner_updated = await self.repository.update_user_role(
            current_owner_id, tenant_id, OrganizationRole.ADMIN
        )

        return previous_owner_updated, new_owner_updated
