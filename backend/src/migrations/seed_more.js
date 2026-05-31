const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        const pwd = await bcrypt.hash('Test@123', 10);
        const depts = ['ME', 'CE', 'EEE'];
        for (const dept of depts) {
            await connection.query(
                'INSERT IGNORE INTO coordinators (name, department, email, password_hash) VALUES (?, ?, ?, ?)',
                [`${dept} Coordinator`, dept, `coordinator.${dept.toLowerCase()}@hostel.edu`, pwd]
            );
        }
        console.log('Additional coordinators seeded.');
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

seed();
