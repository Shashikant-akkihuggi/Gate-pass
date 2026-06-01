const { v4: uuidv4 } = require('uuid');
const { pool: db } = require('../config/database');
const { PASS_STATUS, PASS_TYPES, APPROVAL_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

const ACTIVE_PASS_STATUSES = [
    'PENDING',
    PASS_STATUS.IN_APPROVAL,
    PASS_STATUS.PENDING_CLASS_COORDINATOR,
    PASS_STATUS.PENDING_HOSTEL_OFFICE,
    PASS_STATUS.FINAL_APPROVED,
    PASS_STATUS.EXITED
];
const CANCELLABLE_PASS_STATUSES = [
    'PENDING',
    PASS_STATUS.IN_APPROVAL,
    PASS_STATUS.PENDING_CLASS_COORDINATOR,
    PASS_STATUS.PENDING_HOSTEL_OFFICE,
    PASS_STATUS.FINAL_APPROVED
];

/**
 * Get student details by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Student details
 */
const getStudentByUserId = async (userId) => {
    const [students] = await db.query(
        `SELECT s.*, s.assigned_coordinator_id, 
            CONCAT('Year ', s.year, ' - Section ', s.section) as class_name,
            s.year, s.section,
            s.branch as department_name, 'Hostel' as hostel_block
     FROM students s
     WHERE s.id = ?`,
        [userId]
    );

    if (students.length === 0) {
        throw new Error('STUDENT_NOT_FOUND');
    }

    return students[0];
};

/**
 * Get pass type details by code
 * @param {string} passTypeCode - Pass type code (HALF_DAY, HOME_PASS)
 * @returns {Promise<Object>} Pass type details
 */
const getPassTypeByCode = async (passTypeCode) => {
    const [passTypes] = await db.query(
        'SELECT * FROM pass_types WHERE code = ? AND is_active = TRUE',
        [passTypeCode]
    );

    if (passTypes.length === 0) {
        throw new Error('INVALID_PASS_TYPE');
    }

    return passTypes[0];
};

/**
 * Check for overlapping active passes
 * @param {string} studentId - Student ID
 * @param {Date} fromDatetime - Pass start datetime
 * @param {Date} toDatetime - Pass end datetime
 * @param {string} excludePassId - Pass ID to exclude (for updates)
 * @returns {Promise<boolean>} True if overlap exists
 */
const checkOverlappingPasses = async (studentId, fromDatetime, toDatetime, excludePassId = null) => {
    let query = `
    SELECT COUNT(*) as count
    FROM passes
    WHERE student_id = ?
      AND current_status IN (?, ?, ?, ?)
      AND (
        (from_datetime <= ? AND to_datetime >= ?)
        OR (from_datetime <= ? AND to_datetime >= ?)
        OR (from_datetime >= ? AND to_datetime <= ?)
      )
  `;

    const params = [
        studentId,
        ...ACTIVE_PASS_STATUSES,
        fromDatetime, fromDatetime,
        toDatetime, toDatetime,
        fromDatetime, toDatetime
    ];

    if (excludePassId) {
        query += ' AND id != ?';
        params.push(excludePassId);
    }

    const [result] = await db.query(query, params);
    return result[0].count > 0;
};

/**
 * Check monthly pass limit
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Pass count and limit
 */
const checkMonthlyPassLimit = async (studentId) => {
    // Get max passes per month from settings
    const [settings] = await db.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'max_passes_per_month'"
    );

    const maxPasses = settings.length > 0 ? parseInt(settings[0].setting_value) : 4;

    // Count passes this month
    const [result] = await db.query(
        `SELECT COUNT(*) as count
     FROM passes
     WHERE student_id = ?
       AND current_status NOT IN ('CANCELLED', 'REJECTED')
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
        [studentId]
    );

    const currentCount = result[0].count;

    return {
        currentCount,
        maxPasses,
        canApply: currentCount < maxPasses
    };
};

/**
 * Validate pass duration
 * @param {string} passTypeCode - Pass type code
 * @param {Date} fromDatetime - Start datetime
 * @param {Date} toDatetime - End datetime
 * @returns {Promise<Object>} Validation result
 */
const validatePassDuration = async (passTypeCode, fromDatetime, toDatetime) => {
    const passType = await getPassTypeByCode(passTypeCode);

    const durationHours = (new Date(toDatetime) - new Date(fromDatetime)) / (1000 * 60 * 60);

    if (durationHours <= 0) {
        return {
            isValid: false,
            message: 'End time must be after start time'
        };
    }

    if (durationHours > passType.max_duration_hours) {
        return {
            isValid: false,
            message: `Pass duration cannot exceed ${passType.max_duration_hours} hours`
        };
    }

    // Additional validation for half-day pass
    if (passTypeCode === PASS_TYPES.HALF_DAY) {
        const fromDate = new Date(fromDatetime).toDateString();
        const toDate = new Date(toDatetime).toDateString();

        if (fromDate !== toDate) {
            return {
                isValid: false,
                message: 'Half-day pass must be within the same day'
            };
        }
    }

    return {
        isValid: true,
        durationHours
    };
};

/**
 * Create pass application
 * @param {Object} passData - Pass application data
 * @returns {Promise<Object>} Created pass
 */
const createPassApplication = async (passData) => {
    const {
        studentId,
        passTypeId,
        fromDatetime,
        toDatetime,
        reason,
        destination,
        parentContactVerified
    } = passData;

    await db.query(
        `INSERT INTO passes (
      student_id, pass_type_id, from_datetime, to_datetime,
      reason, destination,
      current_status, current_approval_step, total_approval_steps
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            studentId,
            passTypeId,
            fromDatetime,
            toDatetime,
            reason,
            destination || null,
            PASS_STATUS.IN_APPROVAL,
            0,
            0
        ]
    );

    // Get the inserted ID
    const [result] = await db.query('SELECT LAST_INSERT_ID() as id');
    return result[0].id;
};

