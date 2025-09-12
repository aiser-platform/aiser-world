"""Add query_snapshots table

Revision ID: add_query_snapshots_001
Revises: add_roles_001
Create Date: 2025-09-03 00:00:08.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_query_snapshots_001'
down_revision = 'add_roles_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('query_snapshots',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('data_source_id', sa.String(length=255), nullable=True),
        sa.Column('sql', sa.Text(), nullable=True),
        sa.Column('columns', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('rows', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_query_snapshots_scope', 'query_snapshots', ['user_id', 'organization_id', 'project_id'])


def downgrade() -> None:
    op.drop_index('idx_query_snapshots_scope', table_name='query_snapshots')
    op.drop_table('query_snapshots')


