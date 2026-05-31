const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Catches all errors and sends appropriate response
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?.id || 'unauthenticated'
    });

    // Default error
    let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;
    let message = err.message || 'Internal server error';
    let details = err.details || null;

    // Handle specific error types

    // Validation errors (express-validator)
    if (err.name === 'ValidationError' || err.array) {
        statusCode = HTTP_STATUS.BAD_REQUEST;
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        message = 'Validation failed';
        details = err.array ? err.array() : err.errors;
    }

    // MySQL errors
    if (err.code && err.code.startsWith('ER_')) {
        statusCode = HTTP_STATUS.BAD_REQUEST;
        errorCode = ERROR_CODES.DATABASE_ERROR;

        // Duplicate entry
        if (err.code === 'ER_DUP_ENTRY') {
            statusCode = HTTP_STATUS.CONFLICT;
            errorCode = ERROR_CODES.DUPLICATE_ENTRY;
            message = 'Duplicate entry. Record already exists.';
        }

        // Foreign key constraint
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            message = 'Referenced record does not exist.';
        }

        // Data too long
        if (err.code === 'ER_DATA_TOO_LONG') {
            message = 'Data exceeds maximum length.';
        }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        errorCode = ERROR_CODES.AUTHENTICATION_ERROR;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        errorCode = ERROR_CODES.AUTHENTICATION_ERROR;
        message = 'Token expired';
    }

    // Multer errors (file upload)
    if (err.name === 'MulterError') {
        statusCode = HTTP_STATUS.BAD_REQUEST;
        errorCode = ERROR_CODES.VALIDATION_ERROR;

        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File size exceeds maximum limit';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        } else {
            message = err.message;
        }
    }

    // Send error response
    const response = {
        success: false,
        error: {
            code: errorCode,
            message: message
        },
        timestamp: new Date().toISOString()
    };

    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
        response.error.details = details;
        response.error.stack = err.stack;
    } else if (details) {
        response.error.details = details;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
