const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixWorkflow() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        console.log('Removing 3rd step from HOME_PASS workflow...');
        const [result] = await connection.query(`
            DELETE FROM pass_type_workflow_steps 
            WHERE pass_type_id = (SELECT id FROM pass_types WHERE code = 'HOME_PASS') 
            AND step_order = 3
        `);
        console.log(`Rows affected: ${result.affectedRows}`);

        console.log('Verifying updated workflow steps:');
        const [steps] = await connection.query(`
            SELECT pt.code, pws.step_order, pws.approver_role 
            FROM pass_type_workflow_steps pws 
            JOIN pass_types pt ON pws.pass_type_id = pt.id 
            ORDER BY pt.code, pws.step_order
        `);
        console.table(steps);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

fixWorkflow();
