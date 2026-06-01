const Badge = ({ status, children, className = '' }) => {
    const getStatusStyles = (status) => {
        const s = status?.toUpperCase() || 'UNKNOWN';

        if (s.includes('APPROVED')) return 'bg-success/10 text-success border-success/20';
        if (s.includes('PENDING') || s.includes('APPROVAL')) return 'bg-warning/10 text-warning border-warning/20';
        if (s.includes('REJECTED') || s.includes('LATE')) return 'bg-danger/10 text-danger border-danger/20';
        if (s.includes('EXITED') || s.includes('OUTSIDE')) return 'bg-warning/10 text-warning border-warning/20';
        if (s.includes('RETURNED') || s.includes('COMPLETED') || s.includes('EXTENDED')) return 'bg-primary/10 text-primary border-primary/20';
        if (s.includes('EXTENSION_PENDING')) return 'bg-warning/10 text-warning border-warning/20';

        return 'bg-text/5 text-text/40 border-text/10';
    };

    const styles = getStatusStyles(status);

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles} ${className}`}>
            {children || status?.replace(/_/g, ' ')}
        </span>
    );
};

export default Badge;
