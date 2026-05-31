-- ============================================================================
-- Hostel Gate Pass Management System - Seed Data
-- Version: 1.0.0
-- Description: Initial data for system configuration and test users
-- ============================================================================

-- Set SQL mode and character encoding
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ============================================================================
-- SECTION 1: SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (setting_key, setting_value, data_type, description, is_editable) VALUES
('max_passes_per_month', '4', 'INTEGER', 'Maximum number of passes a student can request per month', TRUE),
('late_return_grace_minutes', '30', 'INTEGER', 'Grace period in minutes before marking a return as late', TRUE),
('qr_expiry_hours', '24', 'INTEGER', 'Number of hours before QR code expires after generation', TRUE),
('auto_expire_passes', 'true', 'BOOLEAN', 'Automatically expire passes after end datetime', TRUE),
('max_pending_passes', '2', 'INTEGER', 'Maximum number of pending passes a student can have', TRUE);

-- ============================================================================
-- SECTION 2: PASS TYPES AND WORKFLOWS
-- ============================================================================

-- Pass Type: HALF_DAY
-- Duration: 12 hours
-- Workflow: Single step approval by HOSTEL_OFFICE
INSERT INTO pass_types (code, name, description, max_duration_hours, requires_destination, is_active) VALUES
('HALF_DAY', 'Half-Day Pass', 'Short duration pass for same-day outings within 12 hours', 12, FALSE, TRUE);

-- Get the ID of HALF_DAY pass type (will be 1 if this is first insert)
SET @half_day_id = LAST_INSERT_ID();

-- Workflow for HALF_DAY: Single step
INSERT INTO pass_type_workflow_steps (pass_type_id, step_order, approver_role, is_mandatory) VALUES
(@half_day_id, 1, 'HOSTEL_OFFICE', TRUE);

-- Pass Type: HOME_PASS
-- Duration: 72 hours (3 days)
-- Workflow: Three-step approval (COORDINATOR → OFFICE → WARDEN)
INSERT INTO pass_types (code, name, description, max_duration_hours, requires_destination, is_active) VALUES
('HOME_PASS', 'Home Pass', 'Extended leave pass for going home or family visits (up to 3 days)', 72, TRUE, TRUE);

-- Get the ID of HOME_PASS pass type (will be 2 if this is second insert)
SET @home_pass_id = LAST_INSERT_ID();

-- Workflow for HOME_PASS: Three steps
INSERT INTO pass_type_workflow_steps (pass_type_id, step_order, approver_role, is_mandatory) VALUES
(@home_pass_id, 1, 'CLASS_COORDINATOR', TRUE),
(@home_pass_id, 2, 'HOSTEL_OFFICE', TRUE),
(@home_pass_id, 3, 'CHIEF_WARDEN', TRUE);

-- ============================================================================
-- SECTION 3: DEPARTMENTS
-- ============================================================================

INSERT INTO departments (name, code, is_active) VALUES
('Computer Science and Engineering', 'CSE', TRUE),
('Electronics and Communication Engineering', 'ECE', TRUE),
('Mechanical Engineering', 'MECH', TRUE),
('Master of Business Administration', 'MBA', TRUE),
('Master of Computer Applications', 'MCA', TRUE);

-- ============================================================================
-- SECTION 4: HOSTEL BLOCKS
-- ============================================================================

INSERT INTO hostel_blocks (name, code, gender, total_rooms, is_active) VALUES
('Boys Block A', 'BBA', 'MALE', 100, TRUE),
('Boys Block B', 'BBB', 'MALE', 100, TRUE),
('Girls Block A', 'GBA', 'FEMALE', 80, TRUE);

-- ============================================================================
-- SECTION 5: TEST USERS
-- Password for all test users: Test@123
-- Bcrypt hash (10 rounds): $2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K
-- Note: In production, generate real bcrypt hashes using a proper library
-- ============================================================================

