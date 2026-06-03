const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnoseStatsIssue() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Shashi12@',
        database: process.env.DB_NAME || 'hostel_gatepass_system'
    });

    try {
        console.log('=== DIAGNOSING STUDENT STATS ISSUE ===\n');

        // 1. Check system_settings table
        console.log('1. Checking system_settings table:');
        const [settings] = await connection.query('SELECT * FROM system_settings');
        console.log('   Settings found:', settings.length);
        if (settings.length > 0) {
            console.log('   Settings data:', JSON.stringify(settings[0], null, 2));
        } else {
            console.log('   ⚠️  WARNING: system_settings table is EMPTY!');
        }
        console.log('');

        // 2. Check students table
        console.log('2. Checking students table:');
        const [students] = await connection.query('SELECT id, usn, full_name FROM students LIMIT 5');
        console.log('   Total students sampled:', students.length);
        if (students.length > 0) {
            console.log('   Sample student:', JSON.stringify(students[0], null, 2));
        }
        console.log('');

        // 3. Check passes table
        console.log('3. Checking passes table:');
        const [passCount] = await connection.query('SELECT COUNT(*) as total FROM passes');
        console.log('   Total passes in system:', passCount[0].total);

        if (students.length > 0) {
            const studentId = students[0].id;
            console.log(`\n   Checking passes for student ID ${studentId}:`);

            const [studentPasses] = await connection.query(
                `SELECT id, student_id, pass_type_id, current_status, created_at 
                 FROM passes WHERE student_id = ?`,
                [studentId]
            );
            console.log('   Passes for this student:', studentPasses.length);
            if (studentPasses.length > 0) {
                console.log('   Sample passes:');
                studentPasses.forEach(pass => {
                    console.log('     -', JSON.stringify(pass));
                });
            }

            // 4. Test the stats query
            console.log(`\n4. Testing stats query for student ID ${studentId}:`);
            const [stats] = await connection.query(
                `SELECT 
                    COUNT(*) as total_passes,
                    COALESCE(SUM(CASE WHEN current_status IN ('PENDING', 'IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE', 'PENDING_CHIEF_WARDEN', 'EXTENSION_PENDING') THEN 1 ELSE 0 END), 0) as in_approval,
                    COALESCE(SUM(CASE WHEN current_status IN ('FINAL_APPROVED', 'APPROVED', 'EXITED', 'OUTSIDE', 'RETURNED', 'COMPLETED', 'LATE_RETURN', 'COMPLETED_LATE', 'EXTENDED') THEN 1 ELSE 0 END), 0) as approved,
                    COALESCE(SUM(CASE WHEN current_status = 'REJECTED' THEN 1 ELSE 0 END), 0) as rejected,
                    COALESCE(SUM(CASE WHEN current_status = 'CANCELLED' THEN 1 ELSE 0 END), 0) as cancelled
                 FROM passes
                 WHERE student_id = ?`,
                [studentId]
            );
            console.log('   Stats query result:', JSON.stringify(stats[0], null, 2));

            // 5. Test monthly counts query
            console.log(`\n5. Testing monthly counts query for student ID ${studentId}:`);
            const [monthlyTypeCounts] = await connection.query(
                `SELECT pt.code, COUNT(*) as count
                 FROM passes p
                 JOIN pass_types pt ON p.pass_type_id = pt.id
                 WHERE p.student_id = ?
                 AND MONTH(p.created_at) = MONTH(CURRENT_DATE())
                 AND YEAR(p.created_at) = YEAR(CURRENT_DATE())
                 AND p.current_status NOT IN ('CANCELLED', 'REJECTED')
                 GROUP BY pt.code`,
                [studentId]
            );
            console.log('   Monthly type counts:', JSON.stringify(monthlyTypeCounts, null, 2));
        }

        console.log('\n=== DIAGNOSIS COMPLETE ===');
        console.log('\nRECOMMENDATIONS:');
        if (settings.length === 0) {
            console.log('❌ Run the admin_module migration to populate system_settings');
            console.log('   Command: node src/migrations/20260603_admin_module.js');
        } else {
            console.log('✅ System settings are configured');
        }

    } catch (error) {
        console.error('Diagnosis error:', error);
    } finally {
        await connection.end();
    }
}

diagnoseStatsIssue();
