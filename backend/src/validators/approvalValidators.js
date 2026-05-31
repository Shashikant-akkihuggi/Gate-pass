const { body, param, query } = require('express-validator');
const { APPROVAL_STATUS } = require('../config/constants');

/**
 * Validation rules for pass ID parameter
 */
const passIdValidation = [
    param('passId')
        .notEmpty()
        .withMessage('Pass ID is required')
        .custom((value) => {
            const num = parseInt(value, 10);
            if (isNaN(num) || num < 1) {
                throw new Error('Invalid pass ID format');
            }
            return true;
        })
];

/**
 * Validation rules for approve pass
 */
const approvePassValidation = [
    ...passIdValidation,

    body('remarks')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 500 })
        .withMessage('Remarks must not exceed 500 characters')
        .trim()
];

/**
 * Validation rules for reject pass
 */
const rejectPassValidation = [
    ...passIdValidation,

    body('remarks')
        .notEmpty()
        .withMessage('Remarks are required for rejection')
        .isLength({ min: 10, max: 500 })
        .withMessage('Remarks must be between 10 and 500 characters')
        .trim()
];

/**
 * Validation rules for approval history filters
 */
const approvalHistoryValidation = [
    query('status')
        .optional()
        .isIn([APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED])
        .withMessage('Invalid status'),

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

module.exports = {
    passIdValidation,
    approvePassValidation,
    rejectPassValidation,
    approvalHistoryValidation
};
