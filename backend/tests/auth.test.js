const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const { hashPassword } = require('../src/utils/passwordHelper');

describe('Authentication API', () => {
    let testUser;
    let accessToken;
    let refreshToken;

    beforeAll(async () => {
        // Create test user
        const hashedPassword = await hashPassword('Test@123');
        const [result] = await db.query(
            `INSERT INTO users (id, email, password_hash, role, status) 
       VALUES (UUID(), 'test@example.com', ?, 'STUDENT', 'ACTIVE')`,
            [hashedPassword]
        );

        const [users] = await db.query(
            'SELECT id, email, role FROM users WHERE email = ?',
            ['test@example.com']
        );
        testUser = users[0];
    });

    afterAll(async () => {
        // Clean up test data
        await db.query('DELETE FROM users WHERE email = ?', ['test@example.com']);
        await db.end();
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Test@123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data.user.email).toBe('test@example.com');

            accessToken = response.body.data.accessToken;
            refreshToken = response.body.data.refreshToken;
        });

        it('should fail with invalid email', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'invalid@example.com',
                    password: 'Test@123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should fail with missing credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/auth/profile', () => {
        it('should get profile with valid token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('test@example.com');
        });

        it('should fail without token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/profile')
                .set('Authorization', 'Bearer invalid_token');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/refresh-token', () => {
        it('should refresh token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({
                    refreshToken: refreshToken
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
        });

        it('should fail with invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .send({
                    refreshToken: 'invalid_token'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    refreshToken: refreshToken
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('PUT /api/v1/auth/change-password', () => {
        it('should change password with valid credentials', async () => {
            // Login first to get new token
            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Test@123'
                });

            const token = loginResponse.body.data.accessToken;

            const response = await request(app)
                .put('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'Test@123',
                    newPassword: 'NewTest@123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should fail with incorrect current password', async () => {
            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'NewTest@123'
                });

            const token = loginResponse.body.data.accessToken;

            const response = await request(app)
                .put('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'WrongPassword',
                    newPassword: 'AnotherTest@123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
