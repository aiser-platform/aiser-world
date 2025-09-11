"""Unified schema synchronization between auth and chat2chart services

Revision ID: unified_schema_001
Revises: fix_migration_chain_001
Create Date: 2025-02-15 00:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "unified_schema_001"
down_revision = "fix_migration_chain_001"
branch_labels = None
depends_on = None


def upgrade():
    # Ensure users table has consistent schema
    # Add any missing columns that chat2chart expects
    op.execute("""
        DO $$
        BEGIN
            -- Add uuid_filename column to files table if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'files' AND column_name = 'uuid_filename'
            ) THEN
                ALTER TABLE files ADD COLUMN uuid_filename VARCHAR(255);
            END IF;
            
            -- Add content_type column to files table if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'files' AND column_name = 'content_type'
            ) THEN
                ALTER TABLE files ADD COLUMN content_type VARCHAR(100);
            END IF;
            
            -- Add storage_type column to files table if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'files' AND column_name = 'storage_type'
            ) THEN
                ALTER TABLE files ADD COLUMN storage_type VARCHAR(50) DEFAULT 'local';
            END IF;
            
            -- Add file_size column to files table if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'files' AND column_name = 'file_size'
            ) THEN
                ALTER TABLE files ADD COLUMN file_size BIGINT;
            END IF;
        END $$;
    """)

    # Create chat2chart specific tables if they don't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS chart (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            chart_type VARCHAR(100) NOT NULL,
            chart_config JSONB NOT NULL DEFAULT '{}',
            data_analysis JSONB,
            user_id INTEGER REFERENCES users(id),
            conversation_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            is_deleted BOOLEAN DEFAULT FALSE
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS chat_node (
            id SERIAL PRIMARY KEY,
            node_type VARCHAR(50) NOT NULL,
            content TEXT,
            metadata JSONB DEFAULT '{}',
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS conversation (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            is_deleted BOOLEAN DEFAULT FALSE
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS message (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            role VARCHAR(20) NOT NULL,
            conversation_id INTEGER REFERENCES conversation(id),
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE
        );
    """)

    # Add indexes for performance
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_chart_user_id ON chart(user_id);
        CREATE INDEX IF NOT EXISTS idx_chart_conversation_id ON chart(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_chat_node_user_id ON chat_node(user_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation(user_id);
        CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON message(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_message_user_id ON message(user_id);
        CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
    """)

    # Ensure all tables have consistent audit columns
    op.execute("""
        DO $$
        BEGIN
            -- Add audit columns to chart table if they don't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'chart' AND column_name = 'deleted_at'
            ) THEN
                ALTER TABLE chart ADD COLUMN deleted_at TIMESTAMP;
            END IF;
            
            -- Add audit columns to conversation table if they don't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'conversation' AND column_name = 'deleted_at'
            ) THEN
                ALTER TABLE conversation ADD COLUMN deleted_at TIMESTAMP;
            END IF;
        END $$;
    """)


def downgrade():
    # Drop indexes
    op.execute("""
        DROP INDEX IF EXISTS idx_chart_user_id;
        DROP INDEX IF EXISTS idx_chart_conversation_id;
        DROP INDEX IF EXISTS idx_chat_node_user_id;
        DROP INDEX IF EXISTS idx_conversation_user_id;
        DROP INDEX IF EXISTS idx_message_conversation_id;
        DROP INDEX IF EXISTS idx_message_user_id;
        DROP INDEX IF EXISTS idx_files_user_id;
    """)

    # Drop chat2chart specific tables
    op.execute("DROP TABLE IF EXISTS message CASCADE;")
    op.execute("DROP TABLE IF EXISTS conversation CASCADE;")
    op.execute("DROP TABLE IF EXISTS chat_node CASCADE;")
    op.execute("DROP TABLE IF EXISTS chart CASCADE;")

    # Remove added columns from files table
    op.execute("""
        ALTER TABLE files DROP COLUMN IF EXISTS uuid_filename;
        ALTER TABLE files DROP COLUMN IF EXISTS content_type;
        ALTER TABLE files DROP COLUMN IF EXISTS storage_type;
        ALTER TABLE files DROP COLUMN IF EXISTS file_size;
    """)
