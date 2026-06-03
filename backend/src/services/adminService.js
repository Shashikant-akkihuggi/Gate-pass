const { pool: db } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

/**
 * Log an administrative action to audit_logs
 */
const logAuditAction = async ({ actorId, actorRole, action, entityType, entityId, description, ipAddress, connection = null }) => {
    try {
        const query = `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, ip_address)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [actorId, actorRole, action, entityType, entityId, description, ipAddress];

        if (connection) {
            await connection.query(query, params);
        } else {
            await db.query(query, params);
        }
    } catch (error) {
        logger.error('Error logging audit action:', error);
    }
};

/**
 * Get dashboard overview statistics
 */
const getDashboardStats = async () => {
    // Check if status column exists in students (to handle different schema versions)
    const [studentCols] = await db.query('SHOW COLUMNS FROM students LIKE "status"');
    let studentQuery = 'SELECT COUNT(*) as total, COUNT(*) as active FROM students';
    if (studentCols.length > 0) {
        studentQuery = 'SELECT COUNT(*) as total, SUM(CASE WHEN status = "ACTIVE" THEN 1 ELSE 0 END) as active FROM students';
    }
    const [students] = await db.query(studentQuery);

    const [coordinators] = await db.query('SELECT COUNT(*) as total FROM coordinators');
    const [staff] = await db.query('SELECT role, COUNT(*) as total FROM users WHERE role IN ("HOSTEL_OFFICE", "WATCHMAN") GROUP BY role');

    const [passStats] = await db.query(`
        SELECT 
            SUM(CASE WHEN current_status IN ('APPROVED', 'FINAL_APPROVED') THEN 1 ELSE 0 END) as active_passes,
            SUM(CASE WHEN current_status = 'PENDING_CLASS_COORDINATOR' THEN 1 ELSE 0 END) as pending_coordinator,
            SUM(CASE WHEN current_status = 'PENDING_HOSTEL_OFFICE' THEN 1 ELSE 0 END) as pending_office,
            SUM(CASE WHEN current_status IN ('EXITED', 'OUTSIDE') THEN 1 ELSE 0 END) as students_outside,
            SUM(CASE WHEN current_status = 'LATE_RETURN' THEN 1 ELSE 0 END) as late_returns,
            SUM(CASE WHEN DATE(exit_scan_at) = CURDATE() THEN 1 ELSE 0 END) as today_exits,
            SUM(CASE WHEN DATE(return_scan_at) = CURDATE() THEN 1 ELSE 0 END) as today_entries,
            SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as total_this_month
        FROM passes
    `);

    let extensionCount = 0;
    try {
        const [extensions] = await db.query('SELECT COUNT(*) as total FROM pass_extensions');
        extensionCount = extensions[0].total;
    } catch (err) {
        logger.warn('pass_extensions table may not exist yet');
    }

    const officeCount = staff.find(s => s.role === 'HOSTEL_OFFICE')?.total || 0;
    const watchmanCount = staff.find(s => s.role === 'WATCHMAN')?.total || 0;

    return {
        users: {
            students: { total: students[0].total, active: students[0].active },
            coordinators: coordinators[0].total,
            office: officeCount,
            watchmen: watchmanCount
        },
        passes: {
            ...passStats[0],
            total_extensions: extensionCount
        }
    };
};

/**
 * Get student list with filters
 */
const getStudents = async (filters = {}) => {
    const { branch, year, status, search } = filters;
    let query = `SELECT s.*, c.full_name as coordinator_name 
                 FROM students s 
                 LEFT JOIN coordinators c ON s.assigned_coordinator_id = c.id 
                 WHERE 1=1`;
    const params = [];

    if (branch) { query += ' AND s.branch = ?'; params.push(branch); }
    if (year) { query += ' AND s.year = ?'; params.push(year); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    if (search) {
        query += ' AND (s.full_name LIKE ? OR s.usn LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY s.created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
};

/**
 * Update user status (Enable/Disable)
 */
const updateUserStatus = async (role, id, status, adminId) => {
    let table = role === 'STUDENT' ? 'students' : (role === 'CLASS_COORDINATOR' ? 'coordinators' : 'users');

    // For staff, we update users table
    if (role === 'HOSTEL_OFFICE' || role === 'WATCHMAN') {
        table = 'users';
    }

    await db.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);

    await logAuditAction({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'UPDATE_USER_STATUS',
        entityType: role,
        entityId: id,
        description: `Status updated to ${status}`
    });
};

/**
 * Reset User Password
 */
const resetUserPassword = async (role, id, newPassword, adminId) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let table = role === 'STUDENT' ? 'students' : (role === 'CLASS_COORDINATOR' ? 'coordinators' : 'users');

    if (role === 'HOSTEL_OFFICE' || role === 'WATCHMAN') {
        table = 'users';
    }

    await db.query(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [hashedPassword, id]);

    await logAuditAction({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'RESET_PASSWORD',
        entityType: role,
        entityId: id,
        description: `Password reset by admin`
    });
};

/**
 * Get System Settings
 */
const getSystemSettings = async () => {
    const [rows] = await db.query('SELECT * FROM system_settings LIMIT 1');
    return rows[0];
};

/**
 * Update System Settings
 */
const updateSystemSettings = async (settings, adminId) => {
    const {
        max_half_day_hours,
        max_home_pass_days,
        max_half_day_per_month,
        max_home_pass_per_month,
        enable_half_day,
        enable_home_pass
    } = settings;

    await db.query(`
        UPDATE system_settings SET 
            max_half_day_hours = ?, 
            max_home_pass_days = ?, 
            max_half_day_per_month = ?, 
            max_home_pass_per_month = ?, 
            enable_half_day = ?, 
            enable_home_pass = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `, [max_half_day_hours, max_home_pass_days, max_half_day_per_month, max_home_pass_per_month, enable_half_day, enable_home_pass]);

    await logAuditAction({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'UPDATE_SETTINGS',
        description: 'System settings updated'
    });
};

/**
 * Get Audit Logs
 */
const getAuditLogs = async (limit = 100) => {
    const [rows] = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
    return rows;
};

/**
 * Get users by role with filters
 */
const getUsers = async (role, filters = {}) => {
    const { search, status } = filters;
    let query = '';
    const params = [];

    if (role === 'CLASS_COORDINATOR') {
        query = 'SELECT * FROM coordinators WHERE 1=1';
    } else if (role === 'STUDENT') {
        return getStudents(filters);
    } else {
        query = 'SELECT * FROM users WHERE role = ?';
        params.push(role);
    }

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    if (search) {
        if (role === 'CLASS_COORDINATOR') {
            query += ' AND (full_name LIKE ? OR mobile_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        } else {
            query += ' AND email LIKE ?';
            params.push(`%${search}%`);
        }
    }

    const [rows] = await db.query(query, params);

    // Add additional info for coordinators
    if (role === 'CLASS_COORDINATOR') {
        for (let row of rows) {
            const [approvals] = await db.query(`
                SELECT 
                    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
                FROM pass_approvals WHERE approver_id = ?
            `, [row.id]);
            row.stats = approvals[0];
        }
    }

    // Add additional info for watchmen
    if (role === 'WATCHMAN') {
        for (let row of rows) {
            const [scans] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN scan_type = 'EXIT' THEN 1 ELSE 0 END) as exits,
                    SUM(CASE WHEN scan_type = 'ENTRY' THEN 1 ELSE 0 END) as entries
                FROM pass_scans WHERE watchman_id = ?
            `, [row.id]);
            row.stats = scans[0];
        }
    }

    return rows;
};

