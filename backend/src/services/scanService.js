const { pool: db } = require('../config/database');
const { PASS_STATUS } = require('../config/constants');
const logger = require('../utils/logger');
const { formatMySQLDateTime } = require('../utils/dateHelper');
const PENDING_EXIT_STATUSES = [PASS_STATUS.FINAL_APPROVED];
const OUTSIDE_STATUSES = [PASS_STATUS.EXITED];
const COMPLETED_STATUSES = [PASS_STATUS.RETURNED, PASS_STATUS.LATE_RETURN];
const LATE_RETURN_STATUSES = [PASS_STATUS.LATE_RETURN];
const ACTIVE_SCAN_STATUSES = [...new Set([...PENDING_EXIT_STATUSES, ...OUTSIDE_STATUSES])];

const toSqlStatusList = (statuses) => statuses.map((status) => `'${status}'`).join(', ');

const PENDING_EXIT_STATUS_SQL = toSqlStatusList(PENDING_EXIT_STATUSES);
const OUTSIDE_STATUS_SQL = toSqlStatusList(OUTSIDE_STATUSES);
const COMPLETED_STATUS_SQL = toSqlStatusList(COMPLETED_STATUSES);
const LATE_RETURN_STATUS_SQL = toSqlStatusList(LATE_RETURN_STATUSES);
const ACTIVE_SCAN_STATUS_SQL = toSqlStatusList(ACTIVE_SCAN_STATUSES);

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Find an approved pass by USN (primary) or pass_id (fallback).
 * Returns the pass row or null.
 */
const findPassForScan = async (identifier) => {
    // 1. Try by USN / roll_number — return the most recent active pass (FINAL_APPROVED or EXITED)
    const [usnRows] = await db.query(
        `SELECT p.*, s.usn as roll_number, s.full_name as student_name, s.id as student_user_id,
                pt.name as pass_type_name
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE s.usn = ?
           AND p.current_status IN (${ACTIVE_SCAN_STATUS_SQL})
         ORDER BY p.id DESC
         LIMIT 1`,
        [String(identifier).toUpperCase()]
    );

    if (usnRows.length > 0) return usnRows[0];

    // 2. Fallback: Try numeric pass ID
    if (/^\d+$/.test(String(identifier))) {
        const [idRows] = await db.query(
            `SELECT p.*, s.usn as roll_number, s.full_name as student_name, s.id as student_user_id,
                    pt.name as pass_type_name
             FROM passes p
             JOIN students s ON p.student_id = s.id
             JOIN pass_types pt ON p.pass_type_id = pt.id
             WHERE p.id = ?`,
            [identifier]
        );
        if (idRows.length > 0) return idRows[0];
    }

    return null;
};

// ── Watchman dashboard data ───────────────────────────────────────────────────

const getWatchmanDashboard = async () => {
    const [pendingExits] = await db.query(
        `SELECT p.id as pass_id, p.from_datetime, p.to_datetime, p.destination,
                s.id as student_id, s.usn as roll_number, s.full_name as student_name, '' as room_number,
                s.branch as department,
                pt.name as pass_type_name,
                'Hostel' as hostel_block
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE p.current_status IN (${PENDING_EXIT_STATUS_SQL})
         ORDER BY p.from_datetime ASC`
    );

    const [studentsOutside] = await db.query(
        `SELECT p.id as pass_id, p.from_datetime, p.to_datetime, p.destination,
                p.exit_scan_at,
                s.id as student_id, s.usn as roll_number, s.full_name as student_name, '' as room_number,
                s.branch as department,
                pt.name as pass_type_name,
                'Hostel' as hostel_block,
                TIMESTAMPDIFF(MINUTE, NOW(), p.to_datetime) as minutes_remaining
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE p.current_status IN (${OUTSIDE_STATUS_SQL})
         ORDER BY p.to_datetime ASC`
    );

    const [recentReturns] = await db.query(
        `SELECT p.id as pass_id, p.from_datetime, p.to_datetime,
                p.exit_scan_at, p.return_scan_at, COALESCE(p.late_minutes, 0) as late_minutes,
                p.current_status,
                s.usn as roll_number, s.full_name as student_name,
                pt.name as pass_type_name
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE p.current_status IN (${COMPLETED_STATUS_SQL})
           AND DATE(p.return_scan_at) = CURDATE()
         ORDER BY p.return_scan_at DESC
         LIMIT 20`
    );

    const [stats] = await db.query(
        `SELECT
            SUM(CASE WHEN current_status IN (${PENDING_EXIT_STATUS_SQL}) THEN 1 ELSE 0 END) as pending_exits,
            SUM(CASE WHEN current_status IN (${OUTSIDE_STATUS_SQL}) THEN 1 ELSE 0 END) as outside_count,
            SUM(CASE WHEN current_status IN (${COMPLETED_STATUS_SQL}) AND DATE(return_scan_at) = CURDATE() THEN 1 ELSE 0 END) as returned_today,
            SUM(CASE WHEN current_status IN (${LATE_RETURN_STATUS_SQL}) AND DATE(return_scan_at) = CURDATE() THEN 1 ELSE 0 END) as late_today
         FROM passes`
    );

    return {
        pendingExits,
        studentsOutside,
        recentReturns,
        stats: stats[0]
    };
};

