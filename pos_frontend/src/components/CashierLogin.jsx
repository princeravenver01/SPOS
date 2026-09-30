import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Delete } from 'lucide-react';

export default function CashierLogin() {
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [groupedUsers, setGroupedUsers] = useState({});
    const [lockoutMsg, setLockoutMsg] = useState('');
    const [step, setStep] = useState('login');
    const [authenticatedUser, setAuthenticatedUser] = useState(null);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const { branchId } = useParams();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const url = branchId ? `/api/auth/pos-users?branch_id=${branchId}` : '/api/auth/pos-users';
                const res = await fetch(url);
                const data = await res.json();
                setGroupedUsers(data);
                
                // Auto-select first user if available
                const roles = Object.keys(data);
                if (roles.length > 0 && data[roles[0]].length > 0) {
                    setUsername(data[roles[0]][0].username);
                }
            } catch (err) {
                console.error('Failed to fetch POS users', err);
            }
        };
        fetchUsers();
    }, []);

    // Check lockout status whenever username changes
    useEffect(() => {
        setPin('');
        setError('');
        
        if (!username) return;
        
        const lockKey = `lockout_${username}`;
        const lockTime = localStorage.getItem(lockKey);
        
        if (lockTime) {
            const timeLeft = parseInt(lockTime) - Date.now();
            if (timeLeft > 0) {
                const minutes = Math.ceil(timeLeft / 60000);
                setLockoutMsg(`Account locked. Try again in ${minutes} minute(s).`);
            } else {
                localStorage.removeItem(lockKey);
                setLockoutMsg('');
            }
        } else {
            setLockoutMsg('');
        }
    }, [username]);

    const handlePinInput = (num) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleLogin = async (e) => {
        e?.preventDefault();
        
        if (!username || !pin) {
            setError('Please enter both username and PIN.');
            return;
        }

        if (lockoutMsg) {
            setError(lockoutMsg);
            return;
        }

        setIsLoading(true);
        setError('');

        const lockKey = `lockout_${username}`;
        const attemptsKey = `attempts_${username}`;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, pin })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Clear attempts on success
                localStorage.removeItem(attemptsKey);
                localStorage.removeItem(lockKey);
                
                const user = data.user;
                if (!user.branches || user.branches.length === 0) {
                    setError('You are not assigned to any branches.');
                    return;
                }
                
                if (branchId && user.branches.some(b => b.id.toString() === branchId)) {
                    user.activeBranch = user.branches.find(b => b.id.toString() === branchId);
                    login(user);
                    navigate('/');
                } else if (user.branches.length === 1) {
                    user.activeBranch = user.branches[0];
                    login(user);
                    navigate('/');
                } else {
                    setAuthenticatedUser(user);
                    setStep('branch_select');
                }
            } else {
                // Handle failed attempt
                let attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
                
                if (attempts >= 4) {
                    // Lockout for 1 hour (3600000 ms)
                    localStorage.setItem(lockKey, Date.now() + 3600000);
                    localStorage.removeItem(attemptsKey);
                    setLockoutMsg('Account locked for 1 hour due to too many failed attempts.');
                    setError('Account locked for 1 hour due to too many failed attempts.');
                } else {
                    localStorage.setItem(attemptsKey, attempts);
                    setError(data.error || `Invalid PIN. ${4 - attempts} attempts remaining.`);
                }
                
                setPin('');
            }
        } catch (err) {
            console.error('Login error', err);
            setError('Cannot connect to server.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBranchSelect = (branch) => {
        const user = { ...authenticatedUser, activeBranch: branch };
        login(user);
        navigate('/');
    };

    if (step === 'branch_select' && authenticatedUser) {
        return (
            <div className="flex h-screen glass-bg items-center justify-center font-sans p-4">
                <div className="glass-panel p-8 w-full max-w-[400px] border-charcoal-light flex flex-col items-center shadow-2xl rounded-3xl">
                    <h2 className="text-white text-xl font-bold tracking-widest uppercase mb-6 text-center">Select Branch</h2>
                    <div className="w-full flex flex-col gap-3">
                        {authenticatedUser.branches.map(b => (
                            <button
                                key={b.id}
                                onClick={() => handleBranchSelect(b)}
                                className="w-full py-4 px-6 bg-[#1e1e1e] hover:bg-butterscotch hover:text-charcoal border border-white/10 rounded-xl text-white font-medium transition-colors text-left flex justify-between items-center group"
                            >
                                <span>{b.name}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                            setStep('login');
                            setAuthenticatedUser(null);
                            setPin('');
                        }}
                        className="mt-6 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen glass-bg items-center justify-center font-sans p-4">
            <form 
                onSubmit={handleLogin}
                className="glass-panel p-8 md:p-12 w-full max-w-[380px] md:max-w-[760px] border-charcoal-light flex flex-col md:flex-row items-center shadow-2xl rounded-3xl md:gap-12"
            >
                {/* Left Column (Logo & User Select) */}
                <div className="flex flex-col items-center md:items-start w-full flex-1">
                    
                    <div className="mb-6 md:mb-10 flex flex-col items-center md:items-start w-full">
                        <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border-2 border-butterscotch/50 bg-black flex items-center justify-center mb-4 md:mb-5 shadow-[0_0_15px_rgba(251,189,5,0.3)]">
                            <img src="/logo.png" alt="Silingan" className="h-full w-full object-cover" />
                        </div>
                        <h1 className="text-white text-xl md:text-2xl font-bold tracking-widest uppercase text-center md:text-left">Cashier Login</h1>
                        <p className="text-gray-400 text-xs md:text-sm mt-1 text-center md:text-left">Please select your account</p>
                    </div>

                    {/* User Select Dropdown */}
                    <div className="w-full mb-6">
                        <div className="border-b border-gray-600 focus-within:border-butterscotch transition-colors pb-2 w-full relative">
                            <select 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-transparent text-white text-lg md:text-xl outline-none appearance-none cursor-pointer font-medium text-center md:text-left pr-8"
                            >
                                {Object.keys(groupedUsers).length === 0 && (
                                    <option value="" className="text-black">No POS users found</option>
                                )}
                                {Object.keys(groupedUsers).map(role => (
                                    <optgroup key={role} label={role} className="text-gray-500 font-bold bg-charcoal text-left">
                                        {groupedUsers[role].map(user => (
                                            <option key={user.username} value={user.username} className="text-white font-medium bg-[#1e1e1e]">
                                                {user.name || user.username}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-butterscotch/70">
                                ▼
                            </div>
                        </div>
                    </div>

                    {/* PIN Display */}
                    <div className="mb-4 md:mb-0 h-8 flex items-center justify-center md:justify-start w-full">
                        {pin.length > 0 ? (
                            <div className="flex gap-3">
                                {[...Array(pin.length)].map((_, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full bg-butterscotch shadow-[0_0_8px_rgba(251,189,5,0.8)]" />
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-600 tracking-widest text-sm uppercase text-center md:text-left w-full">
                                 Enter PIN
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm mt-2 text-center md:text-left w-full">{error}</div>
                    )}
                </div>

                {/* Right Column (PIN Pad) */}
                <div className="flex flex-col items-center w-full md:w-[280px] shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12 mt-4 md:mt-0">
                    {lockoutMsg ? (
                        <div className="text-red-400 font-medium mb-6 text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20 w-full text-sm">
                            {lockoutMsg}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-[240px]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button 
                                    key={num}
                                    type="button"
                                    onClick={() => handlePinInput(num.toString())}
                                    className="h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xl font-medium transition-colors flex items-center justify-center shadow-sm"
                                >
                                    {num}
                                </button>
                            ))}
                            <button type="button" className="h-14 rounded-full flex items-center justify-center"></button>
                            <button 
                                type="button"
                                onClick={() => handlePinInput('0')}
                                className="h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xl font-medium transition-colors flex items-center justify-center shadow-sm"
                            >
                                0
                            </button>
                            <button 
                                type="button"
                                onClick={handleDelete}
                                className="h-14 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-colors flex items-center justify-center shadow-sm"
                            >
                                <Delete size={22} />
                            </button>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading || !username || !pin || !!lockoutMsg}
                        className="w-full max-w-[240px] bg-butterscotch hover:bg-butterscotch/90 disabled:opacity-50 disabled:hover:bg-butterscotch text-charcoal-dark font-bold py-3.5 rounded-xl uppercase tracking-widest text-sm transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex justify-center items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
                    </button>
                </div>
            </form>
        </div>
    );
}
