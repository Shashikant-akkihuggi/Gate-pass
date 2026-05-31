const { getReportStats, getReportData, getRecentActivity } = require('../services/reportService');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { formatMySQLDateTime } = require('../utils/dateHelper');

// Helper: format date for display
const fmtDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * GET /api/v1/reports
 * Returns summary stats + recent activity
 */
const getReports = async (req, res) => {
    try {
        console.log('Reports API hit — user:', req.user?.id, req.user?.role);

        const { fromDate, toDate, status, passTypeId } = req.query;
        const filters = { fromDate, toDate, status, passTypeId };

        const [stats, recentActivity] = await Promise.all([
            getReportStats(filters),
            getRecentActivity()
        ]);

        console.log('Report stats:', stats);
        console.log('Recent activity count:', recentActivity.length);

        res.json({
            success: true,
            data: { stats, recentActivity }
        });
    } catch (error) {
        logger.error('getReports error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch reports' });
    }
};

/**
 * GET /api/v1/reports/data
 * Returns full pass records for table display
 */
const getReportTableData = async (req, res) => {
    try {
        const { fromDate, toDate, status, passTypeId } = req.query;
        const rows = await getReportData({ fromDate, toDate, status, passTypeId });

        console.log('Report table data count:', rows.length);

        res.json({ success: true, data: { passes: rows, total: rows.length } });
    } catch (error) {
        logger.error('getReportTableData error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch report data' });
    }
};

/**
 * GET /api/v1/reports/export/excel
 * Streams an .xlsx file
 */
