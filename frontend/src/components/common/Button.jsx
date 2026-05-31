const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const baseClasses = 'font-bold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 flex items-center justify-center tracking-tight';

    const variants = {
        primary: 'bg-primary text-white hover:bg-primary-700 focus:ring-primary/20 shadow-lg shadow-primary/20 active:scale-[0.98]',
        secondary: 'bg-text/5 text-text hover:bg-text/10 focus:ring-text/5 active:scale-[0.98]',
        success: 'bg-success text-white hover:bg-success-700 focus:ring-success/20 shadow-lg shadow-success/20 active:scale-[0.98]',
        danger: 'bg-danger text-white hover:bg-danger-700 focus:ring-danger/20 shadow-lg shadow-danger/20 active:scale-[0.98]',
        outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary/20 active:scale-[0.98]',
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
    };

    const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'cursor-not-allowed opacity-50 grayscale' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                </span>
            ) : children}
        </button>
    );
};

export default Button;
