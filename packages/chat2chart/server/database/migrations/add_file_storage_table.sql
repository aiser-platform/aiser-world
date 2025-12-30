-- Migration to create file_storage table for PostgreSQL BYTEA storage
-- This replaces local file storage with PostgreSQL-based object storage
-- 
-- To apply manually, run: psql -U aiser -d aiser_world -f <this_file>
-- Or use Alembic: alembic upgrade head (if converted to Alembic migration)

-- Create file_storage table for PostgreSQL BYTEA storage
CREATE TABLE IF NOT EXISTS file_storage (
    object_key VARCHAR PRIMARY KEY,  -- e.g., "user_files/<user_id>/<file_uuid>.<ext>"
    file_data BYTEA NOT NULL,         -- Binary file content
    file_size INTEGER NOT NULL,
    content_type VARCHAR,
    original_filename VARCHAR,
    user_id VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_is_active ON file_storage(is_active);

-- Note: file_path in data_sources now stores object_key (no schema change needed)
-- The semantic meaning of file_path has changed from local file path to object_key

-- Remove tenant_id from data_sources if not already removed
ALTER TABLE data_sources DROP COLUMN IF EXISTS tenant_id;

