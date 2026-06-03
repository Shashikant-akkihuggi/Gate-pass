const { verifyAccessToken } = require('../utils/jwtUtils');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        logger.info('=== AUTH MIDDLEWARE DEBUG ===');
        logger.info('Request path:', req.path);
        logger.info('Request method:', req.method);

        // Get token from header
        const authHeader = req.headers.authorization;
        logger.info('Auth header present:', !!authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.error('No token provided or invalid format');
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: ERROR_CODES.AUTHENTICATION_ERROR,
                    message: 'No token provided. Please authenticate.'
                }
            });
        }

        // Extract token
        const token = authHeader.split(' ')[1]; // Bearer TOKEN
        logger.info('Token extracted, length:', token?.length);

        if (!token) {
            throw new Error('Invalid token format');
        }

        // Verify token
        const decoded = verifyAccessToken(token);
        logger.info('Token decoded:', { id: decoded.id, userId: decoded.userId, email: decoded.email, role: decoded.role });

        // Attach user info to request - support both 'id' and 'userId' fields
        req.user = {
            id: decoded.userId || decoded.id,
            userId: decoded.userId || decoded.id,
            email: decoded.email,
            role: decoded.role,
            usn: decoded.usn || decoded.email
        };

        logger.info('User attached to request:', req.user);
        next();
    } catch (error) {
        logger.error('Authentication error:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: ERROR_CODES.AUTHENTICATION_ERROR,
                    message: 'Token expired. Please login again.'
                }
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: ERROR_CODES.AUTHENTICATION_ERROR,
                    message: 'Invalid token. Please login again.'
                }
            });
        }

        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            error: {
                code: ERROR_CODES.AUTHENTICATION_ERROR,
                message: 'Authentication failed.'
            }
        });
    }
};

module.exports = authenticate;
