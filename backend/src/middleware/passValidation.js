const { pool: db } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Validate pass application request
 */
const validatePassApplication = async (req, res, next) => {
    try {
        const { pass_type_id, from_datetime, to_datetime, reason, destination } = req.body;
        const errors = [];

        // Required fields
        if (!pass_type_id) errors.push('Pass type is required');
        if (!from_datetime) errors.push('From date/time is required');
        if (!to_datetime) errors.push('To date/time is required');
        if (!reason || reason.trim().length === 0) errors.push('Reason is required');

        // Reason minimum length
        if (reason && reason.trim().length < 10) {
            errors.push('Reason must be at least 10 characters');
        }

        // Date validation
        const fromDate = new Date(from_datetime);
        const toDate = new Date(to_datetime);
        const now = new Date();

        if (isNaN(fromDate.getTime())) {
            errors.push('Invalid from date/time format');
        }

        if (isNaN(toDate.getTime())) {
            errors.push('Invalid to date/time format');
        }

        if (fromDate < now) {
            errors.push('From date/time must be in the future');
        }

        if (toDate <= fromDate) {
            errors.push('To date/time must be after from date/time');
        }

        // Validate pass type exists
        if (pass_type_id) {
            const [passTypes] = await db.query(
                'SELECT id, code, requires_destination, max_duration_hours FROM pass_types WHERE id = ? AND is_active = TRUE',
                [pass_type_id]
            );

            if (passTypes.length === 0) {
                errors.push('Invalid or inactive pass type');
            } else {
                const passType = passTypes[0];

                // Check if destination is required
                if (passType.requires_destination && (!destination || destination.trim().length === 0)) {
                    errors.push(`Destination is required for ${passType.code} pass`);
                }

                // Check duration
                const durationHours = (toDate - fromDate) / (1000 * 60 * 60);
                if (durationHours > passType.max_duration_hours) {
                    errors.push(`Pass duration cannot exceed ${passType.max_duration_hours} hours`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    } catch (error) {
        logger.error('Pass validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Validation failed'
        });
    }
};

/**
 * Check if student has active passes
 */
const checkActivePasses = async (req, res, next) => {
    try {
        const studentId = req.user.id;

        // Check for active passes
        const [activePasses] = await db.query(
            `SELECT id, current_status, from_datetime, to_datetime
             FROM passes
             WHERE student_id = ?
             AND current_status IN ('PENDING', 'IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE', 'FINAL_APPROVED', 'EXITED')`,
            [studentId]
        );

        if (activePasses.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You already have an active pass. Please wait for it to complete or cancel it.',
                activePass: {
                    id: activePasses[0].id,
                    status: activePasses[0].current_status,
                    from: activePasses[0].from_datetime,
                    to: activePasses[0].to_datetime
                }
            });
        }

        // Attach student ID to request
        req.studentId = studentId;
        next();

    } catch (error) {
        logger.error('Active pass check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check active passes'
        });
    }
};

/**
 * Check monthly pass limit
 */
const checkMonthlyLimit = async (req, res, next) => {
    try {
        const studentId = req.studentId;

        // Get max passes per month from system settings
        const [settings] = await db.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'max_passes_per_month'"
        );

        const maxPasses = settings.length > 0 ? parseInt(settings[0].setting_value) : 4;

        // Count passes this month
        const [count] = await db.query(
            `SELECT COUNT(*) as count
             FROM passes
             WHERE student_id = ?
             AND MONTH(created_at) = MONTH(CURRENT_DATE())
             AND YEAR(created_at) = YEAR(CURRENT_DATE())
             AND current_status NOT IN ('CANCELLED', 'REJECTED')`,
            [studentId]
        );

        if (count[0].count >= maxPasses) {
            return res.status(429).json({
                success: false,
                message: `Monthly pass limit reached. You can only apply for ${maxPasses} passes per month.`,
                limit: maxPasses,
                used: count[0].count
            });
        }

        next();
    } catch (error) {
        logger.error('Monthly limit check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check monthly limit'
        });
    }
};

module.exports = {
    validatePassApplication,
    checkActivePasses,
    checkMonthlyLimit
};
