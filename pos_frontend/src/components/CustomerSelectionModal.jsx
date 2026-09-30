import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CustomerSelectionModal({ isOpen, onClose, onSelect }) {
    const { cashier } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'create'
    
    // New customer form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && view === 'list') {
            fetchCustomers();
        }
    }, [isOpen, view]);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const branchId = cashier?.activeBranch?.id || '';
            const res = await fetch(`/api/customers?branch_id=${branchId}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        if (!name) return;
        
        setIsSaving(true);
        try {
            const branchId = cashier?.activeBranch?.id || null;
            const payload = {
                name,
                phone,
                email,
                branch_id: branchId
            };
            
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                const data = await res.json();
                // Select the newly created customer automatically
                onSelect({
                    id: data.id,
                    name,
                    phone,
                    email
                });
                onClose();
                // Reset form
                setName('');
                setPhone('');
                setEmail('');
                setView('list');
            } else {
                console.error('Failed to create customer');
            }
        } catch (err) {
            console.error('Error creating customer:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase()) || 
        c.phone?.includes(search)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {view === 'list' ? 'Select Customer' : 'New Customer'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {view === 'list' ? (
                    <div className="flex flex-col h-[500px]">
                        <div className="p-4 border-b border-white/5 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search name or phone..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-butterscotch"
                                />
                            </div>
                            <button 
                                onClick={() => setView('create')}
                                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-colors border border-white/10"
                                title="Create New Customer"
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    <Loader2 className="animate-spin" size={24} />
                                </div>
                            ) : filteredCustomers.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredCustomers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                onSelect(c);
                                                onClose();
                                            }}
                                            className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="text-white font-medium">{c.name}</div>
                                                {c.phone && <div className="text-gray-400 text-sm mt-0.5">{c.phone}</div>}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 text-butterscotch transition-opacity">
                                                <Check size={18} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                    <p>No customers found.</p>
                                    <button 
                                        onClick={() => setView('create')}
                                        className="text-butterscotch hover:underline text-sm font-medium"
                                    >
                                        Create "{search}"
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5 bg-black/20">
                            <button 
                                onClick={() => {
                                    onSelect(null);
                                    onClose();
                                }}
                                className="w-full py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-colors"
                            >
                                Walk-in Customer (Clear)
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCreateCustomer} className="flex flex-col h-[500px]">
                        <div className="p-6 flex-1 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Full Name *</label>
                                <input 
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                    placeholder="e.g. Juan Dela Cruz"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Phone Number</label>
                                <input 
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                    placeholder="e.g. 09123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Email Address</label>
                                <input 
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                    placeholder="e.g. juan@example.com"
                                />
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setView('list')}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-colors"
                            >
                                Back
                            </button>
                            <button 
                                type="submit"
                                disabled={!name || isSaving}
                                className="flex-1 py-3 rounded-xl bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save & Select'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
