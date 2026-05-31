const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validator');
const { ROLES } = require('../config/constants');
const approvalController = require('../controllers/approvalController');
const {
    approvePassValidation,
    rejectPassValidation,
    approvalHistoryValidation,
    passIdValidation
} = require('../validators/approvalValidators');

/**
 * @route   GET /api/v1/approvals/pending
 * @desc    Get pending approvals for logged-in approver
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
router.get(
    '/pending',
    authenticate,
    roleCheck([ROLES.CLASS_COORDINATOR, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN, ROLES.ADMIN]),
    approvalController.getPendingApprovals
);

/**
 * @route   GET /api/v1/approvals/stats
 * @desc    Get approval statistics for logged-in approver
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
router.get(
    '/stats',
    authenticate,
    roleCheck([ROLES.CLASS_COORDINATOR, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN, ROLES.ADMIN]),
    approvalController.getApprovalStats
);

/**
 * @route   GET /api/v1/approvals/history
 * @desc    Get approval history
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
router.get(
    '/history',
    authenticate,
    roleCheck([ROLES.CLASS_COORDINATOR, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN, ROLES.ADMIN]),
    approvalHistoryValidation,
    validate,
    approvalController.getApprovalHistory
);

/**
 * @route   GET /api/v1/approvals/:passId/timeline
 * @desc    Get pass approval timeline
 * @access  Private
 */
router.get(
    '/:passId/timeline',
    authenticate,
    passIdValidation,
    validate,
    approvalController.getApprovalTimeline
);

/**
 * @route   POST /api/v1/approvals/:passId/approve
 * @desc    Approve a pass
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
router.post(
    '/:passId/approve',
    authenticate,
    roleCheck([ROLES.CLASS_COORDINATOR, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN, ROLES.ADMIN]),
    approvePassValidation,
    validate,
    approvalController.approvePass
);

/**
 * @route   POST /api/v1/approvals/:passId/reject
 * @desc    Reject a pass
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
router.post(
    '/:passId/reject',
    authenticate,
    roleCheck([ROLES.CLASS_COORDINATOR, ROLES.HOSTEL_OFFICE, ROLES.CHIEF_WARDEN, ROLES.ADMIN]),
    rejectPassValidation,
    validate,
    approvalController.rejectPass
);

module.exports = router;
