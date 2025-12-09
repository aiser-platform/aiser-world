-- Migration: Add Onboarding Enhancements
-- Adds columns and tables for enhanced frictionless onboarding

-- Add onboarding progress tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP;

-- Create onboarding analytics table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_event ON onboarding_analytics(event);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at ON onboarding_analytics(created_at);

-- Create onboarding friction logs table
CREATE TABLE IF NOT EXISTS onboarding_friction_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    step VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_friction_user_id ON onboarding_friction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_friction_step ON onboarding_friction_logs(step);

-- Update organizations table with pricing fields (if not exists)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS storage_used_gb DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit_gb DECIMAL(10,2) DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_data_sources INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);

-- Create usage_records table for tracking
CREATE TABLE IF NOT EXISTS usage_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    record_type VARCHAR(50) NOT NULL, -- 'ai_query', 'api_call', 'storage', 'data_source'
    quantity INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_org_id ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_type ON usage_records(record_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_created_at ON usage_records(created_at);

-- Create ai_usage_logs table (if not exists)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    query_text TEXT,
    agent_type VARCHAR(50), -- 'nl2sql', 'chart_generation', 'insights', etc.
    llm_calls INTEGER DEFAULT 1,
    tokens_used INTEGER,
    credits_consumed INTEGER DEFAULT 1,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org_id ON ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent_type ON ai_usage_logs(agent_type);

-- Create subscriptions table (if not exists)
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    plan_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Update existing organizations to have proper defaults
UPDATE organizations
SET 
    ai_credits_limit = CASE 
        WHEN plan_type = 'free' THEN 10
        WHEN plan_type = 'pro' THEN 100
        WHEN plan_type = 'team' THEN 800
        WHEN plan_type = 'enterprise' THEN -1
        ELSE 10
    END,
    max_projects = CASE
        WHEN plan_type = 'free' THEN 1
        WHEN plan_type IN ('pro', 'team', 'enterprise') THEN -1
        ELSE 1
    END,
    max_data_sources = CASE
        WHEN plan_type = 'free' THEN 2
        WHEN plan_type IN ('pro', 'team', 'enterprise') THEN -1
        ELSE 2
    END,
    storage_limit_gb = CASE
        WHEN plan_type = 'free' THEN 2
        WHEN plan_type = 'pro' THEN 20
        WHEN plan_type = 'team' THEN 100
        WHEN plan_type = 'enterprise' THEN -1
        ELSE 2
    END
WHERE ai_credits_limit IS NULL OR ai_credits_limit = 0;


