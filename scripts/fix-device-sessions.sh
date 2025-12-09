#!/bin/bash
# One-time fix for device_sessions schema
# Run this if device_sessions table is missing columns

echo "🔧 Fixing device_sessions schema..."

docker exec aiser-postgres psql -U aiser -d aiser_world <<EOF
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS device_id varchar(255);
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS device_type varchar(50);
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS device_name varchar(100);
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS ip_address varchar(45);
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS user_agent varchar(255);
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS refresh_token varchar(2048) NOT NULL DEFAULT '';
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS refresh_token_revoked boolean DEFAULT false;
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamp without time zone;
ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS last_active_at timestamp without time zone;
EOF

echo "✅ Schema fixed. Restarting auth service..."
docker compose -f docker-compose.dev.yml restart auth-service

echo "Done! Login should work now."

