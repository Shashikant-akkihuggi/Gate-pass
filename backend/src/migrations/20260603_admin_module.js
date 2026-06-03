const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Shashi12@',
        database: process.env.DB_NAME || 'hostel_gatepass_system'
    });

    try {
        console.log('Starting Admin Module migration...');

        // 1. Create admins table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
                status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Admins table created.');

        // 2. Create/Recreate system_settings table as requested
        await connection.query('DROP TABLE IF EXISTS system_settings');
        await connection.query(`
            CREATE TABLE system_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                max_half_day_hours INT NOT NULL DEFAULT 4,
                max_home_pass_days INT NOT NULL DEFAULT 3,
                max_half_day_per_month INT NOT NULL DEFAULT 4,
                max_home_pass_per_month INT NOT NULL DEFAULT 2,
                enable_half_day BOOLEAN NOT NULL DEFAULT TRUE,
                enable_home_pass BOOLEAN NOT NULL DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('System settings table created.');

        // Seed initial settings
        await connection.query(`
            INSERT INTO system_settings 
            (max_half_day_hours, max_home_pass_days, max_half_day_per_month, max_home_pass_per_month, enable_half_day, enable_home_pass)
            VALUES (4, 3, 4, 2, TRUE, TRUE)
        `);
        console.log('Initial settings seeded.');

        // 3. Create audit_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                actor_id INT NOT NULL,
                actor_role VARCHAR(50) NOT NULL,
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50),
                entity_id INT,
                description TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Audit logs table created.');

        // 4. Seed a super admin
        const adminPassword = await bcrypt.hash('Admin@123', 10);
        await connection.query(`
            INSERT IGNORE INTO admins (username, password_hash, role, status)
            VALUES ('admin', ?, 'SUPER_ADMIN', 'ACTIVE')
        `, [adminPassword]);

        // Also ensure an entry exists in the main users table for unified auth if needed
        await connection.query(`
            INSERT IGNORE INTO users (email, password_hash, role, status)
            VALUES ('admin@hostel.edu', ?, 'ADMIN', 'ACTIVE')
        `, [adminPassword]);

        console.log('Super Admin seeded (username: admin, email: admin@hostel.edu, password: Admin@123)');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();