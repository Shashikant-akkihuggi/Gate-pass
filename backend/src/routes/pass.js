const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { validatePassApplication, checkActivePasses, checkMonthlyLimit } = require('../middleware/passValidation');
const { applyPass, getMyPasses, getPassDetails, cancelPass, getPassStats, getPassTypes, downloadPassPDF } = require('../controllers/passController');

/**
 * @route   GET /api/v1/passes/:id/download
 * @desc    Download pass PDF
 * @access  Private (STUDENT only - own passes)
 */
router.get('/:id/download',
    authenticateToken,
    authorizeRoles('STUDENT'),
    downloadPassPDF
);

/**
 * @route   POST /api/v1/passes/apply
 * @desc    Apply for a new pass
 * @access  Private (STUDENT only)
 */
router.post('/apply',
    authenticateToken,
    authorizeRoles('STUDENT'),
    checkActivePasses,
    checkMonthlyLimit,
    validatePassApplication,
    applyPass
);

/**
 * @route   GET /api/v1/passes/my-passes
 * @desc    Get all passes for logged-in student
 * @access  Private (STUDENT only)
 */
router.get('/my-passes',
    authenticateToken,
    authorizeRoles('STUDENT'),
    getMyPasses
);

/**
 * @route   GET /api/v1/passes/stats
 * @desc    Get pass statistics
 * @access  Private (STUDENT only)
 */
router.get('/stats',
    authenticateToken,
    authorizeRoles('STUDENT'),
    getPassStats
);

/**
 * @route   GET /api/v1/passes/types
 * @desc    Get all active pass types
 * @access  Private (All authenticated users)
 */
router.get('/types',
    authenticateToken,
    getPassTypes
);

/**
 * @route   GET /api/v1/passes/:id
 * @desc    Get pass details by ID
 * @access  Private (STUDENT only - own passes)
 */
router.get('/:id',
    authenticateToken,
    authorizeRoles('STUDENT'),
    getPassDetails
);

/**
 * @route   PUT /api/v1/passes/:id/cancel
 * @desc    Cancel a pass
 * @access  Private (STUDENT only - own passes)
 */
router.put('/:id/cancel',
    authenticateToken,
    authorizeRoles('STUDENT'),
    cancelPass
);

module.exports = router;
