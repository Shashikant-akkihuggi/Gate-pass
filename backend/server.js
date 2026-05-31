const app = require('./src/app');
const logger = require('./src/utils/logger');
const { testConnection, closePool } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Startup function
const startServer = async () => {
    try {
        // Display startup banner
        logger.info('========================================');
        logger.info('Hostel Gate Pass Management System');
        logger.info('========================================');
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Node Version: ${process.version}`);
        logger.info('========================================');

        // Test database connection
        logger.info('Testing database connection...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            logger.error('Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Start HTTP server
        const server = app.listen(PORT, () => {
            logger.info('========================================');
            logger.info(`✓ Server running on port ${PORT}`);
            logger.info(`✓ API URL: http://localhost:${PORT}`);
            logger.info(`✓ Health Check: http://localhost:${PORT}/api/health`);
            logger.info('========================================');
            logger.info('Server is ready to accept requests');
            logger.info('Press CTRL+C to stop');
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal) => {
            logger.info(`\n${signal} signal received: starting graceful shutdown`);

            // Stop accepting new connections
            server.close(async () => {
                logger.info('✓ HTTP server closed');

                // Close database pool
                await closePool();

                logger.info('✓ Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    logger.error('Shutting down server...');
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    logger.error('Shutting down server...');
    process.exit(1);
});

// Start the server
startServer();
