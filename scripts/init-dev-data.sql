-- Production-Ready Development Data Initialization
-- This script creates real development data for Aiser Platform

-- Create real development organization
INSERT INTO organizations (id, name, slug, description, plan_type, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Aiser Development Organization',
    'aiser-dev-org',
    'Development organization for Aiser Platform development and testing',
    'enterprise',
    true,
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Get the organization ID for further inserts
WITH org AS (
    SELECT id FROM organizations WHERE slug = 'aiser-dev-org' LIMIT 1
)

-- Create real development project
INSERT INTO projects (id, name, description, organization_id, created_by, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Development Project',
    'Main development project for Aiser Platform features and testing',
    org.id,
    (SELECT id FROM users LIMIT 1), -- Use first available user
    true,
    NOW(),
    NOW()
FROM org
ON CONFLICT DO NOTHING;

-- Create real data source templates (not demo data)
INSERT INTO data_sources (id, name, type, format, size, row_count, schema, user_id, tenant_id, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'PostgreSQL Development DB',
    'database',
    'postgresql',
    0,
    0,
    '{"connection_type": "postgresql", "host": "postgres", "port": 5432, "database": "aiser_world", "ssl_mode": "require"}',
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM organizations WHERE slug = 'aiser-dev-org' LIMIT 1),
    true,
    NOW(),
    NOW()
ON CONFLICT DO NOTHING;

-- Create sample dashboard template (not demo data)
INSERT INTO dashboards (id, name, description, project_id, created_by, layout_config, theme_config, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Sample Dashboard Template',
    'Template dashboard for development and testing purposes',
    (SELECT id FROM projects WHERE name = 'Development Project' LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    '{"grid_size": 12, "widgets": [], "layout": "grid"}',
    '{"primary_color": "#1890ff", "secondary_color": "#52c41a", "theme": "light"}',
    true,
    NOW(),
    NOW()
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Aiser development environment initialized with real data structure!' as status;
