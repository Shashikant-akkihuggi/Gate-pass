const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { hashPassword } = require('../src/utils/passwordHelper');

describe('Pass Request API', () => {
    let studentToken;
    let studentId;
    let userId;
    let classId;
    let departmentId;
    let hostelBlockId;
    let passTypeId;

    beforeAll(async () => {
        // Create test department
        const [deptResult] = await db.query(
            "INSERT INTO departments (name, code, status) VALUES ('Test Department', 'TEST', 'ACTIVE')"
        );
        departmentId = deptResult.insertId;

        // Create test hostel block
        const [blockResult] = await db.query(
            "INSERT INTO hostel_blocks (name, block_code, gender, total_rooms, status) VALUES ('Test Block', 'TB', 'MALE', 50, 'ACTIVE')"
        );
        hostelBlockId = blockResult.insertId;

        // Create coordinator user
        const coordinatorPassword = await hashPassword('Coordinator@123');
        const [coordResult] = await db.query(
            "INSERT INTO users (id, email, password_hash, role, status) VALUES (UUID(), 'coordinator@test.com', ?, 'CLASS_COORDINATOR', 'ACTIVE')",
            [coordinatorPassword]
        );

        const [coordUsers] = await db.query(
            "SELECT id FROM users WHERE email = 'coordinator@test.com'"
        );
        const coordinatorId = coordUsers[0].id;

        // Create test class
        const [classResult] = await db.query(
            "INSERT INTO classes (name, year, department_id, coordinator_id, academic_year, status) VALUES ('Test Class', 3, ?, ?, '2024-2025', 'ACTIVE')",
            [departmentId, coordinatorId]
        );
        classId = classResult.insertId;

        // Create student user
        const studentPassword = await hashPassword('Student@123');
        const [userResult] = await db.query(
            "INSERT INTO users (id, email, password_hash, role, status) VALUES (UUID(), 'student@test.com', ?, 'STUDENT', 'ACTIVE')",
            [studentPassword]
        );

        const [users] = await db.query(
            "SELECT id FROM users WHERE email = 'student@test.com'"
        );
        userId = users[0].id;

        // Create student profile
        const [studentResult] = await db.query(
            `INSERT INTO students (id, user_id, roll_number, first_name, last_name, class_id, hostel_block_id, room_number, phone, parent_phone, parent_name, date_of_birth, address, emergency_contact, admission_date, status)
       VALUES (UUID(), ?, 'TEST001', 'Test', 'Student', ?, ?, '101', '1234567890', '0987654321', 'Parent Name', '2000-01-01', 'Test Address', '1234567890', '2024-01-01', 'ACTIVE')`,
            [userId, classId, hostelBlockId]
        );

        const [students] = await db.query(
            "SELECT id FROM students WHERE user_id = ?",
            [userId]
        );
        studentId = students[0].id;

        // Create pass types
        await db.query(
            `INSERT INTO pass_types (name, code, max_duration_hours, requires_destination, approval_workflow, is_active)
       VALUES ('Half-Day Pass', 'HALF_DAY', 6, FALSE, '["HOSTEL_OFFICE"]', TRUE)`
        );

        await db.query(
            `INSERT INTO pass_types (name, code, max_duration_hours, requires_destination, approval_workflow, is_active)
       VALUES ('Home Pass', 'HOME_PASS', 168, TRUE, '["CLASS_COORDINATOR", "HOSTEL_OFFICE", "CHIEF_WARDEN"]', TRUE)`
        );

        const [passTypes] = await db.query(
            "SELECT id FROM pass_types WHERE code = 'HALF_DAY'"
        );
        passTypeId = passTypes[0].id;

        // Login to get token
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'student@test.com',
                password: 'Student@123'
            });

        studentToken = loginResponse.body.data.accessToken;
    });

    afterAll(async () => {
        // Clean up test data
        await db.query('DELETE FROM passes WHERE student_id = ?', [studentId]);
        await db.query('DELETE FROM students WHERE id = ?', [studentId]);
        await db.query('DELETE FROM users WHERE email IN (?, ?)', ['student@test.com', 'coordinator@test.com']);
        await db.query('DELETE FROM classes WHERE id = ?', [classId]);
        await db.query('DELETE FROM hostel_blocks WHERE id = ?', [hostelBlockId]);
        await db.query('DELETE FROM departments WHERE id = ?', [departmentId]);
        await db.query('DELETE FROM pass_types WHERE code IN (?, ?)', ['HALF_DAY', 'HOME_PASS']);
        await db.end();
    });

    describe('POST /api/v1/passes', () => {
        it('should apply for half-day pass successfully', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const returnTime = new Date(tomorrow);
            returnTime.setHours(16, 0, 0, 0);

            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'HALF_DAY',
                    fromDatetime: tomorrow.toISOString(),
                    toDatetime: returnTime.toISOString(),
                    reason: 'Need to visit doctor for regular checkup'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.pass).toHaveProperty('id');
            expect(response.body.data.pass.current_status).toBe('PENDING');
        });

        it('should apply for home pass with destination', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(10, 0, 0, 0);

            const returnTime = new Date(tomorrow);
            returnTime.setDate(returnTime.getDate() + 2);

            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'HOME_PASS',
                    fromDatetime: tomorrow.toISOString(),
                    toDatetime: returnTime.toISOString(),
                    reason: 'Going home for family function',
                    destination: 'Home Address, City',
                    parentContactVerified: true
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post('/api/v1/passes')
                .send({
                    passType: 'HALF_DAY',
                    fromDatetime: new Date().toISOString(),
                    toDatetime: new Date().toISOString(),
                    reason: 'Test reason'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid pass type', async () => {
            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'INVALID_TYPE',
                    fromDatetime: new Date().toISOString(),
                    toDatetime: new Date().toISOString(),
                    reason: 'Test reason'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should fail with past date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'HALF_DAY',
                    fromDatetime: yesterday.toISOString(),
                    toDatetime: new Date().toISOString(),
                    reason: 'Test reason'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should fail without destination for home pass', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 3);

            const returnTime = new Date(tomorrow);
            returnTime.setDate(returnTime.getDate() + 2);

            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'HOME_PASS',
                    fromDatetime: tomorrow.toISOString(),
                    toDatetime: returnTime.toISOString(),
                    reason: 'Going home for family function'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/passes', () => {
        it('should get student passes', async () => {
            const response = await request(app)
                .get('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.passes)).toBe(true);
        });

        it('should filter passes by status', async () => {
            const response = await request(app)
                .get('/api/v1/passes?status=PENDING')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/v1/passes/:id', () => {
        let passId;

        beforeAll(async () => {
            // Create a test pass
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 5);
            tomorrow.setHours(10, 0, 0, 0);

            const returnTime = new Date(tomorrow);
            returnTime.setHours(16, 0, 0, 0);

            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'HALF_DAY',
                    fromDatetime: tomorrow.toISOString(),
                    toDatetime: returnTime.toISOString(),
                    reason: 'Test pass for retrieval'
                });

            passId = response.body.data.pass.id;
        });

        it('should get pass by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/passes/${passId}`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.pass.id).toBe(passId);
        });

        it('should fail with invalid pass ID', async () => {
            const response = await request(app)
                .get('/api/v1/passes/invalid-id')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/v1/passes/:id', () => {
        let passId;

        beforeEach(async () => {
            // Create a test pass
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 6);
            tomorrow.setHours(10, 0, 0, 0);

            const returnTime = new Date(tomorrow);
            returnTime.setHours(16, 0, 0, 0);

            const response = await request(app)
                .post('/api/v1/passes')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    passType: 'HALF_DAY',
                    fromDatetime: tomorrow.toISOString(),
                    toDatetime: returnTime.toISOString(),
                    reason: 'Test pass for cancellation'
                });

            passId = response.body.data.pass.id;
        });

        it('should cancel pass successfully', async () => {
            const response = await request(app)
                .delete(`/api/v1/passes/${passId}`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
