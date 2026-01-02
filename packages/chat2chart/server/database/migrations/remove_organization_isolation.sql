-- Migration to drop organization/tenant multi-tenant schema.
-- This removes all organization and RBAC isolation.
-- 
-- NOTE: This SQL file has been converted to an Alembic migration.
-- See: alembic/versions/20250125_remove_organization_isolation.py
-- The Alembic migration will run automatically when 'alembic upgrade head' is executed.
-- 
-- This SQL file is kept for reference only.
-- To apply manually, run: psql -U aiser -d aiser_world -f <this_file>

-- Drop foreign-key style org user mapping
DROP TABLE IF EXISTS user_organizations CASCADE;

-- Drop organizations table
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop organization / tenant columns from core tables
ALTER TABLE IF EXISTS conversation
    DROP COLUMN IF EXISTS tenant_id;

ALTER TABLE IF EXISTS charts
    DROP COLUMN IF EXISTS tenant_id;

ALTER TABLE IF EXISTS data_sources
    DROP COLUMN IF EXISTS tenant_id;

ALTER TABLE IF EXISTS data_queries
    DROP COLUMN IF EXISTS tenant_id;

-- Note: After this migration runs, update models to remove tenant_id column definitions


