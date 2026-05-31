const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        const [rows] = await connection.query('SHOW CREATE TABLE students');
        console.log(rows[0]['Create Table']);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkSchema();