/**
 * Create Coordinator
 */
const createCoordinator = async (data, adminId) => {
    const { full_name, department, mobile_number, password } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
        'INSERT INTO coordinators (full_name, department, mobile_number, password_hash, status) VALUES (?, ?, ?, ?, "ACTIVE")',
        [full_name, department, mobile_number, passwordHash]
    );

    await logAuditAction({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'CREATE_COORDINATOR',
        entityType: 'CLASS_COORDINATOR',
        entityId: result.insertId,
        description: `Coordinator created: ${full_name} (${department})`
    });

    return result.insertId;
};

/**
 * Create Staff (Hostel Office / Watchman)
 */
const createStaff = async (data, adminId) => {
    const { email, password, role, first_name, last_name, mobile_number, department } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [userResult] = await connection.query(
            'INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, "ACTIVE")',
            [email, passwordHash, role]
        );

        const userId = userResult.insertId;

        await connection.query(
            'INSERT INTO staff (user_id, first_name, last_name, mobile_number, department) VALUES (?, ?, ?, ?, ?)',
            [userId, first_name, last_name, mobile_number, department]
        );

        await logAuditAction({
            actorId: adminId,
            actorRole: 'ADMIN',
            action: `CREATE_${role}`,
            entityType: role,
            entityId: userId,
            description: `${role} created: ${email}`,
            connection
        });

        await connection.commit();
        return userId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Delete User
 */
const deleteUser = async (role, id, adminId) => {
    let table = role === 'STUDENT' ? 'students' : (role === 'CLASS_COORDINATOR' ? 'coordinators' : 'users');

    if (role === 'HOSTEL_OFFICE' || role === 'WATCHMAN') {
        table = 'users';
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // If it's a user role (HOSTEL_OFFICE, WATCHMAN), also delete from staff table
        if (role === 'HOSTEL_OFFICE' || role === 'WATCHMAN') {
            await connection.query('DELETE FROM staff WHERE user_id = ?', [id]);
        }

        await connection.query(`DELETE FROM ${table} WHERE id = ?`, [id]);

        await logAuditAction({
            actorId: adminId,
            actorRole: 'ADMIN',
            action: 'DELETE_USER',
            entityType: role,
            entityId: id,
            description: `User deleted by admin`,
            connection
        });

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Get all passes with filters
 */
const getAllPasses = async (filters = {}) => {
    const { status, type, search, startDate, endDate } = filters;
    let query = `
        SELECT p.*, s.full_name as student_name, s.usn, s.branch as department, pt.name as pass_type_name
        FROM passes p
        JOIN students s ON p.student_id = s.id
        JOIN pass_types pt ON p.pass_type_id = pt.id
        WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND p.current_status = ?'; params.push(status); }
    if (type) { query += ' AND pt.code = ?'; params.push(type); }
    if (startDate) { query += ' AND p.created_at >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND p.created_at <= ?'; params.push(endDate); }
    if (search) {
        query += ' AND (s.full_name LIKE ? OR s.usn LIKE ? OR p.destination LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
};

/**
 * Get detailed analytics
 */
const getAnalytics = async () => {
    // Passes by department
    const [byDept] = await db.query(`
        SELECT s.branch as department, COUNT(*) as count
        FROM passes p
        JOIN students s ON p.student_id = s.id
        GROUP BY s.branch
    `);

    // Passes by month (last 6 months)
    const [byMonth] = await db.query(`
        SELECT DATE_FORMAT(created_at, '%b %Y') as month, COUNT(*) as count
        FROM passes
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month
        ORDER BY MIN(created_at) ASC
    `);

    // Pass type usage
    const [byType] = await db.query(`
        SELECT pt.name as type, COUNT(*) as count
        FROM passes p
        JOIN pass_types pt ON p.pass_type_id = pt.id
        GROUP BY pt.name
    `);

    // Late returns by department
    const [lateByDept] = await db.query(`
        SELECT s.branch as department, COUNT(*) as count
        FROM passes p
        JOIN students s ON p.student_id = s.id
        WHERE p.current_status = 'LATE_RETURN'
        GROUP BY s.branch
    `);

    // Most active students
    const [activeStudents] = await db.query(`
        SELECT s.full_name, s.usn, COUNT(*) as count
        FROM passes p
        JOIN students s ON p.student_id = s.id
        GROUP BY s.id
        ORDER BY count DESC
        LIMIT 10
    `);

    // Most frequent destinations
    const [destinations] = await db.query(`
        SELECT destination, COUNT(*) as count
        FROM passes
        GROUP BY destination
        ORDER BY count DESC
        LIMIT 10
    `);

    // Extension request analysis
    let extensions = [];
    try {
        const [extRows] = await db.query(`
            SELECT status, COUNT(*) as count
            FROM pass_extensions
            GROUP BY status
        `);
        extensions = extRows;
    } catch (err) {
        logger.warn('pass_extensions table may not exist yet');
    }

    return {
        byDepartment: byDept,
        byMonth: byMonth,
        byType: byType,
        lateByDepartment: lateByDept,
        activeStudents,
        destinations,
        extensions
    };
};

/**
 * Get Student Report Data
 */
const getStudentReportData = async (filters = {}) => {
    const { branch, year } = filters;
    let query = `
        SELECT 
            s.usn, s.full_name as name, s.branch as department, s.year,
            COUNT(p.id) as pass_count,
            SUM(CASE WHEN p.current_status = 'LATE_RETURN' THEN 1 ELSE 0 END) as late_returns
        FROM students s
        LEFT JOIN passes p ON s.id = p.student_id
        WHERE 1=1
    `;
    const params = [];
    if (branch) { query += ' AND s.branch = ?'; params.push(branch); }
    if (year) { query += ' AND s.year = ?'; params.push(year); }

    query += ' GROUP BY s.id ORDER BY s.usn ASC';
    const [rows] = await db.query(query, params);
    return rows;
};

/**
 * Get Coordinator Report Data
 */
const getCoordinatorReportData = async () => {
    const [rows] = await db.query(`
        SELECT 
            c.full_name as name, c.department,
            SUM(CASE WHEN pa.status = 'APPROVED' THEN 1 ELSE 0 END) as approvals,
            SUM(CASE WHEN pa.status = 'REJECTED' THEN 1 ELSE 0 END) as rejections,
            SUM(CASE WHEN pa.status = 'PENDING' THEN 1 ELSE 0 END) as pending
        FROM coordinators c
        LEFT JOIN pass_approvals pa ON c.id = pa.approver_id AND pa.approver_role = 'CLASS_COORDINATOR'
        GROUP BY c.id
        ORDER BY c.full_name ASC
    `);
    return rows;
};

/**
 * Get Watchman Report Data (Scan logs)
 */
const getWatchmanReportData = async () => {
    const [rows] = await db.query(`
        SELECT 
            ps.created_at as scan_time, ps.scan_type,
            s.full_name as student_name, s.usn,
            COALESCE(CONCAT(st.first_name, ' ', st.last_name), 'Unknown') as watchman_name
        FROM pass_scans ps
        JOIN passes p ON ps.pass_id = p.id
        JOIN students s ON p.student_id = s.id
        LEFT JOIN users u ON ps.watchman_id = u.id
        LEFT JOIN staff st ON u.id = st.user_id
        ORDER BY ps.created_at DESC
    `);
    return rows;
};

/**
 * Send notification to users
 */
const sendNotification = async (data, adminId) => {
    try {
        const { target_role, target_dept, target_year, type, title, message } = data;
        
        logger.info('Broadcasting notification:', { target_role, type, title, adminId });

        // Ensure optional fields are handled correctly
        const dept = target_dept || null;
        const year = target_year || null;

        const [result] = await db.query(
            `INSERT INTO admin_broadcasts (target_role, target_dept, target_year, type, title, message, actor_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [target_role, dept, year, type, title, message, adminId]
        );

        await logAuditAction({
            actorId: adminId,
            actorRole: 'ADMIN',
            action: 'BROADCAST_NOTIFICATION',
            entityType: 'NOTIFICATION',
            entityId: result.insertId,
            description: `Broadcasted ${type} notification: ${title}`
        });

        return result.insertId;
    } catch (error) {
        logger.error('Error in sendNotification service:', {
            error: error.message,
            stack: error.stack,
            data
        });
        throw error;
    }
};

/**
 * Get notification history
 */
const getNotifications = async () => {
    try {
        const [rows] = await db.query('SELECT * FROM admin_broadcasts ORDER BY created_at DESC LIMIT 20');
        return rows;
    } catch (error) {
        logger.error('Error in getNotifications service:', error);
        throw error;
    }
};

module.exports = {
    getDashboardStats,
    getStudents,
    getUsers,
    createCoordinator,
    createStaff,
    updateUserStatus,
    resetUserPassword,
    deleteUser,
    getSystemSettings,
    updateSystemSettings,
    getAuditLogs,
    logAuditAction,
    getAllPasses,
    getAnalytics,
    getStudentReportData,
    getCoordinatorReportData,
    getWatchmanReportData,
    sendNotification,
    getNotifications
};