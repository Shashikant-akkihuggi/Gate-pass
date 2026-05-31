const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateEnum() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        console.log('Current Schema:');
        const [rows] = await connection.query('SHOW CREATE TABLE passes');
        console.log(rows[0]['Create Table']);

        const alterQuery = `
            ALTER TABLE passes 
            MODIFY COLUMN current_status ENUM(
                'PENDING', 
                'IN_APPROVAL', 
                'PENDING_CLASS_COORDINATOR', 
                'PENDING_HOSTEL_OFFICE', 
                'PENDING_CHIEF_WARDEN', 
                'FINAL_APPROVED', 
                'APPROVED', 
                'OUTSIDE', 
                'COMPLETED', 
                'COMPLETED_LATE', 
                'REJECTED', 
                'CANCELLED', 
                'EXPIRED', 
                'EXITED', 
                'RETURNED', 
                'LATE_RETURN'
            ) NOT NULL DEFAULT 'PENDING'
        `;

        console.log('\nExecuting ALTER TABLE...');
        await connection.query(alterQuery);
        console.log('Successfully updated ENUM definition.');

        console.log('\nUpdated Schema:');
        const [newRows] = await connection.query('SHOW CREATE TABLE passes');
        console.log(newRows[0]['Create Table']);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

updateEnum();
