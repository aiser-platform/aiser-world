-- Aiser Platform Database Initialization
-- Multi-tenant architecture with Cube.js semantic layer support
--
-- Default Users (Development Only - Change in Production):
-- admin@aiser.app / admin123 (admin role)
-- user@aiser.app / user123 (user role)  
-- analyst@aiser.app / analyst123 (analyst role)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with tenant isolation
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password VARCHAR(256) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    tenant_id VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    type VARCHAR(50) DEFAULT 'chat2chart',
    user_id INTEGER REFERENCES users(id),
    tenant_id VARCHAR(50) DEFAULT 'default',
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
    user_id INTEGER REFERENCES users(id),
    conversation_id UUID REFERENCES conversation(id),
    tenant_id VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_tenant_id ON conversation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_user_id ON conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation(created_at);

CREATE INDEX IF NOT EXISTS idx_charts_tenant_id ON charts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_charts_user_id ON charts(user_id);
CREATE INDEX IF NOT EXISTS idx_charts_conversation_id ON charts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_charts_created_at ON charts(created_at);
CREATE INDEX IF NOT EXISTS idx_charts_type ON charts(chart_type);

-- Insert sample data for development with hashed passwords
INSERT INTO users (email, username, first_name, last_name, password, role, tenant_id) 
VALUES 
    ('admin@aiser.app', 'admin', 'Admin', 'User', '$2b$12$hKYCyJEZ/xB8jGY5sX5e3.4kUzYrtwZrtoKSACsUqTqmSr5is67LS', 'admin', 'default'),
    ('user@aiser.app', 'user', 'Test', 'User', '$2b$12$K6WPdTEaymVOCZDNpzbVvuCKDuSURzEHbsH3IDjDxRN0a9mhS6yn2', 'user', 'default'),
    ('analyst@aiser.app', 'analyst', 'Data', 'Analyst', '$2b$12$mbeDtR1AlF0AB8VJBco6l.GM6EhI9nqpIv6U1E8tEjgnxGV3s/7M.', 'analyst', 'default')
ON CONFLICT (email) DO NOTHING;

-- Insert sample conversations
INSERT INTO conversation (id, title, description, user_id, tenant_id)
SELECT 
    uuid_generate_v4(),
    'Sample Chart Analysis',
    'Analyzing sales data with AI-powered insights',
    u.id,
    'default'
FROM users u 
WHERE u.email = 'user@aiser.app'
ON CONFLICT DO NOTHING;

-- Insert sample charts
INSERT INTO charts (title, chart_type, chart_library, status, complexity_score, data_source, user_id, tenant_id)
SELECT 
    'Sales Performance Dashboard',
    'line',
    'echarts',
    'completed',
    7,
    'postgresql',
    u.id,
    'default'
FROM users u 
WHERE u.email = 'user@aiser.app'
ON CONFLICT DO NOTHING;

INSERT INTO charts (title, chart_type, chart_library, status, complexity_score, data_source, user_id, tenant_id)
SELECT 
    'User Growth Analysis',
    'bar',
    'echarts',
    'completed',
    5,
    'postgresql',
    u.id,
    'default'
FROM users u 
WHERE u.email = 'analyst@aiser.app'
ON CONFLICT DO NOTHING;

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_updated_at BEFORE UPDATE ON conversation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charts_updated_at BEFORE UPDATE ON charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Aiser database initialized successfully with multi-tenant support!' as status;