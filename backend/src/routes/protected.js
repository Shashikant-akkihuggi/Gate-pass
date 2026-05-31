const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/v1/protected/admin
 * @desc    Admin only route example
 * @access  Private (ADMIN only)
 */
router.get('/admin', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome Admin!',
        data: {
            user: req.user,
            info: 'This route is only accessible by ADMIN role'
        }
    });
});

/**
 * @route   GET /api/v1/protected/student
 * @desc    Student only route example
 * @access  Private (STUDENT only)
 */
router.get('/student', authenticateToken, authorizeRoles('STUDENT'), (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome Student!',
        data: {
            user: req.user,
            info: 'This route is only accessible by STUDENT role'
        }
    });
});

/**
 * @route   GET /api/v1/protected/approvers
 * @desc    Approvers only route example
 * @access  Private (CLASS_COORDINATOR, HOSTEL_OFFICE, CHIEF_WARDEN)
 */
router.get('/approvers',
    authenticateToken,
    authorizeRoles('CLASS_COORDINATOR', 'HOSTEL_OFFICE', 'CHIEF_WARDEN'),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: `Welcome ${req.user.role}!`,
            data: {
                user: req.user,
                info: 'This route is accessible by approvers only'
            }
        });
    }
);

/**
 * @route   GET /api/v1/protected/staff
 * @desc    All staff route example
 * @access  Private (All roles except STUDENT)
 */
router.get('/staff',
    authenticateToken,
    authorizeRoles('ADMIN', 'CLASS_COORDINATOR', 'HOSTEL_OFFICE', 'CHIEF_WARDEN', 'WATCHMAN'),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: `Welcome ${req.user.role}!`,
            data: {
                user: req.user,
                info: 'This route is accessible by all staff members'
            }
        });
    }
);

/**
 * @route   GET /api/v1/protected/any
 * @desc    Any authenticated user route example
 * @access  Private (All authenticated users)
 */
router.get('/any', authenticateToken, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome authenticated user!',
        data: {
            user: req.user,
            info: 'This route is accessible by any authenticated user'
        }
    });
});

module.exports = router;
