import { Menu, Bell, Search, User } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const navigate = useNavigate();

    return (
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            {/* Left side */}
            <div className="flex items-center flex-1">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-xl hover:bg-primary/5 text-text/70 transition-colors mr-2"
                >
                    <Menu size={20} />
                </button>

                <div className="hidden md:flex items-center max-w-md w-full relative group">
                    <Search size={18} className="absolute left-3 text-text/40 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search passes, status..."
                        className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5 text-text/70'
                            }`}
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger border-2 border-card rounded-full"></span>
                    </button>

                    {/* Notification dropdown */}
                    <AnimatePresence>
                        {showNotifications && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-80 bg-card rounded-2xl shadow-xl shadow-text/10 border border-border z-50 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-border flex items-center justify-between">
                                        <h3 className="font-bold text-text">Notifications</h3>
                                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <div className="p-8 text-center">
                                            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Bell size={20} className="text-text/20" />
                                            </div>
                                            <p className="text-sm font-medium text-text/60">No new notifications</p>
                                            <p className="text-xs text-text/40 mt-1">We'll notify you when your pass status changes.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-background/50 border-t border-border text-center">
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false);
                                                navigate('/notifications');
                                            }}
                                            className="text-xs font-semibold text-primary hover:underline"
                                        >
                                            View all notifications
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-8 w-px bg-border hidden sm:block"></div>

                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center space-x-2 p-1 pr-3 rounded-xl hover:bg-primary/5 transition-colors group"
                >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                        S
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-xs font-bold text-text group-hover:text-primary transition-colors">Student Account</p>
                        <p className="text-[10px] text-text/50">Active Session</p>
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Header;