const exportExcel = async (req, res) => {
    try {
        const { fromDate, toDate, status, passTypeId } = req.query;
        const rows = await getReportData({ fromDate, toDate, status, passTypeId });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Gate Pass System';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Gate Pass Report');

        // Header row styling
        sheet.columns = [
            { header: 'Pass ID', key: 'pass_id', width: 10 },
            { header: 'Student Name', key: 'student_name', width: 22 },
            { header: 'Roll Number', key: 'roll_number', width: 16 },
            { header: 'Pass Type', key: 'pass_type_name', width: 18 },
            { header: 'Destination', key: 'destination', width: 20 },
            { header: 'From Date', key: 'from_datetime', width: 22 },
            { header: 'To Date', key: 'to_datetime', width: 22 },
            { header: 'Status', key: 'current_status', width: 16 },
            { header: 'Approved By', key: 'approved_by', width: 22 },
            { header: 'Approval Date', key: 'approval_date', width: 22 },
        ];

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 20;

        // Add data rows
        rows.forEach((r) => {
            sheet.addRow({
                pass_id: r.pass_id,
                student_name: r.first_name, // first_name alias now contains full_name
                roll_number: r.roll_number, // roll_number alias now contains usn
                pass_type_name: r.pass_type_name,
                destination: r.destination || '—',
                from_datetime: fmtDate(r.from_datetime),
                to_datetime: fmtDate(r.to_datetime),
                current_status: r.current_status?.replace(/_/g, ' '),
                approved_by: r.approved_by || '—',
                approval_date: fmtDate(r.approval_date),
            });
        });

        // Alternate row shading
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
            }
        });

        // Auto-filter
        sheet.autoFilter = { from: 'A1', to: 'J1' };

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
        const filename = `GatePass_Report_${today}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        logger.error('exportExcel error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to export Excel' });
    }
};

/**
 * GET /api/v1/reports/export/pdf
 * Streams a PDF file
 */
const exportPDF = async (req, res) => {
    try {
        const { fromDate, toDate, status, passTypeId } = req.query;
        const [rows, stats] = await Promise.all([
            getReportData({ fromDate, toDate, status, passTypeId }),
            getReportStats({ fromDate, toDate, passTypeId })
        ]);

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
        const filename = `GatePass_Report_${today}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        doc.pipe(res);

        // ── Title block ──────────────────────────────────────────────────────
        doc.fontSize(18).font('Helvetica-Bold')
            .text('Hostel Gate Pass Management System', { align: 'center' });
        doc.fontSize(13).font('Helvetica')
            .text('Gate Pass Report', { align: 'center' });
        doc.fontSize(9).fillColor('#555555')
            .text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

        if (fromDate || toDate) {
            doc.text(`Period: ${fromDate || 'All'} to ${toDate || 'All'}`, { align: 'center' });
        }

        doc.moveDown(1);

        // ── Summary stats ────────────────────────────────────────────────────
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E40AF').text('Summary Statistics');
        doc.moveDown(0.3);

        const summaryItems = [
            ['Total Passes', stats.total_passes || 0],
            ['Approved', stats.approved_passes || 0],
            ['Rejected', stats.rejected_passes || 0],
            ['Pending', stats.pending_passes || 0],
            ['Exited', stats.exited_passes || 0],
            ['Returned', stats.returned_passes || 0],
            ['Late Returns', stats.late_returns || 0],
            ['Cancelled', stats.cancelled_passes || 0],
        ];

        const colW = 100;
        let sx = doc.page.margins.left;
        const sy = doc.y;

        summaryItems.forEach(([label, val], i) => {
            const x = sx + (i % 4) * colW;
            const y = sy + Math.floor(i / 4) * 36;
            doc.rect(x, y, colW - 4, 30).fillAndStroke('#EFF6FF', '#BFDBFE');
            doc.fillColor('#1E3A8A').fontSize(8).font('Helvetica-Bold')
                .text(label, x + 4, y + 4, { width: colW - 8 });
            doc.fillColor('#1E40AF').fontSize(14).font('Helvetica-Bold')
                .text(String(val), x + 4, y + 14, { width: colW - 8 });
        });

        doc.y = sy + Math.ceil(summaryItems.length / 4) * 36 + 10;
        doc.moveDown(0.5);

        // ── Pass details table ───────────────────────────────────────────────
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E40AF').text('Pass Details');
        doc.moveDown(0.3);

        const cols = [
            { label: 'ID', width: 30 },
            { label: 'Student', width: 100 },
            { label: 'Roll No.', width: 65 },
            { label: 'Pass Type', width: 75 },
            { label: 'Destination', width: 80 },
            { label: 'From', width: 90 },
            { label: 'To', width: 90 },
            { label: 'Status', width: 70 },
        ];

        const tableLeft = doc.page.margins.left;
        const rowH = 18;

        // Table header
        let cx = tableLeft;
        const headerY = doc.y;
        doc.rect(tableLeft, headerY, cols.reduce((s, c) => s + c.width, 0), rowH)
            .fill('#1E40AF');
        cols.forEach((col) => {
            doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold')
                .text(col.label, cx + 3, headerY + 5, { width: col.width - 6, ellipsis: true });
            cx += col.width;
        });

        doc.y = headerY + rowH;

        // Table rows
        rows.forEach((r, idx) => {
            if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
            }

            const rowY = doc.y;
            const bg = idx % 2 === 0 ? '#F8FAFF' : '#FFFFFF';
            doc.rect(tableLeft, rowY, cols.reduce((s, c) => s + c.width, 0), rowH)
                .fill(bg);

            const cells = [
                String(r.pass_id),
                `${r.first_name} ${r.last_name}`,
                r.roll_number,
                r.pass_type_name,
                r.destination || '—',
                fmtDate(r.from_datetime),
                fmtDate(r.to_datetime),
                (r.current_status || '').replace(/_/g, ' '),
            ];

            cx = tableLeft;
            cells.forEach((cell, ci) => {
                doc.fillColor('#111827').fontSize(7).font('Helvetica')
                    .text(cell, cx + 3, rowY + 5, { width: cols[ci].width - 6, ellipsis: true });
                cx += cols[ci].width;
            });

            doc.y = rowY + rowH;
        });

        if (rows.length === 0) {
            doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
                .text('No records found for the selected filters.', { align: 'center' });
        }

        doc.end();
    } catch (error) {
        logger.error('exportPDF error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || 'Failed to export PDF' });
        }
    }
};

module.exports = { getReports, getReportTableData, exportExcel, exportPDF };
