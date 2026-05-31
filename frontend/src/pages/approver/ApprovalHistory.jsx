import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { approvalService } from '../../services/approvalService';
import { formatDateTime, handleError } from '../../utils/helpers';

const ApprovalHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchHistory();
    }, [filter]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const filters = filter ? { status: filter } : {};
            const response = await approvalService.getApprovalHistory(filters);

            console.log('Approval history response:', response);

            // Safely extract history array
            const records = response.data?.history || [];
            console.log('History records:', records.length, records);

            setHistory(Array.isArray(records) ? records : []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            toast.error(handleError(error));
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Approval History</h1>

                {/* Filter */}
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">All</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {history.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No history found</h3>
                        <p className="text-gray-600">Approvals you take action on will appear here.</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {history.map((record) => (
                        <Card key={record.approval_id}>
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="flex-1">
                                    {/* Student & Status */}
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-base font-semibold text-gray-900">
                                            {record.first_name} {record.last_name}
                                            <span className="ml-2 text-sm font-normal text-gray-500">
                                                ({record.roll_number})
                                            </span>
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {record.approval_status === 'APPROVED' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <FiCheckCircle className="h-3 w-3" />
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    <FiXCircle className="h-3 w-3" />
                                                    Rejected
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pass Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <span className="text-gray-500">Pass ID</span>
                                            <p className="font-medium text-gray-900">#{record.pass_id}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Pass Type</span>
                                            <p className="font-medium text-gray-900">{record.pass_type_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Pass Status</span>
                                            <p className="font-medium text-gray-900">
                                                {record.pass_status?.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">From</span>
                                            <p className="font-medium text-gray-900">{formatDateTime(record.from_datetime)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">To</span>
                                            <p className="font-medium text-gray-900">{formatDateTime(record.to_datetime)}</p>
                                        </div>
                                        {record.destination && (
                                            <div>
                                                <span className="text-gray-500">Destination</span>
                                                <p className="font-medium text-gray-900">{record.destination}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-500">Action Taken</span>
                                            <p className="font-medium text-gray-900">
                                                {record.action_taken_at
                                                    ? formatDateTime(record.action_taken_at)
                                                    : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Class</span>
                                            <p className="font-medium text-gray-900">{record.class_name}</p>
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    {record.remarks && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                                            <span className="text-gray-500 font-medium">Remarks: </span>
                                            <span className="text-gray-700">{record.remarks}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApprovalHistory;
