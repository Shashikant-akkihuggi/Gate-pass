const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/authMiddleware');
const { ROLES } = require('../config/constants');

// Apply auth and admin role check to all routes
router.use(authenticateToken);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get('/stats', adminController.getStats);
router.get('/users/:role', adminController.getUsers);
router.post('/coordinators', adminController.createCoordinator);
router.post('/staff', adminController.createStaff);
router.get('/students', adminController.getStudents);
router.get('/passes', adminController.getAllPasses);
router.post('/user-status', adminController.updateUserStatus);
router.post('/reset-password', adminController.resetPassword);
router.post('/delete-user', adminController.deleteUser);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/analytics', adminController.getAnalytics);
router.get('/notifications', adminController.getNotifications);
router.post('/notifications', adminController.sendNotification);

// Reports
router.get('/reports/students', adminController.getStudentReport);
router.get('/reports/coordinators', adminController.getCoordinatorReport);
router.get('/reports/watchmen', adminController.getWatchmanReport);
router.get('/reports/students/export', adminController.exportStudentReport);
router.get('/reports/coordinators/export', adminController.exportCoordinatorReport);
router.get('/reports/watchmen/export', adminController.exportWatchmanReport);

module.exports = router;