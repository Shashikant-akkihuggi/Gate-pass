const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');
const { getReports, getReportTableData, exportExcel, exportPDF } = require('../controllers/reportController');

const REPORT_ROLES = [
    ROLES.HOSTEL_OFFICE,
    ROLES.CHIEF_WARDEN,
    ROLES.CLASS_COORDINATOR,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
];

/**
 * @route   GET /api/v1/reports
 * @desc    Get summary stats + recent activity
 * @access  Private (Hostel Office, Chief Warden, Coordinator, Admin)
 */
router.get('/', authenticateToken, authorizeRoles(...REPORT_ROLES), getReports);

/**
 * @route   GET /api/v1/reports/data
 * @desc    Get full pass records table
 * @access  Private
 */
router.get('/data', authenticateToken, authorizeRoles(...REPORT_ROLES), getReportTableData);

/**
 * @route   GET /api/v1/reports/export/excel
 * @desc    Download Excel report
 * @access  Private
 */
router.get('/export/excel', authenticateToken, authorizeRoles(...REPORT_ROLES), exportExcel);

/**
 * @route   GET /api/v1/reports/export/pdf
 * @desc    Download PDF report
 * @access  Private
 */
router.get('/export/pdf', authenticateToken, authorizeRoles(...REPORT_ROLES), exportPDF);

module.exports = router;
