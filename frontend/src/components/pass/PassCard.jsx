import { 
    Calendar, 
    Clock, 
    MapPin, 
    Download, 
    Eye, 
    XCircle,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDateTime } from '../../utils/helpers';
import Badge from '../common/Badge';
import Button from '../common/Button';

const PassCard = ({ pass, onView, onCancel, onDownload, downloading }) => {
    const canCancel = ['PENDING', 'IN_APPROVAL', 'FINAL_APPROVED', 'APPROVED', 'PENDING_CLASS_COORDINATOR', 'PENDING_HOSTEL_OFFICE'].includes(pass.current_status);
    const canDownload = ['FINAL_APPROVED', 'APPROVED'].includes(pass.current_status);

    const displayId = pass?.id ? String(pass.id) : 'N/A';

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-xl transition-all group"
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-black text-text group-hover:text-primary transition-colors">{pass.pass_type_name}</h3>
                    <p className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em] mt-1">REF #{displayId}</p>
                </div>
                <Badge status={pass.current_status} />
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-text/20">
                        <ArrowUpRight size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Departure</p>
                        <p className="text-sm font-bold text-text/70">{formatDateTime(pass.from_datetime)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-text/20">
                        <ArrowDownLeft size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Expected Return</p>
                        <p className="text-sm font-bold text-text/70">{formatDateTime(pass.to_datetime)}</p>
                    </div>
                </div>
                {pass.destination && (
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-text/20">
                            <MapPin size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Destination</p>
                            <p className="text-sm font-bold text-text/70 truncate">{pass.destination}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl font-bold text-[10px] uppercase tracking-widest h-10"
                    onClick={() => onView(pass)}
                >
                    <Eye size={14} className="mr-2" />
                    Details
                </Button>
                
                {canDownload && (
                    <Button
                        variant="primary"
                        size="sm"
                        className="rounded-xl h-10 w-10 flex items-center justify-center p-0 shadow-lg shadow-primary/20"
                        onClick={() => onDownload(pass.id)}
                        loading={downloading}
                    >
                        <Download size={16} />
                    </Button>
                )}

                {canCancel && (
                    <button
                        onClick={() => onCancel(pass.id)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-danger/5 text-danger border border-danger/10 hover:bg-danger/10 transition-colors"
                        title="Cancel Pass"
                    >
                        <XCircle size={18} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default PassCard;