import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { formatDateTime, downloadFile, handleError } from '../../utils/helpers';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    Download,
    ShieldCheck,
    FileText,
    Info,
    CheckCircle2,
    XCircle,
    ArrowRight
} from 'lucide-react';
import { passService } from '../../services/passService';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import { motion } from 'framer-motion';

const PassDetailsModal = ({ pass, isOpen, onClose }) => {
    const [downloading, setDownloading] = useState(false);

    if (!pass) return null;

    const showQR = ['FINAL_APPROVED', 'APPROVED', 'EXITED', 'OUTSIDE'].includes(pass.current_status) && pass.qr_code;

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
        <Modal isOpen={isOpen} onClose={onClose} title="Pass Details" size="lg">
            <div className="flex flex-col gap-10">

                {/* Top Section: Status & Type */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-text tracking-tight">{pass.pass_type_name}</h4>
                            <p className="text-sm font-bold text-text/30 uppercase tracking-[0.2em]">Reference #{pass.id}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge status={pass.current_status} className="px-4 py-1.5 text-xs" />
                        {showQR && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDownload}
                                loading={downloading}
                                className="rounded-xl shadow-lg shadow-primary/20"
                            >
                                <Download size={16} className="mr-2" />
                                Download Pass PDF
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left Side: Information */}
                    <div className="space-y-8">
                        {/* Student Information */}
                        <section>
                            <h5 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <User size={14} className="mr-2" /> Student Information
                            </h5>
                            <div className="bg-background rounded-3xl border border-border p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest mb-1">Full Name</p>
                                        <p className="text-sm font-bold text-text">{pass.student_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest mb-1">USN</p>
                                        <p className="text-sm font-bold text-text">{pass.usn || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Timing & Destination */}
                        <section>
                            <h5 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <Clock size={14} className="mr-2" /> Pass Logistics
                            </h5>
                            <div className="bg-background rounded-3xl border border-border overflow-hidden">
                                <div className="grid grid-cols-2 border-b border-border">
                                    <div className="p-5 border-r border-border">
                                        <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest mb-1">Departure</p>
                                        <p className="text-sm font-bold text-text">{formatDateTime(pass.from_datetime)}</p>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest mb-1">Expected Return</p>
                                        <p className="text-sm font-bold text-text">{formatDateTime(pass.to_datetime)}</p>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest mb-1">Destination</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-primary" />
                                        <p className="text-sm font-bold text-text">{pass.destination || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Reason */}
                        <section>
                            <h5 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <Info size={14} className="mr-2" /> Purpose
                            </h5>
                            <div className="bg-background rounded-3xl border border-border p-6">
                                <p className="text-sm font-medium text-text/70 leading-relaxed italic">
                                    "{pass.reason}"
                                </p>
                            </div>
                        </section>
                    </div>

                    {/* Right Side: QR & Timeline */}
                    <div className="space-y-8">
                        {/* QR Code Preview */}
                        <section>
                            <h5 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <ShieldCheck size={14} className="mr-2" /> Security Check
                            </h5>
                            {showQR ? (
                                <div className="bg-card rounded-3xl border-2 border-primary/20 p-8 flex flex-col items-center shadow-2xl shadow-primary/5">
                                    <div className="p-4 bg-white rounded-3xl shadow-lg border border-border">
                                        <img src={pass.qr_code} alt="Pass QR Code" className="w-48 h-48 md:w-56 md:h-56" />
                                    </div>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-6">Active Gate Pass</p>
                                    <p className="text-xs text-text/40 mt-2 text-center max-w-[200px]">Present this QR code to the watchman at the gate during exit and return.</p>
                                </div>
                            ) : (
                                <div className="bg-background rounded-3xl border border-border border-dashed p-12 flex flex-col items-center opacity-50 grayscale">
                                    <div className="w-20 h-20 bg-text/5 rounded-full flex items-center justify-center text-text/20 mb-4">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <p className="text-xs font-bold text-text/40 uppercase tracking-widest">QR Not Available</p>
                                    <p className="text-[10px] text-text/30 mt-1">Available once fully approved</p>
                                </div>
                            )}
                        </section>

                        {/* Approval Timeline */}
                        <section>
                            <h5 className="text-[10px] font-black text-text/30 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <CheckCircle2 size={14} className="mr-2" /> Approval Workflow
                            </h5>
                            <div className="space-y-4">
                                {pass.approvals && pass.approvals.length > 0 ? (
                                    pass.approvals.map((approval, index) => (
                                        <div key={approval.id} className="relative pl-8 pb-4 last:pb-0">
                                            {/* Line */}
                                            {index < pass.approvals.length - 1 && (
                                                <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border"></div>
                                            )}
                                            {/* Dot */}
                                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 shadow-sm transition-all ${approval.status === 'APPROVED' ? 'bg-success border-success text-white' :
                                                    approval.status === 'REJECTED' ? 'bg-danger border-danger text-white' :
                                                        'bg-background border-border text-text/20'
                                                }`}>
                                                {approval.status === 'APPROVED' ? <CheckCircle2 size={12} /> :
                                                    approval.status === 'REJECTED' ? <XCircle size={12} /> :
                                                        <Clock size={12} />}
                                            </div>

                                            <div className="bg-background rounded-2xl border border-border p-4 hover:border-primary/20 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-black text-text uppercase tracking-widest">
                                                            {approval.approver_role.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-text/40 mt-0.5">
                                                            {approval.status} {approval.approved_at && `• ${formatDateTime(approval.approved_at)}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {approval.remarks && (
                                                    <div className="mt-3 pt-3 border-t border-border/50">
                                                        <p className="text-xs text-text/60 italic font-medium leading-relaxed">
                                                            "{approval.remarks}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 bg-background rounded-3xl border border-border text-center">
                                        <p className="text-xs font-bold text-text/30 uppercase tracking-widest">Application Submitted</p>
                                        <p className="text-[10px] text-text/20 mt-1">Pending first stage approval</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PassDetailsModal;