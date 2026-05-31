const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * @route   GET /api/health
 * @desc    Health check endpoint - checks API and database status
 * @access  Public
 */
router.get('/', async (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            api: 'UP',
            database: 'DOWN'
        }
    };

    try {
        // Test database connection
        const [rows] = await pool.query('SELECT 1 as health');

        if (rows && rows[0].health === 1) {
            healthCheck.services.database = 'UP';
        }

        // Get database stats
        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM passes) as total_passes,
                (SELECT COUNT(*) FROM passes WHERE current_status = 'PENDING') as pending_passes
        `);

        healthCheck.database = {
            status: 'connected',
            stats: stats[0]
        };

        res.status(200).json(healthCheck);
    } catch (error) {
        healthCheck.status = 'ERROR';
        healthCheck.services.database = 'DOWN';
        healthCheck.error = error.message;

        res.status(503).json(healthCheck);
    }
});

/**
 * @route   GET /api/health/db
 * @desc    Detailed database health check
 * @access  Public
 */
router.get('/db', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Get database info
        const [dbInfo] = await connection.query('SELECT DATABASE() as db_name, VERSION() as version');
        const [tableCount] = await connection.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
        `);

        connection.release();

        res.status(200).json({
            status: 'UP',
            database: dbInfo[0].db_name,
            version: dbInfo[0].version,
            tables: tableCount[0].count,
            pool: {
                total: pool.pool._allConnections.length,
                free: pool.pool._freeConnections.length,
                queue: pool.pool._connectionQueue.length
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'DOWN',
            error: error.message,
            code: error.code
        });
    }
});

module.exports = router;
