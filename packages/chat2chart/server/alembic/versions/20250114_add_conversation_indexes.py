"""Add indexes for conversation and message tables

Revision ID: 20250114_add_conversation_indexes
Revises: 20251111_add_user_settings_table
Create Date: 2025-01-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250114_add_conversation_indexes'
down_revision = '20251111_add_user_settings_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add indexes for conversation table
    op.create_index(
        'idx_conversation_updated_at',
        'conversation',
        ['updated_at'],
        postgresql_ops={'updated_at': 'DESC'},
        unique=False
    )
    
    op.create_index(
        'idx_conversation_active_deleted',
        'conversation',
        ['is_active', 'is_deleted'],
        unique=False,
        postgresql_where=sa.text('is_deleted = false OR is_deleted IS NULL')
    )
    
    # Add GIN index for JSONB fields (agent_context, langchain_memory)
    op.create_index(
        'idx_conversation_agent_context_gin',
        'conversation',
        ['agent_context'],
        unique=False,
        postgresql_using='gin'
    )
    
    op.create_index(
        'idx_conversation_langchain_memory_gin',
        'conversation',
        ['langchain_memory'],
        unique=False,
        postgresql_using='gin'
    )
    
    # Add full-text search index for title
    op.execute("""
        CREATE INDEX idx_conversation_title_search 
        ON conversation 
        USING GIN (to_tsvector('english', title))
    """)
    
    # Add indexes for message table
    op.create_index(
        'idx_message_conversation_id',
        'message',
        ['conversation_id'],
        unique=False
    )
    
    op.create_index(
        'idx_message_conversation_created',
        'message',
        ['conversation_id', 'created_at'],
        unique=False,
        postgresql_ops={'created_at': 'DESC'}
    )
    
    # Add GIN index for ai_metadata JSONB field
    op.create_index(
        'idx_message_ai_metadata_gin',
        'message',
        ['ai_metadata'],
        unique=False,
        postgresql_using='gin'
    )


def downgrade():
    # Drop indexes in reverse order
    op.drop_index('idx_message_ai_metadata_gin', table_name='message')
    op.drop_index('idx_message_conversation_created', table_name='message')
    op.drop_index('idx_message_conversation_id', table_name='message')
    op.execute('DROP INDEX IF EXISTS idx_conversation_title_search')
    op.drop_index('idx_conversation_langchain_memory_gin', table_name='conversation')
    op.drop_index('idx_conversation_agent_context_gin', table_name='conversation')
    op.drop_index('idx_conversation_active_deleted', table_name='conversation')
    op.drop_index('idx_conversation_updated_at', table_name='conversation')


