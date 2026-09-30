import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('spos_admin', JSON.stringify(data.user));
                navigate('/admin/dashboard');
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError("Network Error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen glass-bg flex flex-col md:flex-row overflow-hidden animate-fade-in-up">
                
                {/* Left Side - Login Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-24 flex flex-col justify-center relative h-screen z-10 glass-panel">
                    <div className="absolute top-8 left-8 flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="h-8 rounded-full shadow-[0_0_15px_rgba(251,189,5,0.3)]" />
                        <span className="font-bold text-xl text-white tracking-wider">Silingan<span className="text-butterscotch">Gastro</span></span>
                    </div>

                    <div className="max-w-md w-full mx-auto">
                        <h2 className="text-4xl font-bold text-white mb-2">Back-Office Login</h2>
                        <p className="text-gray-400 mb-12">Enter your admin credentials to continue.</p>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Username <span className="text-butterscotch">*</span></label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-butterscotch transition-colors" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 border border-white/10 rounded-xl focus:ring-butterscotch focus:border-butterscotch bg-black/20 text-white transition-all backdrop-blur-md placeholder-gray-500"
                                        placeholder="admin"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Password <span className="text-butterscotch">*</span></label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-butterscotch transition-colors" />
                                    </div>
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-12 py-4 border border-white/10 rounded-xl focus:ring-butterscotch focus:border-butterscotch bg-black/20 text-white transition-all backdrop-blur-md placeholder-gray-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm font-medium p-3 bg-red-500/10 rounded-lg border border-red-500/20">{error}</p>}

                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(251,189,5,0.2)] text-lg font-bold text-charcoal bg-butterscotch hover:bg-butterscotch/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-butterscotch transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 mt-8"
                            >
                                {isLoading ? 'Authenticating...' : 'Secure Login'}
                            </button>
                        </form>
                    </div>
                    
                    <div className="absolute bottom-8 left-8 text-sm text-gray-500">
                        © 2026 Silingan Gastro POS
                    </div>
                </div>

                {/* Right Side - Image Panel */}
                <div className="hidden md:block md:w-1/2 relative h-screen">
                    <img 
                        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2000&auto=format&fit=crop" 
                        alt="Restaurant Management" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-dark via-charcoal-dark/50 to-transparent"></div>
                    
                    {/* Overlay Card */}
                    <div className="absolute bottom-12 left-12 right-12 glass-card p-8 rounded-3xl text-white">
                        <h3 className="text-3xl font-bold mb-4 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Turn real-time data into strategic growth.</h3>
                        <div className="flex gap-6 text-sm text-gray-300 font-medium">
                            <span className="flex items-center gap-1.5"><span className="text-butterscotch">✓</span> Monitor Sales</span>
                            <span className="flex items-center gap-1.5"><span className="text-butterscotch">✓</span> Manage Inventory</span>
                            <span className="flex items-center gap-1.5"><span className="text-butterscotch">✓</span> Track Performance</span>
                        </div>
                    </div>
                </div>
        </div>
    );
}
