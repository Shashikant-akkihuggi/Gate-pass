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
        console.log('Starting extension migration...');

        // Create pass_extensions table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS pass_extensions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pass_id INT NOT NULL,
                requested_by_id INT NOT NULL,
                current_to_datetime DATETIME NOT NULL,
                extended_to_datetime DATETIME NOT NULL,
                reason TEXT NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                coordinator_approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                hostel_approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (pass_id) REFERENCES passes(id) ON DELETE CASCADE
            )
        `);
        console.log('pass_extensions table created/verified.');

        // Update passes table to support EXTENDED status if needed (ENUM constraint check)
        // Since it's MySQL, if current_status is VARCHAR/TEXT, no issue. 
        // If it's ENUM, we might need to alter it.
        const [columns] = await connection.query("SHOW COLUMNS FROM passes LIKE 'current_status'");
        if (columns.length > 0 && columns[0].Type.includes('enum')) {
            console.log('Updating passes.current_status enum...');
            await connection.query(`
                ALTER TABLE passes MODIFY COLUMN current_status 
                ENUM('PENDING', 'IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE', 'PENDING_CHIEF_WARDEN', 'FINAL_APPROVED', 'EXITED', 'RETURNED', 'LATE_RETURN', 'REJECTED', 'CANCELLED', 'EXPIRED', 'EXTENSION_PENDING', 'EXTENDED')
            `);
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
