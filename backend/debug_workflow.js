const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWorkflow() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gate_pass'
    });

    try {
        console.log('--- Pass Type Workflow Steps ---');
        const [steps] = await connection.query(`
            SELECT pt.code, pws.step_order, pws.approver_role 
            FROM pass_type_workflow_steps pws 
            JOIN pass_types pt ON pws.pass_type_id = pt.id 
            ORDER BY pt.code, pws.step_order
        `);
        console.table(steps);

        console.log('\n--- Recent Passes ---');
        const [passes] = await connection.query(`
            SELECT p.id, p.current_status, p.current_approval_step, pt.code as type 
            FROM passes p 
            JOIN pass_types pt ON p.pass_type_id = pt.id 
            ORDER BY p.id DESC LIMIT 5
        `);
        console.table(passes);

        if (passes.length > 0) {
            const lastPassId = passes[0].id;
            console.log(`\n--- Approval Steps for Pass ID ${lastPassId} ---`);
            const [approvals] = await connection.query(`
                SELECT id, step_order, approver_role, status 
                FROM pass_approvals 
                WHERE pass_id = ? 
                ORDER BY step_order
            `, [lastPassId]);
            console.table(approvals);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkWorkflow();
