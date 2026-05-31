const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool: db } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const logger = require('../utils/logger');

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object if authenticated
 */
const authenticateUser = async (email, password) => {
    // Find user by email
    const [users] = await db.query(
        'SELECT id, email, password_hash, role, status FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) {
        throw new Error('INVALID_CREDENTIALS');
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'ACTIVE') {
        throw new Error('ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        throw new Error('INVALID_CREDENTIALS');
    }

    return user;
};

/**
 * Generate authentication tokens
 * @param {Object} user - User object
 * @returns {Object} Access and refresh tokens
 */
const generateTokens = (user) => {
    const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return { accessToken, refreshToken };
};

/**
 * Store refresh token in database
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token
 * @param {Object} metadata - Request metadata (IP, user agent)
 * @returns {Promise<string>} Token ID
 */
const storeRefreshToken = async (userId, refreshToken, metadata = {}) => {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
        `INSERT INTO refresh_tokens (id, user_id, token, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [
            tokenId,
            userId,
            refreshToken,
            expiresAt,
            metadata.ipAddress || null,
            metadata.userAgent || null
        ]
    );

    return tokenId;
};

/**
 * Revoke refresh token
 * @param {string} refreshToken - Refresh token to revoke
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if revoked
 */
const revokeRefreshToken = async (refreshToken, userId) => {
    const [result] = await db.query(
        'UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHEREen = ? AND user_id = ?',
        [refreshToken, userId]
    );

    return result.affectedRows > 0;
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
const revokeAllUserTokens = async (userId) => {
    const [result] = await db.query(
        'UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = ? AND is_revoked = FALSE',
        [userId]
    );

    return result.affectedRows;
};

/**
 * Validate refresh token
 * @param {string} refreshToken - Refresh token
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if valid
 */
const validateRefreshToken = async (refreshToken, userId) => {
    const [tokens] = await db.query(
        `SELECT id, expires_at, is_revoked 
     FROM refresh_tokens 
     WHERE token = ? AND user_id = ?`,
        [refreshToken, userId]
    );

    if (tokens.length === 0) {
        return false;
    }

    const token = tokens[0];

    // Check if revoked
    if (token.is_revoked) {
        return false;
    }

    // Check if expired
    if (new Date(token.expires_at) < new Date()) {
        return false;
    }

    return true;
};

/**
 * Get user profile by user ID
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<Object>} User profile
 */
const getUserProfile = async (userId, role) => {
    if (role === 'STUDENT') {
        const [students] = await db.query(
            `SELECT s.*, 
              CONCAT('Year ', c.year, ' - Section ', c.section) as class_name,
              c.year, c.section,
              d.name as department_name, h.name as hostel_block
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN hostel_blocks h ON s.hostel_block_id = h.id
       WHERE s.user_id = ?`,
            [userId]
        );
        return students[0] || null;
    } else {
        const [staff] = await db.query(
            `SELECT st.*, d.name as department_name
       FROM staff st
       LEFT JOIN departments d ON st.department_id = d.id
       WHERE st.user_id = ?`,
            [userId]
        );
        return staff[0] || null;
    }
};

/**
 * Update user last login timestamp
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const updateLastLogin = async (userId) => {
    await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
    );
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if changed
 */
const changeUserPassword = async (userId, currentPassword, newPassword) => {
    // Get current password hash
    const [users] = await db.query(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
    );

    if (users.length === 0) {
        throw new Error('USER_NOT_FOUND');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isPasswordValid) {
        throw new Error('INVALID_CURRENT_PASSWORD');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
    );

    // Revoke all refresh tokens for security
    await revokeAllUserTokens(userId);

    return true;
};

/**
 * Clean up expired refresh tokens
 * @returns {Promise<number>} Number of tokens deleted
 */
const cleanupExpiredTokens = async () => {
    const [result] = await db.query(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR (is_revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))'
    );

    logger.info(`Cleaned up ${result.affectedRows} expired refresh tokens`);
    return result.affectedRows;
};

module.exports = {
    authenticateUser,
    generateTokens,
    storeRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    validateRefreshToken,
    getUserProfile,
    updateLastLogin,
    changeUserPassword,
    cleanupExpiredTokens
};
tok