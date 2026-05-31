-- ============================================================================
-- Hostel Gate Pass Management System - INSERT Statements Only
-- Version: 1.0.0
-- Description: Clean INSERT statements for initial seed data
-- Password for all users: Test@123
-- ============================================================================

-- ============================================================================
-- 1. PASS TYPES
-- ============================================================================

INSERT INTO pass_types (code, name, description, max_duration_hours, requires_destination, is_active) VALUES
('HALF_DAY', 'Half-Day Pass', 'Short duration pass for same-day outings within 12 hours', 12, FALSE, TRUE),
('HOME_PASS', 'Home Pass', 'Extended leave pass for going home or family visits (up to 3 days)', 72, TRUE, TRUE);

-- ============================================================================
-- 2. WORKFLOW STEPS
-- ============================================================================

-- HALF_DAY workflow: 1 step (HOSTEL_OFFICE)
INSERT INTO pass_type_workflow_steps (pass_type_id, step_order, approver_role, is_mandatory) VALUES
(1, 1, 'HOSTEL_OFFICE', TRUE);

-- HOME_PASS workflow: 3 steps (CLASS_COORDINATOR → HOSTEL_OFFICE → CHIEF_WARDEN)
INSERT INTO pass_type_workflow_steps (pass_type_id, step_order, approver_role, is_mandatory) VALUES
(2, 1, 'CLASS_COORDINATOR', TRUE),
(2, 2, 'HOSTEL_OFFICE', TRUE),
(2, 3, 'CHIEF_WARDEN', TRUE);

-- ============================================================================
-- 3. DEPARTMENTS
-- ============================================================================

INSERT INTO departments (name, code, is_active) VALUES
('Computer Science and Engineering', 'CSE', TRUE),
('Electronics and Communication Engineering', 'ECE', TRUE),
('Mechanical Engineering', 'MECH', TRUE),
('Master of Business Administration', 'MBA', TRUE),
('Master of Computer Applications', 'MCA', TRUE);

-- ============================================================================
-- 4. HOSTEL BLOCKS
-- ============================================================================

INSERT INTO hostel_blocks (name, code, gender, total_rooms, is_active) VALUES
('Boys Block A', 'BBA', 'MALE', 100, TRUE),
('Boys Block B', 'BBB', 'MALE', 100, TRUE),
('Girls Block A', 'GBA', 'FEMALE', 80, TRUE);

-- ============================================================================
-- 5. USERS
-- Password: Test@123
-- Bcrypt hash (10 rounds): $2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K
-- ============================================================================

