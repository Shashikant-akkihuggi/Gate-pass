const bcrypt = require('bcryptjs');
const { pool: db } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with email/USN and password
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or USN

        // Validation
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Identifier and password are required'
            });
        }

        let user = null;
        let profile = null;
        let role = null;

        // 1. Try to find in students table by USN
        const [students] = await db.query(
            'SELECT * FROM students WHERE usn = ?',
            [identifier.toUpperCase()]
        );

        if (students.length > 0) {
            const student = students[0];
            const isPasswordValid = await bcrypt.compare(password, student.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ success: false, message: 'Invalid USN or password' });
            }
            role = 'STUDENT';
            user = { id: student.id, email: student.usn, role }; // Using USN as email for students in JWT
            profile = student;
        } else {
            // 2. Try to find in coordinators table by mobile_number
            const [coordinators] = await db.query(
                'SELECT * FROM coordinators WHERE mobile_number = ?',
                [identifier]
            );

            if (coordinators.length > 0) {
                const coordinator = coordinators[0];
                const isPasswordValid = await bcrypt.compare(password, coordinator.password_hash);
                if (!isPasswordValid) {
                    return res.status(401).json({ success: false, message: 'Invalid mobile number or password' });
                }
                role = 'CLASS_COORDINATOR';
                user = { id: coordinator.id, email: coordinator.mobile_number, role };
                profile = coordinator;
            } else {
                // 3. Try to find in central users table (Hostel Office, Watchman, Admin)
                const [users] = await db.query(
                    'SELECT * FROM users WHERE email = ?',
                    [identifier]
                );

                if (users.length > 0) {
                    const u = users[0];
                    if (u.status !== 'ACTIVE') {
                        return res.status(403).json({ success: false, message: 'Account is inactive' });
                    }
                    const isPasswordValid = await bcrypt.compare(password, u.password_hash);
                    if (!isPasswordValid) {
                        return res.status(401).json({ success: false, message: 'Invalid email or password' });
                    }
                    role = u.role;
                    user = { id: u.id, email: u.email, role };

                    // Fetch profile from staff table if applicable
                    const [staff] = await db.query('SELECT * FROM staff WHERE user_id = ?', [u.id]);
                    profile = staff[0] || null;
                }
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            id: user.id,
            role: user.role,
            usn: role === 'STUDENT' ? user.email : undefined,
            email: user.email
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        logger.info(`User logged in: ${user.email} (${user.role})`);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                profile,
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
};

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new student
 * @access  Public
 */
const register = async (req, res) => {
    try {
        const { full_name, usn, branch, year, section, mobile, password } = req.body;

        // Basic validation
        if (!full_name || !usn || !branch || !year || !section || !mobile || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check uniqueness
        const [existing] = await db.query(
            'SELECT id FROM students WHERE usn = ? OR mobile = ?',
            [usn, mobile]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'USN or Mobile already registered' });
        }

        // Find assigned coordinator by department
        const [coordinators] = await db.query(
            'SELECT id FROM coordinators WHERE department = ? LIMIT 1',
            [branch]
        );
        const assigned_coordinator_id = coordinators.length > 0 ? coordinators[0].id : null;

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert student with assigned_coordinator_id
        const [result] = await db.query(
            `INSERT INTO students (full_name, usn, branch, year, section, mobile, password_hash, assigned_coordinator_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [full_name, usn.toUpperCase(), branch, year, section.toUpperCase(), mobile, password_hash, assigned_coordinator_id]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { id: result.insertId }
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

/**
 * @route   POST /api/v1/auth/register-coordinator
 * @desc    Register a new class coordinator
 * @access  Public
 */
const registerCoordinator = async (req, res) => {
    try {
        const { full_name, mobile_number, department, password } = req.body;

        // Validation
        if (!full_name || !mobile_number || !department || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check if mobile number or department already registered
        const [existingMobile] = await db.query(
            'SELECT id FROM coordinators WHERE mobile_number = ?',
            [mobile_number]
        );
        if (existingMobile.length > 0) {
            return res.status(400).json({ success: false, message: 'Mobile number already registered' });
        }

        const [existingDept] = await db.query(
            'SELECT id FROM coordinators WHERE department = ?',
            [department]
        );
        if (existingDept.length > 0) {
            return res.status(400).json({ success: false, message: `A coordinator is already registered for the ${department} department` });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert coordinator (handling_year removed)
        const [result] = await db.query(
            `INSERT INTO coordinators (full_name, mobile_number, department, password_hash, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [full_name, mobile_number, department, password_hash]
        );

        res.status(201).json({
            success: true,
            message: 'Coordinator registered successfully',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error("Coordinator Registration Error:", error);
        logger.error('Register coordinator error:', error);
        res.status(500).json({ success: false, message: 'Coordinator registration failed' });
    }
};

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Verify refresh token
        const { verifyRefreshToken } = require('../utils/jwtUtils');
        const decoded = verifyRefreshToken(refreshToken);

        // Verify user still exists and is active
        const [users] = await db.query(
            'SELECT id, email, role, status FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0 || users[0].status !== 'ACTIVE') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const tokenPayload = {
            id: users[0].id,
            userId: users[0].id,
            email: users[0].email,
            role: users[0].role
        };

        const newAccessToken = generateAccessToken(tokenPayload);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken
            }
        });

    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token'
        });
    }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let user = null;
        let profile = null;

        if (role === 'STUDENT') {
            const [students] = await db.query(
                'SELECT id, usn as email, usn, full_name, branch, year, section, mobile, coordinator_id, created_at FROM students WHERE id = ?',
                [userId]
            );
            if (students.length > 0) {
                profile = students[0];
                user = { id: profile.id, email: profile.usn, role: 'STUDENT' };
            }
        } else if (role === 'CLASS_COORDINATOR') {
            const [coordinators] = await db.query(
                'SELECT id, email, name, department FROM coordinators WHERE id = ?',
                [userId]
            );
            if (coordinators.length > 0) {
                profile = coordinators[0];
                user = { id: profile.id, email: profile.email, role: 'CLASS_COORDINATOR' };
            }
        } else {
            const [users] = await db.query(
                'SELECT id, email, role, status, created_at FROM users WHERE id = ?',
                [userId]
            );
            if (users.length > 0) {
                user = users[0];
                const [staff] = await db.query('SELECT * FROM staff WHERE user_id = ?', [userId]);
                profile = staff[0] || null;
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user,
                profile
            }
        });

    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile'
        });
    }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client should delete tokens)
 * @access  Private
 */
const logout = async (req, res) => {
    try {
        logger.info(`User logged out: ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

module.exports = {
    login,
    register,
    registerCoordinator,
    refreshToken,
    getMe,
    logout
};
