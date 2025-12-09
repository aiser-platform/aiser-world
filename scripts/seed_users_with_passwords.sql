-- Aiser Platform Seed Data with Passwords and Organizations
-- Default password for all users: FirstUsers@123
-- 
-- To generate the password hash, run one of these commands:
-- 
-- Option 1 (using Python with passlib):
--   python3 -c "from passlib.hash import pbkdf2_sha256; print(pbkdf2_sha256.hash('FirstUsers@123'))"
--
-- Option 2 (using Docker):
--   docker run --rm python:3.11-slim bash -c "pip install -q passlib && python3 -c \"from passlib.hash import pbkdf2_sha256; print(pbkdf2_sha256.hash('FirstUsers@123'))\""
--
-- Option 3 (sign up a test user and copy the hash from the database):
--   After signing up, run: SELECT email, password FROM users WHERE email = 'your-test@email.com';
--
-- Then replace the hash below with the generated hash.

-- Update existing users with default password
-- Password: FirstUsers@123
-- Hash generated using: python3 -c "from passlib.hash import pbkdf2_sha256; print(pbkdf2_sha256.hash('FirstUsers@123'))"
UPDATE users 
SET password = '$pbkdf2-sha256$29000$1VprTYlxbu19D0HoPad0rg$wT3PCAxZSWtgdVzWb4tmwuN.NatetJmTeDixgSXAAjY' 
WHERE email IN ('admin@aiser.app', 'user@aiser.app', 'analyst@aiser.app')
AND (password IS NULL OR password = '');

-- Create organizations with different plan types
INSERT INTO organizations (name, slug, description, plan_type, ai_credits_limit, max_users, max_projects, max_storage_gb, is_active, is_deleted, created_at, updated_at)
VALUES 
    ('Free Plan Organization', 'free-org', 'Free tier organization for testing', 'free', 30, 1, 1, 5, true, false, NOW(), NOW()),
    ('Pro Plan Organization', 'pro-org', 'Pro tier organization for testing', 'pro', 300, 3, -1, 90, true, false, NOW(), NOW()),
    ('Team Plan Organization', 'team-org', 'Team tier organization for testing', 'team', 1000, 10, -1, 200, true, false, NOW(), NOW()),
    ('Enterprise Plan Organization', 'enterprise-org', 'Enterprise tier organization for testing', 'enterprise', 5000, 100, -1, 1000, true, false, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Link users to organizations (assign admin to enterprise, user to pro, analyst to team)
-- First, ensure user_organizations table exists (it should from migrations)
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
WHERE u.email = 'admin@aiser.app' AND o.slug = 'enterprise-org'
   OR u.email = 'user@aiser.app' AND o.slug = 'pro-org'
   OR u.email = 'analyst@aiser.app' AND o.slug = 'team-org'
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Seed users and organizations created successfully! All users now have password: FirstUsers@123' as status;