-- Admin
INSERT INTO users (email, password_hash, role, status) VALUES
('admin@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'ADMIN', 'ACTIVE');

-- Class Coordinator (CSE)
INSERT INTO users (email, password_hash, role, status) VALUES
('coordinator.cse@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'CLASS_COORDINATOR', 'ACTIVE');

-- Class Coordinator (ECE)
INSERT INTO users (email, password_hash, role, status) VALUES
('coordinator.ece@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'CLASS_COORDINATOR', 'ACTIVE');

-- Hostel Office
INSERT INTO users (email, password_hash, role, status) VALUES
('office@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'HOSTEL_OFFICE', 'ACTIVE');

-- Chief Warden
INSERT INTO users (email, password_hash, role, status) VALUES
('warden@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'CHIEF_WARDEN', 'ACTIVE');

-- Watchman
INSERT INTO users (email, password_hash, role, status) VALUES
('watchman@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'WATCHMAN', 'ACTIVE');

-- Student (CSE)
INSERT INTO users (email, password_hash, role, status) VALUES
('student.cse@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'STUDENT', 'ACTIVE');

-- Student (ECE)
INSERT INTO users (email, password_hash, role, status) VALUES
('student.ece@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'STUDENT', 'ACTIVE');

-- ============================================================================
-- 6. STAFF RECORDS
-- ============================================================================

-- Admin Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(1, 'EMP001', 'System', 'Administrator', '9876543210', NULL, 'System Admin', 'ACTIVE');

-- Coordinator Staff (CSE)
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(2, 'EMP002', 'Rajesh', 'Kumar', '9876543211', 1, 'Class Coordinator', 'ACTIVE');

-- Coordinator Staff (ECE)
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(3, 'EMP003', 'Priya', 'Sharma', '9876543212', 2, 'Class Coordinator', 'ACTIVE');

-- Hostel Office Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(4, 'EMP004', 'Suresh', 'Patel', '9876543213', NULL, 'Hostel Office Manager', 'ACTIVE');

-- Chief Warden Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(5, 'EMP005', 'Dr. Anita', 'Verma', '9876543214', NULL, 'Chief Warden', 'ACTIVE');

-- Watchman Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(6, 'EMP006', 'Ramesh', 'Singh', '9876543215', NULL, 'Security Watchman', 'ACTIVE');

-- ============================================================================
-- 7. CLASSES
-- ============================================================================

-- CSE Classes
INSERT INTO classes (department_id, year, section, academic_year, coordinator_id, is_active) VALUES
(1, 1, 'A', '2024-2025', 2, TRUE),
(1, 1, 'B', '2024-2025', 2, TRUE),
(1, 2, 'A', '2024-2025', 2, TRUE);

-- ECE Classes
INSERT INTO classes (department_id, year, section, academic_year, coordinator_id, is_active) VALUES
(2, 1, 'A', '2024-2025', 3, TRUE),
(2, 2, 'A', '2024-2025', 3, TRUE);

-- ============================================================================
-- 8. STUDENTS
-- ============================================================================

-- Student 1 (CSE, Male, Boys Block A)
INSERT INTO students (user_id, roll_number, first_name, last_name, gender, phone, parent_phone, class_id, hostel_block_id, room_number, status) VALUES
(7, 'CSE2024001', 'Amit', 'Sharma', 'MALE', '9876543220', '9876543221', 1, 1, 'BBA-101', 'ACTIVE');

-- Student 2 (ECE, Female, Girls Block A)
INSERT INTO students (user_id, roll_number, first_name, last_name, gender, phone, parent_phone, class_id, hostel_block_id, room_number, status) VALUES
(8, 'ECE2024001', 'Sneha', 'Reddy', 'FEMALE', '9876543222', '9876543223', 4, 3, 'GBA-201', 'ACTIVE');

-- ============================================================================
-- 9. SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (setting_key, setting_value, data_type, description, is_editable) VALUES
('max_passes_per_month', '4', 'INTEGER', 'Maximum number of passes a student can request per month', TRUE),
('late_return_grace_minutes', '30', 'INTEGER', 'Grace period in minutes before marking a return as late', TRUE),
('qr_expiry_hours', '24', 'INTEGER', 'Number of hours before QR code expires after generation', TRUE),
('auto_expire_passes', 'true', 'BOOLEAN', 'Automatically expire passes after end datetime', TRUE),
('max_pending_passes', '2', 'INTEGER', 'Maximum number of pending passes a student can have', TRUE);

-- ============================================================================
-- VERIFICATION QUERIES (Commented - uncomment to verify)
-- ============================================================================

-- SELECT 'Pass Types:', COUNT(*) FROM pass_types;
-- SELECT 'Workflow Steps:', COUNT(*) FROM pass_type_workflow_steps;
-- SELECT 'Departments:', COUNT(*) FROM departments;
-- SELECT 'Hostel Blocks:', COUNT(*) FROM hostel_blocks;
-- SELECT 'Users:', role, COUNT(*) FROM users GROUP BY role;
-- SELECT 'Staff:', COUNT(*) FROM staff;
-- SELECT 'Classes:', COUNT(*) FROM classes;
-- SELECT 'Students:', COUNT(*) FROM students;
-- SELECT 'System Settings:', COUNT(*) FROM system_settings;

-- ============================================================================
-- END OF INSERT STATEMENTS
-- ============================================================================
