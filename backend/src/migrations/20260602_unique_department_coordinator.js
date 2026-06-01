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
        console.log('Starting unique department constraint migration...');

        // Check for existing duplicates first
        const [duplicates] = await connection.query(`
            SELECT department, COUNT(*) as count 
            FROM coordinators 
            GROUP BY department 
            HAVING count > 1
        `);

        if (duplicates.length > 0) {
            console.warn('WARNING: Duplicate departments found in coordinators table:');
            console.table(duplicates);
            console.log('Please resolve duplicates manually before applying the unique constraint.');
            // We could auto-resolve by keeping the first one, but manual is safer for business data.
            // For now, let's proceed with adding the unique constraint IF NO DUPLICATES.
            // If duplicates exist, this script will fail gracefully.
        }

        // Add unique constraint to department column
        await connection.query(`
            ALTER TABLE coordinators ADD UNIQUE (department)
        `);
        console.log('Unique constraint added to coordinators.department.');

        console.log('Migration completed successfully.');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error('Migration failed: Duplicate departments already exist in the database.');
        } else {
            console.error('Migration failed:', error);
        }
    } finally {
        await connection.end();
    }
}

migrate();
