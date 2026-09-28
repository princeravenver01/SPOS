import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Store, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminModifiers() {
    const [modifiers, setModifiers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [managingBranchId, setManagingBranchId] = useState('');

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newModifier, setNewModifier] = useState({
        name: '',
        is_required: false,
        max_selections: 1,
        options: [{ id: Date.now(), name: '', price: '' }]
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
        fetchBranches();
    }, []);

    useEffect(() => {
        if (managingBranchId) {
            fetchModifiers(managingBranchId);
        } else {
            setModifiers([]);
        }
    }, [managingBranchId]);

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            const data = await res.json();
            setBranches(data);
            if (data.length > 0) {
                setManagingBranchId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchModifiers = async (branchId) => {
        if (!branchId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/modifiers?branch_id=${branchId}`);
            const data = await res.json();
            setModifiers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch modifiers', err);
            setModifiers([]);
        }
    };

    const handleAddOption = () => {
        setNewModifier(prev => ({
            ...prev,
            options: [...prev.options, { id: Date.now(), name: '', price: '' }]
        }));
    };

    const handleRemoveOption = (id) => {
        setNewModifier(prev => ({
            ...prev,
            options: prev.options.filter(o => o.id !== id)
        }));
    };

    const handleOptionChange = (id, field, value) => {
        setNewModifier(prev => ({
            ...prev,
            options: prev.options.map(o => o.id === id ? { ...o, [field]: value } : o)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const validOptions = newModifier.options.filter(o => o.name.trim() !== '');
        
        if (validOptions.length === 0) {
            showToast('error', 'Please add at least one valid option.');
            return;
        }

        const modifierToSave = {
            branch_id: managingBranchId,
            name: newModifier.name,
            is_required: newModifier.is_required,
            max_selections: newModifier.max_selections,
            options: validOptions.map(o => ({ name: o.name, price: parseFloat(o.price) || 0 }))
        };

        try {
            showToast('loading', 'Saving modifier...');
            if (editingId) {
                await fetch(`http://localhost:5000/api/modifiers/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modifierToSave)
                });
            } else {
                await fetch('http://localhost:5000/api/modifiers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modifierToSave)
                });
            }
            fetchModifiers(managingBranchId);
            setIsAdding(false);
            setEditingId(null);
            setNewModifier({ name: '', is_required: false, max_selections: 1, options: [{ id: Date.now(), name: '', price: '' }] });
            showToast('success', 'Modifier saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save modifier');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting modifier...');
            await fetch(`http://localhost:5000/api/modifiers/${deleteModal.id}`, { method: 'DELETE' });
            fetchModifiers(managingBranchId);
            setDeleteModal(null);
            showToast('success', 'Modifier deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete modifier.');
        }
    };

    const handleEdit = (modifier) => {
        setEditingId(modifier.id);
        setNewModifier({
            name: modifier.name,
            is_required: modifier.is_required,
            max_selections: modifier.max_selections,
            options: modifier.options.length > 0 ? [...modifier.options] : [{ id: Date.now(), name: '', price: '' }]
        });
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewModifier({ name: '', is_required: false, max_selections: 1, options: [{ id: Date.now(), name: '', price: '' }] });
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Modifiers</h2>
                        <p className="text-sm text-gray-400">Create sets of options (like toppings or add-ons) to apply to items at sale.</p>
                    </div>
                    {!isAdding && managingBranchId && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Modifier
                        </button>
                    )}
                </div>

                {!isAdding && (
                    <div className="mb-8 p-6 glass-card rounded-2xl border border-charcoal-light flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-charcoal p-3 rounded-xl border border-white/5">
                                <Store size={24} className="text-butterscotch" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Select Branch to Manage Modifiers</h3>
                                <p className="text-sm text-gray-400">Choose a branch to view, add, or edit its specific modifier groups.</p>
                            </div>
                        </div>
                        <div className="w-64">
                            <select 
                                value={managingBranchId}
                                onChange={(e) => setManagingBranchId(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Select Branch</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {isAdding && (
                        <div className="mb-8 p-8 glass-card rounded-2xl border border-charcoal-light animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                <Settings size={20} className="text-butterscotch" /> {editingId ? 'Edit Modifier' : 'New Modifier'}
                            </h3>
                            
                            <form onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Modifier Name *</label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={newModifier.name} 
                                            onChange={e => setNewModifier({...newModifier, name: e.target.value})} 
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" 
                                            placeholder="e.g. Sugar Level" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Is Required?</label>
                                        <select 
                                            value={newModifier.is_required ? 'true' : 'false'} 
                                            onChange={e => setNewModifier({...newModifier, is_required: e.target.value === 'true'})} 
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none"
                                        >
                                            <option value="false" className="text-gray-900">No, it's optional</option>
                                            <option value="true" className="text-gray-900">Yes, require selection</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Max Selections</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={newModifier.max_selections} 
                                            onChange={e => setNewModifier({...newModifier, max_selections: parseInt(e.target.value) || 1})} 
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" 
                                        />
                                    </div>
                                </div>

                                <div className="bg-black/20 p-6 rounded-xl border border-white/5 mb-8">
                                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Options</h4>
                                    
                                    <div className="grid grid-cols-12 gap-4 mb-2 px-2">
                                        <div className="col-span-7 md:col-span-8 text-xs font-semibold text-gray-500 uppercase tracking-wider">Option Name</div>
                                        <div className="col-span-4 md:col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price (PHP)</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {newModifier.options.map((opt, index) => (
                                        <div key={opt.id} className="grid grid-cols-12 gap-4 mb-3 items-center group">
                                            <div className="col-span-7 md:col-span-8">
                                                <input 
                                                    required={index === 0}
                                                    type="text" 
                                                    value={opt.name} 
                                                    onChange={e => handleOptionChange(opt.id, 'name', e.target.value)} 
                                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-butterscotch transition-colors" 
                                                    placeholder="e.g. 50% Sugar" 
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-3">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={opt.price} 
                                                    onChange={e => handleOptionChange(opt.id, 'price', e.target.value)} 
                                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-butterscotch transition-colors" 
                                                    placeholder="0.00" 
                                                />
                                            </div>
                                            <div className="col-span-1 text-right">
                                                {newModifier.options.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveOption(opt.id)} 
                                                        className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button 
                                        type="button" 
                                        onClick={handleAddOption} 
                                        className="mt-4 text-sm font-bold text-butterscotch hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Add option
                                    </button>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingId ? 'Update Modifier' : 'Save Modifier'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {!isAdding && managingBranchId && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {modifiers.length === 0 ? (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                    <Settings size={48} className="mx-auto text-gray-600 mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">No modifiers found</h3>
                                    <p className="text-gray-400 mb-6">Create modifiers for this branch to get started.</p>
                                    <button 
                                        onClick={() => setIsAdding(true)}
                                        className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-2 rounded-xl transition-colors inline-flex items-center gap-2"
                                    >
                                        <Plus size={18} /> Add Modifier
                                    </button>
                                </div>
                            ) : (
                                modifiers.map(mod => (
                                    <div key={mod.id} className="glass-card p-6 rounded-2xl flex flex-col border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                                                    <Settings size={20} className="text-butterscotch" />
                                                    {mod.name}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    {mod.is_required ? (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Required</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">Optional</span>
                                                    )}
                                                    <span className="text-xs text-gray-500 font-mono">Max: {mod.max_selections}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(mod)} className="text-gray-400 hover:text-butterscotch transition-colors p-1">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteModal(mod)} 
                                                    className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5">
                                            <ul className="space-y-2">
                                                {mod.options.map(opt => {
                                                    const price = parseFloat(opt.price) || 0;
                                                    return (
                                                        <li key={opt.id} className="flex justify-between text-sm">
                                                            <span className="text-gray-300">{opt.name}</span>
                                                            <span className="text-gray-400 font-mono">
                                                                {price > 0 ? `+PHP ${price.toFixed(2)}` : 'Free'}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
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
                            <h3 className="text-xl font-bold text-white">Delete Modifier</h3>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Modifier</button>
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
        </AdminLayout>
    );
}
