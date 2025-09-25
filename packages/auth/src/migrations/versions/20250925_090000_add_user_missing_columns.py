"""add missing user columns

Revision ID: 20250925_090000_add_user_missing_columns
Revises: 
Create Date: 2025-09-25 09:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250925_090000_add_user_missing_columns'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing user columns needed by auth-service and downstream services.
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('users')]

    if 'password' not in cols:
        op.add_column('users', sa.Column('password', sa.Text(), nullable=True))

    if 'is_active' not in cols:
        op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default=sa.sql.expression.true(), nullable=False))

    if 'legacy_id' not in cols:
        op.add_column('users', sa.Column('legacy_id', sa.BigInteger(), nullable=True))

    if 'deleted_at' not in cols:
        op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))

    if 'is_deleted' not in cols:
        op.add_column('users', sa.Column('is_deleted', sa.Boolean(), server_default=sa.sql.expression.false(), nullable=False))


def downgrade() -> None:
    # Attempt to remove columns if they exist (safe for dev only)
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('users')]

    if 'is_deleted' in cols:
        op.drop_column('users', 'is_deleted')
    if 'deleted_at' in cols:
        op.drop_column('users', 'deleted_at')
    if 'legacy_id' in cols:
        op.drop_column('users', 'legacy_id')
    if 'is_active' in cols:
        op.drop_column('users', 'is_active')
    if 'password' in cols:
        op.drop_column('users', 'password')


