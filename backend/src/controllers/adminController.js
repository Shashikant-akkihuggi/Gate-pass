const adminService = require('../services/adminService');
const { HTTP_STATUS } = require('../config/constants');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Helper: format date for display
const fmtDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const getStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error getting admin stats:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getStudents = async (req, res) => {
    try {
        const students = await adminService.getStudents(req.query);
        res.json({ success: true, data: students });
    } catch (error) {
        logger.error('Error getting students for admin:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { role, id, status } = req.body;
        await adminService.updateUserStatus(role, id, status, req.user.id);
        res.json({ success: true, message: 'User status updated successfully' });
    } catch (error) {
        logger.error('Error updating user status:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { role, id, newPassword } = req.body;
        await adminService.resetUserPassword(role, id, newPassword, req.user.id);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        logger.error('Error resetting password:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getSettings = async (req, res) => {
    try {
        const settings = await adminService.getSystemSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        logger.error('Error getting settings:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        await adminService.updateSystemSettings(req.body, req.user.id);
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const logs = await adminService.getAuditLogs();
        res.json({ success: true, data: logs });
    } catch (error) {
        logger.error('Error getting audit logs:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const { role } = req.params;
        const users = await adminService.getUsers(role, req.query);
        res.json({ success: true, data: users });
    } catch (error) {
        logger.error('Error getting users for admin:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const createCoordinator = async (req, res) => {
    try {
        const id = await adminService.createCoordinator(req.body, req.user.id);
        res.status(HTTP_STATUS.CREATED).json({ success: true, data: { id }, message: 'Coordinator created successfully' });
    } catch (error) {
        logger.error('Error creating coordinator:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const createStaff = async (req, res) => {
    try {
        const id = await adminService.createStaff(req.body, req.user.id);
        res.status(HTTP_STATUS.CREATED).json({ success: true, data: { id }, message: 'Staff created successfully' });
    } catch (error) {
        logger.error('Error creating staff:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { role, id } = req.body;
        await adminService.deleteUser(role, id, req.user.id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getAllPasses = async (req, res) => {
    try {
        const passes = await adminService.getAllPasses(req.query);
        res.json({ success: true, data: passes });
    } catch (error) {
        logger.error('Error getting all passes for admin:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const analytics = await adminService.getAnalytics();
        res.json({ success: true, data: analytics });
    } catch (error) {
        logger.error('Error getting analytics:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const sendNotification = async (req, res) => {
    try {
        const id = await adminService.sendNotification(req.body, req.user.id);
        res.status(HTTP_STATUS.CREATED).json({ success: true, data: { id }, message: 'Notification sent successfully' });
    } catch (error) {
        logger.error('Error sending notification:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getNotifications = async (req, res) => {
    try {
        const notifications = await adminService.getNotifications();
        res.json({ success: true, data: notifications });
    } catch (error) {
        logger.error('Error getting notifications:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getStudentReport = async (req, res) => {
    try {
        const data = await adminService.getStudentReportData(req.query);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Error getting student report:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getCoordinatorReport = async (req, res) => {
    try {
        const data = await adminService.getCoordinatorReportData();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Error getting coordinator report:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const getWatchmanReport = async (req, res) => {
    try {
        const data = await adminService.getWatchmanReportData();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Error getting watchman report:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const exportStudentReport = async (req, res) => {
    try {
        const data = await adminService.getStudentReportData(req.query);
        const { format } = req.query;

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Student Report');
            sheet.columns = [
                { header: 'USN', key: 'usn', width: 15 },
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Department', key: 'department', width: 15 },
                { header: 'Year', key: 'year', width: 10 },
                { header: 'Total Passes', key: 'pass_count', width: 15 },
                { header: 'Late Returns', key: 'late_returns', width: 15 }
            ];
            data.forEach(row => sheet.addRow(row));

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Student_Report.xlsx"');
            await workbook.xlsx.write(res);
            return res.end();
        } else if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="Student_Report.pdf"');
            doc.pipe(res);
            doc.fontSize(16).text('Student Pass Report', { align: 'center' });
            doc.moveDown();
            data.forEach(row => {
                doc.fontSize(10).text(`${row.usn} - ${row.name} (${row.department}) - Passes: ${row.pass_count}, Late: ${row.late_returns}`);
                doc.moveDown(0.5);
            });
            doc.end();
        } else {
            res.status(400).json({ success: false, message: 'Invalid format' });
        }
    } catch (error) {
        logger.error('Error exporting student report:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const exportCoordinatorReport = async (req, res) => {
    try {
        const data = await adminService.getCoordinatorReportData();
        const { format } = req.query;

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Coordinator Report');
            sheet.columns = [
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Department', key: 'department', width: 15 },
                { header: 'Approvals', key: 'approvals', width: 15 },
                { header: 'Rejections', key: 'rejections', width: 15 },
                { header: 'Pending', key: 'pending', width: 15 }
            ];
            data.forEach(row => sheet.addRow(row));
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Coordinator_Report.xlsx"');
            await workbook.xlsx.write(res);
            return res.end();
        } else if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="Coordinator_Report.pdf"');
            doc.pipe(res);
            doc.fontSize(16).text('Coordinator Performance Report', { align: 'center' });
            doc.moveDown();
            data.forEach(row => {
                doc.fontSize(10).text(`${row.name} (${row.department}) - Appr: ${row.approvals}, Rej: ${row.rejections}, Pend: ${row.pending}`);
                doc.moveDown(0.5);
            });
            doc.end();
        } else {
            res.status(400).json({ success: false, message: 'Invalid format' });
        }
    } catch (error) {
        logger.error('Error exporting coordinator report:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

const exportWatchmanReport = async (req, res) => {
    try {
        const data = await adminService.getWatchmanReportData();
        const { format } = req.query;

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Watchman Report');
            sheet.columns = [
                { header: 'Time', key: 'scan_time', width: 25 },
                { header: 'Type', key: 'scan_type', width: 15 },
                { header: 'Student', key: 'student_name', width: 25 },
                { header: 'USN', key: 'usn', width: 15 },
                { header: 'Watchman', key: 'watchman_name', width: 25 }
            ];
            data.forEach(row => {
                sheet.addRow({
                    ...row,
                    scan_time: fmtDate(row.scan_time)
                });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="Watchman_Scan_Report.xlsx"');
            await workbook.xlsx.write(res);
            return res.end();
        } else if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 30 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="Watchman_Scan_Report.pdf"');
            doc.pipe(res);
            doc.fontSize(16).text('Watchman Scan Logs', { align: 'center' });
            doc.moveDown();
            data.forEach(row => {
                doc.fontSize(9).text(`${fmtDate(row.scan_time)} | ${row.scan_type} | ${row.student_name} (${row.usn}) | By: ${row.watchman_name}`);
                doc.moveDown(0.3);
            });
            doc.end();
        } else {
            res.status(400).json({ success: false, message: 'Invalid format' });
        }
    } catch (error) {
        logger.error('Error exporting watchman report:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

module.exports = {
    getStats,
    getStudents,
    getUsers,
    createCoordinator,
    createStaff,
    updateUserStatus,
    resetPassword,
    deleteUser,
    getSettings,
    updateSettings,
    getAuditLogs,
    getAllPasses,
    getAnalytics,
    sendNotification,
    getNotifications,
    getStudentReport,
    getCoordinatorReport,
    getWatchmanReport,
    exportStudentReport,
    exportCoordinatorReport,
    exportWatchmanReport
};