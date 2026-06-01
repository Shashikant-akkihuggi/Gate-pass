const { pool: db } = require('../config/database');
const { createApprovalWorkflow, getWorkflowSteps } = require('../services/workflowService');
const { PASS_STATUS, ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const { formatMySQLDateTime } = require('../utils/dateHelper');

/**
 * @route   POST /api/v1/passes/apply
 * @desc    Apply for a new pass
 * @access  Private (STUDENT only)
 */
const applyPass = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { pass_type_id, from_datetime, to_datetime, reason, destination } = req.body;
        const studentId = req.studentId; // From checkActivePasses middleware

        // Format datetime values for MySQL
        const formattedFromDatetime = formatMySQLDateTime(from_datetime);
        const formattedToDatetime = formatMySQLDateTime(to_datetime);

        logger.info('Transaction started for pass application');
        await connection.beginTransaction();

        // Get workflow steps count using the same connection
        const workflowSteps = await getWorkflowSteps(connection, pass_type_id);
        const totalSteps = workflowSteps.length;

        if (totalSteps === 0) {
            throw new Error('No workflow steps found for this pass type');
        }

        // Determine initial status based on the first approver role
        const firstRole = workflowSteps[0].approver_role;
        let initialStatus = PASS_STATUS.IN_APPROVAL;

        if (firstRole === ROLES.CLASS_COORDINATOR) {
            initialStatus = PASS_STATUS.PENDING_CLASS_COORDINATOR;
        } else if (firstRole === ROLES.HOSTEL_OFFICE) {
            initialStatus = PASS_STATUS.PENDING_HOSTEL_OFFICE;
        } else if (firstRole === ROLES.CHIEF_WARDEN) {
            initialStatus = PASS_STATUS.PENDING_CHIEF_WARDEN;
        }

        logger.info(`Initial status for pass: ${initialStatus} (First role: ${firstRole})`);

        // Fetch student details for audit columns
        const [students] = await connection.query(
            'SELECT usn, full_name, assigned_coordinator_id FROM students WHERE id = ?',
            [studentId]
        );
        const student = students[0];

        // Insert pass
        const [passResult] = await connection.query(
            `INSERT INTO passes (
                student_id, coordinator_id, usn, student_name,
                pass_type_id, from_datetime, to_datetime,
                destination, reason, current_status, current_approval_step,
                total_approval_steps, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
            [
                studentId, student.assigned_coordinator_id, student.usn, student.full_name,
                pass_type_id, formattedFromDatetime, formattedToDatetime,
                destination, reason, initialStatus, totalSteps
            ]
        );

        const passId = passResult.insertId;
        logger.info(`Pass created with ID: ${passId}`);

        // Create approval workflow using the same connection
        await createApprovalWorkflow(connection, passId, pass_type_id, studentId);

        await connection.commit();
        logger.info('Transaction committed successfully');

        // Fetch created pass with details
        const [passes] = await db.query(
            `SELECT p.*, pt.name as pass_type_name, pt.code as pass_type_code,
                    s.full_name as first_name, '' as last_name, s.usn as roll_number
             FROM passes p
             JOIN pass_types pt ON p.pass_type_id = pt.id
             JOIN students s ON p.student_id = s.id
             WHERE p.id = ?`,
            [passId]
        );

        res.status(201).json({
            success: true,
            message: 'Pass application submitted successfully',
            data: {
                pass: passes[0],
                workflow: {
                    totalSteps,
                    currentStep: 0,
                    status: initialStatus
                }
            }
        });

    } catch (error) {
        await connection.rollback();
        logger.error('Apply pass error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit pass application'
        });
    } finally {
        connection.release();
    }
};

/**
 * @route   GET /api/v1/passes/my-passes
 * @desc    Get all passes for logged-in student
 * @access  Private (STUDENT only)
 */
const getMyPasses = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get all passes with details including extension status
        const [passes] = await db.query(
            `SELECT p.*, 
                    pt.name as pass_type_name, 
                    pt.code as pass_type_code,
                    pt.max_duration_hours,
                    COALESCE(pa.approved_steps, 0) as approved_steps,
                    COALESCE(pa.total_steps, 0) as total_steps,
                    ex.status as extension_status,
                    ex.extended_to_datetime as extension_to_datetime
             FROM passes p
             JOIN pass_types pt ON p.pass_type_id = pt.id
             LEFT JOIN (
                 SELECT pass_id,
                        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_steps,
                        COUNT(*) as total_steps
                 FROM pass_approvals
                 GROUP BY pass_id
             ) pa ON pa.pass_id = p.id
             LEFT JOIN (
                 SELECT pass_id, status, extended_to_datetime
                 FROM pass_extensions
                 WHERE status = 'PENDING'
                 ORDER BY created_at DESC
                 LIMIT 1
             ) ex ON ex.pass_id = p.id
             WHERE p.student_id = ?
             ORDER BY p.created_at DESC`,
            [studentId]
        );

        res.status(200).json({
            success: true,
            data: {
                passes,
                total: passes.length
            }
        });

    } catch (error) {
        logger.error('Get my passes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch passes'
        });
    }
};

/**
 * @route   GET /api/v1/passes/:id
 * @desc    Get pass details by ID
 * @access  Private (STUDENT only - own passes)
 */
const getPassDetails = async (req, res) => {
    try {
        const passId = req.params.id;
        const studentId = req.user.id;

        // Get pass details
        const [passes] = await db.query(
            `SELECT p.*, 
                    pt.name as pass_type_name, 
                    pt.code as pass_type_code,
                    pt.max_duration_hours,
                    pt.requires_destination,
                    s.full_name as first_name, '' as last_name, s.usn as roll_number, s.mobile as phone,
                    s.year, s.section, s.branch as department_name,
                    'Hostel' as hostel_block_name
             FROM passes p
             JOIN pass_types pt ON p.pass_type_id = pt.id
             JOIN students s ON p.student_id = s.id
             WHERE p.id = ? AND p.student_id = ?`,
            [passId, studentId]
        );

        if (passes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pass not found'
            });
        }

        // Get approval history
        const [approvals] = await db.query(
            `SELECT pa.*, 
                    COALESCE(u.email, c.mobile_number) as approver_email,
                    COALESCE(st.first_name, c.full_name) as approver_name,
                    COALESCE(st.last_name, '') as approver_last_name
             FROM pass_approvals pa
             LEFT JOIN users u ON pa.approver_id = u.id
             LEFT JOIN staff st ON u.id = st.user_id
             LEFT JOIN coordinators c ON pa.approver_id = c.id
             WHERE pa.pass_id = ?
             ORDER BY pa.step_order ASC`,
            [passId]
        );

        // Get scan history
        const [scans] = await db.query(
            `SELECT ps.*,
                    u.email as watchman_email,
                    st.first_name as watchman_first_name,
                    st.last_name as watchman_last_name
             FROM pass_scans ps
             JOIN users u ON ps.watchman_id = u.id
             JOIN staff st ON u.id = st.user_id
             WHERE ps.pass_id = ?
             ORDER BY ps.scan_datetime ASC`,
            [passId]
        );

        res.status(200).json({
            success: true,
            data: {
                pass: passes[0],
                approvals,
                scans
            }
        });

    } catch (error) {
        logger.error('Get pass details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pass details'
        });
    }
};

/**
 * @route   PUT /api/v1/passes/:id/cancel
 * @desc    Cancel a pass
 * @access  Private (STUDENT only - own passes)
 */
const cancelPass = async (req, res) => {
    try {
        const passId = req.params.id;
        const studentId = req.user.id;
        const { cancellation_reason } = req.body;

        // Get pass
        const [passes] = await db.query(
            'SELECT id, current_status FROM passes WHERE id = ? AND student_id = ?',
            [passId, studentId]
        );

        if (passes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pass not found'
            });
        }

        const pass = passes[0];

        // Check if pass can be cancelled
        const cancellableStatuses = ['PENDING', 'IN_APPROVAL', 'FINAL_APPROVED', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE'];
        if (!cancellableStatuses.includes(pass.current_status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel pass with status ${pass.current_status}`
            });
        }

        // Update pass status
        await db.query(
            `UPDATE passes 
             SET current_status = 'CANCELLED', 
                 cancellation_reason = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [cancellation_reason || 'Cancelled by student', passId]
        );

        logger.info(`Pass ${passId} cancelled by student ${studentId}`);

        res.status(200).json({
            success: true,
            message: 'Pass cancelled successfully'
        });

    } catch (error) {
        logger.error('Cancel pass error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel pass'
        });
    }
};

/**
 * @route   GET /api/v1/passes/stats
 * @desc    Get pass statistics for student
 * @access  Private (STUDENT only)
 */
const getPassStats = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Get statistics
        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as total_passes,
                SUM(CASE WHEN current_status IN ('IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE') THEN 1 ELSE 0 END) as in_approval,
                SUM(CASE WHEN current_status IN ('FINAL_APPROVED', 'APPROVED') THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN current_status IN ('EXITED', 'OUTSIDE') THEN 1 ELSE 0 END) as outside,
                SUM(CASE WHEN current_status IN ('RETURNED', 'COMPLETED') THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN current_status IN ('LATE_RETURN', 'COMPLETED_LATE') THEN 1 ELSE 0 END) as completed_late,
                SUM(CASE WHEN current_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN current_status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
             FROM passes
             WHERE student_id = ?`,
            [studentId]
        );

        // Get monthly count
        const [monthlyCount] = await db.query(
            `SELECT COUNT(*) as count
             FROM passes
             WHERE student_id = ?
             AND MONTH(created_at) = MONTH(CURRENT_DATE())
             AND YEAR(created_at) = YEAR(CURRENT_DATE())
             AND current_status NOT IN ('CANCELLED', 'REJECTED')`,
            [studentId]
        );

        // Get max passes per month
        const [settings] = await db.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'max_passes_per_month'"
        );
        const maxPasses = settings.length > 0 ? parseInt(settings[0].setting_value) : 4;

        res.status(200).json({
            success: true,
            data: {
                ...stats[0],
                monthly_limit: {
                    currentCount: monthlyCount[0].count,
                    maxPasses,
                    remaining: maxPasses - monthlyCount[0].count
                }
            }
        });

    } catch (error) {
        logger.error('Get pass stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

/**
 * @route   GET /api/v1/passes/types
 * @desc    Get all active pass types
 * @access  Private (All authenticated users)
 */
const getPassTypes = async (req, res) => {
    try {
        // Get all active pass types
        const [passTypes] = await db.query(
            `SELECT id, code, name, description, max_duration_hours, 
                    requires_destination, is_active, created_at
             FROM pass_types
             WHERE is_active = TRUE
             ORDER BY id ASC`
        );

        res.status(200).json({
            success: true,
            data: passTypes
        });

    } catch (error) {
        logger.error('Get pass types error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pass types'
        });
    }
};

/**
 * @route   GET /api/v1/passes/:id/download
 * @desc    Download pass PDF
 * @access  Private (STUDENT only)
 */
const downloadPassPDF = async (req, res) => {
    try {
        const passId = req.params.id;
        const studentId = req.user.id;

        // Fetch pass details with student and approval information
        const [passes] = await db.query(
            `SELECT p.*, 
                    pt.name as pass_type_name, 
                    s.full_name as student_name, s.usn, s.branch as department, s.year, s.section, s.mobile
             FROM passes p
             JOIN pass_types pt ON p.pass_type_id = pt.id
             JOIN students s ON p.student_id = s.id
             WHERE p.id = ? AND p.student_id = ?`,
            [passId, studentId]
        );

        if (passes.length === 0) {
            return res.status(404).json({ success: false, message: 'Pass not found' });
        }

        const pass = passes[0];

        if (pass.current_status !== 'FINAL_APPROVED') {
            return res.status(403).json({ success: false, message: 'Pass is not yet fully approved' });
        }

        // Fetch approval details
        const [approvals] = await db.query(
            `SELECT pa.approver_role, pa.action_taken_at,
                    COALESCE(st.first_name, c.full_name) as approver_name
             FROM pass_approvals pa
             LEFT JOIN users u ON pa.approver_id = u.id
             LEFT JOIN staff st ON u.id = st.user_id
             LEFT JOIN coordinators c ON pa.approver_id = c.id
             WHERE pa.pass_id = ? AND pa.status = 'APPROVED'
             ORDER BY pa.step_order ASC`,
            [passId]
        );

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=GatePass_${pass.usn}_${passId}.pdf`);

        doc.pipe(res);

        // Header Section
        doc.fillColor('#1e40af').fontSize(24).text('HOSTEL GATE PASS', { align: 'center' });
        doc.fontSize(14).text('Hostel Gate Pass Management System', { align: 'center' });
        doc.moveDown(1.5);

        // Draw line
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
        doc.moveDown(1.5);

        const startY = doc.y;

        // Student Details (Left Side)
        doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('STUDENT DETAILS', 50, startY);
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Name: ${pass.student_name}`);
        doc.text(`USN: ${pass.usn}`);
        doc.text(`Department: ${pass.department}`);
        doc.text(`Year: ${pass.year} | Section: ${pass.section}`);
        doc.text(`Mobile: ${pass.mobile}`);

        // QR Code (Right Side)
        if (pass.qr_code) {
            try {
                const qrImage = pass.qr_code.split(',')[1];
                const qrBuffer = Buffer.from(qrImage, 'base64');
                doc.image(qrBuffer, 400, startY, { width: 120 });
            } catch (e) {
                logger.error('Error adding QR to PDF:', e);
            }
        }

        doc.y = startY + 130;
        doc.moveDown(1);

        // Pass Details
        doc.font('Helvetica-Bold').fontSize(12).text('PASS DETAILS', 50, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Pass ID: ${passId}`);
        doc.text(`Type: ${pass.pass_type_name}`);
        doc.text(`From: ${new Date(pass.from_datetime).toLocaleString()}`);
        doc.text(`To: ${new Date(pass.to_datetime).toLocaleString()}`);
        doc.text(`Destination: ${pass.destination}`);
        doc.text(`Reason: ${pass.reason}`);
        doc.moveDown(2);

        // Approval Details
        doc.font('Helvetica-Bold').fontSize(12).text('APPROVAL STATUS', 50, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);

        approvals.forEach(app => {
            const roleName = app.approver_role.replace(/_/g, ' ');
            doc.text(`${roleName}: ${app.approver_name} (Approved on ${new Date(app.action_taken_at).toLocaleDateString()})`);
        });

        doc.moveDown(3);

        // Footer / Verification Section
        doc.rect(50, doc.y, 495, 60).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text('Verified Digital Gate Pass', 60, doc.y + 10);
        doc.font('Helvetica').fontSize(8).text('This is a digitally generated pass and is verifiable using the QR code.', 60, doc.y + 5);
        doc.text('Generated by Hostel Gate Pass Management System', 60, doc.y + 5);

        // Approved Badge
        doc.fillColor('#059669').fontSize(14).font('Helvetica-Bold').text('APPROVED', 450, doc.y - 45);

        doc.end();

    } catch (error) {
        logger.error('Download pass PDF error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate PDF' });
        }
    }
};

/**
 * @route   POST /api/v1/passes/:id/extend
 * @desc    Request pass extension
 * @access  Private (STUDENT only)
 */
const requestExtension = async (req, res) => {
    try {
        const passId = req.params.id;
        const studentId = req.user.id;
        const { extended_to_datetime, reason } = req.body;

        const passService = require('../services/passService');
        const extensionId = await passService.requestExtension({
            passId,
            requestedById: studentId,
            extendedToDatetime: formatMySQLDateTime(extended_to_datetime),
            reason
        });

        // Notify coordinator and hostel office
        const [students] = await db.query(
            'SELECT full_name, assigned_coordinator_id FROM students WHERE id = ?',
            [studentId]
        );

        if (students.length > 0) {
            const notificationService = require('../services/notificationService');
            const { NOTIFICATION_TYPES } = require('../config/constants');

            // 1. Notify Coordinator
            if (students[0].assigned_coordinator_id) {
                await notificationService.createNotification({
                    userId: students[0].assigned_coordinator_id,
                    title: 'Extension Requested',
                    message: `Student ${students[0].full_name} has requested an extension for Pass #${passId}.`,
                    type: NOTIFICATION_TYPES.EXTENSION_REQUESTED,
                    relatedPassId: passId
                });
            }

            // 2. Notify Hostel Office (Users with HOSTEL_OFFICE role)
            const [hostelStaff] = await db.query('SELECT id FROM users WHERE role = "HOSTEL_OFFICE"');
            for (const staff of hostelStaff) {
                await notificationService.createNotification({
                    userId: staff.id,
                    title: 'Extension Requested',
                    message: `Student ${students[0].full_name} has requested an extension for Pass #${passId}.`,
                    type: NOTIFICATION_TYPES.EXTENSION_REQUESTED,
                    relatedPassId: passId
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Extension request submitted successfully',
            data: { extensionId }
        });
    } catch (error) {
        logger.error('Request extension error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/v1/passes/extensions/pending
 * @desc    Get pending extensions for approver
 * @access  Private (COORDINATOR/HOSTEL_OFFICE)
 */
const getPendingExtensions = async (req, res) => {
    try {
        const approverId = req.user.id;
        const role = req.user.role;

        const passService = require('../services/passService');
        const extensions = await passService.getPendingExtensions(approverId, role);

        res.status(200).json({
            success: true,
            data: extensions
        });
    } catch (error) {
        logger.error('Get pending extensions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending extensions' });
    }
};

/**
 * @route   POST /api/v1/passes/extensions/:id/approve
 * @desc    Approve or reject extension
 * @access  Private (COORDINATOR/HOSTEL_OFFICE)
 */
const processExtensionApproval = async (req, res) => {
    try {
        const extensionId = req.params.id;
        const approverId = req.user.id;
        const role = req.user.role;
        const { status, remarks } = req.body;

        const passService = require('../services/passService');
        await passService.processExtensionApproval(extensionId, approverId, role, status, remarks);

        // Notify student
        const [extensions] = await db.query(
            'SELECT pass_id, requested_by_id FROM pass_extensions WHERE id = ?',
            [extensionId]
        );

        if (extensions.length > 0) {
            const notificationService = require('../services/notificationService');
            const { NOTIFICATION_TYPES } = require('../config/constants');

            await notificationService.createNotification({
                userId: extensions[0].requested_by_id,
                title: `Extension ${status.toLowerCase()}`,
                message: `Your extension request for Pass #${extensions[0].pass_id} has been ${status.toLowerCase()}.`,
                type: status === 'APPROVED' ? NOTIFICATION_TYPES.EXTENSION_APPROVED : NOTIFICATION_TYPES.EXTENSION_REJECTED,
                relatedPassId: extensions[0].pass_id
            });
        }

        res.status(200).json({
            success: true,
            message: `Extension request ${status.toLowerCase()} successfully`
        });
    } catch (error) {
        logger.error('Process extension approval error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    applyPass,
    getMyPasses,
    getPassDetails,
    cancelPass,
    getPassStats,
    getPassTypes,
    downloadPassPDF,
    requestExtension,
    getPendingExtensions,
    processExtensionApproval
};
