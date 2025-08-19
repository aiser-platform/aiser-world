-- Insert default roles for Aiser Platform
-- This script creates the basic roles needed for organization management

-- Check if roles table exists and insert default roles
INSERT INTO roles (name, description, permissions, is_system_role, created_at, updated_at) 
VALUES 
    ('owner', 'Organization owner with full access', '{"all": true}', true, NOW(), NOW()),
    ('admin', 'Organization administrator', '{"organization": ["read", "write"], "projects": ["read", "write"], "users": ["read", "write"]}', true, NOW(), NOW()),
    ('member', 'Organization member', '{"organization": ["read"], "projects": ["read", "write"]}', true, NOW(), NOW()),
    ('viewer', 'Organization viewer', '{"organization": ["read"], "projects": ["read"]}', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Verify the roles were created
SELECT 'Default roles created successfully' as status, COUNT(*) as role_count FROM roles;
