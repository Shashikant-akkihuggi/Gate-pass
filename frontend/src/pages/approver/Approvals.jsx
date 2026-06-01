import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Textarea from '../../components/common/Textarea';
import StatCard from '../../components/dashboard/StatCard';
import { approvalService } from '../../services/approvalService';
import { formatDateTime, handleError } from '../../utils/helpers';

import { passService } from '../../services/passService';

const Approvals = () => {
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [pendingExtensions, setPendingExtensions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('passes'); // 'passes' or 'extensions'
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', item: null, isExtension: false });
    const [remarks, setRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [approvalsData, extensionsData, statsData] = await Promise.all([
                approvalService.getPendingApprovals(),
                passService.getPendingExtensions(),
                approvalService.getApprovalStats(),
            ]);

            setPendingApprovals(Array.isArray(approvalsData.data?.approvals) ? approvalsData.data.approvals : []);
            setPendingExtensions(Array.isArray(extensionsData.data) ? extensionsData.data : []);
            setStats(statsData.data);
        } catch (error) {
            toast.error(handleError(error));
            setPendingApprovals([]);
            setPendingExtensions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (type, item, isExtension = false) => {
        setActionModal({ isOpen: true, type, item, isExtension });
        setRemarks('');
    };

    const handleSubmitAction = async () => {
        if (actionModal.type === 'reject' && !remarks.trim()) {
            toast.error('Remarks are required for rejection');
            return;
        }

        setProcessing(true);
        try {
            if (actionModal.isExtension) {
                await passService.processExtensionApproval(actionModal.item.id, {
                    status: actionModal.type === 'approve' ? 'APPROVED' : 'REJECTED',
                    remarks
                });
                toast.success(`Extension ${actionModal.type}d successfully`);
            } else {
                if (actionModal.type === 'approve') {
                    await approvalService.approvePass(actionModal.item.pass_id, remarks);
                    toast.success('Pass approved successfully');
                } else {
                    await approvalService.rejectPass(actionModal.item.pass_id, remarks);
                    toast.success('Pass rejected successfully');
                }
            }

            setActionModal({ isOpen: false, type: '', item: null, isExtension: false });
            fetchData();
        } catch (error) {
            toast.error(handleError(error));
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Approvals Management</h1>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('passes')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'passes' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pass Requests ({pendingApprovals.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('extensions')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'extensions' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Extensions ({pendingExtensions.length})
                    </button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Pending"
                        value={stats.pending_count || 0}
                        icon={FiClock}
                        color="yellow"
                    />
                    <StatCard
                        title="Approved Today"
                        value={stats.approved_today || 0}
                        icon={FiCheckCircle}
                        color="green"
                    />
                    <StatCard
                        title="Rejected Today"
                        value={stats.rejected_today || 0}
                        icon={FiXCircle}
                        color="red"
                    />
                </div>
            )}

            {/* Approvals List */}
            {activeTab === 'passes' ? (
                pendingApprovals.length === 0 ? (
                    <Card>
                        <div className="text-center py-12">
                            <FiCheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending pass requests</h3>
                            <p className="text-gray-600">All caught up!</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {pendingApprovals.map((approval) => (
                            <Card key={approval.pass_id}>
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {approval.first_name} {approval.last_name}
                                            </h3>
                                            <Badge status={approval.current_status} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Roll Number:</span>
                                                <span className="ml-2 font-medium">{approval.roll_number}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Pass Type:</span>
                                                <span className="ml-2 font-medium">{approval.pass_type_name}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">From:</span>
                                                <span className="ml-2 font-medium">{formatDateTime(approval.from_datetime)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">To:</span>
                                                <span className="ml-2 font-medium">{formatDateTime(approval.to_datetime)}</span>
                                            </div>
                                        </div>

                                        {approval.destination && (
                                            <div className="mt-2 text-sm">
                                                <span className="text-gray-600">Destination:</span>
                                                <span className="ml-2">{approval.destination}</span>
                                            </div>
                                        )}

                                        <div className="mt-2 text-sm">
                                            <span className="text-gray-600">Reason:</span>
                                            <p className="mt-1 text-gray-900">{approval.reason}</p>
                                        </div>
                                    </div>

                                    <div className="flex lg:flex-col gap-2">
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleAction('approve', approval)}
                                        >
                                            <FiCheckCircle className="mr-2" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleAction('reject', approval)}
                                        >
                                            <FiXCircle className="mr-2" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            ) : (
                pendingExtensions.length === 0 ? (
                    <Card>
                        <div className="text-center py-12">
                            <FiCheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending extensions</h3>
                            <p className="text-gray-600">All caught up!</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {pendingExtensions.map((ext) => (
                            <Card key={ext.id}>
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {ext.student_name}
                                            </h3>
                                            <Badge status="EXTENSION_PENDING" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Roll Number:</span>
                                                <span className="ml-2 font-medium">{ext.usn}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Pass Type:</span>
                                                <span className="ml-2 font-medium">{ext.pass_type_name}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Current Return:</span>
                                                <span className="ml-2 font-medium">{formatDateTime(ext.current_to_datetime)}</span>
                                            </div>
                                            <div>
                                                <span className="text-primary font-bold">Extended Return:</span>
                                                <span className="ml-2 font-bold text-primary">{formatDateTime(ext.extended_to_datetime)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-sm">
                                            <span className="text-gray-600">Extension Reason:</span>
                                            <p className="mt-1 text-gray-900 italic">"{ext.reason}"</p>
                                        </div>
                                    </div>

                                    <div className="flex lg:flex-col gap-2">
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleAction('approve', ext, true)}
                                        >
                                            <FiCheckCircle className="mr-2" />
                                            Approve Ext.
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleAction('reject', ext, true)}
                                        >
                                            <FiXCircle className="mr-2" />
                                            Reject Ext.
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            )}

            {/* Action Modal */}
            <Modal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ isOpen: false, type: '', item: null, isExtension: false })}
                title={`${actionModal.type === 'approve' ? 'Approve' : 'Reject'} ${actionModal.isExtension ? 'Extension' : 'Pass'}`}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to {actionModal.type} this {actionModal.isExtension ? 'extension request' : 'pass request'}?
                    </p>

                    <Textarea
                        label="Remarks"
                        name="remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder={`Optional remarks for ${actionModal.type}...`}
                        required={actionModal.type === 'reject'}
                    />

                    <div className="flex gap-4">
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={() => setActionModal({ isOpen: false, type: '', item: null, isExtension: false })}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={actionModal.type === 'approve' ? 'success' : 'danger'}
                            fullWidth
                            onClick={handleSubmitAction}
                            loading={processing}
                        >
                            Confirm {actionModal.type}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Approvals;
