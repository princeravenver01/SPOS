import React, { useState, useEffect } from 'react';
import { Factory, Plus, ArrowLeft, Search, Save, X, Store, CheckCircle, PackageMinus, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminProductions() {
    const [productions, setProductions] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'form' | 'details'
    const [selectedProduction, setSelectedProduction] = useState(null);
    
    // Form state
    const [formType, setFormType] = useState('Production'); // 'Production' | 'Disassembly'
    const [formBranchId, setFormBranchId] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formItems, setFormItems] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };
    
    useEffect(() => {
        fetchProductions();
        fetchBranches();
    }, []);

    useEffect(() => {
        if (formBranchId) {
            fetchProducts(formBranchId);
        } else {
            setProducts([]);
        }
    }, [formBranchId]);

    const fetchProductions = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/productions');
            setProductions(await res.json());
        } catch (err) {
            console.error('Failed to fetch productions', err);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            setBranches(await res.json());
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchProducts = async (branchId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/products?branch_id=${branchId}`);
            setProducts(await res.json());
        } catch (err) {
            console.error('Failed to fetch products', err);
        }
    };

    const handleSave = async () => {
        if (!formBranchId || formItems.length === 0) {
            showToast('error', 'Please select a branch and add at least one item.');
            return;
        }

        try {
            showToast('loading', 'Saving production...');
            const res = await fetch('http://localhost:5000/api/productions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch_id: formBranchId,
                    type: formType,
                    notes: formNotes,
                    items: formItems
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('success', data.message || 'Production saved successfully.');
                fetchProductions();
                setViewMode('list');
                resetForm();
            } else {
                showToast('error', data.error || 'Error saving production');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save');
        }
    };

    const resetForm = () => {
        setFormType('Production');
        setFormBranchId('');
        setFormNotes('');
        setFormItems([]);
        setProductSearch('');
    };

    const addItem = (product) => {
        if (!formItems.find(i => i.product_id === product.id)) {
            setFormItems([...formItems, {
                product_id: product.id,
                product_name: product.name,
                sku: product.sku,
                quantity: 1,
                cost: product.cost
            }]);
        }
        setProductSearch('');
    };

    const updateItemQuantity = (productId, qty) => {
        setFormItems(formItems.map(item => 
            item.product_id === productId ? { ...item, quantity: parseFloat(qty) || 0 } : item
        ));
    };

    const removeItem = (productId) => {
        setFormItems(formItems.filter(item => item.product_id !== productId));
    };

    const compositeProducts = products.filter(p => p.use_production && p.is_composite);
    const filteredSearch = compositeProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

    return (
        <AdminLayout>
            {viewMode === 'list' && (
                <div className="flex flex-col h-full animate-fade-in">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <Factory className="text-butterscotch" size={32} /> Production
                            </h2>
                            <p className="text-sm text-gray-400">Manage production and disassembly of composite items.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative inline-block text-left group">
                                <button className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2">
                                    <Plus size={20} /> ADD PRODUCTION
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-charcoal border border-white/10 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                                    <button 
                                        onClick={() => { setFormType('Production'); setViewMode('form'); }}
                                        className="w-full text-left px-4 py-3 text-white hover:bg-white/10 font-bold transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} className="text-butterscotch" /> Add Production
                                    </button>
                                    <button 
                                        onClick={() => { setFormType('Disassembly'); setViewMode('form'); }}
                                        className="w-full text-left px-4 py-3 text-white hover:bg-white/10 font-bold transition-colors flex items-center gap-2"
                                    >
                                        <PackageMinus size={16} className="text-orange-400" /> Add Disassembly
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-charcoal-light rounded-2xl border border-white/5 overflow-hidden flex-1 flex flex-col shadow-xl">
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-black/40 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-5 rounded-tl-2xl font-bold tracking-wider">Number</th>
                                        <th className="px-6 py-5 font-bold tracking-wider">Type</th>
                                        <th className="px-6 py-5 font-bold tracking-wider">Date</th>
                                        <th className="px-6 py-5 font-bold tracking-wider">Branch</th>
                                        <th className="px-6 py-5 font-bold tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productions.map(prod => (
                                        <tr key={prod.id} 
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`http://localhost:5000/api/productions/${prod.id}`);
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        setSelectedProduction(data);
                                                        setViewMode('details');
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-4 font-bold text-white group-hover:text-butterscotch transition-colors">
                                                {prod.pr_number}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${prod.type === 'Production' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    {prod.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{new Date(prod.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 flex items-center gap-2"><Store size={16} className="text-gray-500"/>{prod.branch_name}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400 flex items-center gap-1 w-max">
                                                    <CheckCircle size={12}/> Completed
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {productions.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500 bg-black/20">
                                                <Factory size={48} className="mx-auto mb-4 text-gray-600 opacity-50" />
                                                <p className="text-lg">No production records found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'form' && (
                <div className="flex flex-col h-full animate-fade-in">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <button 
                                onClick={() => { setViewMode('list'); resetForm(); }}
                                className="text-butterscotch hover:text-white flex items-center gap-2 text-sm font-bold mb-4 transition-colors"
                            >
                                <ArrowLeft size={16} /> Back to Productions
                            </button>
                            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                {formType === 'Production' ? <Plus className="text-butterscotch" size={32} /> : <PackageMinus className="text-orange-400" size={32} />} 
                                Create {formType}
                            </h2>
                        </div>
                        <button 
                            onClick={handleSave}
                            className={`${formType === 'Production' ? 'bg-butterscotch hover:bg-butterscotch/90 shadow-[0_0_15px_rgba(251,189,5,0.2)]' : 'bg-orange-500 hover:bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'} text-charcoal font-bold px-8 py-3 rounded-xl transition-all flex items-center gap-2`}
                        >
                            <Save size={20} /> SAVE
                        </button>
                    </div>

                    <div className="grid gap-6 flex-1 overflow-y-auto pr-2 pb-10">
                        {/* Header Details */}
                        <div className="glass-card p-6 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-butterscotch/5 rounded-bl-[100px] pointer-events-none"></div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Branch *</label>
                                <select 
                                    value={formBranchId} 
                                    onChange={(e) => setFormBranchId(e.target.value)}
                                    className="w-full max-w-md bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none"
                                >
                                    <option value="">Select a branch</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Notes</label>
                                <textarea 
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    maxLength={500}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors h-24 resize-none"
                                    placeholder="Optional notes..."
                                />
                                <div className="text-right text-xs text-gray-500 mt-1">{formNotes.length} / 500</div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="glass-card rounded-2xl flex flex-col overflow-visible">
                            <div className="p-6 border-b border-white/5 bg-black/20">
                                <h3 className="text-xl font-bold text-white">Items</h3>
                                <p className="text-sm text-gray-400 mt-1">Select the composite items to {formType.toLowerCase()}.</p>
                            </div>
                            
                            <div className="p-6">
                                {formItems.length > 0 && (
                                    <table className="w-full text-sm text-left text-gray-300 mb-6">
                                        <thead className="text-xs text-gray-400 uppercase bg-white/5 rounded-xl">
                                            <tr>
                                                <th className="px-4 py-3 rounded-tl-lg font-bold">Item</th>
                                                <th className="px-4 py-3 font-bold w-32">Quantity</th>
                                                <th className="px-4 py-3 font-bold w-32">Cost</th>
                                                <th className="px-4 py-3 rounded-tr-lg w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formItems.map(item => (
                                                <tr key={item.product_id} className="border-b border-white/5 bg-black/20 group">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-white">{item.product_name}</div>
                                                        <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input 
                                                            type="number" 
                                                            min="0.1" 
                                                            step="0.1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItemQuantity(item.product_id, e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-butterscotch text-white"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {item.cost}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => removeItem(item.product_id)} className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10">
                                                            <X size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search size={18} className="text-gray-400" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        disabled={!formBranchId}
                                        placeholder={formBranchId ? "Search composite item..." : "Select a branch first..."}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-butterscotch transition-all placeholder:text-gray-500 disabled:opacity-50"
                                    />
                                    {productSearch && filteredSearch.length > 0 && (
                                        <div className="absolute z-20 w-full mt-2 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                            {filteredSearch.map(product => (
                                                <div 
                                                    key={product.id}
                                                    onClick={() => addItem(product)}
                                                    className="p-4 hover:bg-white/5 cursor-pointer flex justify-between items-center text-sm border-b border-white/5 last:border-0"
                                                >
                                                    <div>
                                                        <div className="font-bold text-white">{product.name}</div>
                                                        <div className="text-xs text-gray-500 mt-1">Cost: {product.cost}</div>
                                                    </div>
                                                    <span className="text-gray-400 text-xs bg-black/40 px-2 py-1 rounded">SKU: {product.sku}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {productSearch && filteredSearch.length === 0 && (
                                        <div className="absolute z-20 w-full mt-2 bg-[#1a1f2e] border border-white/10 rounded-xl p-4 text-center text-gray-500">
                                            No composite items found matching "{productSearch}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'details' && selectedProduction && (
                <div className="flex flex-col h-full animate-fade-in">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <button 
                                onClick={() => { setViewMode('list'); setSelectedProduction(null); }}
                                className="text-butterscotch hover:text-white flex items-center gap-2 text-sm font-bold mb-4 transition-colors"
                            >
                                <ArrowLeft size={16} /> Back to Productions
                            </button>
                            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <Factory className="text-butterscotch" size={32} /> Production Details
                            </h2>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl w-full mx-auto relative overflow-hidden">
                        {/* Loyverse style white document styling */}
                        <div className="flex justify-between items-start border-b pb-6 mb-6">
                            <div>
                                <h3 className="text-4xl font-bold text-gray-800 mb-4">{selectedProduction.pr_number}</h3>
                                <div className="text-gray-500 text-sm space-y-1">
                                    <p>Date: {new Date(selectedProduction.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}</p>
                                    <p>Created by: {selectedProduction.created_by}</p>
                                    <p>Type: <span className="font-semibold text-gray-700">{selectedProduction.type}</span></p>
                                </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                <p className="mb-1">Store:</p>
                                <p className="font-semibold text-gray-800">{selectedProduction.branch_name}</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h4 className="text-xl font-bold text-gray-800 mb-4">Items</h4>
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead>
                                    <tr className="border-b">
                                        <th className="pb-3 font-normal text-gray-500">Item name</th>
                                        <th className="pb-3 font-normal text-gray-500 text-right w-32">Cost</th>
                                        <th className="pb-3 font-normal text-gray-500 text-right w-32">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProduction.items && selectedProduction.items.map(item => (
                                        <tr key={item.id} className="border-b border-gray-100">
                                            <td className="py-4">
                                                <div className="font-bold text-gray-800">{item.product_name}</div>
                                                <div className="text-gray-400 text-xs mt-1">SKU {item.sku}</div>
                                            </td>
                                            <td className="py-4 text-right">
                                                {item.cost}
                                            </td>
                                            <td className="py-4 text-right font-bold text-gray-800">
                                                {item.quantity}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {selectedProduction.notes && (
                            <div className="mt-8 pt-6 border-t">
                                <h4 className="text-sm font-semibold text-gray-500 mb-2">Notes</h4>
                                <p className="text-gray-800">{selectedProduction.notes}</p>
                            </div>
                        )}
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
