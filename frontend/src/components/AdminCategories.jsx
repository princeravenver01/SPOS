import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [branches, setBranches] = useState([]);
    const [managingBranchId, setManagingBranchId] = useState(null);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newCategory, setNewCategory] = useState({ name: '', color: '#fbbd05' });

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
            fetchCategories();
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

    const fetchCategories = async () => {
        if (!managingBranchId) return;
        try {
            const res = await fetch(`http://localhost:5000/api/categories?branch_id=${managingBranchId}`);
            const data = await res.json();
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            showToast('loading', 'Saving category...');
            if (editingId) {
                await fetch(`http://localhost:5000/api/categories/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newCategory)
                });
            } else {
                await fetch('http://localhost:5000/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...newCategory, branch_id: managingBranchId })
                });
            }
            fetchCategories();
            setIsAdding(false);
            setEditingId(null);
            setNewCategory({ name: '', color: '#fbbd05' });
            showToast('success', 'Category saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save category');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting category...');
            await fetch(`http://localhost:5000/api/categories/${deleteModal.id}`, { method: 'DELETE' });
            fetchCategories();
            setDeleteModal(null);
            showToast('success', 'Category deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete category.');
        }
    };

    const handleEdit = (cat) => {
        setEditingId(cat.id);
        setNewCategory({ name: cat.name, color: cat.color });
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setNewCategory({ name: '', color: '#fbbd05' });
    };

    const colors = ['#fbbd05', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Categories</h2>
                        <p className="text-sm text-gray-400">Organize your products into display categories for the POS.</p>
                        
                        <div className="mt-4 flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/10 w-max">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Managing Branch:</span>
                            <select 
                                value={managingBranchId || ''} 
                                onChange={e => setManagingBranchId(Number(e.target.value))}
                                className="bg-transparent text-white font-bold px-4 py-2 border-l border-white/10 focus:outline-none appearance-none"
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {!isAdding && managingBranchId && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Category
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding && (
                        <div className="mb-8 p-8 glass-card rounded-2xl border border-charcoal-light animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                <FileText size={20} className="text-butterscotch" /> {editingId ? 'Edit Category' : 'New Category'}
                            </h3>
                            
                            <form onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Category Name *</label>
                                        <input required type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Desserts" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Label Color</label>
                                        <div className="flex items-center gap-3 mt-2">
                                            {colors.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setNewCategory({...newCategory, color})}
                                                    className={`w-10 h-10 rounded-full transition-transform ${newCategory.color === color ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingId ? 'Update' : 'Save Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {categories.map(cat => (
                            <div key={cat.id} className="glass-card p-6 rounded-2xl flex flex-col items-center text-center group border border-white/5 hover:border-white/10 transition-colors">
                                <div 
                                    className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center shadow-lg"
                                    style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}` }}
                                >
                                    <FileText size={28} style={{ color: cat.color }} />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-4">{cat.name}</h4>
                                
                                <div className="flex gap-2 w-full mt-auto">
                                    <button 
                                        onClick={() => handleEdit(cat)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium transition-colors border border-white/5"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => setDeleteModal(cat)}
                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/10"
                                    >
                                        Remove
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
                                <h3 className="text-xl font-bold text-white">Delete Category</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete the <span className="text-white font-semibold">{deleteModal.name}</span> category? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Category</button>
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
