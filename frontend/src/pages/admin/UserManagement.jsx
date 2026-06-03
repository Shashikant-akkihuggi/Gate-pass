import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    UserX,
    UserCheck,
    Trash2,
    Key,
    Plus,
    Shield,
    Briefcase,
    Activity,
    ChevronLeft,
    ChevronRight,
    Download,
    XCircle,
    User
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const UserManagement = () => {
    const [activeTab, setActiveTab] = useState('STUDENT');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState({ branch: '', year: '' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [userHistory, setUserHistory] = useState({ passes: [], extensions: [], scans: [] });
    const [formData, setFormData] = useState({
        full_name: '',
        first_name: '',
        last_name: '',
        email: '',
        mobile_number: '',
        department: '',
        password: ''
    });

    const tabs = [
        { id: 'STUDENT', label: 'Students', icon: Users },
        { id: 'CLASS_COORDINATOR', label: 'Coordinators', icon: Shield },
        { id: 'HOSTEL_OFFICE', label: 'Hostel Office', icon: Briefcase },
        { id: 'WATCHMAN', label: 'Watchmen', icon: Activity },
    ];

    useEffect(() => {
        fetchUsers();
    }, [activeTab, search, filter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = {
                search,
                ...filter
            };
            const res = await api.get(`/admin/users/${activeTab}`, { params });
            setUsers(res.data.data);
        } catch (err) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'CLASS_COORDINATOR') {
                await api.post('/admin/coordinators', formData);
            } else {
                await api.post('/admin/staff', { ...formData, role: activeTab });
            }
            toast.success(`${activeTab.replace(/_/g, ' ')} added successfully`);
            setShowAddModal(false);
            setFormData({ full_name: '', first_name: '', last_name: '', email: '', mobile_number: '', department: '', password: '' });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add user');
        }
    };

    const handleStatusChange = async (userId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await api.post('/admin/user-status', { role: activeTab, id: userId, status: newStatus });
            toast.success(`User ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'} successfully`);
            fetchUsers();
        } catch (err) {
            toast.error('Failed to update user status');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.post('/admin/delete-user', { role: activeTab, id: userId });
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (err) {
            toast.error('Failed to delete user');
        }
    };

    const handleResetPassword = async (userId) => {
        const newPassword = window.prompt('Enter new password:');
        if (!newPassword) return;
        try {
            await api.post('/admin/reset-password', { role: activeTab, id: userId, newPassword });
            toast.success('Password reset successfully');
        } catch (err) {
            toast.error('Failed to reset password');
        }
    };

    const handleViewDetails = async (user) => {
        setSelectedUser(user);
        setShowDetailsModal(true);
        if (activeTab === 'STUDENT') {
            try {
                // Fetch student history (passes, extensions, scans)
                // We'll use existing admin passes endpoint with student_id filter
                const res = await api.get('/admin/passes', { params: { search: user.usn } });
                setUserHistory({ passes: res.data.data, extensions: [], scans: [] });
            } catch (err) {
                console.error('Failed to fetch student history:', err);
            }
        }
    };

    const handleExport = () => {
        window.location.href = `${api.defaults.baseURL}/admin/reports/students/export?format=excel&branch=${filter.branch}&year=${filter.year}`;
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage all system users and their permissions</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'STUDENT' && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            Export Excel
                        </button>
                    )}
                    {(activeTab !== 'STUDENT') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Add {activeTab.replace(/_/g, ' ')}
                        </button>
                    )}
                </div>
            </div>

            {/* User Details Modal */}
            <AnimatePresence>
                {showDetailsModal && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-xl font-bold text-slate-900">User Profile: {selectedUser.full_name || selectedUser.username}</h2>
                                <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-900 border-b pb-2">Basic Information</h3>
                                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                                            <span className="text-slate-500">Full Name:</span>
                                            <span className="font-medium">{selectedUser.full_name || 'N/A'}</span>
                                            <span className="text-slate-500">Email:</span>
                                            <span className="font-medium">{selectedUser.email || 'N/A'}</span>
                                            <span className="text-slate-500">Mobile:</span>
                                            <span className="font-medium">{selectedUser.mobile_number || selectedUser.mobile || 'N/A'}</span>
                                            <span className="text-slate-500">Status:</span>
                                            <span className={`font-bold ${selectedUser.status === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedUser.status}</span>
                                        </div>
                                    </div>
                                    {activeTab === 'STUDENT' && (
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-slate-900 border-b pb-2">Academic Details</h3>
                                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                                <span className="text-slate-500">USN:</span>
                                                <span className="font-mono font-bold text-blue-600">{selectedUser.usn}</span>
                                                <span className="text-slate-500">Department:</span>
                                                <span className="font-medium">{selectedUser.branch}</span>
                                                <span className="text-slate-500">Year / Section:</span>
                                                <span className="font-medium">{selectedUser.year} / {selectedUser.section}</span>
                                                <span className="text-slate-500">Coordinator:</span>
                                                <span className="font-medium">{selectedUser.coordinator_name || 'Not assigned'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {activeTab === 'STUDENT' && (
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-slate-900 border-b pb-2">Pass History</h3>
                                        <div className="overflow-hidden border border-slate-100 rounded-xl">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-4 py-3 font-bold text-slate-600">Type</th>
                                                        <th className="px-4 py-3 font-bold text-slate-600">Destination</th>
                                                        <th className="px-4 py-3 font-bold text-slate-600">Date</th>
                                                        <th className="px-4 py-3 font-bold text-slate-600">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {userHistory.passes.length === 0 ? (
                                                        <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400">No pass records found</td></tr>
                                                    ) : userHistory.passes.map(pass => (
                                                        <tr key={pass.id}>
                                                            <td className="px-4 py-3">{pass.pass_type_name}</td>
                                                            <td className="px-4 py-3">{pass.destination}</td>
                                                            <td className="px-4 py-3">{new Date(pass.from_datetime).toLocaleDateString()}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pass.current_status === 'FINAL_APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                                    pass.current_status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                                                        'bg-slate-100 text-slate-600'
                                                                    }`}>
                                                                    {pass.current_status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add User Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-900">Add {activeTab.replace(/_/g, ' ')}</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleAddUser} className="p-8 space-y-4">
                                {activeTab === 'CLASS_COORDINATOR' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="e.g. Dr. Ramesh Kumar"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                                            <select
                                                required
                                                value={formData.department}
                                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="">Select Dept</option>
                                                {['CSE', 'CSBS', 'AIDS', 'ECE', 'MECH', 'MBA', 'MCA'].map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.mobile_number}
                                                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="10-digit mobile"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.first_name}
                                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.last_name}
                                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                            <input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.mobile_number}
                                                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-1 pb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                                    <input
                                        required
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                                    >
                                        Create User
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setFilter({ branch: '', year: '' });
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === tab.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, USN, or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                {activeTab === 'STUDENT' && (
                    <>
                        <select
                            value={filter.branch}
                            onChange={(e) => setFilter({ ...filter, branch: e.target.value })}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">All Departments</option>
                            {['CSE', 'CSBS', 'AIDS', 'ECE', 'MECH', 'MBA', 'MCA'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select
                            value={filter.year}
                            onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">All Years</option>
                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                        </select>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700">Name</th>
                                <th className="px-6 py-4 font-bold text-slate-700">
                                    {activeTab === 'STUDENT' ? 'USN / Details' : 'Contact / Role'}
                                </th>
                                <th className="px-6 py-4 font-bold text-slate-700">Department</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-bold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No users found</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                {(user.full_name || user.first_name || user.username || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{user.full_name || `${user.first_name || ''} ${user.last_name || ''}` || user.username}</p>
                                                <p className="text-xs text-slate-500">{user.email || user.mobile_number}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {activeTab === 'STUDENT' ? (
                                            <div>
                                                <p className="font-mono font-bold text-blue-600">{user.usn}</p>
                                                <p className="text-xs text-slate-500">Year {user.year} - Section {user.section}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-slate-700 font-medium">{user.role || activeTab.replace(/_/g, ' ')}</p>
                                                <p className="text-xs text-slate-500">{user.mobile_number || 'N/A'}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                            {user.branch || user.department || 'All'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewDetails(user)}
                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                title="View Details"
                                            >
                                                <User className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user.id)}
                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Reset Password"
                                            >
                                                <Key className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(user.id, user.status)}
                                                className={`p-2 transition-colors ${user.status === 'ACTIVE' ? 'text-slate-400 hover:text-orange-600' : 'text-slate-400 hover:text-emerald-600'}`}
                                                title={user.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                            >
                                                {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
