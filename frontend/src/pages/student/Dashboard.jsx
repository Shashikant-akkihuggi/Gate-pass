import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Download,
    Plus,
    Calendar,
    MapPin,
    ChevronRight,
    ArrowUpRight,
    History,
    User,
    GraduationCap,
    School,
    Contact,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '../../components/dashboard/StatCard';
import PassDetailsModal from '../../components/pass/PassDetailsModal';
import Button from '../../components/common/Button';
import { passService } from '../../services/passService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { handleError, formatDateTime, downloadFile } from '../../utils/helpers';

// ── Status Configuration ──────────────────────────────────────────────────────

const statusConfig = {
    FINAL_APPROVED: {
        icon: CheckCircle2,
        color: 'text-success',
        bg: 'bg-success/10',
        border: 'border-success/20',
        label: 'Ready to Exit',
        step: 2
    },
    APPROVED: {
        icon: CheckCircle2,
        color: 'text-success',
        bg: 'bg-success/10',
        border: 'border-success/20',
        label: 'Ready to Exit',
        step: 2
    },
    EXITED: {
        icon: ArrowUpRight,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
        label: 'Currently Outside',
        step: 3
    },
    OUTSIDE: {
        icon: ArrowUpRight,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
        label: 'Currently Outside',
        step: 3
    },
    RETURNED: {
        icon: CheckCircle2,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
        label: 'Completed',
        step: 4
    },
    COMPLETED: {
        icon: CheckCircle2,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
        label: 'Completed',
        step: 4
    },
    LATE_RETURN: {
        icon: AlertCircle,
        color: 'text-danger',
        bg: 'bg-danger/10',
        border: 'border-danger/20',
        label: 'Returned Late',
        step: 4
    },
    COMPLETED_LATE: {
        icon: AlertCircle,
        color: 'text-danger',
        bg: 'bg-danger/10',
        border: 'border-danger/20',
        label: 'Returned Late',
        step: 4
    },
    IN_APPROVAL: {
        icon: Clock,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
        label: 'Under Review',
        step: 1
    },
    PENDING_CLASS_COORDINATOR: {
        icon: Clock,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
        label: 'Awaiting Coordinator',
        step: 1
    },
    PENDING_HOSTEL_OFFICE: {
        icon: Clock,
        color: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/20',
        label: 'Awaiting Hostel Office',
        step: 1
    },
    REJECTED: {
        icon: XCircle,
        color: 'text-danger',
        bg: 'bg-danger/10',
        border: 'border-danger/20',
        label: 'Rejected',
        step: 0
    },
};

// ── Countdown Timer Component ─────────────────────────────────────────────────

