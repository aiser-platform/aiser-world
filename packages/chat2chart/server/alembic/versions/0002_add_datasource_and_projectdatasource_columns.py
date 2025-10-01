"""add description and meta_info to data_sources; add timestamps to project_data_source

Revision ID: 0002_add_datasource_and_projectdatasource_columns
Revises: 0001_create_refresh_tokens_table
Create Date: 2025-09-30 21:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_add_datasource_and_projectdatasource_columns'
down_revision = '0001_create_refresh_tokens_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add description and meta_info to data_sources
    op.add_column('data_sources', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('data_sources', sa.Column('meta_info', sa.JSON(), nullable=True))

    # Add timestamp and is_deleted columns to project_data_source
    op.add_column('project_data_source', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('project_data_source', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('project_data_source', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('project_data_source', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade():
    op.drop_column('project_data_source', 'is_deleted')
    op.drop_column('project_data_source', 'deleted_at')
    op.drop_column('project_data_source', 'updated_at')
    op.drop_column('project_data_source', 'created_at')

    op.drop_column('data_sources', 'meta_info')
    op.drop_column('data_sources', 'description')




