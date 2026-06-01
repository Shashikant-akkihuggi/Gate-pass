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
        console.log('Starting notification type migration...');

        // Update notifications.type enum
        const [columns] = await connection.query("SHOW COLUMNS FROM notifications LIKE 'type'");
        if (columns.length > 0 && columns[0].Type.includes('enum')) {
            console.log('Updating notifications.type enum...');
            await connection.query(`
                ALTER TABLE notifications MODIFY COLUMN type 
                ENUM('PASS_SUBMITTED', 'PASS_APPROVED', 'PASS_REJECTED', 'PASS_EXPIRING', 'LATE_RETURN', 'SYSTEM', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED')
            `);
            console.log('Enum updated successfully.');
        } else {
            console.log('Column type is not an enum or does not exist.');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
