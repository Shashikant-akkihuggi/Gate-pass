const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const setupSuperAdmin = async () => {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Shashi12@',
        database: process.env.DB_NAME || 'hostel_gatepass_system'
    };

    console.log('Connecting to database:', dbConfig.database);
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✓ Connected to database');

        const username = 'admin';
        const password = 'admin123';
        const role = 'SUPER_ADMIN';
        const status = 'ACTIVE';

        console.log(`\nPreparing account:`);
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log(`Status: ${status}`);

        // 1. Generate Hash
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`\nGenerated Bcrypt Hash: ${hash}`);

        // 2. Check if admin exists
        const [existing] = await connection.query('SELECT id FROM admins WHERE username = ?', [username]);

        let sql;
        if (existing.length > 0) {
            console.log('Admin already exists. Updating password and role...');
            sql = `UPDATE admins SET password_hash = '${hash}', role = '${role}', status = '${status}' WHERE username = '${username}';`;
            await connection.query('UPDATE admins SET password_hash = ?, role = ?, status = ? WHERE username = ?', [hash, role, status, username]);
            console.log('✓ Admin account updated successfully');
        } else {
            console.log('Admin does not exist. Creating new account...');
            sql = `INSERT INTO admins (username, password_hash, role, status) VALUES ('${username}', '${hash}', '${role}', '${status}');`;
            await connection.query('INSERT INTO admins (username, password_hash, role, status) VALUES (?, ?, ?, ?)', [username, hash, role, status]);
            console.log('✓ Admin account created successfully');
        }

        console.log('\nSQL Statement Executed:');
        console.log('--------------------------------------------------');
        console.log(sql);
        console.log('--------------------------------------------------');

        // 3. Also ensure consistent entry in users table if it exists
        // (The system seems to use users table for some roles)
        try {
            const [userTableExists] = await connection.query("SHOW TABLES LIKE 'users'");
            if (userTableExists.length > 0) {
                const email = 'admin@hostel.edu';
                const [existingUser] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
                
                if (existingUser.length > 0) {
                    await connection.query('UPDATE users SET password_hash = ?, role = ?, status = ? WHERE email = ?', [hash, 'ADMIN', status, email]);
                    console.log('✓ Updated admin entry in users table');
                } else {
                    await connection.query('INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, ?)', [email, hash, 'ADMIN', status]);
                    console.log('✓ Created admin entry in users table');
                }
            }
        } catch (err) {
            console.log('Note: Could not update users table (might not exist or different schema)');
        }

        console.log('\nFinal Credentials:');
        console.log('--------------------------------------------------');
        console.log(`Login URL: http://localhost:3000/login`);
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed');
        }
    }
};

setupSuperAdmin();
