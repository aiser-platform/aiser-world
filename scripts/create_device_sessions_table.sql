-- SQL to create device_sessions table if missing
CREATE TABLE IF NOT EXISTS device_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_type VARCHAR(50),
  device_name VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  last_active TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  refresh_token TEXT NOT NULL
);


