import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import {
    FiLogOut, FiLogIn, FiClock, FiAlertTriangle,
    FiSearch, FiRefreshCw, FiList, FiUsers, FiCamera, FiX, FiFileText, FiDownload
} from 'react-icons/fi';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';
import { formatDateTime, downloadFile } from '../../utils/helpers';

// ── helpers ───────────────────────────────────────────────────────────────────

const statusBadge = (status) => {
    const map = {
        FINAL_APPROVED: 'bg-blue-100 text-blue-700',
        APPROVED: 'bg-blue-100 text-blue-700',
        PENDING_CLASS_COORDINATOR: 'bg-yellow-100 text-yellow-700',
        PENDING_HOSTEL_OFFICE: 'bg-blue-100 text-blue-700',
        EXITED: 'bg-orange-100 text-orange-700',
        OUTSIDE: 'bg-orange-100 text-orange-700',
        RETURNED: 'bg-green-100 text-green-700',
        COMPLETED: 'bg-green-100 text-green-700',
        LATE_RETURN: 'bg-red-100 text-red-700',
        COMPLETED_LATE: 'bg-red-100 text-red-700',
        IN_APPROVAL: 'bg-yellow-100 text-yellow-700',
        REJECTED: 'bg-gray-100 text-gray-600',
        EXTENSION_PENDING: 'bg-yellow-100 text-yellow-700',
        EXTENDED: 'bg-blue-100 text-blue-700',
    };
    const cls = map[status] || 'bg-gray-100 text-gray-600';
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
};

const Countdown = ({ toDatetime }) => {
    const calc = () => {
        const diff = new Date(toDatetime) - new Date();
        if (diff <= 0) return { label: 'OVERDUE', overdue: true };
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return { label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, overdue: false };
    };
    const [tick, setTick] = useState(calc());
    useEffect(() => {
        const id = setInterval(() => setTick(calc()), 1000);
        return () => clearInterval(id);
    });
    return (
        <span className={`font-mono text-sm font-bold ${tick.overdue ? 'text-red-600' : 'text-orange-600'}`}>
            {tick.label}
        </span>
    );
};

// ── Scan panel ────────────────────────────────────────────────────────────────

