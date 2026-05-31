import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiBook, FiLock, FiArrowRight, FiArrowLeft, FiCheck, FiShield } from 'react-icons/fi';
import api from '../services/api';
import { handleError } from '../utils/helpers';

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        full_name: '',
        usn: '',
        branch: '',
        year: '',
        section: '',
        mobile: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const branches = ['CSE', 'CSBS', 'AIDS'];
    const years = [1, 2, 3, 4];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => {
        if (step === 1 && (!formData.full_name || !formData.usn || !formData.mobile)) {
            return toast.error('Please fill all personal details');
        }
        if (step === 2 && (!formData.branch || !formData.year || !formData.section)) {
            return toast.error('Please fill all academic details');
        }
        setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (formData.password.length < 8) {
            return toast.error('Password must be at least 8 characters long');
        }
        if (formData.password !== formData.confirmPassword) {
            return toast.error('Passwords do not match');
        }

        setLoading(true);
        try {
            await api.post('/auth/register', {
                full_name: formData.full_name,
                usn: formData.usn.toUpperCase(),
                branch: formData.branch,
                year: parseInt(formData.year),
                section: formData.section.toUpperCase(),
                mobile: formData.mobile,
                password: formData.password
            });
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (error) {
            toast.error(handleError(error));
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: 'Personal', icon: <FiUser /> },
        { id: 2, title: 'Academic', icon: <FiBook /> },
        { id: 3, title: 'Security', icon: <FiLock /> },
    ];

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-100/50 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-100/50 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl relative z-10"
            >
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6 shadow-lg shadow-blue-100"
                    >
                        <FiShield className="text-white text-3xl" />
                    </motion.div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">Student Registration</h2>
                    <p className="text-slate-500">Create your official student account</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-[24px] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="flex justify-between mb-12 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                        <motion.div
                            className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0"
                            animate={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                        />
                        {steps.map((s) => (
                            <div key={s.id} className="relative z-10 flex flex-col items-center">
                                <motion.div
                                    animate={{
                                        backgroundColor: step >= s.id ? '#2563eb' : '#f8fafc',
                                        scale: step === s.id ? 1.1 : 1,
                                        borderColor: step >= s.id ? '#2563eb' : '#e2e8f0'
                                    }}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${step >= s.id ? 'text-white' : 'text-slate-400'} border transition-colors shadow-sm`}
                                >
                                    {step > s.id ? <FiCheck /> : s.icon}
                                </motion.div>
                                <span className={`text-xs mt-2 font-bold ${step >= s.id ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {s.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 ml-1">USN</label>
                                            <input
                                                type="text"
                                                name="usn"
                                                value={formData.usn}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                                placeholder="1RV23CS001"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 ml-1">Mobile</label>
                                            <input
                                                type="text"
                                                name="mobile"
                                                value={formData.mobile}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                                placeholder="9876543210"
                                                required
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 ml-1">Branch</label>
                                            <select
                                                name="branch"
                                                value={formData.branch}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all appearance-none"
                                                required
                                            >
                                                <option value="">Select Branch</option>
                                                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 ml-1">Year</label>
                                            <select
                                                name="year"
                                                value={formData.year}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all appearance-none"
                                                required
                                            >
                                                <option value="">Select Year</option>
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Section</label>
                                        <input
                                            type="text"
                                            name="section"
                                            value={formData.section}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                            placeholder="A"
                                            required
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700 ml-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex gap-4 pt-4">
                            {step > 1 && (
                                <motion.button
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="button"
                                    onClick={prevStep}
                                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <FiArrowLeft /> Back
                                </motion.button>
                            )}
                            {step < 3 ? (
                                <motion.button
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                >
                                    Continue <FiArrowRight />
                                </motion.button>
                            ) : (
                                <motion.button
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Create Account <FiCheck /></>
                                    )}
                                </motion.button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-bold"
                    >
                        Already have an account? Sign In
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
