-- ============================================================================
-- Hostel Gate Pass Management System - Database Setup Script
-- Version: 1.0.0
-- Description: Complete database initialization script
-- Usage: mysql -u root -p < setup.sql
-- ============================================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS hostel_gatepass_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Select the database
USE hostel_gatepass_db;

-- Set SQL mode and character encoding
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- Display setup start message
SELECT '========================================' AS '';
SELECT 'Starting Database Setup...' AS '';
SELECT '========================================' AS '';

-- Execute schema creation
SELECT 'Creating tables...' AS '';
SOURCE schema.sql;

-- Execute seed data insertion
SELECT 'Inserting seed data...' AS '';
SOURCE seed.sql;

-- Verification
SELECT '========================================' AS '';
SELECT 'Setup Complete!' AS '';
SELECT '========================================' AS '';

-- Display table count
SELECT COUNT(*) AS 'Total Tables Created' 
FROM information_schema.tables 
WHERE table_schema = 'hostel_gatepass_db';

-- Display all table names
SELECT table_name AS 'Table Name' 
FROM information_schema.tables 
WHERE table_schema = 'hostel_gatepass_db' 
ORDER BY table_name;

-- Display user count by role
SELECT '========================================' AS '';
SELECT 'Test Users Created:' AS '';
SELECT role AS 'Role', COUNT(*) AS 'Count' 
FROM users 
GROUP BY role 
ORDER BY role;

-- Display pass types
SELECT '========================================' AS '';
SELECT 'Pass Types Configured:' AS '';
SELECT code AS 'Code', name AS 'Name', max_duration_hours AS 'Max Hours' 
FROM pass_types;

-- Display system settings
SELECT '========================================' AS '';
SELECT 'System Settings:' AS '';
SELECT setting_key AS 'Setting', setting_value AS 'Value', data_type AS 'Type' 
FROM system_settings;

SELECT '========================================' AS '';
SELECT 'Database is ready to use!' AS '';
SELECT 'Default password for all test users: Test@123' AS '';
SELECT '========================================' AS '';
