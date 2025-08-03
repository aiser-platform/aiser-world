import random
from uuid import UUID
from fastapi import HTTPException

from app.common.service import BaseService
from app.modules.tenants.db.models import OrganizationDB
from app.modules.tenants.db.repository import OrganizationDBRepository
from app.modules.tenants.db.schemas import (
    OrganizationDBCreate,
    OrganizationDBUpdate,
    OrganizationDBResponse,
)


class OrganizationDBService(
    BaseService[
        OrganizationDB,
        OrganizationDBCreate,
        OrganizationDBUpdate,
        OrganizationDBResponse,
    ]
):
    repository: OrganizationDBRepository

    def __init__(self):
        super().__init__(OrganizationDBRepository())

    async def generate_unique_db_name(self, org_id: UUID, max_attempts: int = 5) -> str:
        """
        Generate a unique database name for an organization.

        Args:
            org_id: Organization's UUID
            org_name: Organization's name
            max_attempts: Maximum number of attempts to generate unique name

        Returns:
            str: Generated unique database name

        Raises:
            HTTPException: If unable to generate unique name after max attempts
        """
        base_name = f"tenant_{str(org_id)[:8].lower()}"

        for _ in range(max_attempts):
            db_name = f"{base_name}_{random.randint(1000, 9999)}"
            if await self.repository.validate_db_name(db_name):
                return db_name

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate unique database name after {max_attempts} attempts",
        )

    async def get_by_tenant_id(self, tenant_id: UUID) -> OrganizationDBResponse:
        """Get database configuration by tenant ID"""
        db_config = await self.repository.get_by_tenant_id(tenant_id)
        if not db_config:
            raise HTTPException(
                status_code=404,
                detail="Database configuration not found for this organization",
            )
        return db_config

    async def update_db_name(
        self, tenant_id: UUID, new_db_name: str
    ) -> OrganizationDBResponse:
        """Update database name for an organization"""
        if not await self.repository.validate_db_name(new_db_name):
            raise HTTPException(status_code=400, detail="Database name already exists")

        db_config = await self.repository.get_by_tenant_id(tenant_id)
        if not db_config:
            raise HTTPException(
                status_code=404, detail="Database configuration not found"
            )

        return await self.repository.update(
            db_config.id, OrganizationDBUpdate(db_name=new_db_name)
        )

    async def get_active_connections(self) -> list[OrganizationDBResponse]:
        """Get all active database connections"""
        return await self.repository.get_active_connections()

    def get_connection_string(self, db_config: OrganizationDBResponse) -> str:
        """Generate database connection string"""
        from app.core.config import settings

        return (
            f"postgresql://{settings.SHARED_DB_USER}:{settings.SHARED_DB_PASSWORD}"
            f"@{settings.SHARED_DB_HOST}/{db_config.db_name}"
        )
