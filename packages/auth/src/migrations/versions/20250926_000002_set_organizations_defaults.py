"""Ensure organizations.slug non-null and timestamps have defaults

Revision ID: 20250926_000002
Revises: 20250926_000001
Create Date: 2025-09-26 00:05:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250926_000002'
down_revision = '20250926_000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE organizations SET slug = LOWER(REGEXP_REPLACE(name, '\\s+', '-', 'g')) || '-' || substring(md5(id::text) from 1 for 6) WHERE slug IS NULL;"))
    conn.execute(sa.text("UPDATE organizations SET created_at = now() WHERE created_at IS NULL;"))
    op.alter_column('organizations', 'slug', existing_type=sa.String(length=50), nullable=False)
    op.alter_column('organizations', 'created_at', server_default=sa.text('now()'), existing_type=sa.DateTime(), nullable=False)


def downgrade() -> None:
    op.alter_column('organizations', 'created_at', server_default=None, existing_type=sa.DateTime())