/**
 * Create approval records based on workflow
 * @param {string} passId - Pass ID
 * @param {Array} approvalWorkflow - Array of approver roles
 * @param {string} coordinatorId - Coordinator user ID
 * @returns {Promise<void>}
 */
const createApprovalRecords = async (passId, approvalWorkflow, coordinatorId) => {
    // Get approver IDs based on roles
    const approvers = [];

    for (let i = 0; i < approvalWorkflow.length; i++) {
        const role = approvalWorkflow[i];
        let approverId = null;

        if (role === 'CLASS_COORDINATOR') {
            approverId = coordinatorId;
        } else {
            // Get first active user with the role
            const [users] = await db.query(
                'SELECT id FROM users WHERE role = ? AND status = "ACTIVE" LIMIT 1',
                [role]
            );

            if (users.length > 0) {
                approverId = users[0].id;
            }
        }

        if (approverId) {
            await db.query(
                `INSERT INTO pass_approvals (
          pass_id, approver_id, approver_role, step_order, status
        ) VALUES (?, ?, ?, ?, ?)`,
                [
                    passId,
                    approverId,
                    role,
                    i + 1,
                    APPROVAL_STATUS.PENDING
                ]
            );

            approvers.push({
                level: i + 1,
                role,
                approverId
            });
        }
    }

    return approvers;
};

/**
 * Get pass by ID with details
 * @param {string} passId - Pass ID
 * @returns {Promise<Object>} Pass details
 */
const getPassById = async (passId) => {
    const [passes] = await db.query(
        `SELECT p.*, 
            s.id as student_user_id, s.usn as roll_number, s.full_name as first_name, '' as last_name, s.mobile as phone,
            CONCAT('Year ', s.year, ' - Section ', s.section) as class_name,
            s.year, s.section,
            s.branch as department_name,
            'Hostel' as hostel_block, '' as room_number,
            pt.name as pass_type_name, pt.code as pass_type_code
     FROM passes p
     JOIN students s ON p.student_id = s.id
     JOIN pass_types pt ON p.pass_type_id = pt.id
     WHERE p.id = ?`,
        [passId]
    );

    if (passes.length === 0) {
        return null;
    }

    const pass = passes[0];

    // Get approval details
    const [approvals] = await db.query(
        `SELECT a.*, 
            COALESCE(u.email, c.mobile_number) as approver_email,
            COALESCE(st.first_name, c.full_name) as approver_first_name,
            COALESCE(st.last_name, '') as approver_last_name
     FROM pass_approvals a
     LEFT JOIN users u ON a.approver_id = u.id
     LEFT JOIN staff st ON u.id = st.user_id
     LEFT JOIN coordinators c ON a.approver_id = c.id
     WHERE a.pass_id = ?
     ORDER BY a.step_order ASC`,
        [passId]
    );

    pass.approvals = approvals;

    return pass;
};

