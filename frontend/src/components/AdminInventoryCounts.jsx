import React, { useState, useEffect } from 'react';
import { Plus, X, ArrowLeft, Search, CheckCircle, Trash2, ChevronDown, Check, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminInventoryCounts() {
    const [inventoryCounts, setInventoryCounts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [view, setView] = useState('list'); // 'list', 'form', 'count'
    const [currentIc, setCurrentIc] = useState(null);

    const [formIc, setFormIc] = useState({
        branch_id: '',
        type: 'Partial',
        notes: '',
        items: [],
    });

    const [productSearch, setProductSearch] = useState('');
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [icRes, branchRes, prodRes] = await Promise.all([
                fetch('http://localhost:5000/api/inventory-counts'),
                fetch('http://localhost:5000/api/branches'),
                fetch('http://localhost:5000/api/products')
            ]);
            setInventoryCounts(await icRes.json());
            setBranches(await branchRes.json());
            setProducts(await prodRes.json());
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const fetchSingleIc = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/inventory-counts/${id}`);
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleCreateNew = () => {
        setFormIc({
            branch_id: '',
            type: 'Partial',
            notes: '',
            items: [],
        });
        setCurrentIc(null);
        setView('form');
    };

    const handleViewDetail = async (id) => {
        const ic = await fetchSingleIc(id);
        if (ic) {
            setCurrentIc(ic);
            setView('count');
        }
    };

    // When type changes to 'Full', auto-populate all branch items
    const handleTypeChange = (e) => {
        const type = e.target.value;
        const branchId = formIc.branch_id;
        
        let newItems = [];
        if (type === 'Full' && branchId) {
            const branchProducts = products.filter(p => p.branch_id == branchId);
            newItems = branchProducts.map(p => ({
                product_id: p.id,
                product_name: p.name,
                sku: p.sku,
                expected_stock: parseFloat(p.in_stock) || 0,
                counted_stock: '',
                cost: parseFloat(p.cost) || 0
            }));
        } else if (type === 'Partial') {
            newItems = [];
        }

        setFormIc({ ...formIc, type, items: newItems });
    };

    // When branch changes, clear items (or re-populate if Full)
    const handleBranchChange = (e) => {
        const branchId = e.target.value;
        let newItems = [];
        
        if (formIc.type === 'Full' && branchId) {
            const branchProducts = products.filter(p => p.branch_id == branchId);
            newItems = branchProducts.map(p => ({
                product_id: p.id,
                product_name: p.name,
                sku: p.sku,
                expected_stock: parseFloat(p.in_stock) || 0,
                counted_stock: '',
                cost: parseFloat(p.cost) || 0
            }));
        }
        
        setFormIc({ ...formIc, branch_id: branchId, items: newItems });
    };

    const handleSaveNew = async (status) => {
        if (!formIc.branch_id) return showToast('error', 'Branch is required.');
        if (formIc.type === 'Partial' && formIc.items.length === 0) return showToast('error', 'Add at least 1 item for Partial count.');

        try {
            showToast('loading', 'Creating inventory count...');
            const res = await fetch(`http://localhost:5000/api/inventory-counts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formIc, status })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('success', 'Inventory Count created.');
                fetchData();
                
                if (status === 'In Progress') {
                    // Open count view immediately
                    handleViewDetail(data.id);
                } else {
                    setView('list');
                }
            } else {
                showToast('error', data.error || 'Failed to create count.');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error.');
        }
    };

    const handleSaveProgress = async () => {
        try {
            showToast('loading', 'Saving progress...');
            const res = await fetch(`http://localhost:5000/api/inventory-counts/${currentIc.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: currentIc.items, status: 'In Progress' })
            });
            if (res.ok) {
                showToast('success', 'Progress saved.');
                fetchData();
                setView('list');
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Failed to save progress.');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error.');
        }
    };

    const handleComplete = async () => {
        try {
            showToast('loading', 'Completing inventory count...');
            const res = await fetch(`http://localhost:5000/api/inventory-counts/${currentIc.id}/complete`, {
                method: 'POST'
            });
            if (res.ok) {
                showToast('success', 'Inventory count completed and stock updated!');
                setConfirmModal(false);
                fetchData();
                setView('list');
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Failed to complete.');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error.');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting inventory count...');
            const res = await fetch(`http://localhost:5000/api/inventory-counts/${deleteModal.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast('success', 'Inventory count deleted.');
                fetchData();
                setDeleteModal(null);
                setView('list');
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Failed to delete.');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error.');
        }
    };

    const addProductToPartial = async (product) => {
        if (!formIc.branch_id) return showToast('error', "Select a branch first.");
        
        // Check if already added
        if (formIc.items.find(i => i.product_id === product.id)) return setProductSearch('');

        const newItem = {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            expected_stock: parseFloat(product.in_stock) || 0,
            counted_stock: '',
            cost: parseFloat(product.cost) || 0
        };

        setFormIc({ ...formIc, items: [...formIc.items, newItem] });
        setProductSearch('');
    };

    const updateCountedItem = (index, val) => {
        const newItems = [...currentIc.items];
        newItems[index].counted_stock = val === '' ? '' : parseFloat(val);
        setCurrentIc({ ...currentIc, items: newItems });
    };

    // Filter products for partial search
    const availableProducts = products.filter(p => p.branch_id == formIc.branch_id && p.name.toLowerCase().includes(productSearch.toLowerCase()));

    // Calculations for view mode
    let totalDifference = 0;
    let totalCostDifference = 0;
    let countedItemsCount = 0;
    
    if (currentIc && currentIc.items) {
        currentIc.items.forEach(item => {
            if (item.counted_stock !== null && item.counted_stock !== '') {
                countedItemsCount++;
                const diff = parseFloat(item.counted_stock) - parseFloat(item.expected_stock);
                totalDifference += diff;
                totalCostDifference += (diff * parseFloat(item.cost));
            }
        });
    }

    return (
        <AdminLayout>
            <div className="flex flex-col h-[calc(100vh-2rem)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-shrink-0 animate-fade-in-up">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Inventory Counts</h2>
                        <p className="text-gray-400">Perform partial or full audits of your stock.</p>
                    </div>
                </div>

                {view === 'list' && (
                    <>
                        <div className="flex justify-between items-center mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <button 
                                onClick={handleCreateNew}
                                className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2 uppercase text-sm tracking-wider"
                            >
                                <Plus size={18} /> Add Inventory Count
                            </button>
                        </div>

                        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex-1">
                            <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Status: All</option>
                                </select>
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Branch: All</option>
                                </select>
                                <div className="ml-auto">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                            </div>
                            
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Inventory count #</th>
                                        <th className="px-6 py-4 font-semibold">Date created</th>
                                        <th className="px-6 py-4 font-semibold">Date completed</th>
                                        <th className="px-6 py-4 font-semibold">Branch</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryCounts.map(ic => (
                                        <tr key={ic.id} onClick={() => handleViewDetail(ic.id)} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                                            <td className="px-6 py-4 font-medium text-white">{ic.ic_number}</td>
                                            <td className="px-6 py-4">{ic.created_at ? new Date(ic.created_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '-'}</td>
                                            <td className="px-6 py-4">{ic.completed_at ? new Date(ic.completed_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '—'}</td>
                                            <td className="px-6 py-4">{ic.branch_name || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${ic.status === 'Completed' ? 'bg-green-500/20 text-green-400' : ic.status === 'In Progress' ? 'bg-butterscotch/20 text-butterscotch' : 'bg-gray-500/20 text-gray-400'}`}>
                                                    {ic.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">{ic.type}</td>
                                        </tr>
                                    ))}
                                    {inventoryCounts.length === 0 && (
                                        <tr><td colSpan="6" className="text-center py-8 text-gray-500">No inventory counts found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {view === 'form' && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <button onClick={() => setView('list')} className="text-gray-400 hover:text-white transition-colors mr-2"><ArrowLeft size={20}/></button>
                                    New Inventory Count
                                </h3>
                                <button onClick={() => setView('list')} className="text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <div className="p-6 text-sm text-white">
                                <div className="grid grid-cols-1 gap-y-6 mb-10 max-w-2xl">
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Branch</label>
                                        <select value={formIc.branch_id} onChange={handleBranchChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select a branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Notes</label>
                                        <textarea value={formIc.notes} onChange={e=>setFormIc({...formIc, notes: e.target.value})} rows="2" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-3">Type</label>
                                        <div className="flex gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="ic_type" value="Partial" checked={formIc.type === 'Partial'} onChange={handleTypeChange} className="accent-butterscotch w-4 h-4" />
                                                <span className="text-white">Partial</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="ic_type" value="Full" checked={formIc.type === 'Full'} onChange={handleTypeChange} className="accent-butterscotch w-4 h-4" />
                                                <span className="text-white">Full</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-white/10 rounded-xl mb-8">
                                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 rounded-t-xl">
                                        <h4 className="text-lg font-light">Items</h4>
                                    </div>
                                    
                                    {formIc.type === 'Full' ? (
                                        <div className="p-12 text-center text-gray-400">
                                            All items registered in this branch will be counted.
                                        </div>
                                    ) : (
                                        <div>
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-black/40 text-gray-400 text-xs border-b border-white/10">
                                                    <tr>
                                                        <th className="px-6 py-3 font-normal">Item</th>
                                                        <th className="px-6 py-3 font-normal text-right">Expected stock</th>
                                                        <th className="px-6 py-3 font-normal w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formIc.items.map((item, index) => (
                                                        <tr key={index} className="border-b border-white/5 bg-black/20 group">
                                                            <td className="px-6 py-4 font-medium">{item.product_name} <div className="text-xs text-gray-500 font-normal">SKU {item.sku || '-'}</div></td>
                                                            <td className="px-6 py-4 text-right text-gray-400">{item.expected_stock}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button type="button" onClick={() => {
                                                                    const n = [...formIc.items];
                                                                    n.splice(index, 1);
                                                                    setFormIc({...formIc, items: n});
                                                                }} className="text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            
                                            <div className="relative p-2 bg-black/40 rounded-b-xl">
                                                <div className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-black/20 focus-within:border-butterscotch transition-colors">
                                                    <Search size={16} className="text-gray-500" />
                                                    <input 
                                                        type="text" 
                                                        disabled={!formIc.branch_id}
                                                        placeholder={formIc.branch_id ? "Search item by name..." : "Select branch first to add items..."}
                                                        value={productSearch}
                                                        onChange={e=>setProductSearch(e.target.value)}
                                                        className="bg-transparent border-none focus:outline-none text-white w-full text-sm"
                                                    />
                                                </div>
                                                {productSearch && (
                                                    <div className="absolute left-2 right-2 top-full mt-1 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50">
                                                        {availableProducts.length > 0 ? (
                                                            availableProducts.map(p => (
                                                                <div key={p.id} onClick={() => addProductToPartial(p)} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 text-white flex justify-between">
                                                                    <div>
                                                                        <div>{p.name}</div>
                                                                        <div className="text-xs text-gray-500">SKU {p.sku || '-'}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-gray-400 text-xs">{p.in_stock || 0} in stock</div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-3 text-gray-500 text-sm">No products found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-4 mt-8">
                                    <button type="button" onClick={() => setView('list')} className="px-6 py-2.5 rounded-lg font-bold text-gray-300 hover:text-white transition-colors bg-white/5">Cancel</button>
                                    <button type="button" onClick={() => handleSaveNew('Pending')} className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-2.5 rounded-lg transition-colors uppercase text-sm tracking-wide">Save Pending</button>
                                    <button type="button" onClick={() => handleSaveNew('In Progress')} className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-2.5 rounded-lg shadow-lg transition-transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide">Save & Count</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'count' && currentIc && (
                    <div className="flex-1 overflow-y-auto pb-10 relative">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                                <button onClick={() => setView('list')} className="text-gray-400 font-semibold hover:text-white transition-colors flex items-center gap-2 uppercase text-sm">
                                    <ArrowLeft size={16}/> All inventory counts
                                </button>
                                <div className="flex gap-4">
                                    {currentIc.status !== 'Completed' && (
                                        <button className="text-butterscotch text-sm font-bold tracking-wider uppercase hover:text-butterscotch/80 transition-colors">Count Stock</button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-8 text-white">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-4xl font-light mb-1">{currentIc.ic_number}</h2>
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${currentIc.status === 'Completed' ? 'bg-green-500/20 text-green-400' : currentIc.status === 'In Progress' ? 'bg-butterscotch/20 text-butterscotch' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {currentIc.status}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-8 mb-12 text-sm">
                                    <div>
                                        <div className="mb-1 text-gray-400"><span className="font-semibold text-white">Date created:</span> {currentIc.created_at ? new Date(currentIc.created_at).toLocaleString('en-GB', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-'}</div>
                                        <div className="mb-1 text-gray-400"><span className="font-semibold text-white">Created by:</span> {currentIc.created_by || 'Admin'}</div>
                                        <div className="mt-4 text-gray-400"><span className="font-semibold text-white">Type:</span> {currentIc.type}</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white mb-1">Branch:</div>
                                        <div className="text-gray-400 mb-4">{currentIc.branch_name || '-'}</div>
                                        {currentIc.notes && (
                                            <div className="text-gray-400"><span className="font-semibold text-white block mb-1">Notes:</span> {currentIc.notes}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-8 pb-4">
                                    <h3 className="text-2xl font-light text-white mb-6">Items</h3>
                                </div>

                                <table className="w-full text-left">
                                    <thead className="text-gray-400 text-xs font-medium border-b border-white/10">
                                        <tr>
                                            <th className="py-4 font-normal">Item</th>
                                            <th className="py-4 font-normal text-right">Expected stock</th>
                                            <th className="py-4 font-normal text-right">Counted</th>
                                            <th className="py-4 font-normal text-right">Difference</th>
                                            <th className="py-4 font-normal text-right">Cost difference</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {currentIc.items && currentIc.items.map((item, i) => {
                                            const expected = parseFloat(item.expected_stock) || 0;
                                            const counted = item.counted_stock !== null && item.counted_stock !== '' ? parseFloat(item.counted_stock) : null;
                                            const diff = counted !== null ? counted - expected : null;
                                            const costDiff = diff !== null ? diff * parseFloat(item.cost) : null;

                                            return (
                                                <tr key={i} className="border-b border-white/5">
                                                    <td className="py-4">
                                                        <div className="font-medium text-white">{item.product_name}</div>
                                                        <div className="text-xs text-gray-500">SKU {item.sku || '-'}</div>
                                                    </td>
                                                    <td className="py-4 text-right text-gray-400">{expected}</td>
                                                    <td className="py-4 text-right">
                                                        {currentIc.status === 'Completed' ? (
                                                            <span className="text-white font-medium">{counted !== null ? counted : '—'}</span>
                                                        ) : (
                                                            <input 
                                                                type="number" min="0" 
                                                                value={item.counted_stock !== null ? item.counted_stock : ''} 
                                                                onChange={e=>updateCountedItem(i, e.target.value)} 
                                                                className="w-20 bg-transparent border-b border-white/20 text-white text-right focus:outline-none focus:border-butterscotch px-2 py-1" 
                                                                placeholder="-" 
                                                            />
                                                        )}
                                                    </td>
                                                    <td className={`py-4 text-right ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                        {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '—'}
                                                    </td>
                                                    <td className={`py-4 text-right ${costDiff > 0 ? 'text-green-400' : costDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                        {costDiff !== null ? (costDiff > 0 ? `+${costDiff.toFixed(2)}` : costDiff.toFixed(2)) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        
                                        {/* Totals Row */}
                                        <tr className="bg-white/5 font-bold text-white">
                                            <td colSpan="3" className="py-4 px-4 text-right">Total</td>
                                            <td className={`py-4 text-right ${totalDifference > 0 ? 'text-green-400' : totalDifference < 0 ? 'text-red-400' : ''}`}>
                                                {totalDifference > 0 ? `+${totalDifference}` : totalDifference}
                                            </td>
                                            <td className={`py-4 text-right ${totalCostDifference > 0 ? 'text-green-400' : totalCostDifference < 0 ? 'text-red-400' : ''}`}>
                                                {totalCostDifference > 0 ? `+${totalCostDifference.toFixed(2)}` : totalCostDifference.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {currentIc.status !== 'Completed' && (
                                    <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/10">
                                        <button type="button" onClick={() => setDeleteModal(currentIc)} className="text-red-400 font-bold hover:text-red-300 transition-colors uppercase text-sm tracking-wide flex items-center gap-2"><Trash2 size={16}/> Delete Count</button>
                                        <div className="flex justify-end gap-4">
                                            <button type="button" onClick={handleSaveProgress} className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3 rounded-lg transition-colors uppercase text-sm tracking-wide shadow-sm">Save</button>
                                            <button type="button" onClick={() => setConfirmModal(true)} className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-lg shadow-[0_0_20px_rgba(251,189,5,0.3)] transition-transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide">Complete</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confirmation Modal */}
                        {confirmModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                                <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                                    <div className="p-8">
                                        <h3 className="text-2xl font-bold text-white mb-4">Confirm inventory count</h3>
                                        <p className="text-gray-300 mb-6">
                                            Please confirm changes. This action cannot be undone.
                                        </p>
                                        <ul className="list-disc list-inside text-gray-400 mb-8 space-y-2">
                                            <li>Stock levels of {countedItemsCount} items will be updated.</li>
                                        </ul>
                                        <div className="flex justify-end gap-4">
                                            <button onClick={() => setConfirmModal(false)} className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition-colors uppercase text-sm tracking-wider">Cancel</button>
                                            <button onClick={handleComplete} className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-lg transition-colors uppercase text-sm tracking-wider">Confirm Count</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Delete Modal */}
                        {deleteModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                                <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                                    <div className="flex items-center gap-4 mb-4 text-red-400">
                                        <div className="p-3 bg-red-500/20 rounded-full">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Delete Inventory Count</h3>
                                    </div>
                                    <p className="text-gray-400 mb-6">
                                        Are you sure you want to delete count <span className="text-white font-semibold">{deleteModal.ic_number}</span>? This action cannot be undone.
                                    </p>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                        <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Count</button>
                                    </div>
                                </div>
                            </div>
                        )}
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
