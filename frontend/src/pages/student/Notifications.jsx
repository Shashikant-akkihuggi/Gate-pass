import { useState } from 'react';
import {
    Bell,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Clock,
    Filter,
    Search,
    Trash2,
    CheckCheck,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const Notifications = () => {
    // Mock notifications for UI demonstration
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            title: 'Pass Approved',
            message: 'Your Home Pass application #1024 has been approved by the Hostel Office.',
            type: 'success',
            time: '2 hours ago',
            isRead: false,
            icon: CheckCircle2
        },
        {
            id: 2,
            title: 'Coordinator Comment',
            message: 'Prof. Satish Kumar left a comment: "Please ensure you return by Sunday evening."',
            type: 'info',
            time: '5 hours ago',
            isRead: false,
            icon: MessageSquare
        },
        {
            id: 3,
            title: 'Pass Rejected',
            message: 'Your Half-Day Pass application #1021 was rejected due to incomplete reason.',
            type: 'danger',
            time: '1 day ago',
            isRead: true,
            icon: XCircle
        },
        {
            id: 4,
            title: 'Return Reminder',
            message: 'Reminder: Your scheduled return for Pass #1018 is today at 6:00 PM.',
            type: 'warning',
            time: '1 day ago',
            isRead: true,
            icon: Clock
        }
    ]);

    const [filter, setFilter] = useState('all');

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        return true;
    });

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    };

    const deleteNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const getStatusStyles = (type) => {
        switch (type) {
            case 'success': return 'bg-success/10 text-success border-success/20';
            case 'danger': return 'bg-danger/10 text-danger border-danger/20';
            case 'warning': return 'bg-warning/10 text-warning border-warning/20';
            case 'info': return 'bg-primary/10 text-primary border-primary/20';
            default: return 'bg-text/5 text-text/40 border-text/10';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8 pb-20"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tight">Notifications</h1>
                    <p className="text-text/50 font-medium mt-1">Stay updated with your pass applications and comments.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={markAllAsRead}
                        className="flex items-center px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                        <CheckCheck size={16} className="mr-2" /> Mark all as read
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-card rounded-3xl border border-border p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-background border border-border rounded-2xl p-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-card text-primary shadow-sm' : 'text-text/30 hover:text-text'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'unread' ? 'bg-card text-primary shadow-sm' : 'text-text/30 hover:text-text'}`}
                    >
                        Unread
                    </button>
                </div>

                <div className="relative flex-1 max-w-xs group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        className="w-full bg-background border border-border rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
                <AnimatePresence mode='popLayout'>
                    {filteredNotifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-card rounded-[32px] border border-border border-dashed p-20 text-center"
                        >
                            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 text-text/10">
                                <Bell size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-text mb-1">All caught up!</h3>
                            <p className="text-sm text-text/40">You have no new notifications at this time.</p>
                        </motion.div>
                    ) : (
                        filteredNotifications.map((notif, idx) => (
                            <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`group relative bg-card p-6 rounded-[32px] border transition-all duration-300 ${notif.isRead ? 'border-border' : 'border-primary/30 shadow-xl shadow-primary/5'
                                    }`}
                            >
                                {!notif.isRead && (
                                    <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
                                )}

                                <div className="flex gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 ${getStatusStyles(notif.type)}`}>
                                        <notif.icon size={24} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`text-lg font-black transition-colors ${notif.isRead ? 'text-text/70' : 'text-text'}`}>
                                                    {notif.title}
                                                </h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-text/30 uppercase tracking-widest">
                                                        <Calendar size={12} /> {notif.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className={`mt-3 text-sm leading-relaxed ${notif.isRead ? 'text-text/40 font-medium' : 'text-text/60 font-bold'}`}>
                                            {notif.message}
                                        </p>

                                        <div className="mt-6 flex items-center gap-4">
                                            <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
                                                View Details <ArrowRight size={12} />
                                            </button>
                                            <div className="h-1 w-1 bg-text/10 rounded-full"></div>
                                            <button
                                                onClick={() => deleteNotification(notif.id)}
                                                className="text-[10px] font-black uppercase tracking-widest text-text/20 hover:text-danger transition-colors flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default Notifications;