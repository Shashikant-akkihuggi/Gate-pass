const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { ROLES } = require('../config/constants');
const { getReports, getReportTableData, exportExcel, exportPDF } = require('../controllers/reportController');

const REPORT_ROLES = [
    ROLES.HOSTEL_OFFICE,
    ROLES.CHIEF_WARDEN,
    ROLES.CLASS_COORDINATOR,
    ROLES.ADMIN,
];

/**
 * @route   GET /api/v1/reports
 * @desc    Get summary stats + recent activity
 * @access  Private (Hostel Office, Chief Warden, Coordinator, Admin)
 */
router.get('/', authenticate, roleCheck(REPORT_ROLES), getReports);

/**
 * @route   GET /api/v1/reports/data
 * @desc    Get full pass records table
 * @access  Private
 */
router.get('/data', authenticate, roleCheck(REPORT_ROLES), getReportTableData);

/**
 * @route   GET /api/v1/reports/export/excel
 * @desc    Download Excel report
 * @access  Private
 */
router.get('/export/excel', authenticate, roleCheck(REPORT_ROLES), exportExcel);

/**
 * @route   GET /api/v1/reports/export/pdf
 * @desc    Download PDF report
 * @access  Private
 */
router.get('/export/pdf', authenticate, roleCheck(REPORT_ROLES), exportPDF);

module.exports = router;
