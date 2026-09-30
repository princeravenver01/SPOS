import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, ArrowLeft, Search, CheckCircle, Trash2, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminStockAdjustments() {
    const [stockAdjustments, setStockAdjustments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [view, setView] = useState('list'); // 'list', 'form', 'detail'
    const [currentSa, setCurrentSa] = useState(null);

    const [formSa, setFormSa] = useState({
        branch_id: '',
        reason: 'Receive items',
        sa_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
    });

    const [productSearch, setProductSearch] = useState('');
    const [toast, setToast] = useState(null);

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
            const [saRes, branchRes, prodRes] = await Promise.all([
                fetch('/api/stock-adjustments'),
                fetch('/api/branches'),
                fetch('/api/products')
            ]);
            setStockAdjustments(await saRes.json());
            setBranches(await branchRes.json());
            setProducts(await prodRes.json());
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const fetchSingleSa = async (id) => {
        try {
            const res = await fetch(`/api/stock-adjustments/${id}`);
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleCreateNew = () => {
        setFormSa({
            branch_id: '',
            reason: 'Receive items',
            sa_date: new Date().toISOString().split('T')[0],
            notes: '',
            items: [],
        });
        setCurrentSa(null);
        setView('form');
    };

    const handleViewDetail = async (id) => {
        const sa = await fetchSingleSa(id);
        if (sa) {
            setCurrentSa(sa);
            setView('detail');
        }
    };

    const handleSaveSa = async (e) => {
        e.preventDefault();
        
        if (!formSa.branch_id) return showToast('error', 'Branch is required.');
        if (!formSa.reason) return showToast('error', 'Reason is required.');
        if (!formSa.sa_date) return showToast('error', 'Adjustment date is required.');
        if (!formSa.items || formSa.items.length === 0) return showToast('error', 'At least 1 item is required.');

        try {
            showToast('loading', 'Processing stock adjustment...');
            const res = await fetch(`/api/stock-adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formSa)
            });
            if (res.ok) {
                showToast('success', 'Stock Adjustment completed successfully.');
                fetchData();
                setView('list');
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Failed to complete adjustment.');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error.');
        }
    };

    const addProductToSa = async (product) => {
        if (!formSa.branch_id) {
            return showToast('error', "Please select a branch first.");
        }

        const newItem = {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            in_stock_before: parseFloat(product.in_stock) || 0,
            quantity_adjusted: 0,
            cost: parseFloat(product.cost) || 0
        };

        setFormSa({ ...formSa, items: [...formSa.items, newItem] });
        setProductSearch('');
    };

    const removeProductFromSa = (index) => {
        const newItems = [...formSa.items];
        newItems.splice(index, 1);
        setFormSa({ ...formSa, items: newItems });
    };

    const updateItemQty = (index, qty) => {
        const newItems = [...formSa.items];
        newItems[index].quantity_adjusted = qty === '' ? '' : parseInt(qty);
        setFormSa({ ...formSa, items: newItems });
    };

    const calculateStockAfter = (item) => {
        const qty = parseInt(item.quantity_adjusted) || 0;
        const current = item.in_stock_before;
        if (formSa.reason === 'Receive items') return current + qty;
        if (formSa.reason === 'Loss' || formSa.reason === 'Damage') return current - qty;
        if (formSa.reason === 'Inventory count') return qty;
        return current;
    };

    // Filter products for the search dropdown based on selected Branch
    const availableProducts = products.filter(p => p.branch_id == formSa.branch_id && p.name.toLowerCase().includes(productSearch.toLowerCase()));

    const getQtyHeader = () => {
        if (formSa.reason === 'Receive items') return 'Add stock';
        if (formSa.reason === 'Loss' || formSa.reason === 'Damage') return 'Remove stock';
        if (formSa.reason === 'Inventory count') return 'Counted stock';
        return 'Quantity';
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-[calc(100vh-2rem)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-shrink-0 animate-fade-in-up">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Stock Adjustments</h2>
                        <p className="text-gray-400">Manually adjust inventory counts.</p>
                    </div>
                </div>

                {view === 'list' && (
                    <>
                        {/* Actions */}
                        <div className="flex justify-between items-center mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <button 
                                onClick={handleCreateNew}
                                className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2 uppercase text-sm tracking-wider"
                            >
                                <Plus size={18} /> Add Stock Adjustment
                            </button>
                        </div>

                        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex-1">
                            {/* Toolbar */}
                            <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Reason: All reasons</option>
                                </select>
                                <div className="ml-auto">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                            </div>
                            
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Adjustment #</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Reason</th>
                                        <th className="px-6 py-4 font-semibold">Branch</th>
                                        <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockAdjustments.map(sa => (
                                        <tr key={sa.id} onClick={() => handleViewDetail(sa.id)} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                                            <td className="px-6 py-4 font-medium text-white">{sa.sa_number}</td>
                                            <td className="px-6 py-4">{sa.sa_date ? new Date(sa.sa_date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '-'}</td>
                                            <td className="px-6 py-4">{sa.reason}</td>
                                            <td className="px-6 py-4">{sa.branch_name || '-'}</td>
                                            <td className="px-6 py-4 text-right text-white font-medium">{sa.total_adjusted}</td>
                                        </tr>
                                    ))}
                                    {stockAdjustments.length === 0 && (
                                        <tr><td colSpan="5" className="text-center py-8 text-gray-500">No stock adjustments found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {view === 'detail' && currentSa && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            {/* Header Top Bar */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                                <button onClick={() => setView('list')} className="text-gray-400 font-semibold hover:text-white transition-colors flex items-center gap-2 uppercase text-sm">
                                    <ArrowLeft size={16}/> All stock adjustments
                                </button>
                                <div className="flex items-center gap-6">
                                    <div className="relative group flex items-center h-full py-2 -my-2">
                                        <button className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                            More <ChevronDown size={14}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-8 text-white">
                                {/* Top Section */}
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-4xl font-light mb-1">{currentSa.sa_number}</h2>
                                    </div>
                                </div>
                                
                                {/* Metadata Section */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-sm">
                                    <div className="col-span-2">
                                        <div className="mb-1 text-gray-400"><span className="font-semibold text-white">Date:</span> {currentSa.sa_date ? new Date(currentSa.sa_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '-'}</div>
                                        <div className="mb-1 text-gray-400"><span className="font-semibold text-white">Reason:</span> {currentSa.reason}</div>
                                        <div className="mb-6 text-gray-400"><span className="font-semibold text-white">Adjusted by:</span> {currentSa.adjusted_by || 'Admin'}</div>
                                        
                                        {currentSa.notes && (
                                            <div className="text-gray-400 mt-4"><span className="font-semibold text-white block mb-1">Notes:</span> {currentSa.notes}</div>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <div className="font-semibold text-white mb-2">Branch:</div>
                                        <div className="text-gray-400 leading-relaxed">
                                            {currentSa.branch_name || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Header */}
                                <div className="border-t border-white/10 pt-8 pb-4">
                                    <h3 className="text-2xl font-light text-white mb-6">Items</h3>
                                </div>

                                {/* Items Table */}
                                <table className="w-full text-left">
                                    <thead className="text-gray-400 text-xs font-medium border-b border-white/10">
                                        <tr>
                                            <th className="py-4 font-normal">Item</th>
                                            <th className="py-4 font-normal text-right">
                                                {currentSa.reason === 'Receive items' ? 'Added stock' : currentSa.reason === 'Inventory count' ? 'Counted stock' : 'Removed stock'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {currentSa.items && currentSa.items.map((item, i) => (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="py-4">
                                                    <div className="font-medium text-white">{item.product_name}</div>
                                                    <div className="text-xs text-gray-500">SKU {item.sku || '-'}</div>
                                                </td>
                                                <td className="py-4 text-right text-gray-300">{item.quantity_adjusted}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'form' && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <button onClick={() => setView('list')} className="text-gray-400 hover:text-white transition-colors mr-2"><ArrowLeft size={20}/></button>
                                    New Stock Adjustment
                                </h3>
                                <button onClick={() => setView('list')} className="text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleSaveSa} className="p-6 text-sm text-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10">
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Branch</label>
                                        <select value={formSa.branch_id} onChange={e=>setFormSa({...formSa, branch_id: e.target.value, items: []})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select a branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Reason</label>
                                        <select value={formSa.reason} onChange={e=>setFormSa({...formSa, reason: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="Receive items" className="text-gray-900">Receive items</option>
                                            <option value="Inventory count" className="text-gray-900">Inventory count</option>
                                            <option value="Loss" className="text-gray-900">Loss</option>
                                            <option value="Damage" className="text-gray-900">Damage</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Date</label>
                                        <input type="date" value={formSa.sa_date} onChange={e=>setFormSa({...formSa, sa_date: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-gray-400 font-medium mb-1">Notes</label>
                                        <textarea value={formSa.notes} onChange={e=>setFormSa({...formSa, notes: e.target.value})} rows="3" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Add any notes here..."></textarea>
                                    </div>
                                </div>

                                <h4 className="text-lg font-bold mb-4 flex items-center justify-between">
                                    <span>Items</span>
                                </h4>
                                
                                <div className="border border-white/10 rounded-xl mb-8">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/40 text-gray-400 text-xs uppercase border-b border-white/10">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Item</th>
                                                <th className="px-6 py-3 font-semibold text-right">In stock</th>
                                                <th className="px-6 py-3 font-semibold text-right">{getQtyHeader()}</th>
                                                <th className="px-6 py-3 font-semibold text-right">Cost</th>
                                                <th className="px-6 py-3 font-semibold text-right">Stock after</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formSa.items.map((item, index) => (
                                                <tr key={index} className="border-b border-white/5 bg-black/20 group">
                                                    <td className="px-6 py-4 font-medium">{item.product_name} <div className="text-xs text-gray-500 font-normal">SKU {item.sku || '-'}</div></td>
                                                    <td className="px-6 py-4 text-right text-gray-400">{item.in_stock_before}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <input type="number" min="0" value={item.quantity_adjusted} onChange={e=>updateItemQty(index, e.target.value)} className="w-24 bg-transparent border-b border-white/20 text-white text-right focus:outline-none focus:border-butterscotch px-2 py-1" />
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-400">{item.cost}</td>
                                                    <td className="px-6 py-4 text-right text-white font-semibold">{calculateStockAfter(item)}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button type="button" onClick={() => removeProductFromSa(index)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    {/* Search input attached to bottom of table */}
                                    <div className="relative p-2 bg-black/40">
                                        <div className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-black/20 focus-within:border-butterscotch transition-colors">
                                            <Search size={16} className="text-gray-500" />
                                            <input 
                                                type="text" 
                                                disabled={!formSa.branch_id}
                                                placeholder={formSa.branch_id ? "Search item by name..." : "Select branch first to add items..."}
                                                value={productSearch}
                                                onChange={e=>setProductSearch(e.target.value)}
                                                className="bg-transparent border-none focus:outline-none text-white w-full text-sm"
                                            />
                                        </div>
                                        {/* Dropdown for search */}
                                        {productSearch && (
                                            <div className="absolute left-2 right-2 top-full mt-1 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50">
                                                {availableProducts.length > 0 ? (
                                                    availableProducts.map(p => (
                                                        <div key={p.id} onClick={() => addProductToSa(p)} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 text-white flex justify-between">
                                                            <div>
                                                                <div>{p.name}</div>
                                                                <div className="text-xs text-gray-500">SKU {p.sku || '-'}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-butterscotch text-xs">{p.in_stock || 0} in stock</div>
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

                                <div className="flex justify-end gap-4 mt-8">
                                    <button type="button" onClick={() => setView('list')} className="px-6 py-2.5 rounded-lg font-bold text-gray-300 hover:text-white transition-colors">Cancel</button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-2.5 rounded-lg shadow-lg transition-transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide">Adjust</button>
                                </div>
                            </form>
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
