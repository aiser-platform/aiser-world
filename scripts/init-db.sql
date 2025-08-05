-- Initialize Aiser World Database
-- This script sets up the basic database structure

-- Create extensions in the main database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- The main database 'aiser_world' is already created by POSTGRES_DB
-- All services will use this single database for simplicity