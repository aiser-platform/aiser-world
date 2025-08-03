from uuid import UUID
from fastapi import HTTPException

from app.common.service import BaseService
from app.modules.tenants.organizations.models import Organization
from app.modules.tenants.organizations.repository import OrganizationRepository
from app.modules.tenants.organizations.schemas import (
    OrganizationCreateSchema,
    OrganizationResponseSchema,
    OrganizationUpdateSchema,
)
from app.modules.tenants.organization_users.schemas import OrganizationUserCreateSchema
from app.modules.tenants.constants.tenant_enums import OrganizationRole


class OrganizationService(
    BaseService[
        Organization,
        OrganizationCreateSchema,
        OrganizationUpdateSchema,
        OrganizationResponseSchema,
    ]
):
    repository: OrganizationRepository

    def __init__(self):
        super().__init__(OrganizationRepository())

    async def create_organization(
        self, data: OrganizationCreateSchema, owner_id: UUID
    ) -> OrganizationResponseSchema:
        """
        Create a new organization and assign the creator as owner.

        Args:
            data: Organization creation data
            owner_id: UUID of the user creating the organization

        Returns:
            OrganizationResponseSchema: Created organization
        """
        # Create the organization
        organization = await self.repository.create(data)

        # Add owner to organization_users
        from app.modules.tenants.organization_users.services import (
            OrganizationUserService,
        )

        org_user_service = OrganizationUserService()

        await org_user_service.add_user_to_organization(
            OrganizationUserCreateSchema(
                user_id=owner_id, tenant_id=organization.id, role=OrganizationRole.OWNER
            )
        )

        return organization

    async def update_organization(
        self, org_id: UUID, data: OrganizationUpdateSchema, user_id: UUID
    ) -> OrganizationResponseSchema:
        """
        Update organization details if user has proper permissions.

        Args:
            org_id: Organization ID to update
            data: Update data
            user_id: User attempting the update

        Returns:
            OrganizationResponseSchema: Updated organization
        """
        # Verify user has admin or owner role
        from app.modules.tenants.organization_users.services import (
            OrganizationUserService,
        )

        org_user_service = OrganizationUserService()

        user_orgs = await org_user_service.get_user_organizations(user_id)
        user_org = next((org for org in user_orgs if org.tenant_id == org_id), None)

        if not user_org or user_org.role not in [
            OrganizationRole.OWNER,
            OrganizationRole.ADMIN,
        ]:
            raise HTTPException(
                status_code=403,
                detail="User does not have permission to update this organization",
            )

        return await self.repository.update(org_id, data)

    async def delete_organization(self, org_id: UUID, user_id: UUID) -> bool:
        """
        Delete organization if user is owner.

        Args:
            org_id: Organization ID to delete
            user_id: User attempting the deletion

        Returns:
            bool: True if deleted successfully
        """
        # Verify user is owner
        from app.modules.tenants.organization_users.services import (
            OrganizationUserService,
        )

        org_user_service = OrganizationUserService()

        user_orgs = await org_user_service.get_user_organizations(user_id)
        user_org = next((org for org in user_orgs if org.tenant_id == org_id), None)

        if not user_org or user_org.role != OrganizationRole.OWNER:
            raise HTTPException(
                status_code=403,
                detail="Only organization owners can delete organizations",
            )

        return await self.repository.delete(org_id)

    async def get_user_organizations(
        self, user_id: UUID
    ) -> list[OrganizationResponseSchema]:
        """Get all organizations where user is a member"""
        from app.modules.tenants.organization_users.services import (
            OrganizationUserService,
        )

        org_user_service = OrganizationUserService()

        user_orgs = await org_user_service.get_user_organizations(user_id)
        return [await self.repository.get(org.tenant_id) for org in user_orgs]
