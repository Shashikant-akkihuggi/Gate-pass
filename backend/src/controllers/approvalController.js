const approvalService = require('../services/approvalService');
const notificationService = require('../services/notificationService');
const passService = require('../services/passService');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

const sendApprovalNotifications = async ({ passId, result, userRole, userId }) => {
    const pass = await passService.getPassById(passId);
    if (!pass) {
        logger.error(`Pass ${passId} missing during post-approval notifications`);
        return;
    }

    const studentUserId = pass.student_user_id;

    if (result.isFinalApproval) {
        if (!studentUserId) {
            logger.error(`Student user mapping missing for pass ${passId}; skipping final approval notification`);
            return;
        }

        await notificationService.createNotification({
            userId: studentUserId,
            title: 'Pass Approved',
            message: `Your ${pass.pass_type_name} has been approved. QR code is ready.`,
            type: 'PASS_APPROVED',
            relatedPassId: passId
        });

        logger.info(`Pass ${passId} fully approved by ${userRole} ${userId}`);
        return;
    }

    const approvals = Array.isArray(pass.approvals) ? pass.approvals : [];
    const nextApproval = approvals.find(
        (approval) => approval.step_order === result.nextApprovalStep && approval.status === 'PENDING'
    );

    if (nextApproval) {
        await notificationService.createNotification({
            userId: nextApproval.approver_id,
            title: 'New Pass for Approval',
            message: `${pass.first_name} (${pass.roll_number}) - ${pass.pass_type_name} requires your approval`,
            type: 'PASS_SUBMITTED',
            relatedPassId: passId
        });
    }

    if (!studentUserId) {
        logger.error(`Student user mapping missing for pass ${passId}; skipping approval progress notification`);
        return;
    }

    await notificationService.createNotification({
        userId: studentUserId,
        title: 'Pass Approval Progress',
        message: `Your ${pass.pass_type_name} has been approved by ${userRole}. Forwarded to next approver.`,
        type: 'PASS_APPROVED',
        relatedPassId: passId
    });

    logger.info(`Pass ${passId} approved by ${userRole} ${userId}, forwarded to step ${result.nextApprovalStep}`);
};

