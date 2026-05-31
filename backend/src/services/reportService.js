const { pool: db } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get summary statistics for reports
 */
const getReportStats = async (filters = {}) => {
    const { fromDate, toDate, passTypeId } = filters;

    let whereClause = '1=1';
    const params = [];

    if (fromDate) {
        whereClause += ' AND DATE(p.created_at) >= ?';
        params.push(fromDate);
    }
    if (toDate) {
        whereClause += ' AND DATE(p.created_at) <= ?';
        params.push(toDate);
    }
    if (passTypeId) {
        whereClause += ' AND p.pass_type_id = ?';
        params.push(passTypeId);
    }

    const [stats] = await db.query(
        `SELECT
            COUNT(*) as total_passes,
            SUM(CASE WHEN current_status = 'FINAL_APPROVED' THEN 1 ELSE 0 END) as approved_passes,
            SUM(CASE WHEN current_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_passes,
            SUM(CASE WHEN current_status IN ('PENDING', 'IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE') THEN 1 ELSE 0 END) as pending_passes,
            SUM(CASE WHEN current_status = 'EXITED' THEN 1 ELSE 0 END) as exited_passes,
            SUM(CASE WHEN current_status = 'RETURNED' THEN 1 ELSE 0 END) as returned_passes,
            SUM(CASE WHEN current_status = 'LATE_RETURN' THEN 1 ELSE 0 END) as late_returns,
            SUM(CASE WHEN current_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_passes
         FROM passes p
         WHERE ${whereClause}`,
        params
    );

    // Passes approved by Hostel Office
    const [hostelOfficeStats] = await db.query(
        `SELECT COUNT(*) as hostel_office_approved
         FROM pass_approvals pa
         WHERE pa.approver_role = 'HOSTEL_OFFICE'
           AND pa.status = 'APPROVED'
           ${fromDate ? 'AND DATE(pa.action_taken_at) >= ?' : ''}
           ${toDate ? 'AND DATE(pa.action_taken_at) <= ?' : ''}`,
        [...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])]
    );

    return {
        ...stats[0],
        hostel_office_approved: hostelOfficeStats[0].hostel_office_approved
    };
};

/**
 * Get detailed pass records for reports
 */
const getReportData = async (filters = {}) => {
    const { fromDate, toDate, status, passTypeId } = filters;

    let whereClause = '1=1';
    const params = [];

    if (fromDate) {
        whereClause += ' AND DATE(p.created_at) >= ?';
        params.push(fromDate);
    }
    if (toDate) {
        whereClause += ' AND DATE(p.created_at) <= ?';
        params.push(toDate);
    }
    if (status) {
        whereClause += ' AND p.current_status = ?';
        params.push(status);
    }
    if (passTypeId) {
        whereClause += ' AND p.pass_type_id = ?';
        params.push(passTypeId);
    }

    logger.info('getReportData query filters:', filters);

    const [rows] = await db.query(
        `SELECT
            p.id as pass_id,
            s.full_name as first_name,
            '' as last_name,
            s.usn as roll_number,
            pt.name as pass_type_name,
            p.destination,
            p.from_datetime,
            p.to_datetime,
            p.current_status,
            p.reason,
            p.created_at,
            -- Last approver who took action
            (SELECT COALESCE(CONCAT(st2.first_name, ' ', st2.last_name), c2.full_name)
             FROM pass_approvals pa2
             LEFT JOIN users u2 ON pa2.approver_id = u2.id
             LEFT JOIN staff st2 ON u2.id = st2.user_id
             LEFT JOIN coordinators c2 ON pa2.approver_id = c2.id
             WHERE pa2.pass_id = p.id AND pa2.status = 'APPROVED'
             ORDER BY pa2.step_order DESC
             LIMIT 1
            ) as approved_by,
            (SELECT pa3.action_taken_at
             FROM pass_approvals pa3
             WHERE pa3.pass_id = p.id AND pa3.status = 'APPROVED'
             ORDER BY pa3.step_order DESC
             LIMIT 1
            ) as approval_date
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE ${whereClause}
         ORDER BY p.created_at DESC`,
        params
    );

    logger.info(`getReportData returned ${rows.length} records`);
    return rows;
};

/**
 * Get recent approval activity (last 10 actions)
 */
const getRecentActivity = async () => {
    const [rows] = await db.query(
        `SELECT
            pa.id,
            pa.status as action,
            pa.approver_role,
            pa.action_taken_at,
            pa.remarks,
            p.id as pass_id,
            s.full_name as first_name,
            '' as last_name,
            s.usn as roll_number,
            pt.name as pass_type_name,
            COALESCE(CONCAT(st.first_name, ' ', st.last_name), c.full_name) as approver_name
         FROM pass_approvals pa
         JOIN passes p ON pa.pass_id = p.id
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         LEFT JOIN users u ON pa.approver_id = u.id
         LEFT JOIN staff st ON u.id = st.user_id
         LEFT JOIN coordinators c ON pa.approver_id = c.id
         WHERE pa.status IN ('APPROVED', 'REJECTED')
           AND pa.action_taken_at IS NOT NULL
         ORDER BY pa.action_taken_at DESC
         LIMIT 10`
    );
    return rows;
};

module.exports = { getReportStats, getReportData, getRecentActivity };