const CountdownTimer = ({ toDatetime }) => {
    const calc = useCallback(() => {
        const diff = new Date(toDatetime) - new Date();
        if (diff <= 0) return { label: 'OVERDUE', overdue: true, percent: 100 };

        const totalDuration = 24 * 60 * 60 * 1000; // Mock total duration for progress
        const percent = Math.min(100, Math.max(0, (1 - diff / totalDuration) * 100));

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        return {
            label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
            overdue: false,
            percent
        };
    }, [toDatetime]);

    const [tick, setTick] = useState(calc());

    useEffect(() => {
        const id = setInterval(() => setTick(calc()), 1000);
        return () => clearInterval(id);
    }, [calc]);

    return (
        <div className={`rounded-2xl p-4 border transition-all duration-500 ${tick.overdue ? 'bg-danger/5 border-danger/20' : 'bg-warning/5 border-warning/20'
            }`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text/40">Time Remaining</span>
                {tick.overdue && <span className="text-[10px] font-bold text-danger animate-pulse">ACTION REQUIRED</span>}
            </div>
            <div className={`text-4xl font-black font-mono tracking-tighter ${tick.overdue ? 'text-danger' : 'text-warning'
                }`}>
                {tick.label}
            </div>
            <div className="mt-3 h-1.5 bg-text/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tick.percent}%` }}
                    className={`h-full ${tick.overdue ? 'bg-danger' : 'bg-warning'}`}
                />
            </div>
            {tick.overdue && (
                <p className="text-[10px] text-danger mt-2 font-bold uppercase tracking-tight">Return to hostel immediately!</p>
            )}
        </div>
    );
};

// ── Active Pass Card ──────────────────────────────────────────────────────────

const ActivePassCard = ({ pass, onCancel }) => {
    const [downloading, setDownloading] = useState(false);
    const cfg = statusConfig[pass.current_status] || statusConfig.IN_APPROVAL;
    const Icon = cfg.icon;

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const blob = await passService.downloadPassPDF(pass.id);
            downloadFile(blob, `GatePass_${pass.id}.pdf`);
            toast.success('Pass downloaded successfully');
        } catch (error) {
            toast.error(handleError(error));
        } finally {
            setDownloading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-card rounded-3xl border border-border shadow-xl shadow-text/5 overflow-hidden`}
        >
            <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${cfg.bg} ${cfg.color}`}>
                            <Icon size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-text">{pass.pass_type_name}</h3>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                    {cfg.label}
                                </span>
                            </div>
                            <p className="text-sm text-text/40 font-medium">Reference #{pass.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {['FINAL_APPROVED', 'APPROVED'].includes(pass.current_status) && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDownload}
                                loading={downloading}
                                className="rounded-xl shadow-lg shadow-primary/20"
                            >
                                <Download size={16} className="mr-2" />
                                Download Pass
                            </Button>
                        )}
                        {['IN_APPROVAL', 'FINAL_APPROVED', 'APPROVED', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE'].includes(pass.current_status) && (
                            <button
                                onClick={() => onCancel(pass.id)}
                                className="p-2.5 text-danger bg-danger/5 hover:bg-danger/10 border border-danger/10 rounded-xl transition-colors"
                                title="Cancel Pass"
                            >
                                <XCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-background rounded-2xl border border-border">
                                <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1 flex items-center">
                                    <Calendar size={12} className="mr-1" /> From
                                </p>
                                <p className="text-sm font-bold text-text">{formatDateTime(pass.from_datetime)}</p>
                            </div>
                            <div className="p-4 bg-background rounded-2xl border border-border">
                                <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1 flex items-center">
                                    <Calendar size={12} className="mr-1" /> To
                                </p>
                                <p className="text-sm font-bold text-text">{formatDateTime(pass.to_datetime)}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-background rounded-2xl border border-border">
                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1 flex items-center">
                                <MapPin size={12} className="mr-1" /> Destination
                            </p>
                            <p className="text-sm font-bold text-text">{pass.destination || 'Not Specified'}</p>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        {['EXITED', 'OUTSIDE'].includes(pass.current_status) ? (
                            <CountdownTimer toDatetime={pass.to_datetime} />
                        ) : (
                            <div className="h-full flex flex-col justify-center items-center p-6 bg-primary/5 rounded-3xl border border-primary/10 border-dashed">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                    <Clock size={24} className="text-primary" />
                                </div>
                                <p className="text-sm font-bold text-primary text-center">Awaiting Gate Exit</p>
                                <p className="text-[10px] text-primary/60 text-center mt-1">Timer will start once you scan out at the gate</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-center items-center">
                        {['FINAL_APPROVED', 'APPROVED', 'EXITED', 'OUTSIDE'].includes(pass.current_status) && pass.qr_code ? (
                            <div className="text-center group">
                                <div className="inline-block p-4 bg-white rounded-3xl border border-border shadow-2xl shadow-text/5 group-hover:scale-105 transition-transform duration-500">
                                    <img src={pass.qr_code} alt="QR" className="w-32 h-32 md:w-40 md:h-40" />
                                </div>
                                <p className="text-[10px] text-text/40 mt-4 font-bold uppercase tracking-widest">
                                    {['EXITED', 'OUTSIDE'].includes(pass.current_status) ? 'Show for Return' : 'Show to Watchman'}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center opacity-40 grayscale">
                                <div className="inline-block p-4 bg-background rounded-3xl border border-border border-dashed">
                                    <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center bg-text/5 rounded-2xl">
                                        <ArrowUpRight size={48} className="text-text/20" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-text/60 mt-4 font-bold uppercase tracking-widest">QR Not Ready</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Simple Timeline Progress Bar */}
            <div className="px-8 pb-8">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Approval Progress</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((step) => (
                        <div
                            key={step}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step <= cfg.step ? 'bg-primary shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-text/5'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

// ── Pass Timeline Component ───────────────────────────────────────────────────

const PassTimeline = ({ currentStep }) => {
    const steps = [
        { label: 'Submitted', id: 1 },
        { label: 'Coordinator', id: 2 },
        { label: 'Hostel Office', id: 3 },
        { label: 'Gate Exit', id: 4 },
        { label: 'Returned', id: 5 }
    ];

    return (
        <div className="flex items-center justify-between w-full max-w-xs mx-auto mt-2">
            {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                    <div className={`relative flex items-center justify-center`}>
                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${step.id <= currentStep ? 'bg-primary' : 'bg-text/10'
                            }`} />
                        {step.id === currentStep && (
                            <motion.div
                                layoutId="activeStep"
                                className="absolute w-4 h-4 bg-primary/20 rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            />
                        )}
                    </div>
                    {idx < steps.length - 1 && (
                        <div className={`h-[1px] flex-1 transition-all duration-500 ${step.id < currentStep ? 'bg-primary' : 'bg-text/10'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );
};

// ── Main Student Dashboard ────────────────────────────────────────────────────

const StudentDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentPasses, setRecentPasses] = useState([]);
    const [selectedPass, setSelectedPass] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            const [statsData, passesData] = await Promise.all([
                passService.getPassStats(),
                passService.getMyPasses({ limit: 6 }),
            ]);
            setStats(statsData.data);
            const passes = passesData.data?.passes || [];
            setRecentPasses(Array.isArray(passes) ? passes : []);
        } catch (error) {
            toast.error(handleError(error));
            setRecentPasses([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCancelPass = async (passId) => {
        if (!window.confirm('Are you sure you want to cancel this pass?')) return;
        try {
            await passService.cancelPass(passId);
            toast.success('Pass cancelled successfully');
            fetchData();
        } catch (error) {
            toast.error(handleError(error));
        }
    };

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-card rounded-full" />
                    </div>
                </div>
                <p className="mt-4 text-sm font-bold text-text/40 animate-pulse uppercase tracking-widest">Fetching Dashboard</p>
            </div>
        );
    }

    const activePass = recentPasses.find(p =>
        ['FINAL_APPROVED', 'APPROVED', 'EXITED', 'OUTSIDE', 'IN_APPROVAL', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE'].includes(p.current_status)
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto space-y-10 pb-20"
        >
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1
                        initial={{ x: -20 }}
                        animate={{ x: 0 }}
                        className="text-3xl md:text-4xl font-black text-text tracking-tight"
                    >
                        {getTimeGreeting()}, {user?.profile?.full_name?.split(' ')[0] || 'Student'} 👋
                    </motion.h1>
                    <p className="text-text/50 font-medium mt-1">Manage your hostel passes and approvals.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="primary"
                        onClick={() => navigate('/passes/new')}
                        className="rounded-2xl shadow-xl shadow-primary/20 h-12 px-6"
                    >
                        <Plus size={20} className="mr-2" />
                        Apply New Pass
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Stats & Profile */}
                <div className="lg:col-span-8 space-y-10">

                    {/* Active Pass Section */}
                    {activePass && (
                        <section>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h2 className="text-xs font-black text-text/30 uppercase tracking-[0.2em]">Active Gate Pass</h2>
                                <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                            </div>
                            <ActivePassCard pass={activePass} onCancel={handleCancelPass} />
                        </section>
                    )}

                    {/* Stats Grid */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            title="Total"
                            value={stats?.total_passes || 0}
                            icon={FileText}
                            variant="primary"
                            description="All applications"
                        />
                        <StatCard
                            title="Approved"
                            value={stats?.approved || 0}
                            icon={CheckCircle2}
                            variant="success"
                            description="Ready or used"
                        />
                        <StatCard
                            title="Pending"
                            value={stats?.in_approval || 0}
                            icon={Clock}
                            variant="warning"
                            description="Awaiting review"
                        />
                        <StatCard
                            title="Rejected"
                            value={stats?.rejected || 0}
                            icon={XCircle}
                            variant="danger"
                            description="Declined requests"
                        />
                    </section>

                    {/* Recent Passes Modern Table */}
                    <section>
                        <div className="flex justify-between items-center mb-6 px-2">
                            <h2 className="text-xs font-black text-text/30 uppercase tracking-[0.2em]">Recent History</h2>
                            <button
                                onClick={() => navigate('/passes')}
                                className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                View All <ArrowRight size={14} />
                            </button>
                        </div>

                        {recentPasses.length === 0 ? (
                            <div className="bg-card rounded-3xl border border-border border-dashed p-20 text-center">
                                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="text-text/10" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-text mb-2">No history found</h3>
                                <p className="text-text/40 text-sm max-w-xs mx-auto mb-6">You haven't applied for any gate passes yet. Your history will appear here.</p>
                                <Button variant="outline" size="sm" onClick={() => navigate('/passes/new')}>Start First Application</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentPasses.map((pass, idx) => {
                                    const cfg = statusConfig[pass.current_status] || statusConfig.IN_APPROVAL;
                                    const Icon = cfg.icon;

                                    // Map current status to 1-5 step
                                    let currentStep = 1;
                                    if (['PENDING_CLASS_COORDINATOR'].includes(pass.current_status)) currentStep = 1;
                                    if (['PENDING_HOSTEL_OFFICE'].includes(pass.current_status)) currentStep = 2;
                                    if (['FINAL_APPROVED', 'APPROVED'].includes(pass.current_status)) currentStep = 3;
                                    if (['EXITED', 'OUTSIDE'].includes(pass.current_status)) currentStep = 4;
                                    if (['RETURNED', 'COMPLETED', 'LATE_RETURN', 'COMPLETED_LATE'].includes(pass.current_status)) currentStep = 5;
                                    if (['REJECTED'].includes(pass.current_status)) currentStep = 0;

                                    return (
                                        <motion.div
                                            key={pass.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ x: 4 }}
                                            onClick={() => setSelectedPass(pass)}
                                            className="group bg-card p-5 rounded-2xl border border-border hover:border-primary/30 transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-6"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`p-3 rounded-xl ${cfg.bg} ${cfg.color} group-hover:scale-110 transition-transform`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-text truncate group-hover:text-primary transition-colors">{pass.pass_type_name}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-text/40 mt-1">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Calendar size={12} /> {formatDateTime(pass.from_datetime)}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <MapPin size={12} /> {pass.destination || 'Home'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-48 px-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Progress</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                </div>
                                                <PassTimeline currentStep={currentStep} />
                                            </div>

                                            <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-text/5 text-text/20 group-hover:bg-primary group-hover:text-white transition-all">
                                                <ChevronRight size={20} />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Profile & Actions */}
                <div className="lg:col-span-4 space-y-10">

                    {/* Student Profile Widget */}
                    <section>
                        <div className="mb-4 px-2">
                            <h2 className="text-xs font-black text-text/30 uppercase tracking-[0.2em]">Student Profile</h2>
                        </div>
                        <div className="bg-card rounded-3xl border border-border shadow-xl shadow-text/5 overflow-hidden">
                            <div className="h-24 bg-gradient-to-br from-primary to-primary-700 p-6 flex justify-end">
                                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-white">
                                    <GraduationCap size={18} />
                                </div>
                            </div>
                            <div className="px-6 pb-6 -mt-12">
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-3xl bg-card p-1 shadow-xl shadow-text/5">
                                        <div className="w-full h-full rounded-[20px] bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                            <span className="text-3xl font-black">
                                                {user?.profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="mt-4 text-xl font-black text-text text-center">{user?.profile?.full_name || 'Student Name'}</h3>
                                    <p className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mt-2 uppercase tracking-widest">{user?.profile?.usn || 'USN-UNKNOWN'}</p>
                                </div>

                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-background border border-border group hover:border-primary/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-text/40 group-hover:text-primary transition-colors border border-border">
                                            <School size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Department</p>
                                            <p className="text-sm font-bold text-text">{user?.profile?.branch || 'Information Science'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-background border border-border group hover:border-primary/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-text/40 group-hover:text-primary transition-colors border border-border">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Academic Year</p>
                                            <p className="text-sm font-bold text-text">{user?.profile?.year || '3'}rd Year, Sec {user?.profile?.section || 'A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-background border border-border group hover:border-primary/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-text/40 group-hover:text-primary transition-colors border border-border">
                                            <Contact size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Coordinator</p>
                                            <p className="text-sm font-bold text-text">{user?.profile?.coordinator_name || 'Prof. Satish Kumar'}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full mt-6 py-4 text-xs font-black text-text/40 hover:text-primary border border-border border-dashed rounded-2xl hover:border-primary transition-all uppercase tracking-[0.2em]"
                                >
                                    Full Student Profile
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Quick Actions Card */}
                    <section>
                        <div className="mb-4 px-2">
                            <h2 className="text-xs font-black text-text/30 uppercase tracking-[0.2em]">Quick Actions</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02, x: 4 }}
                                onClick={() => navigate('/passes/new', { state: { type: 'Half-Day' } })}
                                className="flex items-center justify-between p-5 bg-card border border-border rounded-3xl hover:border-primary/30 transition-all shadow-sm hover:shadow-xl shadow-text/5 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Clock size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-text">Half-Day Pass</p>
                                        <p className="text-[10px] text-text/40 font-bold uppercase tracking-wider">Short duration exit</p>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-text/10 group-hover:text-primary transition-colors" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, x: 4 }}
                                onClick={() => navigate('/passes/new', { state: { type: 'Home' } })}
                                className="flex items-center justify-between p-5 bg-card border border-border rounded-3xl hover:border-primary/30 transition-all shadow-sm hover:shadow-xl shadow-text/5 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success group-hover:bg-success group-hover:text-white transition-colors">
                                        <School size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-text">Home Pass</p>
                                        <p className="text-[10px] text-text/40 font-bold uppercase tracking-wider">Visit home / vacation</p>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-text/10 group-hover:text-success transition-colors" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, x: 4 }}
                                onClick={() => navigate('/passes')}
                                className="flex items-center justify-between p-5 bg-card border border-border rounded-3xl hover:border-primary/30 transition-all shadow-sm hover:shadow-xl shadow-text/5 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center text-warning group-hover:bg-warning group-hover:text-white transition-colors">
                                        <History size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-text">View History</p>
                                        <p className="text-[10px] text-text/40 font-bold uppercase tracking-wider">Track past applications</p>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-text/10 group-hover:text-warning transition-colors" />
                            </motion.button>
                        </div>
                    </section>
                </div>
            </div>

            <PassDetailsModal
                pass={selectedPass}
                isOpen={!!selectedPass}
                onClose={() => setSelectedPass(null)}
            />
        </motion.div>
    );
};

export default StudentDashboard;