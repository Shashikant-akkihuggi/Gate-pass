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
        console.log('Adding status column to coordinators table...');
        
        // Check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM coordinators LIKE "status"');
        
        if (columns.length === 0) {
            await connection.query("ALTER TABLE coordinators ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE' AFTER password_hash");
            console.log('✓ Status column added successfully');
        } else {
            console.log('Column "status" already exists.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
