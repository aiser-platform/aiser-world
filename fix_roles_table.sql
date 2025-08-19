-- Fix roles table structure by adding missing columns
-- This script adds the missing columns that the Role model expects

-- Add missing columns to roles table
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Update existing roles to have proper values
UPDATE roles SET is_active = true WHERE is_active IS NULL;
UPDATE roles SET is_deleted = false WHERE is_deleted IS NULL;

-- Insert default roles if they don't exist
INSERT INTO roles (name, description, permissions, is_system_role, created_at, updated_at, is_active, is_deleted) 
VALUES 
    ('owner', 'Organization owner with full access', '{"all": true}', true, NOW(), NOW(), true, false),
    ('admin', 'Organization administrator', '{"organization": ["read", "write"], "projects": ["read", "write"], "users": ["read", "write"]}', true, NOW(), NOW(), true, false),
    ('member', 'Organization member', '{"organization": ["read"], "projects": ["read", "write"]}', true, NOW(), NOW(), true, false),
    ('viewer', 'Organization viewer', '{"organization": ["read"], "projects": ["read"]}', true, NOW(), NOW(), true, false)
ON CONFLICT (name) DO NOTHING;

-- Verify the changes
SELECT 'Roles table fixed successfully' as status, COUNT(*) as role_count FROM roles;
