const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { ROLES } = require('../config/constants');
const scanController = require('../controllers/scanController');

const WATCHMAN_ROLES = [ROLES.WATCHMAN, ROLES.ADMIN];
const VIEW_ROLES = [ROLES.WATCHMAN, ROLES.ADMIN, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN];

// Watchman dashboard
router.get('/dashboard', authenticate, roleCheck(WATCHMAN_ROLES), scanController.getWatchmanDashboard);

// Lookup by USN
router.get('/lookup/:usn', authenticate, roleCheck(WATCHMAN_ROLES), scanController.lookupByUSN);

// Validate QR
router.post('/validate', authenticate, roleCheck(WATCHMAN_ROLES), scanController.validateQR);

// Record exit (QR, passId, or USN)
router.post('/exit', authenticate, roleCheck(WATCHMAN_ROLES), scanController.recordExit);

// Record entry (QR, passId, or USN)
router.post('/entry', authenticate, roleCheck(WATCHMAN_ROLES), scanController.recordEntry);

// Scan history
router.get('/history', authenticate, roleCheck(VIEW_ROLES), scanController.getScanHistory);

// Pass scan logs
router.get('/pass/:passId', authenticate, scanController.getPassScanLogs);

// Scan stats
router.get('/stats', authenticate, roleCheck(VIEW_ROLES), scanController.getScanStats);

// Overdue passes
router.get('/overdue', authenticate, roleCheck(VIEW_ROLES), scanController.getOverduePasses);

/**
 * @route   GET /api/v1/scan/student/:studentId/profile-pdf
 * @desc    Get student profile PDF for watchman
 * @access  Private (Watchman, Hostel Office, Admin)
 */
router.get('/student/:studentId/profile-pdf', authenticate, roleCheck(VIEW_ROLES), scanController.getStudentProfilePDF);

module.exports = router;
