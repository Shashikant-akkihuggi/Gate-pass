const { v4: uuidv4 } = require('uuid');
const { pool: db } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<string>} Notification ID
 */
const createNotification = async (notificationData) => {
    const {
        userId,
        title,
        message,
        type,
        relatedPassId
    } = notificationData;

    const notificationId = uuidv4();

    try {
        await db.query(
            `INSERT INTO notifications (id, user_id, title, message, type, related_pass_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [notificationId, userId, title, message, type, relatedPassId || null]
        );

        logger.info(`Notification created: ${notificationId} for user ${userId}`);
        return notificationId;
    } catch (error) {
        logger.error('Create notification error:', error);
        throw error;
    }
};

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Notifications
 */
const getUserNotifications = async (userId, filters = {}) => {
    let query = `
    SELECT * FROM notifications
    WHERE user_id = ?
  `;

    const params = [userId];

    if (filters.isRead !== undefined) {
        query += ' AND is_read = ?';
        params.push(filters.isRead);
    }

    if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
    }

    const [notifications] = await db.query(query, params);
    return notifications;
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success
 */
const markAsRead = async (notificationId, userId) => {
    const [result] = await db.query(
        'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
        [notificationId, userId]
    );

    return result.affectedRows > 0;
};

/**
 * Mark all notifications as read
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications marked
 */
const markAllAsRead = async (userId) => {
    const [result] = await db.query(
        'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
        [userId]
    );

    return result.affectedRows;
};

/**
 * Get unread notification count
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread count
 */
const getUnreadCount = async (userId) => {
    const [result] = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
    );

    return result[0].count;
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};
