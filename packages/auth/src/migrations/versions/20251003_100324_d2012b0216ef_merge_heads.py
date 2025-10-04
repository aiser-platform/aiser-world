"""merge heads

Revision ID: d2012b0216ef
Revises: 20250925_081500_add_user_verification_fields, 20250925_102000_populate_user_fks_from_legacy, 20250926_000002
Create Date: 2025-10-03 10:03:24.622553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2012b0216ef'
down_revision: Union[str, None] = ('20250925_081500_add_user_verification_fields', '20250925_102000_populate_user_fks_from_legacy', '20250926_000002')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
