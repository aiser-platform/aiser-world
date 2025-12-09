"""Add avatar_url column to users table

Revision ID: 20250123_add_avatar_url
Revises: 
Create Date: 2025-01-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250123_add_avatar_url'
down_revision = '20250122_make_conversation_id_nullable_in_saved_asset'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Check if column already exists before adding
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'avatar_url' not in columns:
        op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
        op.create_index(op.f('ix_users_avatar_url'), 'users', ['avatar_url'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_users_avatar_url'), table_name='users')
    op.drop_column('users', 'avatar_url')

