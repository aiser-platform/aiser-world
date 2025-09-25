"""create refresh_tokens table

Revision ID: 0001_create_refresh_tokens_table
Revises: 
Create Date: 2025-09-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_create_refresh_tokens_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    import uuid

    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', PG_UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token', sa.String(length=1024), nullable=False, unique=True),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )


def downgrade():
    op.drop_table('refresh_tokens')


