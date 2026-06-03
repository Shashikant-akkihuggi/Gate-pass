const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hostel_gatepass_db'
    });

    try {
        console.log('Starting pass_scans table migration...');

        // 1. Rename scan_datetime to scan_time if needed, but user wants created_at for history
        // Actually, let's just make sure all columns are there.
        
        // Add gate_location
        const [columns] = await connection.query('SHOW COLUMNS FROM pass_scans');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('gate_location')) {
            await connection.query('ALTER TABLE pass_scans ADD COLUMN gate_location VARCHAR(100) AFTER scan_type');
            console.log('Added gate_location column.');
        }

        // Modify scan_type ENUM to include ENTRY
        await connection.query("ALTER TABLE pass_scans MODIFY COLUMN scan_type ENUM('EXIT', 'ENTRY', 'RETURN') NOT NULL");
        console.log('Updated scan_type ENUM.');

        // Add scan_time if missing (current schema has scan_datetime)
        if (!columnNames.includes('scan_time')) {
            await connection.query('ALTER TABLE pass_scans ADD COLUMN scan_time DATETIME AFTER watchman_id');
            console.log('Added scan_time column.');
        }

        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();