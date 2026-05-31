import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    Plus,
    Search,
    Filter,
    ArrowUpDown,
    FileText,
    Calendar,
    ChevronDown,
    RefreshCw,
    X,
    LayoutGrid,
    List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/common/Button';
import PassCard from '../../components/pass/PassCard';
import PassDetailsModal from '../../components/pass/PassDetailsModal';
import { passService } from '../../services/passService';
import { handleError, downloadFile } from '../../utils/helpers';
import { PASS_STATUS } from '../../utils/constants';

const MyPasses = () => {
    const [passes, setPasses] = useState([]);
    const [selectedPass, setSelectedPass] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const navigate = useNavigate();

    const fetchPasses = useCallback(async () => {
        try {
            setLoading(true);
            const filters = statusFilter ? { status: statusFilter } : {};
            const response = await passService.getMyPasses(filters);
            const passesData = response.data?.passes || [];
            setPasses(Array.isArray(passesData) ? passesData : []);
        } catch (error) {
            toast.error(handleError(error));
            setPasses([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchPasses();
    }, [fetchPasses]);

    const handleDownloadPass = async (passId) => {
        try {
            setDownloading(passId);
            const blob = await passService.downloadPassPDF(passId);
            downloadFile(blob, `GatePass_${passId}.pdf`);
            toast.success('Pass downloaded successfully');
        } catch (error) {
            toast.error(handleError(error));
        } finally {
            setDownloading(null);
        }
    };

    const handleCancelPass = async (passId) => {
        if (!window.confirm('Are you sure you want to cancel this pass?')) return;
        try {
            await passService.cancelPass(passId);
            toast.success('Pass cancelled successfully');
            fetchPasses();
        } catch (error) {
            toast.error(handleError(error));
        }
    };

    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'PENDING_CLASS_COORDINATOR', label: 'Pending' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'RETURNED', label: 'Returned' },
        { value: 'LATE_RETURN', label: 'Late Return' },
    ];

    const filteredAndSortedPasses = passes
        .filter(pass =>
            pass.pass_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pass.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(pass.id).includes(searchTerm)
        )
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            return 0;
        });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto space-y-8 pb-20"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text tracking-tight">My Gate Passes</h1>
                    <p className="text-text/50 font-medium mt-1">Track and manage your history of pass applications.</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => navigate('/passes/new')}
                    className="rounded-2xl shadow-xl shadow-primary/20 h-12 px-6"
                >
                    <Plus size={20} className="mr-2" />
                    Apply New Pass
                </Button>
            </div>

            {/* Toolbar */}
            <div className="bg-card rounded-3xl border border-border p-4 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                {/* Search */}
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by ID, type or destination..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text/30 hover:text-text"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-background border border-border rounded-2xl py-3 pl-10 pr-10 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text/30 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <ArrowUpDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none bg-background border border-border rounded-2xl py-3 pl-10 pr-10 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text/30 pointer-events-none" />
                    </div>

                    <div className="h-10 w-px bg-border mx-1 hidden md:block"></div>

                    <div className="flex bg-background border border-border rounded-2xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-text/30 hover:text-text'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-text/30 hover:text-text'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <button
                        onClick={fetchPasses}
                        disabled={loading}
                        className={`p-3 rounded-2xl bg-background border border-border text-text/50 hover:text-primary transition-all hover:border-primary/30 ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Passes Content */}
            {loading ? (
                <div className="flex flex-col justify-center items-center h-64">
                    <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black text-text/30 uppercase tracking-widest">Loading Passes...</p>
                </div>
            ) : filteredAndSortedPasses.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-3xl border border-border border-dashed p-24 text-center"
                >
                    <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="text-text/10" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-text mb-2">No passes found</h3>
                    <p className="text-text/40 text-sm max-w-sm mx-auto mb-8">
                        {searchTerm || statusFilter
                            ? "We couldn't find any passes matching your current filters. Try adjusting them."
                            : "You haven't applied for any gate passes yet. Once you do, they'll appear here."}
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        {(searchTerm || statusFilter) && (
                            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter(''); }}>
                                Clear Filters
                            </Button>
                        )}
                        <Button variant="primary" onClick={() => navigate('/passes/new')}>
                            <Plus size={18} className="mr-2" /> Apply Now
                        </Button>
                    </div>
                </motion.div>
            ) : (
                <div className={
                    viewMode === 'grid'
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "flex flex-col gap-4"
                }>
                    <AnimatePresence mode='popLayout'>
                        {filteredAndSortedPasses.map((pass, idx) => (
                            <motion.div
                                key={pass.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                            >
                                <PassCard
                                    pass={pass}
                                    onView={setSelectedPass}
                                    onCancel={handleCancelPass}
                                    onDownload={handleDownloadPass}
                                    downloading={downloading === pass.id}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Pass Details Modal */}
            <PassDetailsModal
                pass={selectedPass}
                isOpen={!!selectedPass}
                onClose={() => setSelectedPass(null)}
            />
        </motion.div>
    );
};

export default MyPasses;