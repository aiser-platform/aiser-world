"""Add data sources table

Revision ID: add_data_sources_001
Revises: add_projects_001
Create Date: 2025-09-03 00:00:03.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_data_sources_001'
down_revision = 'add_projects_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create data_sources table
    op.create_table('data_sources',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('format', sa.String(), nullable=True),
        sa.Column('db_type', sa.String(), nullable=True),
        sa.Column('size', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('schema', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('connection_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('file_path', sa.String(), nullable=True),
        sa.Column('original_filename', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_accessed', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_data_sources_type', 'data_sources', ['type'])
    op.create_index('idx_data_sources_user_id', 'data_sources', ['user_id'])
    op.create_index('idx_data_sources_tenant_id', 'data_sources', ['tenant_id'])
    op.create_index('idx_data_sources_is_active', 'data_sources', ['is_active'])


def downgrade() -> None:
    op.drop_index('idx_data_sources_is_active', table_name='data_sources')
    op.drop_index('idx_data_sources_tenant_id', table_name='data_sources')
    op.drop_index('idx_data_sources_user_id', table_name='data_sources')
    op.drop_index('idx_data_sources_type', table_name='data_sources')
    op.drop_table('data_sources')
