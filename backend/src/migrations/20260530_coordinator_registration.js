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
        console.log('Starting Coordinator System Migration...');

        // 1. Update coordinators table
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS coordinators');
        await connection.query(`
            CREATE TABLE coordinators (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                mobile_number VARCHAR(20) UNIQUE NOT NULL,
                department VARCHAR(50) NOT NULL,
                handling_year INT NOT NULL,
                handling_section VARCHAR(10) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Coordinators table updated.');

        // 2. Update students table to add assigned_coordinator_id if it doesn't exist
        const [columns] = await connection.query('SHOW COLUMNS FROM students');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('assigned_coordinator_id')) {
            await connection.query('ALTER TABLE students ADD COLUMN assigned_coordinator_id INT NULL AFTER coordinator_id');
            console.log('Added assigned_coordinator_id to students table.');
        }

        // Add foreign key for assigned_coordinator_id
        try {
            await connection.query('ALTER TABLE students ADD CONSTRAINT fk_assigned_coordinator FOREIGN KEY (assigned_coordinator_id) REFERENCES coordinators(id) ON DELETE SET NULL');
            console.log('Added foreign key for assigned_coordinator_id.');
        } catch (e) {
            console.log('Foreign key might already exist or error adding it:', e.message);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
