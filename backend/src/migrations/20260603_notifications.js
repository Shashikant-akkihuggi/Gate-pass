const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Shashi12@',
        database: process.env.DB_NAME || 'hostel_gatepass_system'
    });

    try {
        console.log('Creating admin_broadcasts table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_broadcasts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                target_role ENUM('ALL', 'STUDENT', 'CLASS_COORDINATOR', 'HOSTEL_OFFICE', 'WATCHMAN') DEFAULT 'ALL',
                target_dept VARCHAR(50) DEFAULT NULL,
                target_year INT DEFAULT NULL,
                type ENUM('INFO', 'WARNING', 'ANNOUNCEMENT', 'EMERGENCY') DEFAULT 'INFO',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                actor_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Admin broadcasts table created successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
