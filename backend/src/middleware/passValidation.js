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
                'SELECT id, code, requires_destination FROM pass_types WHERE id = ? AND is_active = TRUE',
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

                // Get dynamic limits from system_settings
                const [settings] = await db.query('SELECT * FROM system_settings LIMIT 1');
                const sys = settings[0] || { max_half_day_hours: 4, max_home_pass_days: 3, enable_half_day: 1, enable_home_pass: 1 };

                // Check if pass type is enabled
                if (passType.code === 'HALF_DAY' && !sys.enable_half_day) {
                    errors.push('Half-Day passes are currently disabled by administrator');
                }
                if (passType.code === 'HOME_PASS' && !sys.enable_home_pass) {
                    errors.push('Home passes are currently disabled by administrator');
                }

                // Check duration
                const durationMs = toDate - fromDate;
                if (passType.code === 'HALF_DAY') {
                    const durationHours = durationMs / (1000 * 60 * 60);
                    if (durationHours > sys.max_half_day_hours) {
                        errors.push(`Half-Day pass duration cannot exceed ${sys.max_half_day_hours} hours`);
                    }
                } else if (passType.code === 'HOME_PASS') {
                    const durationDays = durationMs / (1000 * 60 * 60 * 24);
                    if (durationDays > sys.max_home_pass_days) {
                        errors.push(`Home pass duration cannot exceed ${sys.max_home_pass_days} days`);
                    }
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
        const userId = req.user.id;

        // Get student_id from students table
        const [studentRows] = await db.query('SELECT id FROM students WHERE user_id = ?', [userId]);
        if (studentRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }
        const studentId = studentRows[0].id;

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
        const userId = req.user.id;
        const { pass_type_id } = req.body;

        // Get student_id from students table
        const [studentRows] = await db.query('SELECT id FROM students WHERE user_id = ?', [userId]);
        if (studentRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }
        const studentId = studentRows[0].id;
        req.studentId = studentId; // Ensure it's set for the next middleware

        // Get dynamic limits from system_settings
        const [settings] = await db.query('SELECT * FROM system_settings LIMIT 1');
        const sys = settings[0] || { max_half_day_per_month: 4, max_home_pass_per_month: 2 };

        // Get pass type code
        const [passTypes] = await db.query('SELECT code FROM pass_types WHERE id = ?', [pass_type_id]);
        if (passTypes.length === 0) return next();

        const passType = passTypes[0];
        const maxLimit = passType.code === 'HALF_DAY' ? sys.max_half_day_per_month : sys.max_home_pass_per_month;

        // Count passes this month of this type
        const [count] = await db.query(
            `SELECT COUNT(*) as count
             FROM passes p
             JOIN pass_types pt ON p.pass_type_id = pt.id
             WHERE p.student_id = ?
             AND pt.code = ?
             AND MONTH(p.created_at) = MONTH(CURRENT_DATE())
             AND YEAR(p.created_at) = YEAR(CURRENT_DATE())
             AND p.current_status NOT IN ('CANCELLED', 'REJECTED')`,
            [studentId, passType.code]
        );

        if (count[0].count >= maxLimit) {
            return res.status(429).json({
                success: false,
                message: "Monthly pass limit exceeded"
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
