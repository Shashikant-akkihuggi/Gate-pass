const crypto = require('crypto');

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Random token
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
};

/**
 * Create HMAC signature for QR code
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
const createHmacSignature = (data, secret) => {
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
};

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if valid
 */
const verifyHmacSignature = (data, signature, secret) => {
    const expectedSignature = createHmacSignature(data, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
};

/**
 * Hash data using SHA256
 * @param {string} data - Data to hash
 * @returns {string} Hash
 */
const hashData = (data) => {
    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
};

module.exports = {
    generateSecureToken,
    extractTokenFromHeader,
    createHmacSignature,
    verifyHmacSignature,
    hashData
};
