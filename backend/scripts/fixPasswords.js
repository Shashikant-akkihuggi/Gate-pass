const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Fix all user passwords in database
 * Generates real bcrypt hash and updates all users
 * Usage: node scripts/fixPasswords.js
 */

const fixPasswords = async () => {
    const password = 'Test@123';
    const saltRounds = 10;

    console.log('========================================');
    console.log('Password Fix Script');
    console.log('========================================');
    console.log('Password:', password);
    console.log('');

    try {
        // Generate hash
        console.log('Step 1: Generating bcrypt hash...');
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('✓ Hash generated:', hash.substring(0, 30) + '...');
        console.log('');

        // Verify hash works
        console.log('Step 2: Verifying hash...');
        const isValid = await bcrypt.compare(password, hash);
        if (!isValid) {
            throw new Error('Hash verification failed!');
        }
        console.log('✓ Hash verified successfully');
        console.log('');

        // Connect to database
        console.log('Step 3: Connecting to database...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'hostel_gatepass_db'
        });
        console.log('✓ Connected to database');
        console.log('');

        // Update all users
        console.log('Step 4: Updating all users...');
        const [result] = await connection.query(
            'UPDATE users SET password_hash = ?',
            [hash]
        );
        console.log(`✓ Updated ${result.affectedRows} users`);
        console.log('');

        // Verify update
        console.log('Step 5: Verifying update...');
        const [users] = await connection.query(
            'SELECT id, email, role, password_hash FROM users LIMIT 3'
        );

        console.log('Sample users:');
        for (const user of users) {
            const testValid = await bcrypt.compare(password, user.password_hash);
            console.log(`  - ${user.email} (${user.role}): ${testValid ? '✓ VALID' : '✗ INVALID'}`);
        }
        console.log('');

        await connection.end();

        console.log('========================================');
        console.log('✓ Password fix completed successfully!');
        console.log('========================================');
        console.log('');
        console.log('All users can now login with:');
        console.log('  Password: Test@123');
        console.log('');
        console.log('Test login:');
        console.log('  curl -X POST http://localhost:5000/api/v1/auth/login \\');
        console.log('    -H "Content-Type: application/json" \\');
        console.log('    -d \'{"email":"student.cse@hostel.edu","password":"Test@123"}\'');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('✗ Error:', error.message);
        console.error('');

        if (error.code === 'ECONNREFUSED') {
            console.error('MySQL server is not running.');
            console.error('Start it with: sudo service mysql start');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Invalid database credentials.');
            console.error('Check DB_USER and DB_PASSWORD in .env');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist.');
            console.error('Run: mysql -u root -p < database/setup.sql');
        }

        process.exit(1);
    }
};

// Run the fix
fixPasswords();
