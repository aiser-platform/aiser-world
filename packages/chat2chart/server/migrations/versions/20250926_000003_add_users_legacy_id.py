"""Add nullable legacy_id to users for migration compatibility

Revision ID: 20250926_000003
Revises: 20250926_000002
Create Date: 2025-09-26 10:35:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250926_000003'
down_revision = '20250926_000002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('legacy_id', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'legacy_id')


