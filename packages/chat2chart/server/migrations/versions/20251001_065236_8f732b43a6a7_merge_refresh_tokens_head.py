"""merge refresh_tokens head

Revision ID: 8f732b43a6a7
Revises: a6c88e9660a7, add_refresh_tokens_table_20251001
Create Date: 2025-10-01 06:52:36.750947

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f732b43a6a7'
down_revision: Union[str, None] = ('a6c88e9660a7', 'add_refresh_tokens_table_20251001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
