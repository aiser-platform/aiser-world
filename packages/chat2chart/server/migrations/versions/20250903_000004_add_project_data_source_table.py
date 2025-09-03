"""Add project_data_source table

Revision ID: add_project_data_source_001
Revises: add_data_sources_001
Create Date: 2025-09-03 00:00:04.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_project_data_source_001'
down_revision = 'add_data_sources_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create project_data_source table
    op.create_table('project_data_source',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('data_source_id', sa.String(), nullable=False),
        sa.Column('data_source_type', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_project_data_source_project_id', 'project_data_source', ['project_id'])
    op.create_index('idx_project_data_source_data_source_id', 'project_data_source', ['data_source_id'])
    op.create_index('idx_project_data_source_is_active', 'project_data_source', ['is_active'])


def downgrade() -> None:
    op.drop_index('idx_project_data_source_is_active', table_name='project_data_source')
    op.drop_index('idx_project_data_source_data_source_id', table_name='project_data_source')
    op.drop_index('idx_project_data_source_project_id', table_name='project_data_source')
    op.drop_table('project_data_source')
