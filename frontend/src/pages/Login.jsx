import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiLock, FiCheckCircle, FiShield, FiClock, FiActivity, FiMapPin } from 'react-icons/fi';
import { handleError } from '../utils/helpers';

const Login = () => {
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(formData.identifier, formData.password);
            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(handleError(error));
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: <FiActivity className="text-blue-400" />, text: "QR Based Entry" },
        { icon: <FiClock className="text-indigo-400" />, text: "Real Time Tracking" },
        { icon: <FiShield className="text-purple-400" />, text: "Student Verification" },
        { icon: <FiCheckCircle className="text-emerald-400" />, text: "Coordinator Approval" },
        { icon: <FiMapPin className="text-rose-400" />, text: "Hostel Office Monitoring" },
    ];

    return (
        <div className="min-h-screen w-full flex overflow-hidden bg-slate-50">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/50 blur-[100px] rounded-full"
                />
                <motion.div 
                    animate={{
                        x: [0, -50, 0],
                        y: [0, 50, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-100/50 blur-[100px] rounded-full"
                />
            </div>

            {/* Left Side - Hero Section (60%) */}
            <div className="hidden lg:flex lg:w-[60%] relative flex-col items-center justify-center p-12 overflow-hidden border-r border-slate-200">
                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
                            Hostel Gate Pass <br />
                            <span className="text-blue-600">
                                Management System
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-12">
                            A professional digital platform for modern educational institutions. 
                            Ensuring student safety and administrative efficiency through technology.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 * index }}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
                            >
                                <div className="p-3 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                                    {feature.icon}
                                </div>
                                <span className="text-slate-700 font-medium">{feature.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Floating Workflow Card */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-20 right-20 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl hidden xl:block"
                >
                    <p className="text-slate-900 font-bold text-sm mb-4">Approval Workflow</p>
                    <div className="flex flex-col gap-3">
                        {[
                            { role: 'Student', color: 'bg-blue-500' },
                            { role: 'Coordinator', color: 'bg-indigo-500' },
                            { role: 'Hostel Office', color: 'bg-purple-500' },
                            { role: 'Watchman', color: 'bg-emerald-500' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                <span className="text-slate-600 text-xs font-semibold">{item.role}</span>
                                {i < 3 && <div className="ml-auto w-4 h-[1px] bg-slate-100" />}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Login Form (40%) */}
            <div className="w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-md p-8 sm:p-10 rounded-[24px] bg-white border border-slate-200 shadow-2xl relative"
                >
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6 shadow-lg shadow-blue-200"
                        >
                            <FiShield className="text-white text-3xl" />
                        </motion.div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500">Sign in to manage your gate passes</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">USN / Mobile / Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <FiUser />
                                </div>
                                <input
                                    type="text"
                                    name="identifier"
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Enter USN or Email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-slate-700">Password</label>
                                <button type="button" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot password?</button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <FiLock />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-10 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="px-2 bg-white text-slate-400 font-medium tracking-wider">New to the platform?</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <motion.button
                                whileHover={{ bg: "#f8fafc" }}
                                onClick={() => navigate('/register')}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors shadow-sm"
                            >
                                Create Student Account
                            </motion.button>
                            <motion.button
                                whileHover={{ bg: "#f8fafc" }}
                                onClick={() => navigate('/register-coordinator')}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors shadow-sm"
                            >
                                Register as Coordinator
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
