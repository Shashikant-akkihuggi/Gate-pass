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
        console.log('Starting migration...');

        // 1. Create coordinators table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS coordinators (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                department VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL
            )
        `);
        console.log('Coordinators table created/verified.');

        // 2. Modify students table
        // We'll rename the old one if it exists to keep data safe, or just drop if it's demo
        // The user said "replace demo student accounts", so dropping is fine.
        // But first, we need to drop foreign keys in passes
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        await connection.query('DROP TABLE IF EXISTS students');
        await connection.query(`
            CREATE TABLE students ( 
                id INT AUTO_INCREMENT PRIMARY KEY, 
                usn VARCHAR(30) UNIQUE NOT NULL, 
                full_name VARCHAR(100) NOT NULL, 
                branch VARCHAR(50) NOT NULL, 
                year INT NOT NULL, 
                section VARCHAR(10) NOT NULL, 
                coordinator_id INT NULL, 
                mobile VARCHAR(20) UNIQUE, 
                password_hash VARCHAR(255) NOT NULL, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE SET NULL
            )
        `);
        console.log('Students table recreated with USN and password_hash.');

        // 3. Update passes table to add requested columns
        const [passColumns] = await connection.query('SHOW COLUMNS FROM passes');
        const columnNames = passColumns.map(c => c.Field);

        if (!columnNames.includes('coordinator_id')) {
            await connection.query('ALTER TABLE passes ADD COLUMN coordinator_id INT AFTER student_id');
        }
        if (!columnNames.includes('usn')) {
            await connection.query('ALTER TABLE passes ADD COLUMN usn VARCHAR(30) AFTER coordinator_id');
        }
        if (!columnNames.includes('student_name')) {
            await connection.query('ALTER TABLE passes ADD COLUMN student_name VARCHAR(100) AFTER usn');
        }
        console.log('Passes table updated with audit columns.');

        // 4. Re-enable foreign key checks and add back the FK for passes
        await connection.query('ALTER TABLE passes ADD CONSTRAINT fk_passes_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        // 5. Seed initial data
        const bcrypt = require('bcryptjs');
        const defaultPassword = await bcrypt.hash('Test@123', 10);

        // Seed Coordinators
        const coordinators = [
            ['CSE Coordinator', 'CSE', 'coordinator.cse@hostel.edu', defaultPassword],
            ['ISE Coordinator', 'ISE', 'coordinator.ise@hostel.edu', defaultPassword],
            ['ECE Coordinator', 'ECE', 'coordinator.ece@hostel.edu', defaultPassword]
        ];

        for (const [name, dept, email, pwd] of coordinators) {
            await connection.query(
                'INSERT IGNORE INTO coordinators (name, department, email, password_hash) VALUES (?, ?, ?, ?)',
                [name, dept, email, pwd]
            );
        }
        console.log('Coordinators seeded.');

        // Seed other roles into the existing users table if they don't exist
        const staff = [
            ['office@hostel.edu', defaultPassword, 'HOSTEL_OFFICE'],
            ['watchman@hostel.edu', defaultPassword, 'WATCHMAN']
        ];

        for (const [email, pwd, role] of staff) {
            await connection.query(
                'INSERT IGNORE INTO users (email, password_hash, role, status) VALUES (?, ?, ?, ?)',
                [email, pwd, role, 'ACTIVE']
            );
        }
        console.log('Hostel Office and Watchman seeded.');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
