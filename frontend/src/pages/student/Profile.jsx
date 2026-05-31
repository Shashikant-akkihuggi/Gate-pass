import { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    GraduationCap,
    School,
    Calendar,
    Contact,
    ShieldCheck,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    BarChart2,
    Info,
    RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { passService } from '../../services/passService';
import { handleError } from '../../utils/helpers';
import { toast } from 'react-toastify';
import Card from '../../components/common/Card';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';

const StudentProfile = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const response = await passService.getPassStats();
            // Expected response structure based on other pages: { data: { total_passes, approved, in_approval, rejected } }
            setStats(response.data);
        } catch (error) {
            toast.error(handleError(error));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const profileData = [
        { label: 'Full Name', value: user?.profile?.full_name || user?.name || 'N/A', icon: User },
        { label: 'USN / ID', value: user?.profile?.usn || 'N/A', icon: ShieldCheck },
        { label: 'Email Address', value: user?.email || 'N/A', icon: Mail },
        { label: 'Mobile Number', value: user?.profile?.mobile || 'N/A', icon: Phone },
    ];

    const academicData = [
        { label: 'Department', value: user?.profile?.branch || 'N/A', icon: School },
        { label: 'Current Year', value: user?.profile?.year ? `${user.profile.year} Year` : 'N/A', icon: GraduationCap },
        { label: 'Section', value: user?.profile?.section || 'N/A', icon: Calendar },
        { label: 'Coordinator', value: user?.profile?.coordinator_name || 'N/A', icon: Contact },
    ];

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-xs font-black text-text/30 uppercase tracking-widest">Loading Profile...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-10 pb-20"
        >
            {/* Profile Header */}
            <div className="relative">
                <div className="h-48 bg-gradient-to-br from-primary to-primary-700 rounded-[40px] shadow-2xl shadow-primary/20"></div>
                <div className="px-10 -mt-20 flex flex-col md:flex-row items-center md:items-end gap-6">
                    <div className="w-40 h-40 rounded-[48px] bg-card p-2 shadow-2xl shadow-text/10">
                        <div className="w-full h-full rounded-[40px] bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <span className="text-5xl font-black">
                                {(user?.profile?.full_name || user?.name || user?.email)?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="pb-4 text-center md:text-left flex-1">
                        <h1 className="text-4xl font-black text-text tracking-tight">
                            {user?.profile?.full_name || user?.name || 'Student Profile'}
                        </h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20">
                                {user?.profile?.usn || 'STUDENT'}
                            </span>
                            <span className="px-4 py-1.5 rounded-full bg-success/10 text-success text-xs font-black uppercase tracking-widest border border-success/20">
                                Active Student
                            </span>
                        </div>
                    </div>
                    <div className="pb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchStats(true)}
                            loading={refreshing}
                            className="rounded-xl"
                        >
                            <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh Stats
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Stats Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="px-2">
                        <h2 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <BarChart2 size={14} className="mr-2" /> Pass Statistics
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <StatCard
                            title="Total Passes"
                            value={stats?.total_passes || 0}
                            icon={FileText}
                            variant="primary"
                        />
                        <StatCard
                            title="Approved"
                            value={stats?.approved || 0}
                            icon={CheckCircle2}
                            variant="success"
                        />
                        <StatCard
                            title="In Approval"
                            value={stats?.in_approval || 0}
                            icon={Clock}
                            variant="warning"
                        />
                        <StatCard
                            title="Rejected"
                            value={stats?.rejected || 0}
                            icon={XCircle}
                            variant="danger"
                        />
                    </div>
                </div>

                {/* Main Info */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Personal Information */}
                    <section>
                        <div className="px-2">
                            <h2 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <User size={14} className="mr-2" /> Personal Information
                            </h2>
                        </div>
                        <Card>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {profileData.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-3xl bg-background border border-border group hover:border-primary/30 transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-text/20 group-hover:text-primary transition-colors">
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">{item.label}</p>
                                            <p className="text-sm font-black text-text">{item.value || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>

                    {/* Academic Information */}
                    <section>
                        <div className="px-2">
                            <h2 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <School size={14} className="mr-2" /> Academic Details
                            </h2>
                        </div>
                        <Card>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {academicData.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-3xl bg-background border border-border group hover:border-primary/30 transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-text/20 group-hover:text-primary transition-colors">
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">{item.label}</p>
                                            <p className="text-sm font-black text-text">{item.value || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </section>

                    {/* Quick Support */}
                    <section>
                        <div className="bg-primary/5 rounded-[32px] border-2 border-primary/10 border-dashed p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <Info size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-text">Need to update info?</h4>
                                    <p className="text-xs text-text/40 font-medium">Please contact the Hostel Office for any corrections.</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = 'mailto:hostel@college.edu'}
                            >
                                Contact Office
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
        </motion.div>
    );
};

export default StudentProfile;
