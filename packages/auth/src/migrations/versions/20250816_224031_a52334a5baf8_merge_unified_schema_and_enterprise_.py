"""merge unified_schema and enterprise branches

Revision ID: a52334a5baf8
Revises: unified_schema_001, enterprise_001
Create Date: 2025-08-16 22:40:31.408444

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "a52334a5baf8"
down_revision: Union[str, None] = ("unified_schema_001", "enterprise_001")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
