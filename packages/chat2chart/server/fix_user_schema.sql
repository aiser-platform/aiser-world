-- Fix user table schema to match auth service expectations
-- This script adds missing columns and updates existing ones

-- Add missing columns that don't exist yet
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password VARCHAR(256) NOT NULL DEFAULT 'temp_password_change_me',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing columns to match expected schema
ALTER TABLE users 
ALTER COLUMN id TYPE INTEGER USING id::INTEGER,
ALTER COLUMN id SET DEFAULT nextval('users_id_seq'),
ALTER COLUMN username TYPE VARCHAR(50),
ALTER COLUMN email TYPE VARCHAR(100),
ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update existing users to have default values
UPDATE users SET 
    password = 'temp_password_change_me',
    is_verified = TRUE,
    verification_attempts = 0,
    is_active = TRUE,
    is_deleted = FALSE
WHERE password IS NULL;

-- Add constraints
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Commit the changes
COMMIT;
