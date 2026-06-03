import React, { useState, useEffect } from 'react';
import { 
    Settings, 
    Clock, 
    Calendar, 
    Shield, 
    Save, 
    AlertCircle,
    CheckCircle2,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const SystemSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setDownloading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings');
            setSettings(res.data.data);
        } catch (err) {
            toast.error('Failed to fetch system settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setDownloading(true);
        try {
            await api.put('/admin/settings', settings);
            toast.success('System settings updated successfully');
        } catch (err) {
            toast.error('Failed to update settings');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                <p className="text-slate-500">Configure global pass policies and system behavior</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Half-Day Pass Policy */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h2 className="font-bold text-slate-900">Half-Day Pass Policy</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Enable Half-Day Pass</p>
                                    <p className="text-xs text-slate-500">Allow students to apply for half-day passes</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setSettings({...settings, enable_half_day: !settings.enable_half_day})}
                                    className={`transition-colors ${settings.enable_half_day ? 'text-blue-600' : 'text-slate-300'}`}
                                >
                                    {settings.enable_half_day ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Max Duration (Hours)</label>
                                <input 
                                    type="number"
                                    value={settings.max_half_day_hours}
                                    onChange={(e) => setSettings({...settings, max_half_day_hours: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Monthly Limit</label>
                                <input 
                                    type="number"
                                    value={settings.max_half_day_per_month}
                                    onChange={(e) => setSettings({...settings, max_half_day_per_month: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <p className="text-xs text-slate-400 italic">Maximum half-day passes a student can take per month</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Home Pass Policy */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-slate-900">Home Pass Policy</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Enable Home Pass</p>
                                    <p className="text-xs text-slate-500">Allow students to apply for multi-day home passes</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setSettings({...settings, enable_home_pass: !settings.enable_home_pass})}
                                    className={`transition-colors ${settings.enable_home_pass ? 'text-indigo-600' : 'text-slate-300'}`}
                                >
                                    {settings.enable_home_pass ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Max Duration (Days)</label>
                                <input 
                                    type="number"
                                    value={settings.max_home_pass_days}
                                    onChange={(e) => setSettings({...settings, max_home_pass_days: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Monthly Limit</label>
                                <input 
                                    type="number"
                                    value={settings.max_home_pass_per_month}
                                    onChange={(e) => setSettings({...settings, max_home_pass_per_month: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <p className="text-xs text-slate-400 italic">Maximum home passes a student can take per month</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SystemSettings;
