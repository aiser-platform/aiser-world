"""merge new legacy_id migration

Revision ID: a6c88e9660a7
Revises: bf451a69a027, 20250926_000003
Create Date: 2025-09-26 10:44:53.523994

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6c88e9660a7'
down_revision: Union[str, None] = ('bf451a69a027', '20250926_000003')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