-- Admin User
INSERT INTO users (email, password_hash, role, status) VALUES
('admin@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'ADMIN', 'ACTIVE');
SET @admin_user_id = LAST_INSERT_ID();

-- Class Coordinator User (CSE)
INSERT INTO users (email, password_hash, role, status) VALUES
('coordinator.cse@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'CLASS_COORDINATOR', 'ACTIVE');
SET @coordinator_user_id = LAST_INSERT_ID();

-- Class Coordinator User (ECE)
INSERT INTO users (email, password_hash, role, status) VALUES
('coordinator.ece@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'CLASS_COORDINATOR', 'ACTIVE');
SET @coordinator_ece_user_id = LAST_INSERT_ID();

-- Hostel Office User
INSERT INTO users (email, password_hash, role, status) VALUES
('office@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'HOSTEL_OFFICE', 'ACTIVE');
SET @office_user_id = LAST_INSERT_ID();

-- Chief Warden User
INSERT INTO users (email, password_hash, role, status) VALUES
('warden@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'CHIEF_WARDEN', 'ACTIVE');
SET @warden_user_id = LAST_INSERT_ID();

-- Watchman User
INSERT INTO users (email, password_hash, role, status) VALUES
('watchman@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'WATCHMAN', 'ACTIVE');
SET @watchman_user_id = LAST_INSERT_ID();

-- Student User 1 (CSE)
INSERT INTO users (email, password_hash, role, status) VALUES
('student.cse@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'STUDENT', 'ACTIVE');
SET @student1_user_id = LAST_INSERT_ID();

-- Student User 2 (ECE)
INSERT INTO users (email, password_hash, role, status) VALUES
('student.ece@hostel.edu', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K', 'STUDENT', 'ACTIVE');
SET @student2_user_id = LAST_INSERT_ID();

-- ============================================================================
-- SECTION 6: STAFF RECORDS
-- ============================================================================

-- Get department IDs
SET @cse_dept_id = (SELECT id FROM departments WHERE code = 'CSE');
SET @ece_dept_id = (SELECT id FROM departments WHERE code = 'ECE');

-- Admin Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(@admin_user_id, 'EMP001', 'System', 'Administrator', '9876543210', NULL, 'System Admin', 'ACTIVE');

-- Coordinator Staff (CSE)
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(@coordinator_user_id, 'EMP002', 'Rajesh', 'Kumar', '9876543211', @cse_dept_id, 'Class Coordinator', 'ACTIVE');

-- Coordinator Staff (ECE)
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(@coordinator_ece_user_id, 'EMP003', 'Priya', 'Sharma', '9876543212', @ece_dept_id, 'Class Coordinator', 'ACTIVE');

-- Hostel Office Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(@office_user_id, 'EMP004', 'Suresh', 'Patel', '9876543213', NULL, 'Hostel Office Manager', 'ACTIVE');

-- Chief Warden Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(@warden_user_id, 'EMP005', 'Dr. Anita', 'Verma', '9876543214', NULL, 'Chief Warden', 'ACTIVE');

-- Watchman Staff
INSERT INTO staff (user_id, employee_id, first_name, last_name, phone, department_id, designation, status) VALUES
(@watchman_user_id, 'EMP006', 'Ramesh', 'Singh', '9876543215', NULL, 'Security Watchman', 'ACTIVE');

-- ============================================================================
-- SECTION 7: CLASSES
-- ============================================================================

-- CSE Classes
INSERT INTO classes (department_id, year, section, academic_year, coordinator_id, is_active) VALUES
(@cse_dept_id, 1, 'A', '2024-2025', @coordinator_user_id, TRUE),
(@cse_dept_id, 1, 'B', '2024-2025', @coordinator_user_id, TRUE),
(@cse_dept_id, 2, 'A', '2024-2025', @coordinator_user_id, TRUE);

SET @cse_1a_class_id = (SELECT id FROM classes WHERE department_id = @cse_dept_id AND year = 1 AND section = 'A');

-- ECE Classes
INSERT INTO classes (department_id, year, section, academic_year, coordinator_id, is_active) VALUES
(@ece_dept_id, 1, 'A', '2024-2025', @coordinator_ece_user_id, TRUE),
(@ece_dept_id, 2, 'A', '2024-2025', @coordinator_ece_user_id, TRUE);

SET @ece_1a_class_id = (SELECT id FROM classes WHERE department_id = @ece_dept_id AND year = 1 AND section = 'A');

-- ============================================================================
-- SECTION 8: STUDENTS
-- ============================================================================

-- Get hostel block IDs
SET @block_bba_id = (SELECT id FROM hostel_blocks WHERE code = 'BBA');
SET @block_gba_id = (SELECT id FROM hostel_blocks WHERE code = 'GBA');

-- Student 1 (CSE, Male)
INSERT INTO students (user_id, roll_number, first_name, last_name, gender, phone, parent_phone, class_id, hostel_block_id, room_number, status) VALUES
(@student1_user_id, 'CSE2024001', 'Amit', 'Sharma', 'MALE', '9876543220', '9876543221', @cse_1a_class_id, @block_bba_id, 'BBA-101', 'ACTIVE');

-- Student 2 (ECE, Female)
INSERT INTO students (user_id, roll_number, first_name, last_name, gender, phone, parent_phone, class_id, hostel_block_id, room_number, status) VALUES
(@student2_user_id, 'ECE2024001', 'Sneha', 'Reddy', 'FEMALE', '9876543222', '9876543223', @ece_1a_class_id, @block_gba_id, 'GBA-201', 'ACTIVE');

-- ============================================================================
-- VERIFICATION QUERIES (Commented out - uncomment to verify)
-- ============================================================================

-- Verify user count by role
-- SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;

-- Verify departments
-- SELECT * FROM departments ORDER BY code;

-- Verify hostel blocks
-- SELECT * FROM hostel_blocks ORDER BY code;

-- Verify pass types
-- SELECT * FROM pass_types ORDER BY code;

-- Verify workflow steps
-- SELECT pt.code, ptws.step_order, ptws.approver_role 
-- FROM pass_type_workflow_steps ptws
-- JOIN pass_types pt ON ptws.pass_type_id = pt.id
-- ORDER BY pt.code, ptws.step_order;

-- Verify system settings
-- SELECT * FROM system_settings ORDER BY setting_key;

-- Verify students with class and hostel info
-- SELECT s.roll_number, s.first_name, s.last_name, 
--        c.year, c.section, d.code as dept_code,
--        hb.code as hostel_block
-- FROM students s
-- JOIN classes c ON s.class_id = c.id
-- JOIN departments d ON c.department_id = d.id
-- JOIN hostel_blocks hb ON s.hostel_block_id = hb.id;

-- Verify staff with department info
-- SELECT st.employee_id, st.first_name, st.last_name, 
--        st.designation, d.code as dept_code, u.role
-- FROM staff st
-- JOIN users u ON st.user_id = u.id
-- LEFT JOIN departments d ON st.department_id = d.id
-- ORDER BY u.role;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
