import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, Edit2, ShieldAlert, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminDiscounts() {
    const [discounts, setDiscounts] = useState([]);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newDiscount, setNewDiscount] = useState({
        name: '', type: 'percentage', value: '', restricted: false
    });

    // Toast and Modal State
    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await fetch('/api/discounts');
            const data = await res.json();
            setDiscounts(data);
        } catch (err) {
            console.error('Failed to fetch discounts', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const discountToSave = {
            ...newDiscount,
            value: parseFloat(newDiscount.value) || 0
        };

        try {
            showToast('loading', 'Saving discount...');
            if (editingId) {
                await fetch(`/api/discounts/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(discountToSave)
                });
            } else {
                await fetch('/api/discounts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(discountToSave)
                });
            }
            fetchDiscounts();
            setIsAdding(false);
            setEditingId(null);
            setNewDiscount({ name: '', type: 'percentage', value: '', restricted: false });
            showToast('success', 'Discount saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save discount');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting discount...');
            await fetch(`/api/discounts/${deleteModal.id}`, { method: 'DELETE' });
            fetchDiscounts();
            setDeleteModal(null);
            showToast('success', 'Discount deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete discount.');
        }
    };

    const handleEdit = (discount) => {
        setEditingId(discount.id);
        setNewDiscount({
            name: discount.name,
            type: discount.type,
            value: discount.value,
            restricted: discount.restricted
        });
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewDiscount({ name: '', type: 'percentage', value: '', restricted: false });
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Discounts</h2>
                        <p className="text-sm text-gray-400">Create promotional discounts or fixed deductions to apply at checkout.</p>
                    </div>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Discount
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding && (
                        <div className="mb-8 p-8 glass-card rounded-2xl border border-charcoal-light animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                <Receipt size={20} className="text-butterscotch" /> {editingId ? 'Edit Discount' : 'New Discount'}
                            </h3>
                            
                            <form onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Discount Name *</label>
                                        <input required type="text" value={newDiscount.name} onChange={e => setNewDiscount({...newDiscount, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Summer Promo" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Discount Type</label>
                                        <select value={newDiscount.type} onChange={e => setNewDiscount({...newDiscount, type: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="percentage" className="text-gray-900">Percentage (%)</option>
                                            <option value="amount" className="text-gray-900">Fixed Amount (PHP)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Value *</label>
                                        <div className="relative">
                                            <input required type="number" step="0.01" value={newDiscount.value} onChange={e => setNewDiscount({...newDiscount, value: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors pr-12" placeholder={newDiscount.type === 'percentage' ? "e.g. 15" : "e.g. 100.00"} />
                                            <span className="absolute right-4 top-3 text-gray-400 font-bold">
                                                {newDiscount.type === 'percentage' ? '%' : 'PHP'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white flex items-center gap-2">
                                                Restricted Access
                                                {newDiscount.restricted && <ShieldAlert size={16} className="text-butterscotch" />}
                                            </p>
                                            <p className="text-xs text-gray-400 max-w-xs mt-1">Only employees with appropriate access rights can apply this discount.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                            <input type="checkbox" className="sr-only peer" checked={newDiscount.restricted} onChange={e => setNewDiscount({...newDiscount, restricted: e.target.checked})} />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-butterscotch"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingId ? 'Update Discount' : 'Save Discount'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {discounts.map(disc => (
                            <div key={disc.id} className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Receipt size={20} className={disc.restricted ? "text-red-400" : "text-green-400"} />
                                            {disc.name}
                                        </h4>
                                        {disc.restricted && (
                                            <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1 border border-red-500/20">
                                                <ShieldAlert size={12} /> Restricted
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-3xl font-black text-butterscotch mb-4">
                                        {disc.type === 'percentage' ? `${disc.value}%` : `₱${disc.value.toFixed(2)}`}
                                        <span className="text-sm font-medium text-gray-500 ml-2 uppercase tracking-widest block mt-1">OFF</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full mt-4 pt-4 border-t border-white/5">
                                    <button onClick={() => handleEdit(disc)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium transition-colors border border-white/5">
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => setDeleteModal(disc)}
                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/10"
                                    >    Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Delete Modal */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                        <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-4 text-red-400">
                                <div className="p-3 bg-red-500/20 rounded-full">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Delete Discount</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Discount</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border glass-panel ${toast.type === 'success' ? 'bg-[#1a2e1f] border-green-500/30 text-green-400' : toast.type === 'error' ? 'bg-[#2e1a1a] border-red-500/30 text-red-400' : 'bg-charcoal border-butterscotch/30 text-butterscotch'}`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertTriangle size={20} /> : <Loader2 size={20} className="animate-spin" />}
                        <span className="font-medium text-sm">{toast.message}</span>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
