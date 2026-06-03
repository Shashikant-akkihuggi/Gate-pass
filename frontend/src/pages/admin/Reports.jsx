import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    FiFileText, FiDownload, FiFilter, FiRefreshCw,
    FiUser, FiUsers, FiShield, FiActivity, FiSearch
} from 'react-icons/fi';
import api from '../../services/api';

const AdminReports = () => {
    const [activeTab, setActiveTab] = useState('students');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({
        branch: '',
        year: '',
        search: ''
    });

    const tabs = [
        { id: 'students', label: 'Student Reports', icon: FiUsers },
        { id: 'coordinators', label: 'Coordinator Reports', icon: FiShield },
        { id: 'watchmen', label: 'Watchman Reports', icon: FiActivity },
        { id: 'passes', label: 'Pass Reports', icon: FiFileText }
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            let endpoint = '';
            if (activeTab === 'students') endpoint = '/admin/reports/students';
            else if (activeTab === 'coordinators') endpoint = '/admin/reports/coordinators';
            else if (activeTab === 'watchmen') endpoint = '/admin/reports/watchmen';
            else if (activeTab === 'passes') endpoint = '/admin/passes';

            const res = await api.get(endpoint, { params: filters });
            setData(res.data.data);
        } catch (err) {
            console.error('Report fetch error:', err);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleExport = async (format) => {
        setExporting(true);
        try {
            let endpoint = `/admin/reports/${activeTab}/export`;
            if (activeTab === 'passes') {
                // Use general report export for passes
                endpoint = '/reports/export/' + format;
            }

            const res = await api.get(endpoint, {
                params: { ...filters, format },
                responseType: 'blob'
            });

            const blob = new Blob([res.data], {
                type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${activeTab}_report_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Report exported successfully');
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export report');
        } finally {
            setExporting(false);
        }
    };

    const renderTable = () => {
        if (loading) return <div className="text-center py-10">Loading...</div>;
        if (!data || data.length === 0) return <div className="text-center py-10 text-gray-500">No data available</div>;

        switch (activeTab) {
            case 'students':
                return (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Returns</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.usn}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pass_count}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-red-600 font-bold">{row.late_returns}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'coordinators':
                return (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approvals</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejections</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.department}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{row.approvals}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.rejections}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{row.pending}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'watchmen':
                return (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Watchman</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.scan_time).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.scan_type === 'EXIT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                            {row.scan_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.student_name} ({row.usn})</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.watchman_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'passes':
                return (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.student_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.pass_type_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.current_status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {row.current_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <FiDownload /> Export Excel
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        <FiDownload /> Export PDF
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px px-4 gap-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                        </div>
                    </div>
                    {activeTab === 'students' && (
                        <>
                            <select
                                value={filters.branch}
                                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">All Departments</option>
                                <option value="CSE">CSE</option>
                                <option value="ISE">ISE</option>
                                <option value="ECE">ECE</option>
                                <option value="MECH">MECH</option>
                                <option value="CIVIL">CIVIL</option>
                            </select>
                            <select
                                value={filters.year}
                                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">All Years</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </>
                    )}
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {renderTable()}
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