/**
 * Get student passes with filters
 * @param {string} studentId - Student ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of passes
 */
const getStudentPasses = async (studentId, filters = {}) => {
    let query = `
    SELECT p.*, pt.name as pass_type_name, pt.code as pass_type_code
    FROM passes p
    JOIN pass_types pt ON p.pass_type_id = pt.id
    WHERE p.student_id = ?
  `;

    const params = [studentId];

    if (filters.status) {
        query += ' AND p.current_status = ?';
        params.push(filters.status);
    }

    if (filters.passType) {
        query += ' AND pt.code = ?';
        params.push(filters.passType);
    }

    if (filters.fromDate) {
        query += ' AND DATE(p.from_datetime) >= ?';
        params.push(filters.fromDate);
    }

    if (filters.toDate) {
        query += ' AND DATE(p.to_datetime) <= ?';
        params.push(filters.toDate);
    }

    query += ' ORDER BY p.created_at DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
    }

    const [passes] = await db.query(query, params);
    return passes;
};

/**
 * Cancel pass
 * @param {string} passId - Pass ID
 * @param {string} studentId - Student ID (for authorization)
 * @returns {Promise<boolean>} True if cancelled
 */
const cancelPass = async (passId, studentId) => {
    // Verify pass belongs to student and is cancellable
    const [passes] = await db.query(
        `SELECT id, current_status FROM passes 
     WHERE id = ? AND student_id = ?`,
        [passId, studentId]
    );

    if (passes.length === 0) {
        throw new Error('PASS_NOT_FOUND');
    }

    const pass = passes[0];

    if (!CANCELLABLE_PASS_STATUSES.includes(pass.current_status)) {
        throw new Error('PASS_NOT_CANCELLABLE');
    }

    // Update pass status
    await db.query(
        'UPDATE passes SET current_status = ?, updated_at = NOW() WHERE id = ?',
        [PASS_STATUS.CANCELLED, passId]
    );

    // Update approval records
    await db.query(
        'UPDATE pass_approvals SET status = ?, updated_at = NOW() WHERE pass_id = ? AND status = ?',
        [APPROVAL_STATUS.REJECTED, passId, APPROVAL_STATUS.PENDING]
    );

    return true;
};

/**
 * Get pass statistics for student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Statistics
 */
const getStudentPassStats = async (studentId) => {
    const [stats] = await db.query(
        `SELECT 
      COUNT(*) as total_passes,
      SUM(CASE WHEN current_status = 'PENDING' THEN 1 ELSE 0 END) as pending_passes,
      SUM(CASE WHEN current_status = 'FINAL_APPROVED' THEN 1 ELSE 0 END) as approved_passes,
      SUM(CASE WHEN current_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_passes,
      SUM(CASE WHEN current_status IN ('RETURNED', 'LATE_RETURN') THEN 1 ELSE 0 END) as used_passes,
      SUM(CASE WHEN current_status = 'LATE_RETURN' THEN 1 ELSE 0 END) as late_returns
     FROM passes
     WHERE student_id = ?`,
        [studentId]
    );

    const monthlyLimit = await checkMonthlyPassLimit(studentId);

    return {
        ...stats[0],
        monthly_limit: monthlyLimit
    };
};

/**
 * Request pass extension
 * @param {Object} extensionData - Extension request data
 * @returns {Promise<number>} Extension ID
 */
