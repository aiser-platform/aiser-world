-- Production-Ready Development Data Initialization
-- This script creates real development data for Aiser Platform
-- NOTE: Organization context removed - this script is disabled

-- Organization and project creation removed - organization context removed
-- The following sections are commented out as they depend on organizations table:

/*
-- Create real development organization (REMOVED)
-- Organizations table no longer exists

-- Create real development project (REMOVED)
-- Projects may still exist but organization_id references removed

-- Create real data source templates (UPDATED - no tenant_id)
INSERT INTO data_sources (id, name, type, format, size, row_count, schema, user_id, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'PostgreSQL Development DB',
    'database',
    'postgresql',
    0,
    0,
    '{"connection_type": "postgresql", "host": "postgres", "port": 5432, "database": "aiser_world", "ssl_mode": "require"}',
    (SELECT id FROM users LIMIT 1),
    true,
    NOW(),
    NOW()
ON CONFLICT DO NOTHING;

-- Create sample dashboard template (UPDATED - no organization_id)
INSERT INTO dashboards (id, name, description, project_id, created_by, layout_config, theme_config, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'Sample Dashboard Template',
    'Template dashboard for development and testing purposes',
    (SELECT id FROM projects LIMIT 1), -- Use first available project
    (SELECT id FROM users LIMIT 1),
    '{"grid_size": 12, "widgets": [], "layout": "grid"}',
    '{"primary_color": "#1890ff", "secondary_color": "#52c41a", "theme": "light"}',
    true,
    NOW(),
    NOW()
ON CONFLICT DO NOTHING;
*/

-- Success message
SELECT 'Aiser development environment initialized with real data structure!' as status;
