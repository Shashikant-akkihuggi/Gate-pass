const mysql = require('mysql2/promise');
require('dotenv').config();

async function debug() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        console.log('--- DEBUG INFO ---');

        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => Object.values(t)[0]));

        // Check for gate_logs or pass_scans
        const tableNames = tables.map(t => Object.values(t)[0]);
        const scanTable = tableNames.find(t => t === 'gate_logs' || t === 'pass_scans');

        if (scanTable) {
            console.log(`Using table: ${scanTable}`);
            const [columns] = await connection.query(`DESCRIBE ${scanTable}`);
            console.log(`Columns in ${scanTable}:`, columns);

            const [logs] = await connection.query(`SELECT * FROM ${scanTable}`);
            console.log(`Total logs in ${scanTable}: ${logs.length}`);
            if (logs.length > 0) {
                console.log('First log:', logs[0]);
            }
        } else {
            console.log('Neither gate_logs nor pass_scans found!');
        }

        const [students] = await connection.query('SELECT id, usn, full_name FROM students LIMIT 5');
        console.log('Students samples:', students);

        const [users] = await connection.query('SELECT id, email, role FROM users LIMIT 5');
        console.log('Users samples:', users);

        const [passes] = await connection.query('SELECT id, student_id, usn FROM passes LIMIT 5');
        console.log('Passes samples:', passes);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

debug();