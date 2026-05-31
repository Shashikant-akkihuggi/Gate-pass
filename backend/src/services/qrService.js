const QRCode = require('qrcode');
const crypto = require('crypto');
const { pool: db } = require('../config/database');
const logger = require('../utils/logger');

const QR_READY_STATUSES = new Set(['FINAL_APPROVED', 'APPROVED', 'EXITED', 'OUTSIDE']);

const getQrSigningSecret = () => {
    if (!process.env.JWT_ACCESS_SECRET) {
        throw new Error('JWT_ACCESS_SECRET is required for QR signing');
    }

    return process.env.JWT_ACCESS_SECRET;
};

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
            `SELECT p.id, p.student_id, p.from_datetime, p.to_datetime,
              s.usn, s.full_name, pt.code as pass_type
       FROM passes p
       JOIN students s ON p.student_id = s.id
       JOIN pass_types pt ON p.pass_type_id = pt.id
       WHERE p.id = ?`,
            [passId]
        );

        if (passes.length === 0) {
            throw new Error('Pass not found');
        }

        const pass = passes[0];

        // Generate HMAC signature for tamper detection (this is what we store in DB)
        const secret = getQrSigningSecret();
        const dataToSign = `${pass.id}|${pass.usn}|${pass.from_datetime}|${pass.to_datetime}`;
        const signature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex');

        // Create QR code payload (embedded in the QR image)
        const qrPayload = {
            usn: pass.usn,
            studentName: pass.full_name,
            passId: pass.id,
            passType: pass.pass_type,
            validFrom: pass.from_datetime,
            validTo: pass.to_datetime,
            signature
        };

        const qrData = JSON.stringify(qrPayload);

        // Generate QR code as data URL (for display only, not stored in DB)
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION || 'M',
            width: parseInt(process.env.QR_CODE_SIZE) || 300,
            margin: 2
        });

        logger.info(`QR code generated for pass: ${passId}, hash length: ${signature.length}`);

        // Return both - hash goes to DB, dataURL goes to frontend
        return { hash: signature, dataURL: qrCodeDataURL };
    } catch (error) {
        logger.error('QR code generation error:', error);
        throw error;
    }
};

/**
 * Validate QR code
 * @param {string} qrData - QR code data (JSON string)
 * @returns {Promise<Object>} Validation result
 */
const validateQRCode = async (qrData) => {
    try {
        // Parse QR data
        let qrPayload;
        try {
            qrPayload = JSON.parse(qrData);
        } catch (error) {
            return {
                isValid: false,
                message: 'Invalid QR code format'
            };
        }

        // Verify required fields
        if (!qrPayload.usn || !qrPayload.passId || !qrPayload.signature) {
            return {
                isValid: false,
                message: 'QR code missing required fields'
            };
        }

        // Verify signature
        const secret = getQrSigningSecret();
        const dataToSign = `${qrPayload.passId}|${qrPayload.usn}|${qrPayload.validFrom}|${qrPayload.validTo}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex');

        if (qrPayload.signature !== expectedSignature) {
            return {
                isValid: false,
                message: 'QR code signature verification failed. Possible tampering detected.'
            };
        }

        // Get pass from database
        const [passes] = await db.query(
            `SELECT p.*, s.usn, s.full_name,
              pt.name as pass_type_name
       FROM passes p
       JOIN students s ON p.student_id = s.id
       JOIN pass_types pt ON p.pass_type_id = pt.id
       WHERE p.id = ?`,
            [qrPayload.passId]
        );

        if (passes.length === 0) {
            return {
                isValid: false,
                message: 'Pass not found in system'
            };
        }

        const pass = passes[0];

        // Allow QR validation for passes that are ready to exit or already outside.
        if (!QR_READY_STATUSES.has(pass.current_status)) {
            return {
                isValid: false,
                message: `Pass is ${pass.current_status.toLowerCase()}. Only approved passes can be used.`
            };
        }

        // Check if pass is within valid time
        const now = new Date();
        const validFrom = new Date(pass.from_datetime);
        const validTo = new Date(pass.to_datetime);

        if (now < validFrom) {
            return {
                isValid: false,
                message: 'Pass is not yet valid. Valid from: ' + validFrom.toLocaleString()
            };
        }

        if (now > validTo) {
            return {
                isValid: false,
                message: 'Pass has expired. Valid until: ' + validTo.toLocaleString()
            };
        }

        return {
            isValid: true,
            message: 'QR code is valid',
            pass: pass
        };
    } catch (error) {
        logger.error('QR code validation error:', error);
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
            `SELECT p.id, p.student_id, p.from_datetime, p.to_datetime,
              s.usn, s.full_name, pt.code as pass_type
       FROM passes p
       JOIN students s ON p.student_id = s.id
       JOIN pass_types pt ON p.pass_type_id = pt.id
       WHERE p.id = ?`,
            [passId]
        );

        if (passes.length === 0) {
            throw new Error('Pass not found');
        }

        const pass = passes[0];

        const secret = getQrSigningSecret();
        const dataToSign = `${pass.id}|${pass.usn}|${pass.from_datetime}|${pass.to_datetime}`;
        const signature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('hex');

        const qrPayload = {
            usn: pass.usn,
            studentName: pass.full_name,
            passId: pass.id,
            passType: pass.pass_type,
            validFrom: pass.from_datetime,
            validTo: pass.to_datetime,
            signature
        };

        const qrData = JSON.stringify(qrPayload);

        const qrCodeBuffer = await QRCode.toBuffer(qrData, {
            errorCorrectionLevel: 'M',
            width: 300,
            margin: 2
        });

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

/**
 * Verify QR code hasn't been tampered with
 * @param {Object} qrPayload - Parsed QR payload
 * @returns {boolean} True if signature is valid
 */
const verifyQRSignature = (qrPayload) => {
    const secret = getQrSigningSecret();
    const dataToSign = `${qrPayload.passId}|${qrPayload.usn}|${qrPayload.validFrom}|${qrPayload.validTo}`;
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(dataToSign)
        .digest('hex');

    return qrPayload.signature === expectedSignature;
};

/**
 * Check if QR code is within time validity
 * @param {Date} validFrom - Valid from datetime
 * @param {Date} validTo - Valid to datetime
 * @returns {Object} Validity status
 */
const checkTimeValidity = (validFrom, validTo) => {
    const now = new Date();
    const from = new Date(validFrom);
    const to = new Date(validTo);

    if (now < from) {
        return {
            isValid: false,
            message: `Pass is not yet valid. Valid from: ${from.toLocaleString()}`
        };
    }

    if (now > to) {
        return {
            isValid: false,
            message: `Pass has expired. Valid until: ${to.toLocaleString()}`
        };
    }

    return {
        isValid: true,
        message: 'Pass is within valid time period'
    };
};

module.exports = {
    generatePassQRCode,
    validateQRCode,
    generateQRCodeBuffer,
    generateAndStoreQRCode,
    verifyQRSignature,
    checkTimeValidity
};
