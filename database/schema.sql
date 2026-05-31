-- ============================================================================
-- Hostel Gate Pass Management System - Database Schema
-- Version: 1.0.0
-- Description: Complete MySQL schema with normalized 3NF design
-- ============================================================================

-- Set SQL mode and character encoding
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ============             ================================================================
-- PHASE 1: INDEPENDENT TABLES (No Foreign Keys)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: users
-- Description: Core authentication and user management table
-- Supports 6 roles: STUDENT, CLASS_COORDINATOR, HOSTEL_OFFICE, 
--                   CHIEF_WARDEN, WATCHMAN, ADMIN
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'CLASS_COORDINATOR', 'HOSTEL_OFFICE', 'CHIEF_WARDEN', 'WATCHMAN', 'ADMIN') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_last_login (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: departments
-- Description: Academic departments (CSE, ECE, MECH, IT, etc.)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_dept_name (name),
    UNIQUE INDEX idx_dept_code (code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: pass_types
-- Description: Types of passes (HALF_DAY, HOME_PASS)
-- Each type has different duration limits and approval workflows
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS pass_types;
CREATE TABLE pass_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    max_duration_hours INT NOT NULL,
    requires_destination BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_pass_type_code (code),
    UNIQUE INDEX idx_pass_type_name (name),
    INDEX idx_pass_type_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 2: FIRST-LEVEL DEPENDENCIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: hostel_blocks
-- Description: Hostel buildings with gender restrictions
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS hostel_blocks;
CREATE TABLE hostel_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'MIXED') NOT NULL,
    total_rooms INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_block_name (name),
    UNIQUE INDEX idx_block_code (code),
    INDEX idx_gender (gender),
    INDEX idx_block_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: classes
-- Description: Student classes (e.g., CSE Year 1 Section A)
-- Each class has a coordinator who approves HOME_PASS requests
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS classes;
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    year INT NOT NULL,
    section VARCHAR(10) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    coordinator_id INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE INDEX idx_class_unique (department_id, year, section, academic_year),
    INDEX idx_coordinator (coordinator_id),
    INDEX idx_class_active (is_active),
    
    CHECK (year BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: staff
-- Description: Staff member profiles (coordinators, office, warden, watchman)
-- Linked to users table via user_id
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    department_id INT NULL,
    designation VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    
    UNIQUE INDEX idx_staff_user (user_id),
    UNIQUE INDEX idx_employee_id (employee_id),
    INDEX idx_department (department_id),
    INDEX idx_staff_status (status),
    INDEX idx_staff_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: pass_type_workflow_steps
-- Description: Defines approval workflow for each pass type
-- HALF_DAY: 1 step (HOSTEL_OFFICE)
-- HOME_PASS: 3 steps (CLASS_COORDINATOR → HOSTEL_OFFICE → CHIEF_WARDEN)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS pass_type_workflow_steps;
CREATE TABLE pass_type_workflow_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_type_id INT NOT NULL,
    step_order INT NOT NULL,
    approver_role ENUM('CLASS_COORDINATOR', 'HOSTEL_OFFICE', 'CHIEF_WARDEN') NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pass_type_id) REFERENCES pass_types(id) ON DELETE CASCADE,
    
    UNIQUE INDEX idx_workflow_step (pass_type_id, step_order),
    INDEX idx_pass_type (pass_type_id),
    
    CHECK (step_order > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 3: SECOND-LEVEL DEPENDENCIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: students
-- Description: Student profiles with class and hostel assignment
-- Linked to users table via user_id
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    phone VARCHAR(20),
    parent_phone VARCHAR(20),
    class_id INT NOT NULL,
    hostel_block_id INT NOT NULL,
    room_number VARCHAR(20),
    status ENUM('ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (hostel_block_id) REFERENCES hostel_blocks(id) ON DELETE RESTRICT,
    
    UNIQUE INDEX idx_student_user (user_id),
    UNIQUE INDEX idx_roll_number (roll_number),
    INDEX idx_class (class_id),
    INDEX idx_hostel_block (hostel_block_id),
    INDEX idx_student_status (status),
    INDEX idx_student_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 4: THIRD-LEVEL DEPENDENCIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: passes
-- Description: Gate pass applications with status tracking
-- Status flow: PENDING → IN_APPROVAL → APPROVED → OUTSIDE → COMPLETED/COMPLETED_LATE
--              PENDING/IN_APPROVAL → REJECTED
--              PENDING/IN_APPROVAL → CANCELLED (by student)
--              APPROVED → EXPIRED (if not used)
-- Legacy statuses are retained in the ENUM for backwards compatibility
-- during data migrations from older installations.
-- QR code is generated after final approval.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS passes;
CREATE TABLE passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    pass_type_id INT NOT NULL,
    from_datetime DATETIME NOT NULL,
    to_datetime DATETIME NOT NULL,
    destination VARCHAR(255),
    reason TEXT NOT NULL,
    current_status ENUM('PENDING', 'IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE', 'PENDING_CHIEF_WARDEN', 'FINAL_APPROVED', 'APPROVED', 'OUTSIDE', 'COMPLETED', 'COMPLETED_LATE', 'REJECTED', 'CANCELLED', 'EXPIRED', 'EXITED', 'RETURNED', 'LATE_RETURN') NOT NULL DEFAULT 'PENDING',
    current_approval_step INT NOT NULL DEFAULT 0,
    total_approval_steps INT NOT NULL DEFAULT 0,
    qr_code_hash VARCHAR(255) NULL,
    qr_code TEXT NULL,
    qr_generated_at TIMESTAMP NULL,
    exit_scan_at TIMESTAMP NULL,
    return_scan_at TIMESTAMP NULL,
    late_minutes INT DEFAULT 0,
    exit_time DATETIME NULL,
    entry_time DATETIME NULL,
    rejection_reason TEXT NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (pass_type_id) REFERENCES pass_types(id) ON DELETE RESTRICT,
    
    INDEX idx_student (student_id),
    INDEX idx_pass_type (pass_type_id),
    INDEX idx_current_status (current_status),
    INDEX idx_from_datetime (from_datetime),
    INDEX idx_to_datetime (to_datetime),
    INDEX idx_qr_hash (qr_code_hash),
    INDEX idx_composite_student_status (student_id, current_status),
    INDEX idx_composite_status_datetime (current_status, from_datetime),
    
    CHECK (from_datetime < to_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: system_settings
-- Description: Configurable system parameters
-- Examples: max_passes_per_month, late_return_grace_minutes, qr_expiry_hours
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    data_type ENUM('STRING', 'INTEGER', 'BOOLEAN', 'DECIMAL') NOT NULL DEFAULT 'STRING',
    description TEXT,
    is_editable BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE INDEX idx_setting_key (setting_key),
    INDEX idx_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 5: FOURTH-LEVEL DEPENDENCIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: pass_approvals
-- Description: Tracks each approval step in the workflow
-- Each pass goes through multiple approval steps based on pass type
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS pass_approvals;
CREATE TABLE pass_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_id INT NOT NULL,
    step_order INT NOT NULL,
    approver_role ENUM('CLASS_COORDINATOR', 'HOSTEL_OFFICE', 'CHIEF_WARDEN') NOT NULL,
    approver_id INT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    action_taken_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    UNIQUE INDEX idx_pass_step (pass_id, step_order),
    INDEX idx_pass (pass_id),
    INDEX idx_approver (approver_id),
    INDEX idx_approval_status (status),
    INDEX idx_composite_approver_status (approver_id, status),
    INDEX idx_action_taken (action_taken_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: pass_scans
-- Description: Records exit and return scans by watchman
-- Tracks late returns and calculates late duration
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS pass_scans;
CREATE TABLE pass_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_id INT NOT NULL,
    student_id INT NOT NULL,
    watchman_id INT NOT NULL,
    scan_type ENUM('EXIT', 'RETURN') NOT NULL,
    scan_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    late_duration_minutes INT NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (watchman_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_pass (pass_id),
    INDEX idx_student (student_id),
    INDEX idx_watchman (watchman_id),
    INDEX idx_scan_type (scan_type),
    INDEX idx_scan_datetime (scan_datetime),
    INDEX idx_is_late (is_late),
    INDEX idx_composite_pass_scan_type (pass_id, scan_type),
    INDEX idx_composite_student_datetime (student_id, scan_datetime),
    
    CHECK (late_duration_minutes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES (Commented out - uncomment to verify)
-- ============================================================================

-- Verify table count (should be 12)
-- SELECT COUNT(*) AS table_count FROM information_schema.tables 
-- WHERE table_schema = DATABASE();

-- List all tables
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = DATABASE() ORDER BY table_name;

-- Verify indexes
-- SELECT table_name, index_name, column_name 
-- FROM information_schema.statistics 
-- WHERE table_schema = DATABASE() 
-- ORDER BY table_name, index_name, seq_in_index;

-- Verify foreign keys
-- SELECT table_name, constraint_name, referenced_table_name 
-- FROM information_schema.key_column_usage 
-- WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
