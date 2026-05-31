const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkActualDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        console.log('--- Current Tables ---');
        const [tables] = await connection.query('SHOW TABLES');
        console.table(tables);

        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            console.log(`\n--- Structure of ${tableName} ---`);
            const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
            console.table(columns);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkActualDB();
