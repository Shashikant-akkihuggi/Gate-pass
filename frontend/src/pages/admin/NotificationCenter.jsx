import React, { useState, useEffect } from 'react';
import { 
    Bell, 
    Send, 
    Users, 
    Shield, 
    Briefcase, 
    Activity,
    Info,
    AlertTriangle,
    Megaphone,
    Flame,
    Clock,
    XCircle
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { formatDateTime } from '../../utils/helpers';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [formData, setFormData] = useState({
        target_role: 'ALL',
        target_dept: '',
        target_year: '',
        type: 'INFO',
        title: '',
        message: ''
    });

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/admin/notifications');
            setNotifications(res.data.data);
        } catch (err) {
            toast.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.post('/admin/notifications', formData);
            toast.success('Notification sent successfully');
            setFormData({
                target_role: 'ALL',
                target_dept: '',
                target_year: '',
                type: 'INFO',
                title: '',
                message: ''
            });
            fetchNotifications();
        } catch (err) {
            toast.error('Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'INFO': return <Info className="w-4 h-4 text-blue-600" />;
            case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
            case 'ANNOUNCEMENT': return <Megaphone className="w-4 h-4 text-indigo-600" />;
            case 'EMERGENCY': return <Flame className="w-4 h-4 text-rose-600" />;
            default: return <Info className="w-4 h-4 text-slate-600" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
                    <p className="text-slate-500">Broadcast messages to system users</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <Send className="w-5 h-5 text-blue-600" />
                        <h2 className="font-bold text-slate-900">Create New Broadcast</h2>
                    </div>
                    <form onSubmit={handleSend} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Audience</label>
                                <select 
                                    value={formData.target_role}
                                    onChange={(e) => setFormData({...formData, target_role: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="ALL">Everyone</option>
                                    <option value="STUDENT">All Students</option>
                                    <option value="CLASS_COORDINATOR">All Coordinators</option>
                                    <option value="HOSTEL_OFFICE">Hostel Office</option>
                                    <option value="WATCHMAN">Watchmen</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notification Type</label>
                                <select 
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="INFO">Information</option>
                                    <option value="ANNOUNCEMENT">Announcement</option>
                                    <option value="WARNING">Warning</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                            </div>
                        </div>

                        {formData.target_role === 'STUDENT' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department (Optional)</label>
                                    <select 
                                        value={formData.target_dept}
                                        onChange={(e) => setFormData({...formData, target_dept: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">All Departments</option>
                                        {['CSE', 'CSBS', 'AIDS', 'ECE', 'MECH', 'MBA', 'MCA'].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year (Optional)</label>
                                    <select 
                                        value={formData.target_year}
                                        onChange={(e) => setFormData({...formData, target_year: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">All Years</option>
                                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
                            <input 
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Enter notification title..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message Content</label>
                            <textarea 
                                required
                                rows="4"
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                placeholder="Write your message here..."
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={sending}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {sending ? 'Sending...' : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Broadcast Notification
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Recent History</h2>
                    <p className="text-slate-500 text-sm">Past 20 notifications</p>
                </div>

                <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading history...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">No history found</div>
                    ) : notifications.map(notif => (
                        <div key={notif.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 relative group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    {getTypeIcon(notif.type)}
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notif.type}</span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-400">{formatDateTime(notif.created_at)}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{notif.title}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{notif.message}</p>
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500">To: {notif.target_role}</span>
                                {notif.target_dept && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{notif.target_dept}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