/**
 * @desc    Get pending approvals for logged-in approver
 * @route   GET /api/v1/approvals/pending
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
const getPendingApprovals = async (req, res, next) => {
    try {
        logger.info('=== GET PENDING APPROVALS DEBUG ===');
        logger.info('User:', { id: req.user?.id, role: req.user?.role, email: req.user?.email });

        const userId = req.user.id;
        const userRole = req.user.role;

        if (!userId || !userRole) {
            logger.error('Missing user ID or role:', { userId, userRole });
            return res.status(400).json({
                success: false,
                message: 'User ID or role is missing from request'
            });
        }

        logger.info('Fetching pending approvals for:', { userId, userRole });
        const approvals = await approvalService.getPendingApprovals(userId, userRole);
        logger.info('Pending approvals count:', approvals.length);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                approvals,
                count: approvals.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Get pending approvals error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch pending approvals'
        });
    }
};

/**
 * @desc    Approve a pass
 * @route   POST /api/v1/approvals/:passId/approve
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
const approvePass = async (req, res, next) => {
    try {
        console.log("PASS ID:", req.params.passId);
        console.log("USER:", req.user);
        logger.info('=== APPROVE PASS CONTROLLER ===');
        logger.info('req.params =', req.params);
        logger.info('req.body =', req.body);
        logger.info('req.user =', req.user);

        const { passId } = req.params;
        const { remarks } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Approve the pass
        const result = await approvalService.approvePass(
            passId,
            userId,
            userRole,
            remarks
        );

        try {
            await sendApprovalNotifications({ passId, result, userRole, userId });
        } catch (notificationError) {
            console.error("APPROVAL NOTIFICATION ERROR:", notificationError);
            console.error(notificationError.stack);
            logger.error('Approval notifications failed after commit:', notificationError.message, notificationError.stack);
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: result.message,
            data: {
                passId,
                isFinalApproval: result.isFinalApproval,
                qrCode: result.qrCode || null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (error.message === 'Pass not found') {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: {
                    code: ERROR_CODES.NOT_FOUND,
                    message: 'Pass not found'
                }
            });
        }

        if (error.message === 'Pass is not in approval status') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: 'Pass is not in approval status'
                }
            });
        }

        if (error.message === 'You are not assigned to approve this pass') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                error: {
                    code: ERROR_CODES.AUTHORIZATION_ERROR,
                    message: 'You are not assigned to approve this pass'
                }
            });
        }

        if (error.message.includes('already')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: error.message
                }
            });
        }

        if (error.message === 'This pass has not reached your approval level yet') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: 'This pass has not reached your approval level yet'
                }
            });
        }

        console.error("APPROVAL ERROR:", error);
        console.error(error.stack);
        logger.error('Approve pass error:', error.message, error.stack);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
};

/**
 * @desc    Reject a pass
 * @route   POST /api/v1/approvals/:passId/reject
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
const rejectPass = async (req, res, next) => {
    try {
        const { passId } = req.params;
        const { remarks } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Validate remarks
        if (!remarks || remarks.trim().length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: 'Remarks are required for rejection'
                }
            });
        }

        // Reject the pass
        const result = await approvalService.rejectPass(
            passId,
            userId,
            userRole,
            remarks
        );

        // Get pass details for notifications
        const pass = await passService.getPassById(passId);

        // Notify student that pass is rejected
        await notificationService.createNotification({
            userId: pass.student_user_id,
            title: 'Pass Rejected',
            message: `Your ${pass.pass_type_name} has been rejected by ${userRole}. Reason: ${remarks}`,
            type: 'PASS_REJECTED',
            relatedPassId: passId
        });

        logger.info(`Pass ${passId} rejected by ${userRole} ${userId}`);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: result.message,
            data: {
                passId
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (error.message === 'Pass not found') {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: {
                    code: ERROR_CODES.NOT_FOUND,
                    message: 'Pass not found'
                }
            });
        }

        if (error.message === 'Remarks are required for rejection') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: 'Remarks are required for rejection'
                }
            });
        }

        if (error.message === 'You are not assigned to approve this pass') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                error: {
                    code: ERROR_CODES.AUTHORIZATION_ERROR,
                    message: 'You are not assigned to approve this pass'
                }
            });
        }

        if (error.message.includes('already')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: {
                    code: ERROR_CODES.VALIDATION_ERROR,
                    message: error.message
                }
            });
        }

        logger.error('Reject pass error:', error);
        next(error);
    }
};

/**
 * @desc    Get approval history
 * @route   GET /api/v1/approvals/history
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
const getApprovalHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status, fromDate, toDate, limit } = req.query;

        logger.info('getApprovalHistory called:', { userId, userRole });

        const history = await approvalService.getApprovalHistory(userId, userRole, {
            status,
            fromDate,
            toDate,
            limit
        });

        logger.info(`getApprovalHistory returning ${history.length} records`);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                history,
                count: history.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Get approval history error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch approval history'
        });
    }
};

/**
 * @desc    Get approval statistics
 * @route   GET /api/v1/approvals/stats
 * @access  Private (Coordinators, Hostel Office, Chief Warden)
 */
const getApprovalStats = async (req, res, next) => {
    try {
        logger.info('=== GET APPROVAL STATS DEBUG ===');
        logger.info('User:', { id: req.user?.id, role: req.user?.role, email: req.user?.email });

        const userId = req.user.id;
        const userRole = req.user.role;

        if (!userId || !userRole) {
            logger.error('Missing user ID or role');
            return res.status(400).json({
                success: false,
                message: 'User ID or role is missing from request'
            });
        }

        logger.info('Fetching approval stats for user:', { userId, userRole });
        const stats = await approvalService.getApprovalStats(userId, userRole);
        logger.info('Stats fetched:', stats);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Get approval stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch approval statistics'
        });
    }
};

/**
 * @desc    Get pass approval timeline
 * @route   GET /api/v1/approvals/:passId/timeline
 * @access  Private
 */
const getApprovalTimeline = async (req, res, next) => {
    try {
        const { passId } = req.params;

        const timeline = await approvalService.getPassApprovalTimeline(passId);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                timeline
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Get approval timeline error:', error);
        next(error);
    }
};

module.exports = {
    getPendingApprovals,
    approvePass,
    rejectPass,
    getApprovalHistory,
    getApprovalStats,
    getApprovalTimeline
};
