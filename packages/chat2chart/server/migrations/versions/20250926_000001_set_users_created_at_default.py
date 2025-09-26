"""Set server default for users.created_at and populate NULLs

Revision ID: 20250926_000001
Revises: 
Create Date: 2025-09-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250926_000001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Populate existing NULLs safely, then set a DB server default
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE users SET created_at = now() WHERE created_at IS NULL;"))
    # ALTER column to set server default
    op.alter_column('users', 'created_at', server_default=sa.text('now()'), existing_type=sa.DateTime(), nullable=False)


def downgrade() -> None:
    # Remove server default but keep existing values
    op.alter_column('users', 'created_at', server_default=None, existing_type=sa.DateTime())