// ── Scan history ──────────────────────────────────────────────────────────────

const getScanHistory = async (filters = {}) => {
    const { limit = 50, offset = 0 } = filters;

    const [logs] = await db.query(
        `SELECT gl.*,
                s.usn as roll_number, s.full_name as first_name, '' as last_name,
                u.email as watchman_email,
                st.first_name as watchman_first_name, st.last_name as watchman_last_name,
                pt.name as pass_type_name
         FROM gate_logs gl
         JOIN students s ON gl.student_id = s.id
         JOIN users u ON gl.scanned_by = u.id
         LEFT JOIN staff st ON u.id = st.user_id
         JOIN passes p ON gl.pass_id = p.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         ORDER BY gl.scan_time DESC
         LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
    );

    return logs;
};

// ── Exit scan ─────────────────────────────────────────────────────────────────

const recordExitScan = async ({ identifier, watchmanId, gateLocation, remarks }) => {
    const pass = await findPassForScan(identifier);

    if (!pass) {
        throw new Error('PASS_NOT_FOUND');
    }

    if (!PENDING_EXIT_STATUSES.includes(pass.current_status)) {
        if (OUTSIDE_STATUSES.includes(pass.current_status)) throw new Error('ALREADY_EXITED');
        if (COMPLETED_STATUSES.includes(pass.current_status)) throw new Error('PASS_COMPLETED');
        throw new Error('PASS_NOT_APPROVED');
    }

    const now = formatMySQLDateTime(new Date());

    // Update pass
    await db.query(
        `UPDATE passes SET current_status = 'EXITED', exit_scan_at = ?, updated_at = NOW() WHERE id = ?`,
        [now, pass.id]
    );

    // Insert gate log
    await db.query(
        `INSERT INTO gate_logs (pass_id, student_id, action_type, scanned_by, scan_time, gate_location, remarks)
         VALUES (?, ?, 'EXIT', ?, ?, ?, ?)`,
        [pass.id, pass.student_id, watchmanId, now, gateLocation || null, remarks || null]
    );

    logger.info(`EXIT recorded: pass ${pass.id}, student ${pass.roll_number}, by watchman ${watchmanId}`);

    return {
        pass_id: pass.id,
        student_name: pass.student_name,
        roll_number: pass.roll_number,
        pass_type_name: pass.pass_type_name,
        exit_time: now,
        to_datetime: pass.to_datetime,
        status: 'EXITED'
    };
};

// ── Entry scan ────────────────────────────────────────────────────────────────

const recordEntryScan = async ({ identifier, watchmanId, gateLocation, remarks }) => {
    const pass = await findPassForScan(identifier);

    if (!pass) {
        throw new Error('PASS_NOT_FOUND');
    }

    if (!OUTSIDE_STATUSES.includes(pass.current_status)) {
        if (PENDING_EXIT_STATUSES.includes(pass.current_status)) throw new Error('NOT_EXITED_YET');
        if (COMPLETED_STATUSES.includes(pass.current_status)) throw new Error('PASS_COMPLETED');
        throw new Error('INVALID_STATUS_FOR_ENTRY');
    }

    const now = new Date();
    const nowFormatted = formatMySQLDateTime(now);
    const expectedReturn = new Date(pass.to_datetime);
    const isLate = now > expectedReturn;
    const lateMinutes = isLate ? Math.max(0, Math.floor((now - expectedReturn) / 60000)) : 0;
    const newStatus = isLate ? 'LATE_RETURN' : 'RETURNED';

    // Update pass
    await db.query(
        `UPDATE passes
         SET current_status = ?, return_scan_at = ?, late_minutes = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStatus, nowFormatted, lateMinutes, pass.id]
    );

    // Insert gate log
    await db.query(
        `INSERT INTO gate_logs (pass_id, student_id, action_type, scanned_by, scan_time, gate_location, remarks, is_late, late_minutes)
         VALUES (?, ?, 'ENTRY', ?, ?, ?, ?, ?, ?)`,
        [pass.id, pass.student_id, watchmanId, nowFormatted, gateLocation || null, remarks || null, isLate, lateMinutes]
    );

    logger.info(`ENTRY recorded: pass ${pass.id}, student ${pass.roll_number}, late=${isLate}, lateMinutes=${lateMinutes}`);

    return {
        pass_id: pass.id,
        student_name: pass.student_name,
        roll_number: pass.roll_number,
        pass_type_name: pass.pass_type_name,
        entry_time: nowFormatted,
        exit_time: pass.exit_scan_at,
        to_datetime: pass.to_datetime,
        is_late: isLate,
        late_minutes: lateMinutes,
        status: newStatus
    };
};

// ── Lookup by USN (for manual entry) ─────────────────────────────────────────

