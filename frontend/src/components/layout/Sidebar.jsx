import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    PlusCircle,
    Clock,
    CheckSquare,
    BarChart2,
    Users,
    Settings,
    LogOut,
    QrCode,
    User,
    Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();

    const getMenuItems = () => {
        const role = user?.role;

        const menuItems = {
            [ROLES.STUDENT]: [
                { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { path: '/passes', icon: FileText, label: 'My Passes' },
                { path: '/passes/new', icon: PlusCircle, label: 'New Pass' },
                { path: '/notifications', icon: Bell, label: 'Notifications' },
                { path: '/profile', icon: User, label: 'Profile' },
            ],
            [ROLES.CLASS_COORDINATOR]: [
                { path: '/approvals', icon: CheckSquare, label: 'Approvals' },
                { path: '/approvals/history', icon: Clock, label: 'History' },
            ],
            [ROLES.HOSTEL_OFFICE]: [
                { path: '/approvals', icon: CheckSquare, label: 'Approvals' },
                { path: '/approvals/history', icon: Clock, label: 'History' },
                { path: '/reports', icon: BarChart2, label: 'Reports' },
            ],
            [ROLES.CHIEF_WARDEN]: [
                { path: '/approvals', icon: CheckSquare, label: 'Approvals' },
                { path: '/approvals/history', icon: Clock, label: 'History' },
                { path: '/reports', icon: BarChart2, label: 'Reports' },
            ],
            [ROLES.WATCHMAN]: [
                { path: '/scan', icon: QrCode, label: 'Scan QR' },
                { path: '/scan/history', icon: Clock, label: 'Scan History' },
            ],
            [ROLES.ADMIN]: [
                { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { path: '/users', icon: Users, label: 'Users' },
                { path: '/passes', icon: FileText, label: 'All Passes' },
                { path: '/reports', icon: BarChart2, label: 'Reports' },
                { path: '/settings', icon: Settings, label: 'Settings' },
            ],
        };

        return menuItems[role] || [];
    };

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const sidebarVariants = {
        open: { x: 0, opacity: 1 },
        closed: { x: '-100%', opacity: 0 }
    };

    return (
        <>
            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-text/20 backdrop-blur-sm z-40 lg:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border
                    transform transition-all duration-300 ease-in-out
                    lg:translate-x-0 lg:static
                    ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                `}
            >
                {/* Logo */}
                <div className="flex items-center px-6 h-16 border-b border-border">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                        <QrCode className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold text-text tracking-tight">GatePass</h1>
                </div>

                {/* User info */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <span className="text-primary font-semibold text-sm">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-card rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text truncate">
                                {user?.name || user?.email?.split('@')[0]}
                            </p>
                            <p className="text-xs text-text/60 truncate capitalize">
                                {user?.role?.replace(/_/g, ' ').toLowerCase()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                    {getMenuItems().map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-text/70 hover:bg-primary/5 hover:text-primary'
                                }`
                            }
                            onClick={() => onClose && onClose()}
                        >
                            <item.icon className={`mr-3 h-5 w-5 transition-colors ${'group-hover:text-primary'
                                }`} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom actions */}
                <div className="p-4 border-t border-border space-y-1">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-danger rounded-xl hover:bg-danger/5 transition-colors group"
                    >
                        <LogOut className="mr-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
