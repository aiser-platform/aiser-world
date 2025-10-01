"""merge heads

Revision ID: bf451a69a027
Revises: migrate_users_to_uuid_001, 20250926_000002
Create Date: 2025-09-26 09:29:01.849751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf451a69a027'
down_revision: Union[str, None] = ('migrate_users_to_uuid_001', '20250926_000002')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
