import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    LogOut,
    TrendingUp,
    Shield,
    Activity,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                setStats(res.data.data);
            } catch (err) {
                toast.error('Failed to fetch dashboard stats');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

    if (!stats) {
        return (
            <div className="flex flex-col justify-center items-center h-full space-y-4">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
                <p className="text-slate-600 font-medium">Unable to load dashboard data</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const cards = [
        { title: 'Total Students', value: stats?.users?.students?.total || 0, sub: `${stats?.users?.students?.active || 0} Active`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Coordinators', value: stats?.users?.coordinators || 0, sub: 'Department Leads', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { title: 'Hostel Office', value: stats?.users?.office || 0, sub: 'Staff Members', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { title: 'Watchmen', value: stats?.users?.watchmen || 0, sub: 'Gate Security', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-100' },
    ];

    const passStats = [
        { label: 'Active Passes', value: stats?.passes?.active_passes || 0, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Pending Coordinator', value: stats?.passes?.pending_coordinator || 0, icon: Clock, color: 'text-yellow-600' },
        { label: 'Pending Office', value: stats?.passes?.pending_office || 0, icon: Clock, color: 'text-orange-600' },
        { label: 'Students Outside', value: stats?.passes?.students_outside || 0, icon: LogOut, color: 'text-blue-600' },
        { label: 'Late Returns', value: stats?.passes?.late_returns || 0, icon: AlertTriangle, color: 'text-red-600' },
        { label: "Today's Exits", value: stats?.passes?.today_exits || 0, icon: TrendingUp, color: 'text-purple-600' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500">Overview of the GatePass Management System</p>
            </div>

            {/* Top User Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${card.bg}`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <TrendingUp className="w-4 h-4 text-slate-300" />
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium">{card.title}</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                            <span className="text-xs text-slate-400 font-medium">{card.sub}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Pass Statistics */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900">Live Pass Activity</h2>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">Live</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-slate-100">
                    {passStats.map((stat, idx) => (
                        <div key={idx} className="p-8 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions & Placeholder for Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-slate-900 mb-4">Recent System Alerts</h2>
                    <div className="space-y-4">
                        {stats.passes.late_returns > 0 ? (
                            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                <div>
                                    <p className="text-red-900 font-bold text-sm">Critical: Late Returns Detected</p>
                                    <p className="text-red-700 text-xs">{stats.passes.late_returns} students have not returned by their expected time.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                    <p className="text-emerald-900 font-bold text-sm">All Clear</p>
                                    <p className="text-emerald-700 text-xs">No critical alerts at this moment.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-slate-900 mb-4">Quick Links</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-xl transition-all text-left group">
                            <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-2" />
                            <p className="text-sm font-bold text-slate-900">Manage Students</p>
                        </button>
                        <button className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-xl transition-all text-left group">
                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-2" />
                            <p className="text-sm font-bold text-slate-900">System Reports</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