const requestExtension = async (extensionData) => {
    const { passId, requestedById, extendedToDatetime, reason } = extensionData;

    // 1. Verify pass exists and is in a state that can be extended (APPROVED or EXITED/OUTSIDE)
    const [passes] = await db.query(
        'SELECT id, current_status, to_datetime, student_id FROM passes WHERE id = ?',
        [passId]
    );

    if (passes.length === 0) {
        throw new Error('PASS_NOT_FOUND');
    }

    const pass = passes[0];

    // Verify ownership
    if (pass.student_id !== requestedById) {
        throw new Error('UNAUTHORIZED_EXTENSION_REQUEST');
    }

    const allowedStatuses = [PASS_STATUS.FINAL_APPROVED, PASS_STATUS.EXITED, PASS_STATUS.OUTSIDE, PASS_STATUS.EXTENDED];
    if (!allowedStatuses.includes(pass.current_status)) {
        throw new Error('PASS_NOT_EXTENDABLE');
    }

    // 2. Check for existing pending extension
    const [existing] = await db.query(
        'SELECT id FROM pass_extensions WHERE pass_id = ? AND status = "PENDING"',
        [passId]
    );

    if (existing.length > 0) {
        throw new Error('EXTENSION_ALREADY_PENDING');
    }

    // 3. Create extension request
    const [result] = await db.query(
        `INSERT INTO pass_extensions (
            pass_id, requested_by_id, current_to_datetime, extended_to_datetime, reason, status
        ) VALUES (?, ?, ?, ?, ?, "PENDING")`,
        [passId, requestedById, pass.to_datetime, extendedToDatetime, reason]
    );

    const extensionId = result.insertId;

    // 4. Do NOT change pass status, just store the extension request
    // Removed: await db.query('UPDATE passes SET current_status = "EXTENSION_PENDING" ...')

    return extensionId;
};

/**
 * Get extensions for approver
 * @param {string} approverId - Approver User ID
 * @param {string} role - Approver role
 * @returns {Promise<Array>} List of extensions
 */
const getPendingExtensions = async (approverId, role) => {
    let query = `
        SELECT ex.*, p.student_id, p.pass_type_id, s.full_name as student_name, s.usn, pt.name as pass_type_name
        FROM pass_extensions ex
        JOIN passes p ON ex.pass_id = p.id
        JOIN students s ON p.student_id = s.id
        JOIN pass_types pt ON p.pass_type_id = pt.id
        WHERE ex.status = 'PENDING'
    `;

    const params = [];

    if (role === 'CLASS_COORDINATOR') {
        query += ' AND s.coordinator_id = ?';
        params.push(approverId);
    } else if (role === 'HOSTEL_OFFICE') {
        // Hostel office sees all pending extensions (or those approved by coordinator if required)
        // For simplicity, let's say both can approve.
    } else {
        return [];
    }

    const [extensions] = await db.query(query, params);
    return extensions;
};

/**
 * Process extension approval
 * @param {number} extensionId - Extension ID
 * @param {string} approverId - Approver User ID
 * @param {string} role - Approver role
 * @param {string} status - APPROVED or REJECTED
 * @param {string} remarks - Optional remarks
 * @returns {Promise<void>}
 */
const processExtensionApproval = async (extensionId, approverId, role, status, remarks) => {
    const [extensions] = await db.query(
        'SELECT * FROM pass_extensions WHERE id = ?',
        [extensionId]
    );

    if (extensions.length === 0) {
        throw new Error('EXTENSION_NOT_FOUND');
    }

    const extension = extensions[0];

    if (extension.status !== 'PENDING') {
        throw new Error('EXTENSION_ALREADY_PROCESSED');
    }

    // Update extension status
    await db.query(
        'UPDATE pass_extensions SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?',
        [status, remarks, extensionId]
    );

    if (status === 'APPROVED') {
        // Update pass return time and keep its current active status (EXITED/OUTSIDE or FINAL_APPROVED)
        await db.query(
            'UPDATE passes SET to_datetime = ?, updated_at = NOW() WHERE id = ?',
            [extension.extended_to_datetime, extension.pass_id]
        );
    } else {
        // If rejected, the pass status remains unchanged (it was never changed by requestExtension)
        // No action needed for passes table
    }
};

module.exports = {
    getStudentByUserId,
    getPassTypeByCode,
    checkOverlappingPasses,
    checkMonthlyPassLimit,
    validatePassDuration,
    createPassApplication,
    createApprovalRecords,
    getPassById,
    getStudentPasses,
    cancelPass,
    getStudentPassStats,
    requestExtension,
    getPendingExtensions,
    processExtensionApproval
};
