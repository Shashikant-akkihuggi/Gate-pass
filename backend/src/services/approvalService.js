const { v4: uuidv4 } = require('uuid');
const { pool: db } = require('../config/database');
const { PASS_STATUS, APPROVAL_STATUS, ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const qrService = require('./qrService');

const finalizePassApproval = async (connection, passId, newApprovalStep) => {
    const { hash: qrHash, dataURL: qrCodeDataURL } = await qrService.generatePassQRCode(passId);

    await connection.query(
        `UPDATE passes
         SET current_status = ?,
             current_approval_step = ?,
             qr_code_hash = ?,
             qr_code = ?,
             qr_generated_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [PASS_STATUS.FINAL_APPROVED, newApprovalStep, qrHash, qrCodeDataURL, passId]
    );

    return qrCodeDataURL;
};

/**
 * Get pending approvals for approver
 * @param {string} approverId - Approver user ID
 * @param {string} approverRole - Approver role
 * @returns {Promise<Array>} Pending approvals
 */
const getPendingApprovals = async (approverId, approverRole) => {
    let query = `
    SELECT 
      p.id as pass_id,
      p.from_datetime,
      p.to_datetime,
      p.reason,
      p.destination,
      p.current_status,
      p.current_approval_step,
      p.created_at as pass_created_at,
      pt.name as pass_type_name,
      pt.code as pass_type_code,
      s.id as student_id,
      s.usn as roll_number,
      s.full_name as first_name,
      '' as last_name,
      s.mobile as phone,
      '' as room_number,
      CONCAT('Year ', s.year, ' - Section ', s.section) as class_name,
      s.year,
      s.section,
      s.branch as department_name,
      'Hostel' as hostel_block,
      a.id as approval_id,
      a.step_order,
      a.approver_role,
      a.status as approval_status,
      a.created_at as approval_created_at
    FROM pass_approvals a
    JOIN passes p ON a.pass_id = p.id
    JOIN pass_types pt ON p.pass_type_id = pt.id
    JOIN students s ON p.student_id = s.id
    WHERE a.approver_role = ?
      AND a.status = ?
  `;

    // Match by approver_id if assigned, otherwise match by role only
    const params = [approverRole, APPROVAL_STATUS.PENDING];

    // Status mapping: Only show passes that match the approver's role status
    if (approverRole === ROLES.CLASS_COORDINATOR) {
        query += ' AND p.current_status = ?';
        params.push(PASS_STATUS.PENDING_CLASS_COORDINATOR);
    } else if (approverRole === ROLES.HOSTEL_OFFICE) {
        query += ' AND p.current_status = ?';
        params.push(PASS_STATUS.PENDING_HOSTEL_OFFICE);
    } else if (approverRole === ROLES.CHIEF_WARDEN) {
        query += ' AND p.current_status = ?';
        params.push(PASS_STATUS.PENDING_CHIEF_WARDEN);
    }

    // Show passes where it's this approver's turn: current_approval_step = step_order - 1
    query += ' AND p.current_approval_step = (a.step_order - 1)';

    // For Coordinators, only show passes specifically assigned to them
    // We check both pass_approvals.approver_id AND passes.coordinator_id as a fallback
    if (approverRole === ROLES.CLASS_COORDINATOR) {
        query += ' AND (a.approver_id = ? OR p.coordinator_id = ?)';
        params.push(approverId, approverId);
    } else {
        // For other roles, show if assigned or if it's a general role-based approval
        query += ' AND (a.approver_id = ? OR a.approver_id IS NULL)';
        params.push(approverId);
    }

    query += ' ORDER BY p.created_at ASC';

    logger.info('getPendingApprovals query:', { approverRole, approverId, query });
    const [approvals] = await db.query(query, params);
    logger.info(`getPendingApprovals result: ${approvals.length} records`);
    return approvals;
};

/**
 * Get approval by ID with pass details
 * @param {string} approvalId - Approval ID
 * @returns {Promise<Object>} Approval details
 */
const getApprovalById = async (approvalId) => {
    const [approvals] = await db.query(
        `SELECT a.*, p.*, 
            s.usn as roll_number, s.full_name as first_name, '' as last_name,
            pt.name as pass_type_name, pt.code as pass_type_code
     FROM pass_approvals a
     JOIN passes p ON a.pass_id = p.id
     JOIN students s ON p.student_id = s.id
     JOIN pass_types pt ON p.pass_type_id = pt.id
     WHERE a.id = ?`,
        [approvalId]
    );

    return approvals.length > 0 ? approvals[0] : null;
};

/**
 * Validate approval action
 * @param {string} passId - Pass ID
 * @param {string} approverId - Approver user ID
 * @param {string} approverRole - Approver role
 * @returns {Promise<Object>} Validation result
 */
const validateApprovalAction = async (passId, approverId, approverRole, conn = null) => {
    const dbConn = conn || db;

    // Get pass details
    const [passes] = await dbConn.query(
        'SELECT id, current_status, current_approval_step FROM passes WHERE id = ?',
        [passId]
    );

    if (passes.length === 0) {
        return {
            isValid: false,
            message: 'Pass not found'
        };
    }

    const pass = passes[0];

    // Check if pass is in a valid approvable status
    const validStatuses = [
        PASS_STATUS.IN_APPROVAL,
        PASS_STATUS.PENDING_CLASS_COORDINATOR,
        PASS_STATUS.PENDING_HOSTEL_OFFICE
    ];

    if (!validStatuses.includes(pass.current_status)) {
        return {
            isValid: false,
            message: 'Pass is not in approval status'
        };
    }

    // Get approver's approval record - match by role, and either approver_id matches or is unassigned
    // For coordinators, we strictly require the approver_id to match.
    let approvalQuery = `
        SELECT id, step_order, status, approver_id
        FROM pass_approvals 
        WHERE pass_id = ? AND approver_role = ? AND status = 'PENDING'
    `;

    if (approverRole === ROLES.CLASS_COORDINATOR) {
        approvalQuery += ' AND approver_id = ?';
    } else {
        approvalQuery += ' AND (approver_id = ? OR approver_id IS NULL)';
    }

    const [approvals] = await dbConn.query(approvalQuery, [passId, approverRole, approverId]);

    if (approvals.length === 0) {
        logger.warn(`validateApprovalAction: no matching approval row for pass_id=${passId}, role=${approverRole}, approverId=${approverId}`);
        // Debug: log what rows actually exist
        const [allRows] = await dbConn.query(
            'SELECT id, step_order, approver_role, approver_id, status FROM pass_approvals WHERE pass_id = ?',
            [passId]
        );
        logger.warn('All pass_approvals rows for this pass:', allRows);
        return {
            isValid: false,
            message: 'You are not assigned to approve this pass'
        };
    }

    const approval = approvals[0];

    // If approver_id was NULL, assign it now so future queries match
    if (approval.approver_id === null) {
        await dbConn.query(
            'UPDATE pass_approvals SET approver_id = ? WHERE id = ?',
            [approverId, approval.id]
        );
        approval.approver_id = approverId;
    }

    // Check if already approved/rejected
    if (approval.status !== APPROVAL_STATUS.PENDING) {
        return {
            isValid: false,
            message: `You have already ${approval.status.toLowerCase()} this pass`
        };
    }

    // Check if it's the approver's turn (sequential approval)
    // current_approval_step tracks completed steps, so step_order 1 is ready when current_approval_step = 0
    if (pass.current_approval_step !== (approval.step_order - 1)) {
        return {
            isValid: false,
            message: 'This pass has not reached your approval level yet'
        };
    }

    return {
        isValid: true,
        approval,
        pass
    };
};

/**
 * Approve pass
 * @param {string} passId - Pass ID
 * @param {string} approverId - Approver user ID
 * @param {string} approverRole - Approver role
 * @param {string} remarks - Approval remarks
 * @returns {Promise<Object>} Approval result
 */
const approvePass = async (passId, approverId, approverRole, remarks = null) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        logger.info(`[APPROVAL_FLOW] Starting approval for passId: ${passId}, approverId: ${approverId}, role: ${approverRole}`);

        // Validate approval action using the same connection
        const validation = await validateApprovalAction(passId, approverId, approverRole, connection);

        if (!validation.isValid) {
            logger.warn(`[APPROVAL_FLOW] Validation failed for passId: ${passId}: ${validation.message}`);
            throw new Error(validation.message);
        }

        const { approval, pass } = validation;

        logger.info(`[APPROVAL_FLOW] Validation successful:`, {
            approvalId: approval.id,
            passId: pass.id,
            currentStatus: pass.current_status,
            currentApprovalStep: pass.current_approval_step,
            stepOrder: approval.step_order
        });

        // Update approval record
        await connection.query(
            `UPDATE pass_approvals 
       SET status = ?, remarks = ?, action_taken_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
            [APPROVAL_STATUS.APPROVED, remarks, approval.id]
        );

        // Get total approval steps for this pass
        const [totalSteps] = await connection.query(
            'SELECT MAX(step_order) as max_step FROM pass_approvals WHERE pass_id = ?',
            [passId]
        );

        const maxStep = totalSteps[0].max_step;
        logger.info(`[APPROVAL_FLOW] Max step for pass ${passId}: ${maxStep}`);

        const finishedStepOrder = approval.step_order;

        // Check if this is the final approval
        if (finishedStepOrder >= maxStep) {
            logger.info(`[APPROVAL_FLOW] Final approval reached for pass ${passId}. Finalizing...`);
            // All approvals complete - generate QR code and mark as FINAL_APPROVED
            const qrCodeDataURL = await finalizePassApproval(connection, passId, finishedStepOrder);

            await connection.commit();
            logger.info(`[APPROVAL_FLOW] Pass ${passId} fully approved and committed.`);

            return {
                success: true,
                message: 'Pass approved successfully. QR code generated.',
                isFinalApproval: true,
                qrCode: qrCodeDataURL
            };
        } else {
            // Advance to next approval step
            const nextStepOrder = finishedStepOrder + 1;

            // Get next approver role to determine next status
            const [nextApprover] = await connection.query(
                'SELECT approver_role FROM pass_approvals WHERE pass_id = ? AND step_order = ?',
                [passId, nextStepOrder]
            );

            let nextStatus = PASS_STATUS.IN_APPROVAL;
            if (nextApprover.length > 0) {
                const nextRole = nextApprover[0].approver_role;
                if (nextRole === ROLES.HOSTEL_OFFICE) {
                    nextStatus = PASS_STATUS.PENDING_HOSTEL_OFFICE;
                } else if (nextRole === ROLES.CHIEF_WARDEN) {
                    nextStatus = PASS_STATUS.PENDING_CHIEF_WARDEN;
                }
                logger.info(`[APPROVAL_FLOW] Next role: ${nextRole}, nextStatus: ${nextStatus}`);
            }

            await connection.query(
                `UPDATE passes 
         SET current_approval_step = ?, current_status = ?, updated_at = NOW()
         WHERE id = ?`,
                [finishedStepOrder, nextStatus, passId]
            );

            await connection.commit();
            logger.info(`[APPROVAL_FLOW] Pass ${passId} step ${finishedStepOrder} approved. Next step: ${nextStepOrder}, Status: ${nextStatus}`);

            return {
                success: true,
                message: 'Pass approved. Forwarded to next approver.',
                isFinalApproval: false,
                nextApprovalStep: nextStepOrder,
                nextStatus
            };
        }
    } catch (error) {
        logger.error("[APPROVAL_FLOW] ERROR during approval:", {
            message: error.message,
            stack: error.stack,
            passId,
            approverId,
            approverRole
        });
        try {
            await connection.rollback();
            logger.info(`[APPROVAL_FLOW] Rollback successful for passId: ${passId}`);
        } catch (rollbackError) {
            logger.error("[APPROVAL_FLOW] ROLLBACK ERROR:", rollbackError);
        }
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Reject pass
 * @param {string} passId - Pass ID
 * @param {string} approverId - Approver user ID
 * @param {string} approverRole - Approver role
 * @param {string} remarks - Rejection remarks
 * @returns {Promise<Object>} Rejection result
 */
const rejectPass = async (passId, approverId, approverRole, remarks) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Validate approval action using the same connection
        const validation = await validateApprovalAction(passId, approverId, approverRole, connection);

        if (!validation.isValid) {
            throw new Error(validation.message);
        }

        const { approval } = validation;

        // Remarks are required for rejection
        if (!remarks || remarks.trim().length === 0) {
            throw new Error('Remarks are required for rejection');
        }

        // Update approval record
        await connection.query(
            `UPDATE pass_approvals 
       SET status = ?, remarks = ?, action_taken_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
            [APPROVAL_STATUS.REJECTED, remarks, approval.id]
        );

        // Update pass status to rejected
        await connection.query(
            `UPDATE passes 
       SET current_status = ?, updated_at = NOW()
       WHERE id = ?`,
            [PASS_STATUS.REJECTED, passId]
        );

        // Mark all other pending approvals as rejected
        await connection.query(
            `UPDATE pass_approvals 
       SET status = ?, updated_at = NOW()
       WHERE pass_id = ? AND status = ? AND id != ?`,
            [APPROVAL_STATUS.REJECTED, passId, APPROVAL_STATUS.PENDING, approval.id]
        );

        await connection.commit();

        return {
            success: true,
            message: 'Pass rejected successfully'
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Get approval history for approver
 * @param {string} approverId - Approver user ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Approval history
 */
const getApprovalHistory = async (approverId, approverRole, filters = {}) => {
    // Match records where this user took action (approver_id = approverId)
    // OR where the role matches and action was taken (covers cases where approver_id was assigned at action time)
    let query = `
    SELECT 
      a.id as approval_id,
      a.step_order,
      a.status as approval_status,
      a.remarks,
      a.action_taken_at,
      a.created_at as approval_created_at,
      p.id as pass_id,
      p.from_datetime,
      p.to_datetime,
      p.destination,
      p.current_status as pass_status,
      pt.name as pass_type_name,
      s.usn as roll_number,
      s.full_name as first_name,
      '' as last_name,
      CONCAT('Year ', s.year, ' - Section ', s.section) as class_name
    FROM pass_approvals a
    JOIN passes p ON a.pass_id = p.id
    JOIN pass_types pt ON p.pass_type_id = pt.id
    JOIN students s ON p.student_id = s.id
    WHERE a.status IN ('APPROVED', 'REJECTED')
  `;

    const params = [];

    if (approverRole === ROLES.CLASS_COORDINATOR) {
        query += ' AND (a.approver_id = ? OR p.coordinator_id = ?)';
        params.push(approverId, approverId);
    } else {
        query += ' AND (a.approver_id = ? OR (a.approver_role = ? AND a.approver_id IS NULL))';
        params.push(approverId, approverRole);
    }

    if (filters.status) {
        query += ' AND a.status = ?';
        params.push(filters.status);
    }

    if (filters.fromDate) {
        query += ' AND DATE(a.action_taken_at) >= ?';
        params.push(filters.fromDate);
    }

    if (filters.toDate) {
        query += ' AND DATE(a.action_taken_at) <= ?';
        params.push(filters.toDate);
    }

    query += ' ORDER BY a.action_taken_at DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
    }

    logger.info('getApprovalHistory query params:', { approverId, approverRole, filters });
    const [history] = await db.query(query, params);
    logger.info(`getApprovalHistory result: ${history.length} records`);
    return history;
};

/**
 * Get approval statistics for approver
 * @param {string} approverId - Approver user ID
 * @param {string} approverRole - Approver role
 * @returns {Promise<Object>} Statistics
 */
const getApprovalStats = async (approverId, approverRole) => {
    // 1. Get action stats (Approved/Rejected by this user)
    const [actionStats] = await db.query(
        `SELECT 
      COUNT(*) as total_actions,
      SUM(CASE WHEN status = '${APPROVAL_STATUS.APPROVED}' THEN 1 ELSE 0 END) as approved_count,
      SUM(CASE WHEN status = '${APPROVAL_STATUS.REJECTED}' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status = '${APPROVAL_STATUS.APPROVED}' AND DATE(action_taken_at) = CURDATE() THEN 1 ELSE 0 END) as approved_today,
      SUM(CASE WHEN status = '${APPROVAL_STATUS.REJECTED}' AND DATE(action_taken_at) = CURDATE() THEN 1 ELSE 0 END) as rejected_today
     FROM pass_approvals
     WHERE approver_id = ? AND status IN ('APPROVED', 'REJECTED')`,
        [approverId]
    );

    // 2. Get pending count using identical logic to getPendingApprovals
    let pendingQuery = `
    SELECT COUNT(*) as count
    FROM pass_approvals a
    JOIN passes p ON a.pass_id = p.id
    WHERE a.approver_role = ?
      AND a.status = ?
  `;

    const pendingParams = [approverRole, APPROVAL_STATUS.PENDING];

    if (approverRole === ROLES.CLASS_COORDINATOR) {
        pendingQuery += ' AND p.current_status = ?';
        pendingParams.push(PASS_STATUS.PENDING_CLASS_COORDINATOR);
    } else if (approverRole === ROLES.HOSTEL_OFFICE) {
        pendingQuery += ' AND p.current_status = ?';
        pendingParams.push(PASS_STATUS.PENDING_HOSTEL_OFFICE);
    } else if (approverRole === ROLES.CHIEF_WARDEN) {
        pendingQuery += ' AND p.current_status = ?';
        pendingParams.push(PASS_STATUS.PENDING_CHIEF_WARDEN);
    }

    pendingQuery += ' AND p.current_approval_step = (a.step_order - 1)';

    if (approverRole === ROLES.CLASS_COORDINATOR) {
        pendingQuery += ' AND (a.approver_id = ? OR p.coordinator_id = ?)';
        pendingParams.push(approverId, approverId);
    } else {
        pendingQuery += ' AND (a.approver_id = ? OR a.approver_id IS NULL)';
        pendingParams.push(approverId);
    }

    const [pendingRes] = await db.query(pendingQuery, pendingParams);

    return {
        total_approvals: actionStats[0].total_actions + pendingRes[0].count,
        pending_count: pendingRes[0].count,
        approved_count: actionStats[0].approved_count || 0,
        rejected_count: actionStats[0].rejected_count || 0,
        approved_today: actionStats[0].approved_today || 0,
        rejected_today: actionStats[0].rejected_today || 0
    };
};

/**
 * Get pass approval timeline
 * @param {string} passId - Pass ID
 * @returns {Promise<Array>} Approval timeline
 */
const getPassApprovalTimeline = async (passId) => {
    const [timeline] = await db.query(
        `SELECT 
      a.id,
      a.step_order,
      a.approver_role,
      a.status,
      a.remarks,
      a.action_taken_at,
      a.created_at,
      u.email as approver_email,
      COALESCE(st.first_name, '') as approver_first_name,
      COALESCE(st.last_name, '') as approver_last_name
     FROM pass_approvals a
     JOIN users u ON a.approver_id = u.id
     LEFT JOIN staff st ON u.id = st.user_id
     WHERE a.pass_id = ?
     ORDER BY a.step_order ASC`,
        [passId]
    );

    return timeline;
};

/**
 * Check if user can approve pass
 * @param {string} passId - Pass ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<boolean>} Can approve
 */
const canUserApprovePass = async (passId, userId, userRole) => {
    const validation = await validateApprovalAction(passId, userId, userRole);
    return validation.isValid;
};

module.exports = {
    getPendingApprovals,
    getApprovalById,
    validateApprovalAction,
    approvePass,
    rejectPass,
    getApprovalHistory,
    getApprovalStats,
    getPassApprovalTimeline,
    canUserApprovePass
};
