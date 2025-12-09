"""tenancy constants

Revision ID: 59c80afc9229
Revises:
Create Date: 2025-02-26 11:33:47.119213

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.modules.tenants.constants.tenant_enums import OrganizationRole, ProjectRole

# revision identifiers, used by Alembic.
revision: str = "59c80afc9229"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create organization role enum
    organization_role_enum = sa.Enum(OrganizationRole, name="organization_role_enum")
    organization_role_enum.create(op.get_bind())

    # Create project role enum
    project_role_enum = sa.Enum(ProjectRole, name="project_role_enum")
    project_role_enum.create(op.get_bind())


def downgrade() -> None:
    # Drop project role enum
    sa.Enum(name="project_role_enum").drop(op.get_bind())

    # Drop organization role enum
    sa.Enum(name="organization_role_enum").drop(op.get_bind())
