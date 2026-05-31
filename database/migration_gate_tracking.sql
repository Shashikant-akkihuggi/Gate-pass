-- ============================================================================
-- Migration: Gate Exit/Entry Tracking Workflow
-- Run this against your existing database
-- ============================================================================

-- 1. Add qr_code (full data URL) and late_minutes columns to passes
ALTER TABLE passes
    ADD COLUMN IF NOT EXISTS qr_code TEXT NULL AFTER qr_code_hash,
    ADD COLUMN IF NOT EXISTS late_minutes INT NOT NULL DEFAULT 0 AFTER return_scan_at;

-- 2. Extend the current_status ENUM to include new statuses
--    MySQL requires redefining the full ENUM
ALTER TABLE passes
    MODIFY COLUMN current_status ENUM(
        'PENDING',
        'IN_APPROVAL',
        'FINAL_APPROVED',
        'APPROVED',
        'OUTSIDE',
        'COMPLETED',
        'COMPLETED_LATE',
        'REJECTED',
        'CANCELLED',
        'EXPIRED',
        'EXITED',
        'RETURNED',
        'LATE_RETURN'
    ) NOT NULL DEFAULT 'PENDING';

-- 3. Create gate_logs table for full audit trail
CREATE TABLE IF NOT EXISTS gate_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_id INT NOT NULL,
    student_id INT NOT NULL,
    action_type ENUM('EXIT', 'ENTRY') NOT NULL,
    scanned_by INT NOT NULL,
    scan_time DATETIME NOT NULL,
    gate_location VARCHAR(100) NULL,
    remarks TEXT NULL,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    late_minutes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_gate_logs_pass (pass_id),
    INDEX idx_gate_logs_student (student_id),
    INDEX idx_gate_logs_action (action_type),
    INDEX idx_gate_logs_scan_time (scan_time),
    INDEX idx_gate_logs_scanned_by (scanned_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Migrate existing FINAL_APPROVED passes to APPROVED
UPDATE passes SET current_status = 'APPROVED' WHERE current_status = 'FINAL_APPROVED';

-- 5. Migrate existing EXITED passes to OUTSIDE
UPDATE passes SET current_status = 'OUTSIDE' WHERE current_status = 'EXITED';

-- 6. Migrate existing RETURNED passes to COMPLETED
UPDATE passes SET current_status = 'COMPLETED' WHERE current_status = 'RETURNED';

-- 7. Migrate existing LATE_RETURN passes to COMPLETED_LATE
UPDATE passes SET current_status = 'COMPLETED_LATE' WHERE current_status = 'LATE_RETURN';

SELECT 'Migration complete' AS status;
