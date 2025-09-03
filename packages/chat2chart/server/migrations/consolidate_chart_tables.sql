-- Migration: Consolidate chart and charts tables
-- Created: 2025-01-10
-- Description: Merge chart table into charts table and drop redundant chart table

-- Step 1: Add missing columns to charts table to accommodate chart table data
ALTER TABLE charts ADD COLUMN IF NOT EXISTS form_data JSONB;
ALTER TABLE charts ADD COLUMN IF NOT EXISTS result JSONB;
ALTER TABLE charts ADD COLUMN IF NOT EXISTS datasource JSONB;
ALTER TABLE charts ADD COLUMN IF NOT EXISTS message_id UUID;

-- Step 2: Migrate any existing data from chart to charts (if any exists)
-- Note: Both tables are currently empty, but this ensures data preservation
INSERT INTO charts (
    id,
    title,
    form_data,
    result,
    datasource,
    message_id,
    created_at,
    updated_at,
    deleted_at,
    is_active,
    is_deleted
)
SELECT 
    id,
    title,
    form_data,
    result,
    datasource,
    message_id,
    created_at,
    updated_at,
    deleted_at,
    COALESCE(is_active, true),
    COALESCE(is_deleted, false)
FROM chart
WHERE NOT EXISTS (
    SELECT 1 FROM charts WHERE charts.id = chart.id
);

-- Step 3: Update the ChatVisualization model to use charts table
-- This will be done in the Python model file

-- Step 4: Drop the redundant chart table
DROP TABLE IF EXISTS chart;

-- Step 5: Add any missing indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_charts_message_id ON charts(message_id);
CREATE INDEX IF NOT EXISTS idx_charts_form_data ON charts USING GIN(form_data);
CREATE INDEX IF NOT EXISTS idx_charts_result ON charts USING GIN(result);
CREATE INDEX IF NOT EXISTS idx_charts_datasource ON charts USING GIN(datasource);

-- Step 6: Update any foreign key constraints if needed
-- (No foreign keys to update as chart table didn't have any)

-- Verification query
SELECT 
    'charts' as table_name,
    COUNT(*) as record_count
FROM charts
UNION ALL
SELECT 
    'chart' as table_name,
    COUNT(*) as record_count
FROM information_schema.tables 
WHERE table_name = 'chart' AND table_schema = 'public';

