const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        console.log('Starting Coordinator Architecture Update (Removing handling_year)...');

        // 1. Check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM coordinators');
        const hasYear = columns.some(c => c.Field === 'handling_year');

        if (hasYear) {
            console.log('Removing handling_year column from coordinators table...');
            await connection.query('ALTER TABLE coordinators DROP COLUMN handling_year');
            console.log('Column removed successfully.');
        } else {
            console.log('Column handling_year does not exist. Skipping removal.');
        }

        console.log('Coordinator architecture update completed successfully.');

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
