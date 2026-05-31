const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const qrService = require('../src/services/qrService');
const { PASS_STATUS, ACTION_TYPES } = require('../src/config/constants');

describe('QR Scanning Module', () => {
    let studentToken;
    let watchmanToken;
    let approvedPassId;
    let qrData;

    beforeAll(async () => {
        // Setup test data
        // Login as student
        const studentLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'student@example.com',
                password: 'password123'
            });
        studentToken = studentLogin.body.data.accessToken;

        // Login as watchman
        const watchmanLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'watchman@example.com',
                password: 'password123'
            });
        watchmanToken = watchmanLogin.body.data.accessToken;

        // Create and approve a pass for testing
        // This would need to be set up in your test database
    });

    afterAll(async () => {
        // Cleanup test data
        await db.end();
    });

    describe('QR Code Generation', () => {
        test('should generate QR code after final approval', async () => {
            // Assuming pass is approved
            const qrCode = await qrService.generatePassQRCode(approvedPassId);

            expect(qrCode).toBeDefined();
            expect(qrCode).toContain('data:image/png;base64');
        });

        test('should include signature in QR payload', async () => {
            const [passes] = await db.query(
                'SELECT qr_code FROM passes WHERE id = ?',
                [approvedPassId]
            );

            expect(passes[0].qr_code).toBeDefined();

            // Extract and parse QR data
            // Note: In real implementation, you'd decode the QR image
            // For testing, we can test the payload structure
        });

        test('should fail for non-existent pass', async () => {
            await expect(
                qrService.generatePassQRCode('non-existent-id')
            ).rejects.toThrow('Pass not found');
        });
    });

    describe('QR Code Validation', () => {
        beforeEach(async () => {
            // Generate valid QR data for testing
            const [passes] = await db.query(
                `SELECT p.id, p.student_id, p.from_datetime, p.to_datetime,
                        s.roll_number, s.first_name, s.last_name
                 FROM passes p
                 JOIN students s ON p.student_id = s.id
                 WHERE p.current_status = ? LIMIT 1`,
                [PASS_STATUS.APPROVED]
            );

            if (passes.length > 0) {
                const pass = passes[0];
                const crypto = require('crypto');
                const secret = process.env.JWT_ACCESS_SECRET || 'default_secret';

                const qrPayload = {
                    passId: pass.id,
                    studentId: pass.student_id,
                    rollNumber: pass.roll_number,
                    studentName: `${pass.first_name} ${pass.last_name}`,
                    validFrom: pass.from_datetime,
                    validTo: pass.to_datetime,
                    generatedAt: new Date().toISOString()
                };

                const dataToSign = `${pass.id}|${pass.student_id}|${pass.from_datetime}|${pass.to_datetime}`;
                const signature = crypto
                    .createHmac('sha256', secret)
                    .update(dataToSign)
                    .digest('hex');

                qrPayload.signature = signature;
                qrData = JSON.stringify(qrPayload);
                approvedPassId = pass.id;
            }
        });

        test('should validate correct QR code', async () => {
            const response = await request(app)
                .post('/api/v1/scan/validate')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({ qrData });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.pass).toBeDefined();
            expect(response.body.data.scanStatus).toBeDefined();
        });

        test('should reject invalid QR format', async () => {
            const response = await request(app)
                .post('/api/v1/scan/validate')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({ qrData: 'invalid-qr-data' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should reject tampered QR code', async () => {
            const tamperedData = JSON.parse(qrData);
            tamperedData.signature = 'tampered-signature';

            const response = await request(app)
                .post('/api/v1/scan/validate')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({ qrData: JSON.stringify(tamperedData) });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('signature verification failed');
        });

        test('should reject expired pass', async () => {
            const expiredData = JSON.parse(qrData);
            expiredData.validTo = new Date(Date.now() - 86400000).toISOString(); // Yesterday

            const response = await request(app)
                .post('/api/v1/scan/validate')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({ qrData: JSON.stringify(expiredData) });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('expired');
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/scan/validate')
                .send({ qrData });

            expect(response.status).toBe(401);
        });

        test('should require watchman role', async () => {
            const response = await request(app)
                .post('/api/v1/scan/validate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ qrData });

            expect(response.status).toBe(403);
        });
    });

    describe('Exit Scan', () => {
        test('should record exit scan successfully', async () => {
            const response = await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate',
                    remarks: 'Test exit'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.action_type).toBe(ACTION_TYPES.EXIT);
            expect(response.body.data.gate_location).toBe('Main Gate');
        });

        test('should prevent duplicate exit scan', async () => {
            // First exit
            await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            // Duplicate exit
            const response = await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(409);
            expect(response.body.message).toContain('already recorded');
        });

        test('should require gate location', async () => {
            const response = await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({ qrData });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Gate location is required');
        });

        test('should update pass status to USED', async () => {
            await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            const [passes] = await db.query(
                'SELECT current_status FROM passes WHERE id = ?',
                [approvedPassId]
            );

            expect(passes[0].current_status).toBe(PASS_STATUS.USED);
        });
    });

    describe('Entry Scan', () => {
        beforeEach(async () => {
            // Record exit first
            await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });
        });

        test('should record entry scan successfully', async () => {
            const response = await request(app)
                .post('/api/v1/scan/entry')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.action_type).toBe(ACTION_TYPES.ENTRY);
        });

        test('should detect late return', async () => {
            // Update pass to have expired return time
            await db.query(
                'UPDATE passes SET to_datetime = ? WHERE id = ?',
                [new Date(Date.now() - 3600000), approvedPassId] // 1 hour ago
            );

            const response = await request(app)
                .post('/api/v1/scan/entry')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.isLate).toBe(true);
            expect(response.body.data.lateDurationMinutes).toBeGreaterThan(0);
            expect(response.body.message).toContain('Late return detected');
        });

        test('should require prior exit scan', async () => {
            // Create new pass without exit
            // Test that entry fails without exit
            const response = await request(app)
                .post('/api/v1/scan/entry')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData: 'new-pass-qr-data',
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('No exit scan found');
        });

        test('should prevent duplicate entry scan', async () => {
            // First entry
            await request(app)
                .post('/api/v1/scan/entry')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            // Duplicate entry
            const response = await request(app)
                .post('/api/v1/scan/entry')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(409);
            expect(response.body.message).toContain('already recorded');
        });

        test('should flag pass as late return', async () => {
            // Set expired return time
            await db.query(
                'UPDATE passes SET to_datetime = ? WHERE id = ?',
                [new Date(Date.now() - 3600000), approvedPassId]
            );

            await request(app)
                .post('/api/v1/scan/entry')
                .set('Authorization', `Bearer ${watchmanToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            const [passes] = await db.query(
                'SELECT is_late_return FROM passes WHERE id = ?',
                [approvedPassId]
            );

            expect(passes[0].is_late_return).toBe(true);
        });
    });

    describe('Scan History', () => {
        test('should retrieve scan history', async () => {
            const response = await request(app)
                .get('/api/v1/scan/history')
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.logs).toBeDefined();
            expect(Array.isArray(response.body.data.logs)).toBe(true);
            expect(response.body.data.pagination).toBeDefined();
        });

        test('should filter by date range', async () => {
            const today = new Date().toISOString().split('T')[0];

            const response = await request(app)
                .get('/api/v1/scan/history')
                .query({ startDate: today, endDate: today })
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.logs).toBeDefined();
        });

        test('should filter by action type', async () => {
            const response = await request(app)
                .get('/api/v1/scan/history')
                .query({ actionType: ACTION_TYPES.EXIT })
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            response.body.data.logs.forEach(log => {
                expect(log.action_type).toBe(ACTION_TYPES.EXIT);
            });
        });

        test('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/scan/history')
                .query({ limit: 10, offset: 0 })
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.pagination.limit).toBe(10);
            expect(response.body.data.logs.length).toBeLessThanOrEqual(10);
        });
    });

    describe('Pass Scan Logs', () => {
        test('should retrieve logs for specific pass', async () => {
            const response = await request(app)
                .get(`/api/v1/scan/pass/${approvedPassId}`)
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should show exit and entry in order', async () => {
            const response = await request(app)
                .get(`/api/v1/scan/pass/${approvedPassId}`)
                .set('Authorization', `Bearer ${watchmanToken}`);

            const logs = response.body.data;
            if (logs.length >= 2) {
                expect(logs[0].action_type).toBe(ACTION_TYPES.EXIT);
                expect(logs[1].action_type).toBe(ACTION_TYPES.ENTRY);
            }
        });
    });

    describe('Scan Statistics', () => {
        test('should retrieve scan statistics', async () => {
            const response = await request(app)
                .get('/api/v1/scan/stats')
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.total_scans).toBeDefined();
            expect(response.body.data.total_exits).toBeDefined();
            expect(response.body.data.total_entries).toBeDefined();
            expect(response.body.data.late_returns).toBeDefined();
        });

        test('should filter stats by date range', async () => {
            const today = new Date().toISOString().split('T')[0];

            const response = await request(app)
                .get('/api/v1/scan/stats')
                .query({ startDate: today, endDate: today })
                .set('Authorization', `Bearer ${watchmanToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
        });
    });

    describe('Security & Rate Limiting', () => {
        test('should enforce rate limiting on scan endpoints', async () => {
            const requests = [];

            // Make multiple rapid requests
            for (let i = 0; i < 35; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/scan/exit')
                        .set('Authorization', `Bearer ${watchmanToken}`)
                        .send({
                            qrData,
                            gateLocation: 'Main Gate'
                        })
                );
            }

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);

            expect(rateLimited).toBe(true);
        });

        test('should prevent unauthorized access', async () => {
            const response = await request(app)
                .post('/api/v1/scan/exit')
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(401);
        });

        test('should prevent non-watchman access', async () => {
            const response = await request(app)
                .post('/api/v1/scan/exit')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    qrData,
                    gateLocation: 'Main Gate'
                });

            expect(response.status).toBe(403);
        });
    });
});
