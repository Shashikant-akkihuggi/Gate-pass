const jwt = require('jsonwebtoken');

const jwtConfig = {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your_access_secret_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
};

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, jwtConfig.accessSecret, {
        expiresIn: jwtConfig.accessExpiry
    });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, jwtConfig.refreshSecret, {
        expiresIn: jwtConfig.refreshExpiry
    });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.accessSecret);
    } catch (error) {
        throw error;
    }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.refreshSecret);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    jwtConfig,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};
