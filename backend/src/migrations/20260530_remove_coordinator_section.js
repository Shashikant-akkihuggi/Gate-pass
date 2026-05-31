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
        console.log('Starting Coordinator Table Schema Update...');

        // 1. Check if column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM coordinators');
        const hasSection = columns.some(c => c.Field === 'handling_section');

        if (hasSection) {
            console.log('Removing handling_section column from coordinators table...');
            await connection.query('ALTER TABLE coordinators DROP COLUMN handling_section');
            console.log('Column removed successfully.');
        } else {
            console.log('Column handling_section does not exist. Skipping removal.');
        }

        console.log('Schema update completed successfully.');

    } catch (err) {
        console.error('Schema update failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
