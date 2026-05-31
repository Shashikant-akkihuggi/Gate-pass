const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { ROLES } = require('../config/constants');

// Import controllers (to be created)
// const adminController = require('../controllers/adminController');

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get('/users', authenticate, roleCheck([ROLES.ADMIN]));
// router.get('/users', authenticate, roleCheck([ROLES.ADMIN]), adminController.getAllUsers);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create new user
 * @access  Private (Admin)
 */
router.post('/users', authenticate, roleCheck([ROLES.ADMIN]));
// router.post('/users', authenticate, roleCheck([ROLES.ADMIN]), adminController.createUser);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
router.put('/users/:id', authenticate, roleCheck([ROLES.ADMIN]));
// router.put('/users/:id', authenticate, roleCheck([ROLES.ADMIN]), adminController.updateUser);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
router.delete('/users/:id', authenticate, roleCheck([ROLES.ADMIN]));
// router.delete('/users/:id', authenticate, roleCheck([ROLES.ADMIN]), adminController.deleteUser);

/**
 * @route   GET /api/v1/admin/classes
 * @desc    Get all classes
 * @access  Private (Admin)
 */
router.get('/classes', authenticate, roleCheck([ROLES.ADMIN]));
// router.get('/classes', authenticate, roleCheck([ROLES.ADMIN]), adminController.getAllClasses);

/**
 * @route   POST /api/v1/admin/classes
 * @desc    Create new class
 * @access  Private (Admin)
 */
router.post('/classes', authenticate, roleCheck([ROLES.ADMIN]));
// router.post('/classes', authenticate, roleCheck([ROLES.ADMIN]), adminController.createClass);

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Private (Admin)
 */
router.get('/settings', authenticate, roleCheck([ROLES.ADMIN]));
// router.get('/settings', authenticate, roleCheck([ROLES.ADMIN]), adminController.getSettings);

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update system settings
 * @access  Private (Admin)
 */
router.put('/settings', authenticate, roleCheck([ROLES.ADMIN]));
// router.put('/settings', authenticate, roleCheck([ROLES.ADMIN]), adminController.updateSettings);

/**
 * @route   GET /api/v1/admin/reports
 * @desc    Generate reports
 * @access  Private (Admin)
 */
router.get('/reports', authenticate, roleCheck([ROLES.ADMIN]));
// router.get('/reports', authenticate, roleCheck([ROLES.ADMIN]), adminController.generateReports);

module.exports = router;
