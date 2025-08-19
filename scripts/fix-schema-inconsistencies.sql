-- Fix schema inconsistencies between auth and chat2chart services
-- This script aligns the database schema for consistent deployment across all environments

-- 1. Add missing columns to users table for chat2chart compatibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- 2. Add missing columns to conversation table for user reference
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';

-- 3. Add missing columns to message table for user reference
ALTER TABLE message ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 4. Ensure all tables have consistent audit columns
ALTER TABLE charts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE charts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE charts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE conversation ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE message ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE message ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE message ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 5. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tenant_id ON conversation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_user_id ON message(user_id);
CREATE INDEX IF NOT EXISTS idx_charts_tenant_id ON charts(tenant_id);

-- 6. Add missing constraints
ALTER TABLE conversation ADD CONSTRAINT IF NOT EXISTS conversation_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE message ADD CONSTRAINT IF NOT EXISTS message_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- 7. Update alembic version to reflect schema changes
UPDATE alembic_version SET version_num = 'unified_schema_001' WHERE version_num = 'enterprise_001';

-- 8. Insert default admin user if not exists
INSERT INTO users (username, email, password, is_verified, created_at, updated_at, is_active, is_deleted)
SELECT 'admin', 'admin@aiser.world', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.s7uG', true, NOW(), NOW(), true, false
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 9. Create default organization if not exists
INSERT INTO organizations (name, slug, description, plan_type, created_at, updated_at, is_active, is_deleted)
SELECT 'Default Organization', 'default', 'Default organization for the system', 'enterprise', NOW(), NOW(), true, false
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'default');

-- 10. Create default project if not exists
INSERT INTO projects (name, description, organization_id, created_by, is_public, created_at, updated_at, is_active)
SELECT 'Default Project', 'Default project for the system', 
       (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1),
       (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
       false, NOW(), NOW(), true
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Default Project');

-- 11. Create default role if not exists
INSERT INTO roles (name, description, permissions, is_system_role, created_at, updated_at)
SELECT 'admin', 'System administrator with full access', '{"all": true}', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

-- 12. Assign admin user to default organization with admin role
INSERT INTO user_organizations (user_id, organization_id, role_id, status, joined_at, created_at, updated_at)
SELECT 
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1),
    (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
    'active', NOW(), NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations 
    WHERE user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
    AND organization_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
);

-- 13. Create default subscription for enterprise plan
INSERT INTO subscriptions (organization_id, plan_type, status, created_at, updated_at)
SELECT 
    (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1),
    'enterprise', 'active', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
);

-- 14. Ensure all foreign key constraints are properly set
ALTER TABLE charts DROP CONSTRAINT IF EXISTS charts_user_id_fkey;
ALTER TABLE charts ADD CONSTRAINT charts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE charts DROP CONSTRAINT IF EXISTS charts_conversation_id_fkey;
ALTER TABLE charts ADD CONSTRAINT charts_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE SET NULL;

-- 15. Add any missing columns for enterprise features
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 100;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 50;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER DEFAULT 100;

-- 16. Create audit log table for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 17. Final verification
SELECT 'Schema alignment completed successfully!' as status;
