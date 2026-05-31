const { verifyAccessToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT token
 * Verifies token and attaches user data to req.user
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token
        const decoded = verifyAccessToken(token);
        
        // Log decoded token for debugging
        console.log('DEBUG: Decoded JWT:', JSON.stringify(decoded, null, 2));

        // Attach user data to request - support both 'id' and 'userId' fields
        req.user = {
            id: decoded.userId || decoded.id,
            userId: decoded.userId || decoded.id,
            email: decoded.email,
            role: decoded.role,
            usn: decoded.usn || decoded.email // USN might be in 'email' field for students
        };

        if (!req.user.role) {
            logger.error('No role found in decoded token');
        }

        next();
    } catch (error) {
        logger.error('Authentication error:', error.message);

        if (error.message === 'Invalid or expired token') {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Middleware to authorize specific roles
 * @param {Array} allowedRoles - Array of allowed role strings
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Unauthorized access attempt by user ${req.user.id} with role ${req.user.role}`);
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
