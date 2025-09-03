"""Add projects table

Revision ID: add_projects_001
Revises: add_organizations_001
Create Date: 2025-09-03 00:00:02.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_projects_001'
down_revision = 'add_organizations_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create projects table
    op.create_table('projects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('settings', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_projects_organization_id', 'projects', ['organization_id'])
    op.create_index('idx_projects_created_by', 'projects', ['created_by'])
    op.create_index('idx_projects_is_active', 'projects', ['is_active'])
    op.create_index('idx_projects_is_public', 'projects', ['is_public'])


def downgrade() -> None:
    op.drop_index('idx_projects_is_public', table_name='projects')
    op.drop_index('idx_projects_is_active', table_name='projects')
    op.drop_index('idx_projects_created_by', table_name='projects')
    op.drop_index('idx_projects_organization_id', table_name='projects')
    op.drop_table('projects')
