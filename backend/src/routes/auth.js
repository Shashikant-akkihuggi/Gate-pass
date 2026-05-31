const express = require('express');
const router = express.Router();
const { login, register, registerCoordinator, refreshToken, getMe, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/USN and password
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new student
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/v1/auth/register-coordinator
 * @desc    Register a new class coordinator
 * @access  Public
 */
router.post('/register-coordinator', registerCoordinator);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

module.exports = router;
