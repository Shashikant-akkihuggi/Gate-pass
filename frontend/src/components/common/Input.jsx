const Input = ({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    className = '',
    icon: Icon,
    ...props
}) => {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label htmlFor={name} className="block text-xs font-black text-text/40 uppercase tracking-widest ml-1">
                    {label}
                    {required && <span className="text-danger ml-1">*</span>}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30 group-focus-within:text-primary transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`
                        w-full ${Icon ? 'pl-12' : 'px-4'} py-3 bg-background border rounded-2xl transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
                        disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm
                        ${error ? 'border-danger focus:ring-danger/10' : 'border-border'}
                    `}
                    {...props}
                />
            </div>
            {error && <p className="text-[10px] font-bold text-danger uppercase tracking-tight ml-1">{error}</p>}
        </div>
    );
};

export default Input;
