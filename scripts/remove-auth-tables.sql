-- Remove Auth Service and All Authentication Logic
-- This script drops auth-related tables and removes foreign key constraints to users table
-- The users table itself will be dropped, but user_id columns in other tables are kept as plain UUID

-- Drop auth-related tables first (they have FKs to users)
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS device_sessions CASCADE;
DROP TABLE IF EXISTS temporary_tokens CASCADE;

-- Drop foreign key constraints from all tables referencing users
-- Note: We keep the user_id columns themselves, just remove the FK constraints
ALTER TABLE conversation DROP CONSTRAINT IF EXISTS conversation_user_id_fkey;
ALTER TABLE charts DROP CONSTRAINT IF EXISTS charts_user_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE user_organizations DROP CONSTRAINT IF EXISTS user_organizations_user_id_fkey;
ALTER TABLE dashboards DROP CONSTRAINT IF EXISTS dashboards_shared_by_fkey;
ALTER TABLE dashboards DROP CONSTRAINT IF EXISTS dashboards_shared_with_fkey;
ALTER TABLE dashboards DROP CONSTRAINT IF EXISTS dashboards_created_by_fkey;
ALTER TABLE dashboards DROP CONSTRAINT IF EXISTS dashboards_user_id_fkey;
ALTER TABLE dashboard_embeds DROP CONSTRAINT IF EXISTS dashboard_embeds_created_by_fkey;
ALTER TABLE dashboard_analytics DROP CONSTRAINT IF EXISTS dashboard_analytics_user_id_fkey;
ALTER TABLE onboarding_analytics DROP CONSTRAINT IF EXISTS onboarding_analytics_user_id_fkey;
ALTER TABLE onboarding_friction_logs DROP CONSTRAINT IF EXISTS onboarding_friction_logs_user_id_fkey;
ALTER TABLE message DROP CONSTRAINT IF EXISTS message_user_id_fkey;

-- Drop users table (this will cascade to any remaining FKs)
DROP TABLE IF EXISTS users CASCADE;

-- Success message
SELECT 'Auth tables and foreign keys removed successfully. User ID columns kept as plain UUID.' as status;
