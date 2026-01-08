"""Initial migration for four core tables

Revision ID: initial_four_tables
Create Date: 2026-01-05 14:03:08

This migration creates the four core tables matching the exact database schema:
- conversation (with UUID id and user_id)
- message (with UUID id and conversation_id)
- data_sources
- file_storage
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'initial_four_tables'
down_revision = None  # This is the initial migration (previous migration was deleted)
branch_labels = None
depends_on = None


def upgrade():
    # Enable uuid-ossp extension for uuid_generate_v4()
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    
    # Create conversation table (matches BaseModel defaults)
    op.create_table(
        'conversation',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, server_default=sa.text("'active'")),
        sa.Column('type', sa.String(length=50), nullable=True, server_default=sa.text("'chat2chart'")),
        sa.Column('json_metadata', sa.Text(), nullable=True),
        # BaseModel: timezone=True, nullable=True, server_default=func.current_timestamp()
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.current_timestamp()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        # BaseModel: nullable=True, server_default=text("true"/"false")
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for conversation
    op.create_index('idx_conversation_user_id', 'conversation', ['user_id'])
    op.create_index('idx_conversation_created_at', 'conversation', ['created_at'])
    
    # Create trigger function for updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    
    # Create trigger for conversation.updated_at
    op.execute("""
        DROP TRIGGER IF EXISTS update_conversation_updated_at ON conversation;
        CREATE TRIGGER update_conversation_updated_at 
            BEFORE UPDATE ON conversation
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)
    
    # Create message table
    op.create_table(
        'message',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('query', sa.Text(), nullable=True),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('ai_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        # Override: NOT NULL, no defaults (timezone=True to match BaseModel)
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        # Inherits from BaseModel: nullable=True
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversation.id'], name='message_conversation_id_fkey'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create data_sources table
    op.create_table(
        'data_sources',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('format', sa.String(), nullable=True),
        sa.Column('db_type', sa.String(), nullable=True),
        sa.Column('size', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('schema', sa.JSON(), nullable=True),
        sa.Column('sample_data', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('connection_config', sa.JSON(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=True),
        sa.Column('original_filename', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_accessed', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index for data_sources
    op.create_index('ix_data_sources_id', 'data_sources', ['id'])
    
    # Create file_storage table
    op.create_table(
        'file_storage',
        sa.Column('object_key', sa.String(), nullable=False),
        sa.Column('file_data', postgresql.BYTEA(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=True),
        sa.Column('original_filename', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('object_key')
    )
    
    # Create indexes for file_storage
    op.create_index('ix_file_storage_object_key', 'file_storage', ['object_key'])
    op.create_index('ix_file_storage_user_id', 'file_storage', ['user_id'])


def downgrade():
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_index('ix_file_storage_user_id', table_name='file_storage')
    op.drop_index('ix_file_storage_object_key', table_name='file_storage')
    op.drop_table('file_storage')
    
    op.drop_index('ix_data_sources_id', table_name='data_sources')
    op.drop_table('data_sources')
    
    op.drop_table('message')
    
    op.execute("DROP TRIGGER IF EXISTS update_conversation_updated_at ON conversation;")
    op.drop_index('idx_conversation_created_at', table_name='conversation')
    op.drop_index('idx_conversation_user_id', table_name='conversation')
    op.drop_table('conversation')
    
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")