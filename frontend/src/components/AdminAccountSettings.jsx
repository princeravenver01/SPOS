import React, { useState } from 'react';
import { User, Lock, Mail, Shield, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminAccountSettings() {
    const [toast, setToast] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // In a real app, these would come from the auth context or API
    const [accountInfo, setAccountInfo] = useState({
        name: 'Admin Superuser',
        email: 'admin@silingangastro.com',
        role: 'Super Administrator'
    });

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    const handleSaveInfo = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        showToast('loading', 'Updating account information...');
        
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            showToast('success', 'Account information updated successfully!');
        }, 1000);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (passwords.new !== passwords.confirm) {
            showToast('error', 'New passwords do not match');
            return;
        }

        setIsLoading(true);
        showToast('loading', 'Updating password...');
        
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setPasswords({ current: '', new: '', confirm: '' });
            showToast('success', 'Password updated successfully!');
        }, 1000);
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Account Settings</h2>
                    <p className="text-sm text-gray-400">Manage your personal profile and security preferences.</p>
                </div>

                <div className="flex-1 overflow-y-auto pb-12">
                    <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Left Column: Account Info */}
                        <div className="lg:col-span-2 space-y-8">
                            <form onSubmit={handleSaveInfo} className="glass-card p-8 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <User size={20} className="text-butterscotch" /> Profile Information
                                </h3>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6 mb-6 pb-6 border-b border-white/5">
                                        <div className="w-24 h-24 rounded-full bg-charcoal-light/50 border-2 border-butterscotch/30 flex items-center justify-center text-gray-400">
                                            <User size={40} />
                                        </div>
                                        <div>
                                            <button type="button" className="bg-white/5 hover:bg-white/10 text-white font-medium px-4 py-2 rounded-lg transition-colors border border-white/10 text-sm">
                                                Change Avatar
                                            </button>
                                            <p className="text-xs text-gray-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <User size={16} className="text-gray-500" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={accountInfo.name}
                                                    onChange={(e) => setAccountInfo({...accountInfo, name: e.target.value})}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail size={16} className="text-gray-500" />
                                                </div>
                                                <input 
                                                    type="email" 
                                                    value={accountInfo.email}
                                                    onChange={(e) => setAccountInfo({...accountInfo, email: e.target.value})}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Assigned Role</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Shield size={16} className="text-butterscotch" />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={accountInfo.role}
                                                disabled
                                                className="w-full bg-charcoal-dark border border-white/5 rounded-lg pl-10 pr-4 py-3 text-gray-400 cursor-not-allowed opacity-70"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Roles can only be changed by system administrators.</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                            
                            <form onSubmit={handleChangePassword} className="glass-card p-8 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Lock size={20} className="text-butterscotch" /> Security Settings
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Current Password</label>
                                        <input 
                                            type="password" 
                                            value={passwords.current}
                                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">New Password</label>
                                            <input 
                                                type="password" 
                                                value={passwords.new}
                                                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Confirm New Password</label>
                                            <input 
                                                type="password" 
                                                value={passwords.confirm}
                                                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3 rounded-xl transition-colors border border-white/10"
                                    >
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                        {/* Right Column: Sessions */}
                        <div className="space-y-8">
                            <div className="glass-card p-6 rounded-2xl">
                                <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-4">Recent Sessions</h3>
                                <div className="space-y-4">
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-white text-sm">Windows PC • Chrome</span>
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">Active</span>
                                        </div>
                                        <div className="text-xs text-gray-400">IP: 192.168.1.100</div>
                                        <div className="text-xs text-gray-500 mt-1">Started: Just now</div>
                                    </div>
                                </div>
                                <button className="w-full mt-4 text-sm text-red-400 hover:text-white font-medium bg-red-500/10 hover:bg-red-500/20 py-2 rounded-lg transition-colors">
                                    Sign out all other sessions
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border glass-panel ${toast.type === 'success' ? 'bg-[#1a2e1f] border-green-500/30 text-green-400' : toast.type === 'error' ? 'bg-[#2e1a1a] border-red-500/30 text-red-400' : 'bg-charcoal border-butterscotch/30 text-butterscotch'}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertTriangle size={20} /> : <Loader2 size={20} className="animate-spin" />}
                    <span className="font-medium text-sm">{toast.message}</span>
                </div>
            )}
        </AdminLayout>
    );
}
