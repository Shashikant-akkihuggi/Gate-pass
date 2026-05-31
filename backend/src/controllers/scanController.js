const { HTTP_STATUS } = require('../config/constants');
const scanService = require('../services/scanService');
const qrService = require('../services/qrService');
const logger = require('../utils/logger');

// ── Watchman dashboard ────────────────────────────────────────────────────────

const getWatchmanDashboard = async (req, res) => {
    try {
        const data = await scanService.getWatchmanDashboard();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('getWatchmanDashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Lookup by USN ─────────────────────────────────────────────────────────────

const lookupByUSN = async (req, res) => {
    try {
        const { usn } = req.params;
        if (!usn) return res.status(400).json({ success: false, message: 'USN is required' });

        const pass = await scanService.lookupByUSN(usn);
        if (!pass) {
            return res.status(404).json({ success: false, message: 'No active pass found for this USN' });
        }

        res.json({ success: true, data: pass });
    } catch (error) {
        logger.error('lookupByUSN error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Validate QR ───────────────────────────────────────────────────────────────

const validateQR = async (req, res) => {
    try {
        const { qrData } = req.body;
        if (!qrData) return res.status(400).json({ success: false, message: 'QR code data is required' });

        const validation = await qrService.validateQRCode(qrData);
        if (!validation.isValid) {
            return res.status(400).json({ success: false, message: validation.message });
        }

        const scanStatus = await scanService.getPassScanStatus(validation.pass.id);

        res.json({
            success: true,
            message: 'QR code is valid',
            data: {
                pass: validation.pass,
                scanStatus,
                canExit: scanStatus.canExit,
                canEntry: scanStatus.canEntry
            }
        });
    } catch (error) {
        logger.error('validateQR error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Record exit ───────────────────────────────────────────────────────────────

const recordExit = async (req, res) => {
    try {
        const { qrData, identifier, usn, passId, gateLocation, remarks } = req.body;
        const watchmanId = req.user.id;

        // Determine identifier: identifier, QR payload (usn then passId), explicit passId, or USN
        let scanIdentifier;
        if (identifier) {
            scanIdentifier = identifier;
        } else if (qrData) {
            try {
                const payload = JSON.parse(qrData);
                scanIdentifier = payload.usn || payload.passId;
            } catch {
                scanIdentifier = qrData;
            }
        } else if (passId) {
            scanIdentifier = passId;
        } else if (usn) {
            scanIdentifier = usn;
        } else {
            return res.status(400).json({ success: false, message: 'Provide identifier, qrData, passId, or usn' });
        }

        const result = await scanService.recordExitScan({ identifier: scanIdentifier, watchmanId, gateLocation, remarks });

        logger.info(`Exit recorded: pass ${result.pass_id} by watchman ${watchmanId}`);
        res.status(201).json({ success: true, message: 'Student Exit Recorded Successfully', data: result });
    } catch (error) {
        logger.error('recordExit error:', error);
        const msgMap = {
            PASS_NOT_FOUND: [404, 'Pass not found'],
            PASS_NOT_APPROVED: [400, 'Pass is not approved for exit'],
            ALREADY_EXITED: [409, 'Exit already recorded for this pass'],
            PASS_COMPLETED: [409, 'This pass has already been completed'],
        };
        const [status, message] = msgMap[error.message] || [500, error.message];
        res.status(status).json({ success: false, message });
    }
};

// ── Record entry ──────────────────────────────────────────────────────────────

const recordEntry = async (req, res) => {
    try {
        const { qrData, identifier, usn, passId, gateLocation, remarks } = req.body;
        const watchmanId = req.user.id;

        let scanIdentifier;
        if (identifier) {
            scanIdentifier = identifier;
        } else if (qrData) {
            try {
                const payload = JSON.parse(qrData);
                scanIdentifier = payload.usn || payload.passId;
            } catch {
                scanIdentifier = qrData;
            }
        } else if (passId) {
            scanIdentifier = passId;
        } else if (usn) {
            scanIdentifier = usn;
        } else {
            return res.status(400).json({ success: false, message: 'Provide identifier, qrData, passId, or usn' });
        }

        const result = await scanService.recordEntryScan({ identifier: scanIdentifier, watchmanId, gateLocation, remarks });

        logger.info(`Entry recorded: pass ${result.pass_id}, late=${result.is_late}`);
        const message = result.is_late
            ? `Student Entry Recorded — Late by ${result.late_minutes} minute(s)`
            : 'Student Entry Recorded Successfully';

        res.status(201).json({ success: true, message, data: result });
    } catch (error) {
        logger.error('recordEntry error:', error);
        const msgMap = {
            PASS_NOT_FOUND: [404, 'Pass not found'],
            NOT_EXITED_YET: [400, 'Student has not exited yet. Record exit first.'],
            PASS_COMPLETED: [409, 'This pass has already been completed'],
            INVALID_STATUS_FOR_ENTRY: [400, 'Pass is not in a valid state for entry scan'],
        };
        const [status, message] = msgMap[error.message] || [500, error.message];
        res.status(status).json({ success: false, message });
    }
};

// ── Scan history ──────────────────────────────────────────────────────────────

const getScanHistory = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const logs = await scanService.getScanHistory({ limit, offset });
        res.json({ success: true, data: logs });
    } catch (error) {
        logger.error('getScanHistory error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Pass scan logs ────────────────────────────────────────────────────────────

const getPassScanLogs = async (req, res) => {
    try {
        const { passId } = req.params;
        const logs = await scanService.getPassScanLogs(passId);
        res.json({ success: true, data: logs });
    } catch (error) {
        logger.error('getPassScanLogs error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Scan stats ────────────────────────────────────────────────────────────────

const getScanStats = async (req, res) => {
    try {
        const watchmanId = req.user.id;
        const { startDate, endDate } = req.query;
        const stats = await scanService.getScanStatistics({ watchmanId, startDate, endDate });
        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('getScanStats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Overdue passes ────────────────────────────────────────────────────────────

const getOverduePasses = async (req, res) => {
    try {
        const passes = await scanService.getOverduePasses();
        res.json({ success: true, data: passes });
    } catch (error) {
        logger.error('getOverduePasses error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Generate student profile PDF for watchman
 * @route   GET /api/v1/scan/student/:studentId/profile-pdf
 */
const getStudentProfilePDF = async (req, res) => {
    try {
        const { studentId } = req.params;
        const PDFDocument = require('pdfkit');
        const { pool: db } = require('../config/database');

        // Fetch student, coordinator and active pass details
        const [rows] = await db.query(
            `SELECT 
                s.*, 
                c.full_name as coordinator_name, c.mobile_number as coordinator_mobile,
                p.id as pass_id, p.pass_type_id, pt.name as pass_type_name,
                p.from_datetime, p.to_datetime, p.destination, p.reason, p.exit_scan_at,
                p.current_status
             FROM students s
             LEFT JOIN coordinators c ON s.assigned_coordinator_id = c.id
             LEFT JOIN passes p ON s.id = p.student_id AND p.current_status IN ('EXITED', 'FINAL_APPROVED')
             LEFT JOIN pass_types pt ON p.pass_type_id = pt.id
             WHERE s.id = ?
             ORDER BY p.created_at DESC
             LIMIT 1`,
            [studentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const data = rows[0];
        const isLate = data.to_datetime && new Date(data.to_datetime) < new Date();
        const delayMinutes = isLate ? Math.floor((new Date() - new Date(data.to_datetime)) / 60000) : 0;

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Student_Profile_${data.usn}.pdf`);
        doc.pipe(res);

        // Header
        doc.fillColor('#1e40af').fontSize(20).font('Helvetica-Bold').text('HOSTEL GATE PASS SYSTEM', { align: 'center' });
        doc.fillColor('#ef4444').fontSize(14).text('LATE RETURN STUDENT REPORT', { align: 'center' });
        doc.moveDown(1);

        // Student Info Section
        doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('STUDENT INFORMATION', 50);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Full Name: ${data.full_name}`);
        doc.text(`USN: ${data.usn}`);
        doc.text(`Department: ${data.branch}`);
        doc.text(`Year/Section: Year ${data.year} - ${data.section}`);
        doc.text(`Mobile: ${data.mobile}`);
        doc.moveDown(1);

        // Coordinator Info Section
        doc.fontSize(12).font('Helvetica-Bold').text('COORDINATOR DETAILS');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Name: ${data.coordinator_name || 'Not Assigned'}`);
        doc.text(`Mobile: ${data.coordinator_mobile || 'N/A'}`);
        doc.text(`Department: ${data.branch}`);
        doc.moveDown(1);

        // Pass & Status Section
        doc.fontSize(12).font('Helvetica-Bold').text('CURRENT PASS & STATUS');
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);
        
        if (data.pass_id) {
            doc.text(`Pass ID: #${data.pass_id}`);
            doc.text(`Type: ${data.pass_type_name}`);
            doc.text(`Destination: ${data.destination || '—'}`);
            doc.text(`Reason: ${data.reason || '—'}`);
            doc.text(`Exit Time: ${data.exit_scan_at ? new Date(data.exit_scan_at).toLocaleString() : 'Not Exited'}`);
            doc.text(`Expected Return: ${new Date(data.to_datetime).toLocaleString()}`);
            doc.text(`Current Time: ${new Date().toLocaleString()}`);
            
            if (isLate) {
                doc.fillColor('#ef4444').font('Helvetica-Bold');
                doc.text(`Delay Duration: ${delayMinutes} minutes`);
                const status = delayMinutes > 60 ? 'CRITICAL DELAY' : 'LATE RETURN';
                doc.fontSize(16).text(status, { align: 'right' });
            } else {
                doc.fillColor('#059669').font('Helvetica-Bold');
                doc.text('Status: ON TIME', { align: 'right' });
            }
        } else {
            doc.text('No active pass found.');
        }

        doc.moveDown(2);
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.text('Digitally verifiable student profile report.', { align: 'center' });

        doc.end();
    } catch (error) {
        logger.error('getStudentProfilePDF error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate profile PDF' });
        }
    }
};

module.exports = {
    getWatchmanDashboard,
    lookupByUSN,
    validateQR,
    recordExit,
    recordEntry,
    getScanHistory,
    getPassScanLogs,
    getScanStats,
    getOverduePasses,
    getStudentProfilePDF
};
