from app.common.repository import BaseRepository
from app.modules.tenants.organizations.models import Organization
from app.modules.tenants.organizations.schemas import (
    OrganizationCreateSchema,
    OrganizationUpdateSchema,
)


class OrganizationRepository(
    BaseRepository[Organization, OrganizationCreateSchema, OrganizationUpdateSchema]
):
    def __init__(self):
        super().__init__(Organization)
