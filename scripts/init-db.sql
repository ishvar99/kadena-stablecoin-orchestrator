-- Initialize the orchestrator database
CREATE DATABASE IF NOT EXISTS orchestrator_db;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The Prisma schema will handle table creation
-- This file can be used for any additional setup needed
