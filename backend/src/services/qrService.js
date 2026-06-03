const QRCode = require('qrcode');
const { pool: db } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Generate QR code for pass - returns the signature hash for DB storage
 * and the data URL for immediate use
 * @param {string} passId - Pass ID
 * @returns {Promise<Object>} { hash, dataURL }
 */
const generatePassQRCode = async (passId) => {
    try {
        // Get pass details
        const [passes] = await db.query(
            `SELECT p.id, s.usn
       FROM passes p
       JOIN students s ON p.student_id = s.id
       WHERE p.id = ?`,
            [passId]
        );

        if (passes.length === 0) {
            throw new Error('Pass not found');
        }

        const pass = passes[0];

        // NEW: QR code contains ONLY the USN
        const qrData = pass.usn;

        // Generate QR code as data URL (for display only, not stored in DB)
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION || 'M',
            width: parseInt(process.env.QR_CODE_SIZE) || 300,
            margin: 2
        });

        logger.info(`QR code generated for pass: ${passId} using USN: ${pass.usn}`);

        // Return dataURL for frontend. 
        // Hash is kept for compatibility with current DB schema if it expects a return value, 
        // though it's no longer used for verification logic in this simplified model.
        return { hash: pass.usn, dataURL: qrCodeDataURL };
    } catch (error) {
        logger.error('QR code generation error:', error);
        throw error;
    }
};

/**
 * Validate QR code - Simplified to lookup by USN
 * @param {string} usn - The scanned USN string
 * @returns {Promise<Object>} Validation result
 */
const validateQRCode = async (usn) => {
    try {
        if (!usn || typeof usn !== 'string') {
            return {
                isValid: false,
                message: 'Invalid USN provided'
            };
        }

        const cleanUsn = usn.trim().toUpperCase();

        // Get student and their most recent active pass
        const [passes] = await db.query(
            `SELECT p.*, s.usn, s.full_name,
              pt.name as pass_type_name
       FROM passes p
       JOIN students s ON p.student_id = s.id
       JOIN pass_types pt ON p.pass_type_id = pt.id
       WHERE s.usn = ?
         AND p.current_status IN ('FINAL_APPROVED', 'APPROVED', 'EXITED', 'OUTSIDE', 'EXTENDED', 'EXTENSION_PENDING')
       ORDER BY p.id DESC
       LIMIT 1`,
            [cleanUsn]
        );

        if (passes.length === 0) {
            // Check if student even exists
            const [students] = await db.query('SELECT id FROM students WHERE usn = ?', [cleanUsn]);
            if (students.length === 0) {
                return { isValid: false, message: `Student with USN ${cleanUsn} not found` };
            }
            return { isValid: false, message: 'No active approved pass found for this student' };
        }

        const pass = passes[0];

        // Check if pass is within valid time
        const now = new Date();
        const validFrom = new Date(pass.from_datetime);
        const validTo = new Date(pass.to_datetime);

        if (now < validFrom) {
            return {
                isValid: false,
                message: `Pass not yet valid. Starts at: ${validFrom.toLocaleString()}`
            };
        }

        if (now > validTo) {
            return {
                isValid: false,
                message: `Pass has expired. Expired at: ${validTo.toLocaleString()}`
            };
        }

        logger.info(`QR lookup successful for USN: ${cleanUsn}, found Pass ID: ${pass.id}`);

        return {
            isValid: true,
            message: 'Active pass found',
            pass: pass
        };
    } catch (error) {
        logger.error('QR validation error:', error);
        return {
            isValid: false,
            message: 'Error validating QR code'
        };
    }
};

/**
 * Generate QR code as buffer (for download)
 * @param {string} passId - Pass ID
 * @returns {Promise<Buffer>} QR code buffer
 */
const generateQRCodeBuffer = async (passId) => {
    try {
        const [passes] = await db.query(
            `SELECT p.id, s.usn
       FROM passes p
       JOIN students s ON p.student_id = s.id
       WHERE p.id = ?`,
            [passId]
        );

        if (passes.length === 0) {
            throw new Error('Pass not found');
        }

        const pass = passes[0];

        // NEW: QR code contains ONLY the USN
        const qrData = pass.usn;

        const qrCodeBuffer = await QRCode.toBuffer(qrData, {
            errorCorrectionLevel: 'M',
            width: 300,
            margin: 2
        });

        logger.info(`QR code buffer generated for pass: ${passId} using USN: ${pass.usn}`);
        return qrCodeBuffer;
    } catch (error) {
        logger.error('QR code buffer generation error:', error);
        throw error;
    }
};

/**
 * Generate and store QR code for approved pass
 * @param {string} passId - Pass ID
 * @returns {Promise<string>} QR code data URL
 */
const generateAndStoreQRCode = async (passId) => {
    try {
        const { hash, dataURL } = await generatePassQRCode(passId);

        await db.query(
            'UPDATE passes SET qr_code_hash = ?, qr_generated_at = NOW() WHERE id = ?',
            [hash, passId]
        );

        logger.info(`QR code generated and stored for pass: ${passId}`);
        return dataURL;
    } catch (error) {
        logger.error('QR code generation and storage error:', error);
        throw error;
    }
};

module.exports = {
    generatePassQRCode,
    validateQRCode,
    generateQRCodeBuffer,
    generateAndStoreQRCode
};
