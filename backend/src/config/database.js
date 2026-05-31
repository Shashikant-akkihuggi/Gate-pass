const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hostel_gatepass_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    timezone: '+00:00'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        logger.info('✓ Database connection pool created successfully');
        logger.info(`✓ Connected to database: ${dbConfig.database}`);
        logger.info(`✓ Host: ${dbConfig.host}:${dbConfig.port}`);
        connection.release();
        return true;
    } catch (error) {
        logger.error('✗ Database connection failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            logger.error('✗ MySQL server is not running or refusing connections');
            logger.error('  → Start MySQL: sudo service mysql start (Linux) or brew services start mysql (Mac)');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            logger.error('✗ Invalid database credentials');
            logger.error('  → Check DB_USER and DB_PASSWORD in .env file');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            logger.error(`✗ Database '${dbConfig.database}' does not exist`);
            logger.error('  → Run: mysql -u root -p < database/setup.sql');
        }

        return false;
    }
};

// Handle pool errors
pool.on('error', (err) => {
    logger.error('Unexpected database pool error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.error('Database connection was lost. Pool will reconnect automatically.');
    }
});

// Graceful shutdown
const closePool = async () => {
    try {
        await pool.end();
        logger.info('Database connection pool closed');
    } catch (error) {
        logger.error('Error closing database pool:', error.message);
    }
};

// Simple clean export - NO circular references
module.exports = {
    pool,
    testConnection,
    closePool
};
