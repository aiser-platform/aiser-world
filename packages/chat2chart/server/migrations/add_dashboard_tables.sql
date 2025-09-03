-- Migration: Add Dashboard Tables
-- Created: 2025-01-10
-- Description: Add dashboard, dashboard_widgets, and dashboard_shares tables

-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id),
    created_by INTEGER REFERENCES users(id),
    
    -- Dashboard settings
    layout_config JSONB,
    theme_config JSONB,
    global_filters JSONB,
    refresh_interval INTEGER DEFAULT 300,
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE,
    
    -- Plan-based restrictions
    max_widgets INTEGER DEFAULT 10,
    max_pages INTEGER DEFAULT 5,
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_viewed_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create dashboard_widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- Widget identification
    name VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL,  -- chart, table, text, image, etc.
    chart_type VARCHAR(50),            -- bar, line, pie, etc.
    
    -- Widget configuration
    config JSONB,
    data_config JSONB,
    style_config JSONB,
    
    -- Layout and positioning
    x INTEGER DEFAULT 0,
    y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,
    z_index INTEGER DEFAULT 0,
    
    -- Widget state
    is_visible BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_resizable BOOLEAN DEFAULT TRUE,
    is_draggable BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create dashboard_shares table
CREATE TABLE IF NOT EXISTS dashboard_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    shared_by INTEGER NOT NULL REFERENCES users(id),
    shared_with INTEGER REFERENCES users(id),
    
    -- Share settings
    permission VARCHAR(20) DEFAULT 'view',  -- view, edit, admin
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Share metadata
    share_token VARCHAR(255),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dashboards_project_id ON dashboards(project_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboards_is_active ON dashboards(is_active);
CREATE INDEX IF NOT EXISTS idx_dashboards_is_public ON dashboards(is_public);
CREATE INDEX IF NOT EXISTS idx_dashboards_created_at ON dashboards(created_at);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_widget_type ON dashboard_widgets(widget_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_is_visible ON dashboard_widgets(is_visible);

CREATE INDEX IF NOT EXISTS idx_dashboard_shares_dashboard_id ON dashboard_shares(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_shared_by ON dashboard_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_shared_with ON dashboard_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_is_active ON dashboard_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_dashboard_shares_share_token ON dashboard_shares(share_token);

-- Add trigger for updating updated_at column
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dashboards_updated_at 
    BEFORE UPDATE ON dashboards 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_widgets_updated_at 
    BEFORE UPDATE ON dashboard_widgets 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_shares_updated_at 
    BEFORE UPDATE ON dashboard_shares 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

-- Insert sample data for testing
INSERT INTO dashboards (name, description, project_id, created_by, layout_config, theme_config) VALUES
('Sample Sales Dashboard', 'Monthly sales performance dashboard', 1, 1, '{"grid_size": 12, "widgets": []}', '{"primary_color": "#1890ff"}'),
('Marketing Analytics', 'Marketing campaign performance', 1, 1, '{"grid_size": 12, "widgets": []}', '{"primary_color": "#52c41a"}')
ON CONFLICT DO NOTHING;

-- Insert sample widgets
INSERT INTO dashboard_widgets (dashboard_id, name, widget_type, chart_type, config, data_config, x, y, width, height) 
SELECT 
    d.id,
    'Sales Chart',
    'chart',
    'bar',
    '{"title": "Monthly Sales"}',
    '{"data_source": "sales_data"}',
    0, 0, 6, 4
FROM dashboards d WHERE d.name = 'Sample Sales Dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO dashboard_widgets (dashboard_id, name, widget_type, chart_type, config, data_config, x, y, width, height) 
SELECT 
    d.id,
    'Revenue Table',
    'table',
    NULL,
    '{"columns": ["Month", "Revenue"]}',
    '{"data_source": "revenue_data"}',
    6, 0, 6, 4
FROM dashboards d WHERE d.name = 'Sample Sales Dashboard'
ON CONFLICT DO NOTHING;

