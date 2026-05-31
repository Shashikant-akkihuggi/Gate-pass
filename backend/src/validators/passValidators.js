const { body, query, param } = require('express-validator');
const { PASS_TYPES, PASS_STATUS } = require('../config/constants');

/**
 * Validation rules for applying pass
 */
const applyPassValidation = [
    body('passType')
        .notEmpty()
        .withMessage('Pass type is required')
        .isIn([PASS_TYPES.HALF_DAY, PASS_TYPES.HOME_PASS])
        .withMessage('Invalid pass type'),

    body('fromDatetime')
        .notEmpty()
        .withMessage('Start date and time is required')
        .isISO8601()
        .withMessage('Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)'),

    body('toDatetime')
        .notEmpty()
        .withMessage('End date and time is required')
        .isISO8601()
        .withMessage('Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)')
        .custom((value, { req }) => {
            const fromDate = new Date(req.body.fromDatetime);
            const toDate = new Date(value);
            if (toDate <= fromDate) {
                throw new Error('End time must be after start time');
            }
            return true;
        }),

    body('reason')
        .notEmpty()
        .withMessage('Reason is required')
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters')
        .trim(),

    body('destination')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Destination must not exceed 255 characters')
        .trim(),

    body('parentContactVerified')
        .optional()
        .isBoolean()
        .withMessage('Parent contact verified must be a boolean')
];

/**
 * Validation rules for getting passes with filters
 */
const getPassesValidation = [
    query('status')
        .optional()
        .isIn(Object.values(PASS_STATUS))
        .withMessage('Invalid status'),

    query('passType')
        .optional()
        .isIn([PASS_TYPES.HALF_DAY, PASS_TYPES.HOME_PASS])
        .withMessage('Invalid pass type'),

    query('fromDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid from date format'),

    query('toDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid to date format'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for pass ID parameter
 */
const passIdValidation = [
    param('id')
        .notEmpty()
        .withMessage('Pass ID is required')
        .isUUID()
        .withMessage('Invalid pass ID format')
];

/**
 * Validation rules for student ID parameter
 */
const studentIdValidation = [
    param('studentId')
        .notEmpty()
        .withMessage('Student ID is required')
        .isUUID()
        .withMessage('Invalid student ID format')
];

module.exports = {
    applyPassValidation,
    getPassesValidation,
    passIdValidation,
    studentIdValidation
};
