"""Create saved_asset table for Asset Library

Revision ID: 20250114_create_saved_assets_table
Revises: None
Create Date: 2025-01-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250114_create_saved_assets_table'
down_revision = None  # Base migration for alembic_c2c chain
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'saved_asset',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('asset_type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', postgresql.JSONB(), nullable=False),
        sa.Column('thumbnail', sa.Text(), nullable=True),
        sa.Column('data_source_id', sa.String(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversation.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['message_id'], ['message.id'], ondelete='SET NULL'),
    )
    
    # Add indexes
    op.create_index('idx_saved_asset_conversation_id', 'saved_asset', ['conversation_id'])
    op.create_index('idx_saved_asset_type', 'saved_asset', ['asset_type'])
    op.create_index('idx_saved_asset_data_source', 'saved_asset', ['data_source_id'])
    op.create_index('idx_saved_asset_created_at', 'saved_asset', ['created_at'], postgresql_ops={'created_at': 'DESC'})
    op.create_index('idx_saved_asset_active_deleted', 'saved_asset', ['is_active', 'is_deleted'], 
                    postgresql_where=sa.text('is_deleted = false OR is_deleted IS NULL'))
    op.create_index('idx_saved_asset_content_gin', 'saved_asset', ['content'], postgresql_using='gin')


def downgrade():
    op.drop_index('idx_saved_asset_content_gin', table_name='saved_asset')
    op.drop_index('idx_saved_asset_active_deleted', table_name='saved_asset')
    op.drop_index('idx_saved_asset_created_at', table_name='saved_asset')
    op.drop_index('idx_saved_asset_data_source', table_name='saved_asset')
    op.drop_index('idx_saved_asset_type', table_name='saved_asset')
    op.drop_index('idx_saved_asset_conversation_id', table_name='saved_asset')
    op.drop_table('saved_asset')





