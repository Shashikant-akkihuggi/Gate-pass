import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    PieChart,
    LineChart,
    TrendingUp,
    AlertCircle,
    Users,
    MapPin,
    ArrowUpRight,
    CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/admin/analytics');
                setData(res.data.data);
            } catch (err) {
                toast.error('Failed to fetch analytics data');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

    if (!data) {
        return (
            <div className="flex flex-col justify-center items-center h-full space-y-4">
                <AlertCircle className="w-12 h-12 text-yellow-500" />
                <p className="text-slate-600 font-medium">Unable to load analytics data</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const maxDeptCount = Math.max(...(data.byDepartment?.map(d => d.count) || [0]), 1);
    const maxMonthCount = Math.max(...(data.byMonth?.map(m => m.count) || [0]), 1);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">System Analytics</h1>
                <p className="text-slate-500">In-depth analysis of pass usage and trends</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Passes by Department */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Passes by Department
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {data.byDepartment?.map((dept, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    <span className="text-slate-500">{dept.department}</span>
                                    <span className="text-slate-900">{dept.count}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                        style={{ width: `${(dept.count / maxDeptCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {(!data.byDepartment || data.byDepartment.length === 0) && (
                            <p className="text-center py-4 text-slate-400 text-sm">No department data available</p>
                        )}
                    </div>
                </div>

                {/* Passes by Type */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-indigo-600" />
                            Pass Type Distribution
                        </h2>
                    </div>
                    <div className="flex items-center justify-around py-8">
                        {data.byType?.map((type, idx) => (
                            <div key={idx} className="text-center">
                                <div className={`w-24 h-24 rounded-full border-8 ${idx === 0 ? 'border-blue-600' : 'border-indigo-600'} flex items-center justify-center`}>
                                    <span className="text-xl font-bold">{type.count}</span>
                                </div>
                                <p className="mt-4 text-sm font-bold text-slate-600 uppercase">{type.type}</p>
                            </div>
                        ))}
                        {(!data.byType || data.byType.length === 0) && (
                            <p className="text-center py-4 text-slate-400 text-sm">No type distribution data</p>
                        )}
                    </div>
                </div>

                {/* Monthly Trends */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Monthly Pass Trends (Last 6 Months)
                        </h2>
                    </div>
                    <div className="flex items-end justify-between gap-2 h-48 pt-4">
                        {data.byMonth?.map((month, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full max-w-[60px] bg-emerald-100 rounded-t-lg hover:bg-emerald-200 transition-colors relative group"
                                    style={{ height: `${(month.count / maxMonthCount) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {month.count} passes
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{month.month}</span>
                            </div>
                        ))}
                        {(!data.byMonth || data.byMonth.length === 0) && (
                            <p className="text-center w-full py-12 text-slate-400 text-sm">No trend data available</p>
                        )}
                    </div>
                </div>

                {/* Late Return Analysis */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                            Late Returns by Dept
                        </h2>
                    </div>
                    {data.lateByDepartment && data.lateByDepartment.length > 0 ? (
                        <div className="space-y-4">
                            {data.lateByDepartment.map((dept, idx) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <span className="w-16 text-xs font-bold text-slate-500">{dept.department}</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-rose-500 rounded-full"
                                            style={{ width: `${(dept.count / Math.max(...data.lateByDepartment.map(d => d.count), 1)) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900">{dept.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-100" />
                            <p className="text-sm">No late returns recorded</p>
                        </div>
                    )}
                </div>

                {/* Most Active Students */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            Most Active Students
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {data.activeStudents?.map((student, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{student.full_name}</p>
                                    <p className="text-xs text-slate-500">{student.usn}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-purple-600">{student.count}</span>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Passes</p>
                                </div>
                            </div>
                        ))}
                        {(!data.activeStudents || data.activeStudents.length === 0) && (
                            <p className="text-center py-12 text-slate-400 text-sm">No active students found</p>
                        )}
                    </div>
                </div>

                {/* Popular Destinations */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-amber-600" />
                            Frequent Destinations
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {data.destinations?.map((dest, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-700">{dest.destination}</span>
                                    <span className="text-slate-500">{dest.count} visits</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full">
                                    <div
                                        className="h-full bg-amber-500 rounded-full"
                                        style={{ width: `${(dest.count / Math.max(...data.destinations.map(d => d.count), 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {(!data.destinations || data.destinations.length === 0) && (
                            <p className="text-center py-12 text-slate-400 text-sm">No destination data recorded</p>
                        )}
                    </div>
                </div>

                {/* Extension Requests */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <ArrowUpRight className="w-5 h-5 text-cyan-600" />
                            Extension Analysis
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {data.extensions?.map((ext, idx) => (
                            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">{ext.status}</p>
                                <p className="text-2xl font-bold text-slate-900">{ext.count}</p>
                            </div>
                        ))}
                        {(!data.extensions || data.extensions.length === 0) && (
                            <div className="col-span-2 text-center py-6 text-slate-400 text-sm italic">
                                No extensions recorded yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
