import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, variant = 'primary', description }) => {
    const variants = {
        primary: {
            bg: 'bg-primary/10',
            text: 'text-primary',
            border: 'border-primary/20',
            glow: 'shadow-primary/5'
        },
        success: {
            bg: 'bg-success/10',
            text: 'text-success',
            border: 'border-success/20',
            glow: 'shadow-success/5'
        },
        warning: {
            bg: 'bg-warning/10',
            text: 'text-warning',
            border: 'border-warning/20',
            glow: 'shadow-warning/5'
        },
        danger: {
            bg: 'bg-danger/10',
            text: 'text-danger',
            border: 'border-danger/20',
            glow: 'shadow-danger/5'
        }
    };

    const style = variants[variant] || variants.primary;

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            className={`bg-card p-6 rounded-2xl border border-border shadow-sm transition-all hover:shadow-xl ${style.glow}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-text/50 uppercase tracking-wider mb-1">{title}</p>
                    <motion.p 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl font-black text-text"
                    >
                        {value}
                    </motion.p>
                    {description && (
                        <p className="text-xs text-text/40 mt-1 font-medium">{description}</p>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${style.bg} ${style.text} border ${style.border}`}>
                    <Icon size={24} />
                </div>
            </div>
            
            <div className="mt-4 flex items-center">
                <div className="h-1 flex-1 bg-background rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '60%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${style.text.replace('text-', 'bg-')}`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default StatCard;
