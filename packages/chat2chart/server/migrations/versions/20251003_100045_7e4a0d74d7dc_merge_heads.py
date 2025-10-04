"""merge heads

Revision ID: 7e4a0d74d7dc
Revises: add_refresh_tokens_indices_20251001, 8f732b43a6a7, add_user_profile_fields_20251002
Create Date: 2025-10-03 10:00:45.557446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e4a0d74d7dc'
down_revision: Union[str, None] = ('add_refresh_tokens_indices_20251001', '8f732b43a6a7', 'add_user_profile_fields_20251002')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
