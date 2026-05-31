const Card = ({ children, className = '', title, subtitle, action }) => {
    return (
        <div className={`bg-card rounded-3xl border border-border shadow-sm overflow-hidden ${className}`}>
            {(title || subtitle || action) && (
                <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-background/50">
                    <div>
                        {title && <h3 className="text-xl font-black text-text tracking-tight">{title}</h3>}
                        {subtitle && <p className="text-sm font-medium text-text/40 mt-1">{subtitle}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-8">{children}</div>
        </div>
    );
};

export default Card;
