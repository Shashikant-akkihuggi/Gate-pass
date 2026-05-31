/**
 * Date and Time Helper Functions
 * Utilities for formatting dates for MySQL and other operations
 */

/**
 * Format ISO 8601 datetime string to MySQL DATETIME format
 * Converts: "2026-05-28T08:43:00.000Z" -> "2026-05-28 08:43:00"
 * 
 * @param {string|Date} date - ISO 8601 datetime string or Date object
 * @returns {string} MySQL DATETIME formatted string (YYYY-MM-DD HH:MM:SS)
 */
const formatMySQLDateTime = (date) => {
    if (!date) return null;

    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date');
        }

        // Convert to ISO string and format for MySQL
        // "2026-05-28T08:43:00.000Z" -> "2026-05-28 08:43:00"
        return dateObj.toISOString().slice(0, 19).replace('T', ' ');
    } catch (error) {
        console.error('Date formatting error:', error);
        return null;
    }
};

/**
 * Format current datetime to MySQL DATETIME format
 * 
 * @returns {string} Current datetime in MySQL format
 */
const getCurrentMySQLDateTime = () => {
    return formatMySQLDateTime(new Date());
};

/**
 * Add hours to a date and return MySQL formatted string
 * 
 * @param {string|Date} date - Starting date
 * @param {number} hours - Hours to add
 * @returns {string} MySQL DATETIME formatted string
 */
const addHoursToDate = (date, hours) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    dateObj.setHours(dateObj.getHours() + hours);
    return formatMySQLDateTime(dateObj);
};

/**
 * Calculate duration in hours between two dates
 * 
 * @param {string|Date} fromDate - Start date
 * @param {string|Date} toDate - End date
 * @returns {number} Duration in hours
 */
const calculateDurationHours = (fromDate, toDate) => {
    const from = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const to = typeof toDate === 'string' ? new Date(toDate) : toDate;

    return (to - from) / (1000 * 60 * 60);
};

module.exports = {
    formatMySQLDateTime,
    getCurrentMySQLDateTime,
    addHoursToDate,
    calculateDurationHours
};