const ScanPanel = ({ onSuccess }) => {
    const [input, setInput] = useState('');
    const [gateLocation, setGateLocation] = useState('Main Gate');
    const [remarks, setRemarks] = useState('');
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const scannerRef = useRef(null);

    const handleLookup = async (idOrUsn) => {
        const identifier = idOrUsn || input.trim();
        if (!identifier) { toast.error('Enter USN or Pass ID'); return; }
        setLoading(true);
        try {
            const res = await api.get(`/scan/lookup/${identifier}`);
            setPreview(res.data.data);
            if (idOrUsn) setInput(identifier);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Pass not found');
            setPreview(null);
        } finally {
            setLoading(false);
        }
    };

    const startScanner = () => {
        setShowScanner(true);
        setPreview(null);
        setTimeout(() => {
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    try {
                        const data = JSON.parse(decodedText);
                        // Prioritize USN from payload, fallback to passId
                        const identifier = data.usn || data.rollNumber || data.passId;
                        if (identifier) {
                            stopScanner();
                            handleLookup(identifier);
                        } else {
                            toast.error("Invalid QR Code: Missing USN or Pass ID");
                        }
                    } catch (e) {
                        // If not JSON, try as raw ID/USN
                        stopScanner();
                        handleLookup(decodedText);
                    }
                },
                (errorMessage) => {
                    // ignore errors
                }
            ).catch((err) => {
                console.error("Scanner start error:", err);
                toast.error("Camera access failed");
                setShowScanner(false);
            });
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current.clear();
                scannerRef.current = null;
            }).catch(err => console.error("Scanner stop error:", err));
        }
        setShowScanner(false);
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    const handleScanAction = async (action) => {
        setScanning(true);
        try {
            const body = {
                gateLocation,
                remarks: remarks || undefined,
            };
            // USN is the primary identifier now
            body.identifier = input.trim();

            const endpoint = action === 'exit' ? '/scan/exit' : '/scan/entry';
            const res = await api.post(endpoint, body);
            toast.success(res.data.message);
            setInput('');
            setPreview(null);
            setRemarks('');
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Scan failed');
        } finally {
            setScanning(false);
        }
    };

    const canExit = ['FINAL_APPROVED', 'APPROVED'].includes(preview?.current_status);
    const canEntry = ['EXITED', 'OUTSIDE', 'EXTENDED', 'EXTENSION_PENDING'].includes(preview?.current_status);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Scan / Enter USN</h2>
                {!showScanner ? (
                    <button
                        onClick={startScanner}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 bg-primary-50 rounded-lg transition-colors"
                    >
                        <FiCamera className="h-4 w-4" />
                        Scan with Camera
                    </button>
                ) : (
                    <button
                        onClick={stopScanner}
                        className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg transition-colors"
                    >
                        <FiX className="h-4 w-4" />
                        Stop Scanner
                    </button>
                )}
            </div>

            {showScanner && (
                <div className="relative bg-black rounded-xl overflow-hidden aspect-square max-w-sm mx-auto border-4 border-primary-500">
                    <div id="reader" className="w-full h-full"></div>
                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/30">
                        <div className="w-full h-full border-2 border-primary-500 rounded-lg"></div>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                    placeholder="Enter USN (Primary) or Pass ID"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                    onClick={() => handleLookup()}
                    disabled={loading}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                >
                    <FiSearch className="h-4 w-4" />
                    {loading ? 'Looking…' : 'Lookup'}
                </button>
            </div>

            {/* Gate location */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Gate Location</label>
                    <select
                        value={gateLocation}
                        onChange={e => setGateLocation(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {['Main Gate', 'Side Gate', 'Back Gate', 'Emergency Gate'].map(g => (
                            <option key={g}>{g}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Remarks (optional)</label>
                    <input
                        type="text"
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="Any notes"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Preview */}
            {preview && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-900">
                                {preview.student_name}
                            </p>
                            <p className="text-sm text-gray-500">{preview.roll_number} · {preview.pass_type_name}</p>
                        </div>
                        {statusBadge(preview.current_status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Pass Type:</span> <span className="font-medium">{preview.pass_type_name}</span></div>
                        <div><span className="text-gray-500">Destination:</span> <span className="font-medium">{preview.destination || '—'}</span></div>
                        <div><span className="text-gray-500">Valid From:</span> <span className="font-medium">{formatDateTime(preview.from_datetime)}</span></div>
                        <div><span className="text-gray-500">Valid Until:</span> <span className="font-medium">{formatDateTime(preview.to_datetime)}</span></div>
                        {preview.exit_scan_at && <div><span className="text-gray-500">Exited:</span> <span className="font-medium">{formatDateTime(preview.exit_scan_at)}</span></div>}
                    </div>

                    <div className="flex gap-2 pt-1">
                        {canExit && (
                            <button
                                onClick={() => handleScanAction('exit')}
                                disabled={scanning}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50"
                            >
                                <FiLogOut className="h-4 w-4" />
                                {scanning ? 'Recording…' : 'Record EXIT'}
                            </button>
                        )}
                        {canEntry && (
                            <button
                                onClick={() => handleScanAction('entry')}
                                disabled={scanning}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <FiLogIn className="h-4 w-4" />
                                {scanning ? 'Recording…' : 'Record ENTRY'}
                            </button>
                        )}
                        {!canExit && !canEntry && (
                            <p className="text-sm text-gray-500 py-2">
                                {['RETURNED', 'LATE_RETURN', 'COMPLETED', 'COMPLETED_LATE'].includes(preview.current_status)
                                    ? 'Pass completed — no further action needed.'
                                    : 'Pass is not in a scannable state.'}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

const ScanQR = () => {
    const [tab, setTab] = useState('scan');
    const [dashboard, setDashboard] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingDash, setLoadingDash] = useState(true);
    const [downloadingProfile, setDownloadingProfile] = useState(null);

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await api.get('/scan/dashboard');
            setDashboard(res.data.data);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoadingDash(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get('/scan/history?limit=30');
            setHistory(res.data.data || []);
        } catch (err) {
            console.error('History fetch error:', err);
        }
    }, []);

    const handleDownloadProfile = async (studentId, usn) => {
        try {
            setDownloadingProfile(studentId);
            const response = await api.get(`/scan/student/${studentId}/profile-pdf`, {
                responseType: 'blob'
            });
            downloadFile(response.data, `Student_Profile_${usn}.pdf`);
            toast.success('Student profile downloaded');
        } catch (error) {
            toast.error('Failed to download student profile');
        } finally {
            setDownloadingProfile(null);
        }
    };

    useEffect(() => {
        fetchDashboard();
        fetchHistory();
        const id = setInterval(fetchDashboard, 30000); // refresh every 30s
        return () => clearInterval(id);
    }, [fetchDashboard, fetchHistory]);

    const handleScanSuccess = () => {
        fetchDashboard();
        fetchHistory();
    };

    const stats = dashboard?.stats || {};

    const studentsOutside = dashboard?.studentsOutside || [];
    const onTimeOutside = studentsOutside.filter(p => new Date(p.to_datetime) >= new Date());
    const lateReturns = studentsOutside.filter(p => new Date(p.to_datetime) < new Date());

    const tabs = [
        { id: 'scan', label: 'Scan', icon: FiSearch },
        { id: 'pending', label: `Pending Exits (${stats.pending_exits || 0})`, icon: FiClock },
        { id: 'outside', label: `Outside (${onTimeOutside.length || 0})`, icon: FiUsers },
        { id: 'late', label: `Late Returns (${lateReturns.length || 0})`, icon: FiAlertTriangle },
        { id: 'returns', label: 'Returned Today', icon: FiLogIn },
        { id: 'history', label: 'Scan History', icon: FiList },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Watchman Dashboard</h1>
                <button
                    onClick={() => { fetchDashboard(); fetchHistory(); }}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                    <FiRefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Pending Exits', value: stats.pending_exits || 0, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                    { label: 'Outside Now', value: stats.outside_count || 0, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                    { label: 'Returned Today', value: stats.returned_today || 0, color: 'bg-green-50 border-green-200 text-green-700' },
                    { label: 'Late Returns', value: stats.late_today || 0, color: 'bg-red-50 border-red-200 text-red-700' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                        <p className="text-3xl font-bold mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'scan' && <ScanPanel onSuccess={handleScanSuccess} />}

            {tab === 'pending' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Students with Final Approved Passes (Pending Exit)</h2>
                    </div>
                    {!dashboard?.pendingExits?.length ? (
                        <p className="text-center py-10 text-gray-400">No pending exits</p>
                    ) : (
                        <table className="min-w-full text-sm divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Pass ID', 'Student', 'USN', 'Pass Type', 'Destination', 'Valid Until'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {dashboard.pendingExits.map(p => (
                                    <tr key={p.pass_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-700">#{p.pass_id}</td>
                                        <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.roll_number}</td>
                                        <td className="px-4 py-3">{p.pass_type_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.destination || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(p.to_datetime)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'outside' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Students Currently Outside (On Time)</h2>
                    </div>
                    {!onTimeOutside.length ? (
                        <p className="text-center py-10 text-gray-400">No students currently outside on time</p>
                    ) : (
                        <table className="min-w-full text-sm divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Pass ID', 'Student', 'USN', 'Dept', 'Exit Time', 'Expected Return', 'Remaining', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {onTimeOutside.map(p => (
                                    <tr key={p.pass_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-700">#{p.pass_id}</td>
                                        <td className="px-4 py-3 font-medium">{p.student_name}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDownloadProfile(p.student_id, p.roll_number)}
                                                className="text-primary-600 hover:underline font-mono"
                                            >
                                                {p.roll_number}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{p.department}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(p.exit_scan_at)}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(p.to_datetime)}</td>
                                        <td className="px-4 py-3"><Countdown toDatetime={p.to_datetime} /></td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDownloadProfile(p.student_id, p.roll_number)}
                                                disabled={downloadingProfile === p.student_id}
                                                className="text-gray-500 hover:text-primary-600 flex items-center gap-1"
                                                title="View Student Profile"
                                            >
                                                <FiFileText />
                                                <span className="sr-only">Profile</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'late' && (
                <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-100 bg-red-50">
                        <h2 className="font-semibold text-red-900 flex items-center gap-2">
                            <FiAlertTriangle className="text-red-600" />
                            Late Returns
                        </h2>
                    </div>
                    {!lateReturns.length ? (
                        <p className="text-center py-10 text-gray-400">No late returns currently</p>
                    ) : (
                        <table className="min-w-full text-sm divide-y divide-red-100">
                            <thead className="bg-red-50">
                                <tr>
                                    {['Pass ID', 'Student', 'USN', 'Dept', 'Exit Time', 'Expected Return', 'Delay', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-50">
                                {lateReturns.map(p => (
                                    <tr key={p.pass_id} className="bg-red-50 hover:bg-red-100 transition-colors">
                                        <td className="px-4 py-3 font-mono text-red-900 font-bold">#{p.pass_id}</td>
                                        <td className="px-4 py-3 font-bold text-red-900">{p.student_name}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDownloadProfile(p.student_id, p.roll_number)}
                                                className="text-red-700 hover:underline font-mono font-bold"
                                            >
                                                {p.roll_number}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-red-800">{p.department}</td>
                                        <td className="px-4 py-3 text-red-800">{formatDateTime(p.exit_scan_at)}</td>
                                        <td className="px-4 py-3 text-red-800">{formatDateTime(p.to_datetime)}</td>
                                        <td className="px-4 py-3"><Countdown toDatetime={p.to_datetime} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDownloadProfile(p.student_id, p.roll_number)}
                                                    disabled={downloadingProfile === p.student_id}
                                                    className="p-1.5 bg-white border border-red-200 rounded text-red-600 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold shadow-sm"
                                                    title="View Profile"
                                                >
                                                    <FiDownload />
                                                    View Profile
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'returns' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Returned Today</h2>
                    </div>
                    {!dashboard?.recentReturns?.length ? (
                        <p className="text-center py-10 text-gray-400">No returns today</p>
                    ) : (
                        <table className="min-w-full text-sm divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Pass ID', 'Student', 'USN', 'Exited', 'Returned', 'Status', 'Late (min)'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {dashboard.recentReturns.map(p => (
                                    <tr key={p.pass_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-700">#{p.pass_id}</td>
                                        <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.roll_number}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(p.exit_scan_at)}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(p.return_scan_at)}</td>
                                        <td className="px-4 py-3">{statusBadge(p.current_status)}</td>
                                        <td className="px-4 py-3">
                                            {p.late_minutes > 0
                                                ? <span className="text-red-600 font-semibold">{p.late_minutes}</span>
                                                : <span className="text-green-600">On time</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Scan History (Last 30)</h2>
                    </div>
                    {!history.length ? (
                        <p className="text-center py-10 text-gray-400">No scan history</p>
                    ) : (
                        <table className="min-w-full text-sm divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Action', 'Student', 'USN', 'Pass Type', 'Scan Time', 'Gate', 'Late (min)'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {history.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${log.action_type === 'EXIT'
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {log.action_type === 'EXIT' ? <FiLogOut className="h-3 w-3" /> : <FiLogIn className="h-3 w-3" />}
                                                {log.action_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">{log.first_name} {log.last_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{log.roll_number}</td>
                                        <td className="px-4 py-3 text-gray-600">{log.pass_type_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{formatDateTime(log.scan_time)}</td>
                                        <td className="px-4 py-3 text-gray-600">{log.gate_location || '—'}</td>
                                        <td className="px-4 py-3">
                                            {log.is_late
                                                ? <span className="text-red-600 font-semibold">{log.late_minutes}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScanQR;
