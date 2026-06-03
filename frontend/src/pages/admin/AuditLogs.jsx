import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    User, 
    Activity, 
    Shield, 
    Monitor,
    Search,
    Filter,
    ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { formatDateTime } from '../../utils/helpers';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/admin/audit-logs');
            setLogs(res.data.data);
        } catch (err) {
            toast.error('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('CREATE')) return 'text-emerald-600 bg-emerald-50';
        if (action.includes('DELETE')) return 'text-rose-600 bg-rose-50';
        if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
        if (action.includes('RESET')) return 'text-amber-600 bg-amber-50';
        return 'text-slate-600 bg-slate-50';
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
                <p className="text-slate-500">Track all administrative actions and system changes</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700">Timestamp</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Actor</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Action</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Description</th>
                                <th className="px-6 py-4 font-bold text-slate-700">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading audit logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No logs recorded</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                                        {formatDateTime(log.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                                <User className="w-3 h-3 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">ID: #{log.actor_id}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{log.actor_role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {log.description}
                                        {log.entity_id && <span className="ml-1 text-slate-400 font-mono">(ID: {log.entity_id})</span>}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                        {log.ip_address || '—'}
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

export default AuditLogs;
