import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    FiFileText, FiCheckCircle, FiXCircle, FiClock,
    FiDownload, FiFilter, FiRefreshCw, FiActivity
} from 'react-icons/fi';
import api from '../../services/api';
import { formatDateTime } from '../../utils/helpers';
import StatCard from '../../components/dashboard/StatCard';

// ── helpers ──────────────────────────────────────────────────────────────────

const statusBadge = (status) => {
    const map = {
        FINAL_APPROVED: 'bg-green-100 text-green-700',
        APPROVED: 'bg-green-100 text-green-700',
        REJECTED: 'bg-red-100 text-red-700',
        IN_APPROVAL: 'bg-yellow-100 text-yellow-700',
        PENDING: 'bg-yellow-100 text-yellow-700',
        EXITED: 'bg-blue-100 text-blue-700',
        RETURNED: 'bg-purple-100 text-purple-700',
        LATE_RETURN: 'bg-orange-100 text-orange-700',
        CANCELLED: 'bg-gray-100 text-gray-600',
    };
    const cls = map[status] || 'bg-gray-100 text-gray-600';
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
};

// ── component ─────────────────────────────────────────────────────────────────

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [passes, setPasses] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [exporting, setExporting] = useState('');

    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        status: '',
        passTypeId: '',
    });

    // ── fetch ──────────────────────────────────────────────────────────────

    const fetchSummary = async () => {
        try {
            const params = buildParams();
            const res = await api.get('/reports', { params });
            console.log('Reports summary response:', res.data);
            setStats(res.data.data.stats);
            setActivity(res.data.data.recentActivity || []);
        } catch (err) {
            console.error('Reports summary error:', err);
            toast.error(err.response?.data?.message || 'Failed to load report summary');
        }
    };

    const fetchTableData = async () => {
        setTableLoading(true);
        try {
            const params = buildParams();
            const res = await api.get('/reports/data', { params });
            console.log('Reports table data:', res.data);
            setPasses(res.data.data?.passes || []);
        } catch (err) {
            console.error('Reports table error:', err);
            toast.error(err.response?.data?.message || 'Failed to load pass records');
            setPasses([]);
        } finally {
            setTableLoading(false);
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([fetchSummary(), fetchTableData()]);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []); // eslint-disable-line

    // ── filter helpers ─────────────────────────────────────────────────────

    const buildParams = () => {
        const p = {};
        if (filters.fromDate) p.fromDate = filters.fromDate;
        if (filters.toDate) p.toDate = filters.toDate;
        if (filters.status) p.status = filters.status;
        if (filters.passTypeId) p.passTypeId = filters.passTypeId;
        return p;
    };

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const applyFilters = () => fetchAll();

    const resetFilters = () => {
        setFilters({ fromDate: '', toDate: '', status: '', passTypeId: '' });
        setTimeout(fetchAll, 0);
    };

    // ── export helpers ─────────────────────────────────────────────────────

    const downloadFile = async (endpoint, filename, mimeType) => {
        setExporting(endpoint);
        try {
            const params = buildParams();
            const res = await api.get(endpoint, { params, responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Report downloaded successfully');
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to download report');
        } finally {
            setExporting('');
        }
    };

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');

    const exportExcel = () =>
        downloadFile(
            '/reports/export/excel',
            `GatePass_Report_${today}.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

    const exportPDF = () =>
        downloadFile(
            '/reports/export/pdf',
            `GatePass_Report_${today}.pdf`,
            'application/pdf'
        );

    // ── render ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <div className="flex gap-2">
                    <button
                        onClick={exportExcel}
                        disabled={!!exporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        <FiDownload className="h-4 w-4" />
                        {exporting === '/reports/export/excel' ? 'Downloading…' : 'Download Excel'}
                    </button>
                    <button
                        onClick={exportPDF}
                        disabled={!!exporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        <FiDownload className="h-4 w-4" />
                        {exporting === '/reports/export/pdf' ? 'Downloading…' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <FiFilter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filters</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">From Date</label>
                        <input
                            type="date"
                            name="fromDate"
                            value={filters.fromDate}
                            onChange={handleFilterChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">To Date</label>
                        <input
                            type="date"
                            name="toDate"
                            value={filters.toDate}
                            onChange={handleFilterChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="FINAL_APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="IN_APPROVAL">In Approval</option>
                            <option value="PENDING">Pending</option>
                            <option value="EXITED">Exited</option>
                            <option value="RETURNED">Returned</option>
                            <option value="LATE_RETURN">Late Return</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={applyFilters}
                            className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Apply
                        </button>
                        <button
                            onClick={resetFilters}
                            className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                            title="Reset filters"
                        >
                            <FiRefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Summary Stats ── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Total Passes" value={stats.total_passes || 0} icon={FiFileText} color="blue" />
                    <StatCard title="Approved" value={stats.approved_passes || 0} icon={FiCheckCircle} color="green" />
                    <StatCard title="Rejected" value={stats.rejected_passes || 0} icon={FiXCircle} color="red" />
                    <StatCard title="Pending" value={stats.pending_passes || 0} icon={FiClock} color="yellow" />
                    <StatCard title="Exited" value={stats.exited_passes || 0} icon={FiActivity} color="blue" />
                    <StatCard title="Returned" value={stats.returned_passes || 0} icon={FiCheckCircle} color="purple" />
                    <StatCard title="Late Returns" value={stats.late_returns || 0} icon={FiXCircle} color="orange" />
                    <StatCard title="Hostel Office ✓" value={stats.hostel_office_approved || 0} icon={FiCheckCircle} color="green" />
                </div>
            )}

            {/* ── Pass Records Table ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">
                        Pass Records
                        {!tableLoading && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({passes.length} records)
                            </span>
                        )}
                    </h2>
                    {tableLoading && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                    )}
                </div>

                {passes.length === 0 && !tableLoading ? (
                    <div className="text-center py-12 text-gray-500">
                        <FiFileText className="mx-auto h-10 w-10 mb-3 text-gray-300" />
                        <p>No records found for the selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Pass ID', 'Student', 'Roll No.', 'Pass Type', 'Destination', 'From', 'To', 'Status', 'Approved By', 'Approval Date'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {passes.map((p, i) => (
                                    <tr key={p.pass_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                        <td className="px-4 py-3 font-mono text-gray-700">#{p.pass_id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                            {p.first_name} {p.last_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{p.roll_number}</td>
                                        <td className="px-4 py-3 text-gray-700">{p.pass_type_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.destination || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(p.from_datetime)}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(p.to_datetime)}</td>
                                        <td className="px-4 py-3">{statusBadge(p.current_status)}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.approved_by || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                            {p.approval_date ? formatDateTime(p.approval_date) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Recent Activity ── */}
            {activity.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">Recent Approval Activity</h2>
                    </div>
                    <ul className="divide-y divide-gray-50">
                        {activity.map((a) => (
                            <li key={a.id} className="px-5 py-3 flex items-start gap-3">
                                <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${a.action === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {a.action === 'APPROVED' ? '✓' : '✗'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">
                                        <span className="font-medium">{a.approver_name || a.approver_role}</span>
                                        {' '}{a.action === 'APPROVED' ? 'approved' : 'rejected'}{' '}
                                        pass <span className="font-mono">#{a.pass_id}</span> for{' '}
                                        <span className="font-medium">{a.first_name} {a.last_name}</span>
                                        {' '}({a.roll_number})
                                    </p>
                                    {a.remarks && (
                                        <p className="text-xs text-gray-500 mt-0.5">"{a.remarks}"</p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {a.action_taken_at ? formatDateTime(a.action_taken_at) : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Reports;
