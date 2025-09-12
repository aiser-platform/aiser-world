"""Add dashboard_embeds table

Revision ID: add_dashboard_embeds_001
Revises: add_query_snapshots_001
Create Date: 2025-09-03 00:00:10.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_dashboard_embeds_001'
down_revision = 'add_query_snapshots_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'dashboard_embeds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('dashboard_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('embed_token', sa.String(length=255), nullable=False),
        sa.Column('options', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('access_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
    )
    op.create_index('idx_dashboard_embeds_token', 'dashboard_embeds', ['embed_token'])


def downgrade() -> None:
    op.drop_index('idx_dashboard_embeds_token', table_name='dashboard_embeds')
    op.drop_table('dashboard_embeds')


