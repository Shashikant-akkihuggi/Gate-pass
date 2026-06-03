const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Role-based authorization middleware
 * Checks if user has required role(s)
 * 
 * @param {Array|String} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
        try {
            logger.info('=== ROLE CHECK MIDDLEWARE DEBUG ===');
            logger.info('User from request:', req.user);
            logger.info('Allowed roles:', allowedRoles);

            // Ensure user is authenticated
            if (!req.user || !req.user.role) {
                logger.error('User not authenticated or role missing');
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    error: {
                        code: ERROR_CODES.AUTHENTICATION_ERROR,
                        message: 'User not authenticated.'
                    }
                });
            }

            // Convert single role to array
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            logger.info('User role:', req.user.role);
            logger.info('Checking against roles:', roles);

            // Check if user's role is in allowed roles
            if (!roles.includes(req.user.role)) {
                logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. Required: ${roles.join(', ')}`);

                // SUPER_ADMIN should have access to everything that ADMIN has
                // or if it's a general resource for multiple roles
                if (req.user.role === 'SUPER_ADMIN') {
                    logger.info('Role check passed (SUPER_ADMIN bypass)');
                    return next();
                }

                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    error: {
                        code: ERROR_CODES.AUTHORIZATION_ERROR,
                        message: 'You do not have permission to access this resource.'
                    }
                });
            }

            logger.info('Role check passed');
            next();
        } catch (error) {
            logger.error('Role check error:', error);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: {
                    code: ERROR_CODES.INTERNAL_ERROR,
                    message: 'Authorization check failed.'
                }
            });
        }
    };
};

module.exports = roleCheck;
