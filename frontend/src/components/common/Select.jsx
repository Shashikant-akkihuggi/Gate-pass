import { ChevronDown } from 'lucide-react';

const Select = ({
    label,
    name,
    value,
    onChange,
    options = [],
    error,
    required = false,
    disabled = false,
    placeholder = 'Select an option',
    className = '',
    icon: Icon,
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
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text/30 group-focus-within:text-primary transition-colors pointer-events-none">
                        <Icon size={18} />
                    </div>
                )}
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`
                        w-full appearance-none ${Icon ? 'pl-12' : 'px-4'} py-3 bg-background border rounded-2xl transition-all duration-200
                        focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary
                        disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm cursor-pointer
                        ${error ? 'border-danger focus:ring-danger/10' : 'border-border'}
                    `}
                >
                    <option value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text/30 pointer-events-none">
                    <ChevronDown size={16} />
                </div>
            </div>
            {error && <p className="text-[10px] font-bold text-danger uppercase tracking-tight ml-1">{error}</p>}
        </div>
    );
};

export default Select;
