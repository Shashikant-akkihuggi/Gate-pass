const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { ROLES } = require('../config/constants');

// Import controllers (to be created)
// const dashboardController = require('../controllers/dashboardController');

/**
 * @route   GET /api/v1/dashboard/student
 * @desc    Get student dashboard stats
 * @access  Private (Student)
 */
router.get(
    '/student',
    authenticate,
    roleCheck([ROLES.STUDENT])
);
// router.get('/student', authenticate, roleCheck([ROLES.STUDENT]), dashboardController.getStudentDashboard);

/**
 * @route   GET /api/v1/dashboard/approver
 * @desc    Get approver dashboard stats
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
router.get(
    '/approver',
    authenticate,
    roleCheck([ROLES.CLASS_COORDINATOR, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN])
);
// router.get('/approver', authenticate, roleCheck([...]), dashboardController.getApproverDashboard);

/**
 * @route   GET /api/v1/dashboard/watchman
 * @desc    Get watchman dashboard stats
 * @access  Private (Watchman)
 */
router.get(
    '/watchman',
    authenticate,
    roleCheck([ROLES.WATCHMAN])
);
// router.get('/watchman', authenticate, roleCheck([ROLES.WATCHMAN]), dashboardController.getWatchmanDashboard);

/**
 * @route   GET /api/v1/dashboard/admin
 * @desc    Get admin dashboard analytics
 * @access  Private (Admin)
 */
router.get(
    '/admin',
    authenticate,
    roleCheck([ROLES.ADMIN])
);
// router.get('/admin', authenticate, roleCheck([ROLES.ADMIN]), dashboardController.getAdminDashboard);

/**
 * @route   GET /api/v1/dashboard/analytics
 * @desc    Get detailed analytics
 * @access  Private (Admin, Chief Warden)
 */
router.get(
    '/analytics',
    authenticate,
    roleCheck([ROLES.ADMIN, ROLES.CHIEF_WARDEN])
);
// router.get('/analytics', authenticate, roleCheck([...]), dashboardController.getAnalytics);

module.exports = router;