const lookupByUSN = async (identifier) => {
    // Try numeric pass ID first
    if (/^\d+$/.test(String(identifier))) {
        const [rows] = await db.query(
            `SELECT p.id as pass_id, p.current_status, p.from_datetime, p.to_datetime,
                    p.destination, p.exit_scan_at, p.return_scan_at,
                    COALESCE(p.late_minutes, 0) as late_minutes,
                    p.qr_code,
                    s.usn as roll_number, s.full_name as student_name, '' as room_number,
                    pt.name as pass_type_name,
                    'Hostel' as hostel_block
             FROM passes p
             JOIN students s ON p.student_id = s.id
             JOIN pass_types pt ON p.pass_type_id = pt.id
             WHERE p.id = ?`,
            [identifier]
        );
        if (rows.length > 0) return rows[0];
    }

    // Try by USN / roll_number
    const [rows] = await db.query(
        `SELECT p.id as pass_id, p.current_status, p.from_datetime, p.to_datetime,
                p.destination, p.exit_scan_at, p.return_scan_at,
                COALESCE(p.late_minutes, 0) as late_minutes,
                p.qr_code,
                s.usn as roll_number, s.full_name as student_name, '' as room_number,
                pt.name as pass_type_name,
                'Hostel' as hostel_block
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE s.usn = ?
           AND p.current_status IN (${ACTIVE_SCAN_STATUS_SQL})
         ORDER BY p.created_at DESC
         LIMIT 1`,
        [String(identifier).toUpperCase()]
    );

    return rows.length > 0 ? rows[0] : null;
};

// ── Scan statistics ───────────────────────────────────────────────────────────

const getScanStatistics = async (filters = {}) => {
    const { watchmanId, startDate, endDate } = filters;

    let where = '1=1';
    const params = [];

    if (watchmanId) { where += ' AND scanned_by = ?'; params.push(watchmanId); }
    if (startDate) { where += ' AND DATE(scan_time) >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND DATE(scan_time) <= ?'; params.push(endDate); }

    const [stats] = await db.query(
        `SELECT
            COUNT(*) as total_scans,
            SUM(CASE WHEN action_type = 'EXIT' THEN 1 ELSE 0 END) as total_exits,
            SUM(CASE WHEN action_type = 'ENTRY' THEN 1 ELSE 0 END) as total_entries,
            SUM(CASE WHEN is_late = TRUE THEN 1 ELSE 0 END) as late_returns,
            AVG(CASE WHEN is_late = TRUE THEN late_minutes ELSE NULL END) as avg_late_minutes
         FROM gate_logs WHERE ${where}`,
        params
    );

    return stats[0];
};

// ── Pass scan logs ────────────────────────────────────────────────────────────

const getPassScanLogs = async (passId) => {
    const [logs] = await db.query(
        `SELECT gl.*,
                u.email as watchman_email,
                st.first_name as watchman_first_name, st.last_name as watchman_last_name
         FROM gate_logs gl
         JOIN users u ON gl.scanned_by = u.id
         LEFT JOIN staff st ON u.id = st.user_id
         WHERE gl.pass_id = ?
         ORDER BY gl.scan_time ASC`,
        [passId]
    );
    return logs;
};

// ── Overdue passes ────────────────────────────────────────────────────────────

const getOverduePasses = async () => {
    const [rows] = await db.query(
        `SELECT p.id, p.student_id, p.to_datetime, p.exit_scan_at,
                s.usn as roll_number, s.full_name as first_name, '' as last_name, s.mobile as phone,
                pt.name as pass_type_name,
                TIMESTAMPDIFF(MINUTE, p.to_datetime, NOW()) as overdue_minutes
         FROM passes p
         JOIN students s ON p.student_id = s.id
         JOIN pass_types pt ON p.pass_type_id = pt.id
         WHERE p.current_status IN (${OUTSIDE_STATUS_SQL})
           AND p.to_datetime < NOW()
         ORDER BY p.to_datetime ASC`
    );
    return rows;
};

// ── Legacy compat (used by old scanController) ────────────────────────────────

const getPassScanStatus = async (passId) => {
    const [pass] = await db.query('SELECT current_status, exit_scan_at, return_scan_at FROM passes WHERE id = ?', [passId]);
    if (!pass.length) return { canExit: false, canEntry: false, hasExit: false, hasEntry: false };
    const p = pass[0];
    const hasExit = !!p.exit_scan_at;
    const hasEntry = !!p.return_scan_at;
    return {
        hasExit,
        hasEntry,
        canExit: PENDING_EXIT_STATUSES.includes(p.current_status),
        canEntry: OUTSIDE_STATUSES.includes(p.current_status),
        lastAction: hasEntry ? 'ENTRY' : hasExit ? 'EXIT' : null,
        totalScans: (hasExit ? 1 : 0) + (hasEntry ? 1 : 0),
        logs: []
    };
};

module.exports = {
    findPassForScan,
    getWatchmanDashboard,
    getScanHistory,
    recordExitScan,
    recordEntryScan,
    lookupByUSN,
    getScanStatistics,
    getPassScanLogs,
    getOverduePasses,
    getPassScanStatus
};
