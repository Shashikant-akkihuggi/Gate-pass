const { body } = require('express-validator');

/**
 * Validation rules for scan requests
 */
const validateScanRequest = [
    body('qrData')
        .notEmpty()
        .withMessage('QR code data is required')
        .isString()
        .withMessage('QR code data must be a string')
        .isLength({ min: 10 })
        .withMessage('Invalid QR code data format'),

    body('gateLocation')
        .optional()
        .isString()
        .withMessage('Gate location must be a string')
        .isLength({ min: 2, max: 100 })
        .withMessage('Gate location must be between 2 and 100 characters'),

    body('remarks')
        .optional()
        .isString()
        .withMessage('Remarks must be a string')
        .isLength({ max: 500 })
        .withMessage('Remarks cannot exceed 500 characters')
];

module.exports = {
    validateScanRequest
};
