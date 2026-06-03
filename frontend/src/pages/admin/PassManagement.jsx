import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Search, 
    Filter, 
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { formatDateTime } from '../../utils/helpers';

const PassManagement = () => {
    const [passes, setPasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState({ status: '', type: '' });

    useEffect(() => {
        fetchPasses();
    }, [search, filter]);

    const fetchPasses = async () => {
        setLoading(true);
        try {
            const params = {
                search,
                ...filter
            };
            const res = await api.get('/admin/passes', { params });
            setPasses(res.data.data);
        } catch (err) {
            toast.error('Failed to fetch passes');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'FINAL_APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'REJECTED': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'PENDING_CLASS_COORDINATOR': return 'bg-amber-50 text-yellow-600 border-yellow-100';
            case 'PENDING_HOSTEL_OFFICE': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'EXITED': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'RETURNED': return 'bg-slate-50 text-slate-600 border-slate-200';
            case 'LATE_RETURN': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-400';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Pass Management</h1>
                <p className="text-slate-500">Monitor and track all gate passes in the system</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search by student name, USN, or destination..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <select 
                    value={filter.status}
                    onChange={(e) => setFilter({...filter, status: e.target.value})}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING_CLASS_COORDINATOR">Pending Coordinator</option>
                    <option value="PENDING_HOSTEL_OFFICE">Pending Office</option>
                    <option value="FINAL_APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="EXITED">Currently Outside</option>
                    <option value="RETURNED">Returned</option>
                    <option value="LATE_RETURN">Late Return</option>
                </select>
                <select 
                    value={filter.type}
                    onChange={(e) => setFilter({...filter, type: e.target.value})}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="">All Types</option>
                    <option value="HALF_DAY">Half-Day Pass</option>
                    <option value="HOME_PASS">Home Pass</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700">Pass ID</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Student</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Type & Destination</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Date & Time</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading passes...</td></tr>
                            ) : passes.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No passes found</td></tr>
                            ) : passes.map(pass => (
                                <tr key={pass.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-400">#{pass.id}</td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-slate-900">{pass.student_name}</p>
                                            <p className="text-xs text-blue-600 font-bold">{pass.usn}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-700">{pass.pass_type_name}</p>
                                        <p className="text-xs text-slate-500">{pass.destination}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-bold text-slate-700">Out:</span>
                                                {formatDateTime(pass.from_datetime)}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-bold text-slate-700">In:</span>
                                                {formatDateTime(pass.to_datetime)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(pass.current_status)}`}>
                                            {pass.current_status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PassManagement;
