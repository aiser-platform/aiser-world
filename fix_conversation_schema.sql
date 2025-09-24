-- Fix conversation table schema
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS json_metadata JSONB;
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
