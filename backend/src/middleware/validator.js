const { validationResult } = require('express-validator');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorDetails = errors.array();
        logger.error('=== VALIDATION FAILED ===');
        logger.error('Path:', req.path);
        logger.error('Params:', req.params);
        logger.error('Body:', req.body);
        logger.error('Validation errors:', JSON.stringify(errorDetails, null, 2));

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            error: {
                code: ERROR_CODES.VALIDATION_ERROR,
                message: 'Validation failed',
                details: errorDetails
            },
            timestamp: new Date().toISOString()
        });
    }

    next();
};

module.exports = validate;
