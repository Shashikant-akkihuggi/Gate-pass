const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * 404 Not Found middleware
 * Handles requests to non-existent routes
 */
const notFound = (req, res, next) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
            code: ERROR_CODES.NOT_FOUND,
            message: `Route ${req.originalUrl} not found`
        },
        timestamp: new Date().toISOString()
    });
};

module.exports = notFound;
