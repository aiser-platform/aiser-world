-- Aiser Platform Database Initialization
-- Single-tenant architecture (organization/RBAC removed)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Users table removed - user management will be handled by Supabase
-- User IDs in other tables are stored as plain UUID (no foreign key constraints)

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    type VARCHAR(50) DEFAULT 'chat2chart',
    user_id UUID,
    -- tenant_id removed - organization context removed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create charts table
CREATE TABLE IF NOT EXISTS charts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    chart_type VARCHAR(100),
    chart_library VARCHAR(50) DEFAULT 'echarts',
    status VARCHAR(50) DEFAULT 'pending',
    complexity_score INTEGER DEFAULT 5,
    data_source VARCHAR(255),
    user_id UUID,
    conversation_id UUID REFERENCES conversation(id),
    -- tenant_id removed - organization context removed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
-- tenant_id indexes removed - organization context removed
CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation(created_at);

CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);
CREATE INDEX IF NOT EXISTS idx_charts_conversation_id ON charts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_charts_created_at ON charts(created_at);
CREATE INDEX IF NOT EXISTS idx_charts_type ON charts(chart_type);

-- Note: Sample data inserts removed - users table no longer exists
-- Sample data will be created through application logic when Supabase auth is integrated

-- Create pre-aggregations schema for Cube.js
CREATE SCHEMA IF NOT EXISTS pre_aggregations;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aiser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aiser;
GRANT ALL PRIVILEGES ON SCHEMA pre_aggregations TO aiser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pre_aggregations TO aiser;

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_conversation_updated_at BEFORE UPDATE ON conversation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charts_updated_at BEFORE UPDATE ON charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Aiser database initialized successfully!' as status;
