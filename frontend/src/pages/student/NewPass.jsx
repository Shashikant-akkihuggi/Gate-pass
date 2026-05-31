import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    ClipboardList,
    Calendar,
    MapPin,
    MessageSquare,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Info,
    Clock,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import Button from '../../components/common/Button';
import { passService } from '../../services/passService';
import { handleError } from '../../utils/helpers';

const NewPass = () => {
    const location = useLocation();
    const [passTypes, setPassTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        pass_type_id: '',
        from_datetime: '',
        to_datetime: '',
        reason: '',
        destination: '',
    });
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        fetchPassTypes();

        // Handle quick action redirects
        if (location.state?.type) {
            // We'll set the pass type once they are loaded
        }
    }, [location.state]);

    const fetchPassTypes = async () => {
        try {
            const response = await passService.getPassTypes();
            const types = response.data.map(pt => ({
                value: pt.id,
                label: pt.name,
                requiresDestination: pt.requires_destination
            }));
            setPassTypes(types);

            if (location.state?.type) {
                const preselected = types.find(t => t.label.includes(location.state.type));
                if (preselected) {
                    setFormData(prev => ({ ...prev, pass_type_id: preselected.value.toString() }));
                }
            }
        } catch (error) {
            toast.error(handleError(error));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateStep = (currentStep) => {
        const newErrors = {};

        if (currentStep === 1) {
            if (!formData.pass_type_id) newErrors.pass_type_id = 'Please select a pass type';
            if (!formData.from_datetime) newErrors.from_datetime = 'Departure time is required';
            if (!formData.to_datetime) newErrors.to_datetime = 'Expected return time is required';

            if (formData.from_datetime && formData.to_datetime) {
                if (new Date(formData.from_datetime) >= new Date(formData.to_datetime)) {
                    newErrors.to_datetime = 'Return time must be after departure';
                }
                if (new Date(formData.from_datetime) < new Date()) {
                    newErrors.from_datetime = 'Departure cannot be in the past';
                }
            }
        }

        if (currentStep === 2) {
            const selectedPassType = passTypes.find(pt => pt.value === parseInt(formData.pass_type_id));
            if (selectedPassType?.requiresDestination && (!formData.destination || formData.destination.trim().length === 0)) {
                newErrors.destination = 'Destination is required for this pass type';
            }
            if (!formData.reason || formData.reason.trim().length === 0) {
                newErrors.reason = 'Please provide a reason';
            } else if (formData.reason.trim().length < 10) {
                newErrors.reason = 'Reason must be at least 10 characters';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validateStep(2)) return;

        setLoading(true);
        try {
            const payload = {
                pass_type_id: parseInt(formData.pass_type_id),
                from_datetime: new Date(formData.from_datetime).toISOString(),
                to_datetime: new Date(formData.to_datetime).toISOString(),
                reason: formData.reason.trim(),
                destination: formData.destination.trim()
            };

            await passService.createPass(payload);
            toast.success('Pass application submitted successfully!');
            navigate('/passes');
        } catch (error) {
            const errorMessage = error.response?.data?.errors
                ? error.response.data.errors.join(', ')
                : error.response?.data?.message || handleError(error);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: 'Type & Timing', icon: Clock },
        { id: 2, title: 'Details & Reason', icon: ClipboardList },
        { id: 3, title: 'Review & Submit', icon: ShieldCheck },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto pb-20"
        >
            <div className="mb-10">
                <h1 className="text-3xl font-black text-text tracking-tight">Apply for Gate Pass</h1>
                <p className="text-text/50 font-medium mt-1">Complete the steps below to request your pass.</p>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-12 px-2">
                {steps.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center group">
                            <div className={`
                                w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                                ${step >= s.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-card border border-border text-text/20'}
                                ${step === s.id ? 'scale-110' : ''}
                            `}>
                                <s.icon size={20} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest mt-3 transition-colors ${step >= s.id ? 'text-primary' : 'text-text/20'
                                }`}>
                                {s.title}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`h-[2px] flex-1 mx-4 transition-all duration-700 ${step > s.id ? 'bg-primary' : 'bg-border'
                                }`} />
                        )}
                    </div>
                ))}
            </div>

            <Card className="shadow-2xl shadow-text/5">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                                <Info className="text-primary mt-0.5" size={18} />
                                <p className="text-xs font-medium text-primary/70 leading-relaxed">
                                    Choose the type of pass and the exact timing for your exit and return.
                                    Approvals usually take 2-4 hours.
                                </p>
                            </div>

                            <Select
                                label="Pass Type"
                                name="pass_type_id"
                                value={formData.pass_type_id}
                                onChange={handleChange}
                                options={passTypes}
                                error={errors.pass_type_id}
                                icon={ClipboardList}
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Departure Date & Time"
                                    type="datetime-local"
                                    name="from_datetime"
                                    value={formData.from_datetime}
                                    onChange={handleChange}
                                    error={errors.from_datetime}
                                    icon={Calendar}
                                    required
                                />

                                <Input
                                    label="Expected Return Date & Time"
                                    type="datetime-local"
                                    name="to_datetime"
                                    value={formData.to_datetime}
                                    onChange={handleChange}
                                    error={errors.to_datetime}
                                    icon={Clock}
                                    required
                                />
                            </div>

                            <div className="pt-4">
                                <Button fullWidth size="lg" onClick={nextStep}>
                                    Next Step <ArrowRight size={18} className="ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <Input
                                label="Destination"
                                type="text"
                                name="destination"
                                value={formData.destination}
                                onChange={handleChange}
                                placeholder="e.g. Home, Market, Hospital"
                                error={errors.destination}
                                icon={MapPin}
                                required={passTypes.find(pt => pt.value === parseInt(formData.pass_type_id))?.requiresDestination}
                            />

                            <Textarea
                                label="Detailed Reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                placeholder="Explain why you need this pass (minimum 10 characters)"
                                error={errors.reason}
                                required
                                rows={5}
                            />

                            <div className="flex gap-4 pt-4">
                                <Button variant="secondary" size="lg" className="flex-1" onClick={prevStep}>
                                    <ArrowLeft size={18} className="mr-2" /> Back
                                </Button>
                                <Button size="lg" className="flex-[2]" onClick={nextStep}>
                                    Review Application <ArrowRight size={18} className="ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center pb-4">
                                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 text-success">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-text">Review Application</h3>
                                <p className="text-text/40 text-sm mt-1">Please confirm all details before submitting.</p>
                            </div>

                            <div className="bg-background rounded-3xl border border-border overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border">
                                    <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">Pass Type</p>
                                        <p className="text-sm font-black text-text">
                                            {passTypes.find(pt => pt.value === parseInt(formData.pass_type_id))?.label}
                                        </p>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">Destination</p>
                                        <p className="text-sm font-black text-text">{formData.destination || 'Not specified'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border">
                                    <div className="p-5 border-b md:border-b-0 md:border-r border-border">
                                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">Departure</p>
                                        <p className="text-sm font-black text-text">{new Date(formData.from_datetime).toLocaleString()}</p>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">Expected Return</p>
                                        <p className="text-sm font-black text-text">{new Date(formData.to_datetime).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest mb-1">Reason</p>
                                    <p className="text-sm font-medium text-text/70 leading-relaxed">{formData.reason}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="secondary" size="lg" className="flex-1" onClick={prevStep} disabled={loading}>
                                    <ArrowLeft size={18} className="mr-2" /> Edit
                                </Button>
                                <Button size="lg" className="flex-[2]" onClick={handleSubmit} loading={loading}>
                                    Confirm & Submit <ShieldCheck size={18} className="ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

export default NewPass;