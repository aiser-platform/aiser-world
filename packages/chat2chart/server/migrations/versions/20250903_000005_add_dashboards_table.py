"""Add dashboards table

Revision ID: add_dashboards_001
Revises: add_project_data_source_001
Create Date: 2025-09-03 00:00:05.000000

"""
from alembic import op  # type: ignore[reportMissingImports]
import sqlalchemy as sa  # type: ignore[reportMissingImports]
from sqlalchemy.dialects import postgresql  # type: ignore[reportMissingImports]

# revision identifiers, used by Alembic.
revision = 'add_dashboards_001'
down_revision = 'add_project_data_source_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create dashboards table
    op.create_table('dashboards',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('layout_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('theme_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('global_filters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('refresh_interval', sa.Integer(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_template', sa.Boolean(), nullable=True),
        sa.Column('max_widgets', sa.Integer(), nullable=True),
        sa.Column('max_pages', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=True),
        sa.Column('last_viewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_dashboards_project_id', 'dashboards', ['project_id'])
    op.create_index('idx_dashboards_created_by', 'dashboards', ['created_by'])
    op.create_index('idx_dashboards_is_active', 'dashboards', ['is_active'])
    op.create_index('idx_dashboards_is_public', 'dashboards', ['is_public'])


def downgrade() -> None:
    op.drop_index('idx_dashboards_is_public', table_name='dashboards')
    op.drop_index('idx_dashboards_is_active', table_name='dashboards')
    op.drop_index('idx_dashboards_created_by', table_name='dashboards')
    op.drop_index('idx_dashboards_project_id', table_name='dashboards')
    op.drop_table('dashboards')
