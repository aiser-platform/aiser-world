from typing import Optional
from app.common.repository import BaseRepository
from app.modules.tenants.db.models import OrganizationDB
from app.modules.tenants.db.schemas import OrganizationDBCreate, OrganizationDBUpdate


class OrganizationDBRepository(
    BaseRepository[OrganizationDB, OrganizationDBCreate, OrganizationDBUpdate]
):
    def __init__(self):
        super().__init__(OrganizationDB)

    async def get_by_tenant_id(self, tenant_id: str) -> Optional[OrganizationDB]:
        """Get database configuration by tenant ID"""
        return (
            self.db._session.query(self.model)
            .filter(self.model.tenant_id == tenant_id)
            .first()
        )

    async def get_active_connections(self) -> list[OrganizationDB]:
        """Get all active database connections"""
        return (
            self.db._session.query(self.model)
            .filter(self.model.is_active == True)
            .all()
        )

    async def validate_db_name(self, db_name: str) -> bool:
        """Check if database name is already in use"""
        exists = (
            self.db._session.query(self.model)
            .filter(self.model.db_name == db_name)
            .first()
        )
        return exists is None
