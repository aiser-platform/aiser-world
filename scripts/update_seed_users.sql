-- Update seed users with default password and create organizations with plans
-- Default password for all users: FirstUsers@123
-- This script should be run after init-db.sql

-- Generate password hash using pbkdf2_sha256
-- You can generate this hash using: python3 -c "from passlib.hash import pbkdf2_sha256; print(pbkdf2_sha256.hash('FirstUsers@123'))"
-- Or use the auth service container: docker-compose exec auth-service python3 -c "from app.modules.authentication.auth import Auth; a = Auth(); print(a.hash_password('FirstUsers@123'))"

-- For now, we'll use a placeholder hash - replace with actual hash generated from the command above
-- Example hash format: $pbkdf2-sha256$29000$...

-- Update existing users with password (if they don't have one)
-- Note: This will only work if you have the actual hash. For development, you can:
-- 1. Sign up a test user with password "FirstUsers@123"
-- 2. Copy the hash from the database
-- 3. Use that hash here

-- Create organizations with different plan types
INSERT INTO organizations (name, slug, description, plan_type, ai_credits_limit, max_users, max_projects, max_storage_gb, is_active, is_deleted, created_at, updated_at)
VALUES 
    ('Free Plan Organization', 'free-org', 'Free tier organization for testing', 'free', 30, 1, 1, 5, true, false, NOW(), NOW()),
    ('Pro Plan Organization', 'pro-org', 'Pro tier organization for testing', 'pro', 300, 3, -1, 90, true, false, NOW(), NOW()),
    ('Team Plan Organization', 'team-org', 'Team tier organization for testing', 'team', 1000, 10, -1, 200, true, false, NOW(), NOW()),
    ('Enterprise Plan Organization', 'enterprise-org', 'Enterprise tier organization for testing', 'enterprise', 5000, 100, -1, 1000, true, false, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Update users with passwords (you need to replace the hash with actual generated hash)
-- For now, this is a template - uncomment and update with actual hash:
/*
UPDATE users 
SET password = '$pbkdf2-sha256$29000$...REPLACE_WITH_ACTUAL_HASH...' 
WHERE email IN ('admin@aiser.app', 'user@aiser.app', 'analyst@aiser.app')
AND (password IS NULL OR password = '');
*/

-- Link users to organizations (example - adjust based on your needs)
-- This assumes you want to assign users to different plan organizations
/*
INSERT INTO user_organizations (user_id, organization_id, role, is_active, created_at, updated_at)
SELECT 
    u.id,
    o.id,
    CASE 
        WHEN u.email = 'admin@aiser.app' THEN 'owner'
        ELSE 'member'
    END,
    true,
    NOW(),
    NOW()
FROM users u
CROSS JOIN organizations o
WHERE u.email IN ('admin@aiser.app', 'user@aiser.app', 'analyst@aiser.app')
AND o.slug = 'free-org'
ON CONFLICT DO NOTHING;
*/

-- Success message
SELECT 'Seed users and organizations updated! Remember to generate and update password hashes.' as status;





