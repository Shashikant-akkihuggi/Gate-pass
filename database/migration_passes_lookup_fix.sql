-- ============================================================================
-- Migration: Fix passes columns required by watchman lookup
-- Safe to re-run: each column is added only when it is missing.
-- ============================================================================

SET @schema_name = DATABASE();

SET @add_qr_code = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = @schema_name
              AND table_name = 'passes'
              AND column_name = 'qr_code'
        ),
        "SELECT 'passes.qr_code already exists' AS status",
        "ALTER TABLE passes ADD COLUMN qr_code TEXT NULL AFTER qr_code_hash"
    )
);
PREPARE stmt FROM @add_qr_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_late_minutes = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = @schema_name
              AND table_name = 'passes'
              AND column_name = 'late_minutes'
        ),
        "SELECT 'passes.late_minutes already exists' AS status",
        "ALTER TABLE passes ADD COLUMN late_minutes INT DEFAULT 0 AFTER return_scan_at"
    )
);
PREPARE stmt FROM @add_late_minutes;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_exit_time = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = @schema_name
              AND table_name = 'passes'
              AND column_name = 'exit_time'
        ),
        "SELECT 'passes.exit_time already exists' AS status",
        "ALTER TABLE passes ADD COLUMN exit_time DATETIME NULL AFTER late_minutes"
    )
);
PREPARE stmt FROM @add_exit_time;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_entry_time = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = @schema_name
              AND table_name = 'passes'
              AND column_name = 'entry_time'
        ),
        "SELECT 'passes.entry_time already exists' AS status",
        "ALTER TABLE passes ADD COLUMN entry_time DATETIME NULL AFTER exit_time"
    )
);
PREPARE stmt FROM @add_entry_time;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE passes
SET exit_time = exit_scan_at
WHERE exit_time IS NULL
  AND exit_scan_at IS NOT NULL;

UPDATE passes
SET entry_time = return_scan_at
WHERE entry_time IS NULL
  AND return_scan_at IS NOT NULL;

SELECT 'passes lookup migration complete' AS status;
