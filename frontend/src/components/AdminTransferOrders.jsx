import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, X, Edit2, Trash2, CheckCircle, Search, Download, ChevronDown, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminTransferOrders() {
    const [transferOrders, setTransferOrders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [view, setView] = useState('list'); // 'list', 'form', 'receive', 'detail'
    const [currentTo, setCurrentTo] = useState(null);

    const [formTo, setFormTo] = useState({
        source_branch_id: '',
        dest_branch_id: '',
        to_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
    });

    const [productSearch, setProductSearch] = useState('');
    const [receiveData, setReceiveData] = useState([]); // Array of items to receive

    const [isSending, setIsSending] = useState(false);
    const [toast, setToast] = useState(null);
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
            const [tosRes, branchRes, prodRes] = await Promise.all([
                fetch('/api/transfer-orders'),
                fetch('/api/branches'),
                fetch('/api/products')
            ]);
            setTransferOrders(await tosRes.json());
            setBranches(await branchRes.json());
            setProducts(await prodRes.json());
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const fetchSingleTo = async (id) => {
        try {
            const res = await fetch(`/api/transfer-orders/${id}`);
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleCreateNew = () => {
        setFormTo({
            source_branch_id: '',
            dest_branch_id: '',
            to_date: new Date().toISOString().split('T')[0],
            notes: '',
            items: [],
        });
        setCurrentTo(null);
        setView('form');
    };

    const handleEdit = async (id) => {
        const to = await fetchSingleTo(id);
        if (to) {
            setFormTo({
                source_branch_id: to.source_branch_id || '',
                dest_branch_id: to.dest_branch_id || '',
                to_date: to.to_date ? to.to_date.split('T')[0] : '',
                notes: to.notes || '',
                items: to.items || [],
                status: to.status
            });
            setCurrentTo(to);
            setView('form');
        }
    };

    const handleViewDetail = async (id) => {
        const to = await fetchSingleTo(id);
        if (to) {
            setCurrentTo(to);
            setView('detail');
        }
    };

    const handleOpenReceive = async (id) => {
        const to = await fetchSingleTo(id);
        if (to) {
            setCurrentTo(to);
            setReceiveData(to.items.map(item => ({
                id: item.id,
                dest_product_id: item.dest_product_id,
                name: item.product_name,
                sku: item.sku,
                ordered: item.quantity,
                received: item.received,
                to_receive: 0
            })));
            setView('receive');
        }
    };

    const handleSaveTo = async (e) => {
        e.preventDefault();
        
        if (!formTo.source_branch_id) return showToast('error', 'Source branch is required.');
        if (!formTo.dest_branch_id) return showToast('error', 'Destination branch is required.');
        if (formTo.source_branch_id === formTo.dest_branch_id) return showToast('error', 'Source and destination cannot be the same branch.');
        if (!formTo.to_date) return showToast('error', 'Transfer order date is required.');
        if (!formTo.items || formTo.items.length === 0) return showToast('error', 'At least 1 item is required.');

        try {
            showToast('loading', 'Saving transfer order...');
            const method = currentTo ? 'PUT' : 'POST';
            const url = currentTo ? `/api/transfer-orders/${currentTo.id}` : `/api/transfer-orders`;
            
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formTo)
            });
            fetchData();
            setView('list');
            showToast('success', 'Transfer order saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save transfer order');
        }
    };

    const handleReceiveItems = async () => {
        try {
            const itemsToReceive = receiveData.filter(item => item.to_receive > 0).map(item => ({
                id: item.id,
                dest_product_id: item.dest_product_id,
                receive_qty: parseInt(item.to_receive) || 0
            }));
            
            if (itemsToReceive.length === 0) return showToast('error', 'Enter quantities to receive');

            showToast('loading', 'Receiving items...');
            await fetch(`/api/transfer-orders/${currentTo.id}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemsToReceive })
            });
            fetchData();
            setView('list');
            showToast('success', 'Items received successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to receive items');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting transfer order...');
            await fetch(`/api/transfer-orders/${deleteModal.id}`, { method: 'DELETE' });
            fetchData();
            setDeleteModal(null);
            if (view === 'detail') setView('list');
            showToast('success', 'Transfer order deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete transfer order');
        }
    };

    const handleSend = async (id) => {
        setIsSending(true);
        showToast('loading', 'Sending transfer order...');
        try {
            const res = await fetch(`/api/transfer-orders/${id}/send`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                showToast('success', 'Transfer Order sent! Stock deducted from source.');
                fetchData();
            } else {
                showToast('error', data.error || 'Failed to send');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error. Failed to send.');
        } finally {
            setIsSending(false);
        }
    };

    const addProductToTo = async (product) => {
        if (!formTo.source_branch_id || !formTo.dest_branch_id) {
            return showToast('error', "Please select a Source and Destination branch first.");
        }

        // Product matching: Find matching product in DESTINATION branch by SKU (or name if no SKU)
        const destProduct = products.find(p => p.branch_id == formTo.dest_branch_id && ((product.sku && p.sku === product.sku) || (!product.sku && p.name === product.name)));

        if (!destProduct) {
            return showToast('error', "Product not registered in destination branch. Please sync it first.");
        }

        const newItem = {
            source_product_id: product.id,
            dest_product_id: destProduct.id,
            product_name: product.name,
            sku: product.sku,
            source_stock: product.in_stock || 0,
            dest_stock: destProduct.in_stock || 0,
            quantity: 1
        };

        const newItems = [...formTo.items, newItem];
        setFormTo({ ...formTo, items: newItems });
        setProductSearch('');
    };

    const removeProductFromTo = (index) => {
        const newItems = [...formTo.items];
        newItems.splice(index, 1);
        setFormTo({ ...formTo, items: newItems });
    };

    const updateItemQty = (index, qty) => {
        const newItems = [...formTo.items];
        newItems[index].quantity = qty === '' ? '' : parseInt(qty);
        setFormTo({ ...formTo, items: newItems });
    };

    // Filter products for the search dropdown based on selected Source Branch
    const availableSourceProducts = products.filter(p => p.branch_id == formTo.source_branch_id && p.name.toLowerCase().includes(productSearch.toLowerCase()));

    return (
        <AdminLayout>
            <div className="flex flex-col h-[calc(100vh-2rem)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-shrink-0 animate-fade-in-up">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">Transfer Orders</h2>
                        <p className="text-gray-400">Manage stock transfers between branches.</p>
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
                                <Plus size={18} /> Add Transfer Order
                            </button>
                        </div>

                        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex-1">
                            {/* Toolbar */}
                            <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Status: All</option>
                                </select>
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Source: All branches</option>
                                </select>
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Destination: All branches</option>
                                </select>
                                <div className="ml-auto">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                            </div>
                            
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Transfer order #</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Received</th>
                                        <th className="px-6 py-4 font-semibold">Source branch</th>
                                        <th className="px-6 py-4 font-semibold">Destination branch</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transferOrders.map(to => {
                                        return (
                                            <tr key={to.id} onClick={() => handleViewDetail(to.id)} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                                                <td className="px-6 py-4 font-medium text-white">{to.to_number}</td>
                                                <td className="px-6 py-4">{to.to_date ? new Date(to.to_date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '-'}</td>
                                                <td className="px-6 py-4">{to.status === 'Transferred' ? new Date(to.updated_at).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '-'}</td>
                                                <td className="px-6 py-4">{to.source_branch_name || '-'}</td>
                                                <td className="px-6 py-4">{to.dest_branch_name || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-semibold ${to.status === 'Draft' ? 'text-red-400' : to.status === 'Transferred' ? 'text-gray-500' : to.status === 'Partially Received' ? 'text-butterscotch' : 'text-blue-300'}`}>
                                                        {to.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-white font-medium">{to.total_ordered}</td>
                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-3 relative group">
                                                        <span className="text-gray-400 hover:text-white font-semibold cursor-pointer text-xs">MORE <ChevronDown size={14} className="inline"/></span>
                                                        
                                                        {/* Dropdown Menu */}
                                                        <div className="absolute right-0 top-full mt-2 w-32 glass-panel border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                                                            {to.status !== 'Draft' && to.status !== 'Transferred' && (
                                                                <button onClick={() => handleOpenReceive(to.id)} className="text-left px-4 py-2.5 hover:bg-white/5 text-xs font-semibold text-white">Receive</button>
                                                            )}
                                                            {to.status !== 'Partially Received' && to.status !== 'Transferred' && (
                                                                <button onClick={() => handleEdit(to.id)} className="text-left px-4 py-2.5 hover:bg-white/5 text-xs font-semibold text-white">Edit</button>
                                                            )}
                                                            {to.status === 'Draft' && (
                                                                <button onClick={() => handleSend(to.id)} disabled={isSending} className="text-left px-4 py-2.5 hover:bg-white/5 text-xs font-semibold text-white disabled:opacity-50">{isSending ? 'Sending...' : 'Send'}</button>
                                                            )}
                                                            {to.status !== 'Partially Received' && to.status !== 'Transferred' && to.status !== 'In transit' && (
                                                                <button onClick={() => setDeleteModal({id: to.id, name: to.to_number})} className="text-left px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-xs font-semibold">Delete</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {transferOrders.length === 0 && (
                                        <tr><td colSpan="8" className="text-center py-8 text-gray-500">No transfer orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {view === 'detail' && currentTo && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            {/* Header Top Bar */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                                <button onClick={() => setView('list')} className="text-gray-400 font-semibold hover:text-white transition-colors flex items-center gap-2 uppercase text-sm">
                                    <ArrowLeft size={16}/> Transfer orders
                                </button>
                                <div className="flex items-center gap-6">
                                    {currentTo.status !== 'Draft' && currentTo.status !== 'Transferred' && (
                                        <button onClick={() => handleOpenReceive(currentTo.id)} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider">Receive</button>
                                    )}
                                    {currentTo.status !== 'Partially Received' && currentTo.status !== 'Transferred' && (
                                        <button onClick={() => handleEdit(currentTo.id)} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider">Edit</button>
                                    )}
                                    {currentTo.status === 'Draft' && (
                                        <button onClick={() => handleSend(currentTo.id)} disabled={isSending} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider disabled:opacity-50">{isSending ? 'Sending...' : 'Send'}</button>
                                    )}
                                    
                                    <div className="relative group flex items-center h-full py-2 -my-2">
                                        <button className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                            More <ChevronDown size={14}/>
                                        </button>
                                        <div className="absolute right-0 top-full w-32 glass-panel border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                                            {currentTo.status !== 'Partially Received' && currentTo.status !== 'Transferred' && currentTo.status !== 'In transit' && (
                                                <button onClick={() => setDeleteModal({id: currentTo.id, name: currentTo.to_number})} className="text-left px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-xs font-semibold">Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-8 text-white">
                                {/* Top Section */}
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-4xl font-light mb-1">{currentTo.to_number}</h2>
                                        <div className="text-gray-400 text-sm">{currentTo.status}</div>
                                    </div>
                                    <div className="w-48 text-right">
                                        <div className="w-full bg-black/40 h-2 rounded-full mb-2 overflow-hidden border border-white/10">
                                            <div className="bg-white/70 h-2 rounded-full" style={{width: `${currentTo.total_ordered > 0 ? Math.round((currentTo.total_received / currentTo.total_ordered) * 100) : 0}%`}}></div>
                                        </div>
                                        <div className="text-xs text-gray-400">Received {currentTo.total_received || 0} of {currentTo.total_ordered || 0}</div>
                                    </div>
                                </div>
                                
                                {/* Metadata Section */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-sm">
                                    <div className="col-span-2">
                                        <div className="mb-1 text-gray-400"><span className="font-semibold text-white">Date:</span> {currentTo.to_date ? new Date(currentTo.to_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '-'}</div>
                                        <div className="mb-6 text-gray-400"><span className="font-semibold text-white">Ordered by:</span> Admin</div>
                                        
                                        <div className="font-semibold text-white mb-2 mt-4">Source branch:</div>
                                        <div className="text-gray-400 leading-relaxed">
                                            {currentTo.source_branch_name || '-'}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="font-semibold text-white mb-2 mt-[4.5rem]">Destination branch:</div>
                                        <div className="text-gray-400 leading-relaxed">
                                            {currentTo.dest_branch_name || '-'}
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
                                            <th className="py-4 font-normal text-right">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {currentTo.items && currentTo.items.map((item, i) => (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="py-4">
                                                    <div className="font-medium text-white">{item.product_name}</div>
                                                    <div className="text-xs text-gray-500">SKU {item.sku || '-'}</div>
                                                </td>
                                                <td className="py-4 text-right text-gray-300">{item.quantity}</td>
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
                                    {currentTo ? currentTo.to_number : 'New Transfer Order'}
                                    <span className="ml-2 text-xs font-medium text-gray-400 border border-white/10 px-2 py-0.5 rounded">{currentTo ? currentTo.status : 'Draft'}</span>
                                </h3>
                                <button onClick={() => setView('list')} className="text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleSaveTo} className="p-6 text-sm text-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10">
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Source branch</label>
                                        <select value={formTo.source_branch_id} onChange={e=>setFormTo({...formTo, source_branch_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select a branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Destination branch</label>
                                        <select value={formTo.dest_branch_id} onChange={e=>setFormTo({...formTo, dest_branch_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select a branch</option>
                                            {branches.filter(b => b.id != formTo.source_branch_id).map(b => <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Date of transfer order</label>
                                        <input type="date" value={formTo.to_date} onChange={e=>setFormTo({...formTo, to_date: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-gray-400 font-medium mb-1">Notes</label>
                                        <textarea value={formTo.notes} onChange={e=>setFormTo({...formTo, notes: e.target.value})} rows="3" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Add any notes here..."></textarea>
                                    </div>
                                </div>

                                <h4 className="text-lg font-bold mb-4 flex items-center justify-between">
                                    <span>Items</span>
                                    <button type="button" className="text-butterscotch text-xs uppercase tracking-wider font-bold">Import</button>
                                </h4>
                                
                                <div className="border border-white/10 rounded-xl mb-8">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-black/40 text-gray-400 text-xs uppercase border-b border-white/10">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Item</th>
                                                <th className="px-6 py-3 font-semibold text-right">Source stock</th>
                                                <th className="px-6 py-3 font-semibold text-right">Destination stock</th>
                                                <th className="px-6 py-3 font-semibold text-right">Quantity</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formTo.items.map((item, index) => (
                                                <tr key={index} className="border-b border-white/5 bg-black/20 group">
                                                    <td className="px-6 py-4 font-medium">{item.product_name} <div className="text-xs text-gray-500 font-normal">SKU {item.sku || '-'}</div></td>
                                                    <td className="px-6 py-4 text-right text-gray-400">{item.source_stock || 0}</td>
                                                    <td className="px-6 py-4 text-right text-gray-400">{item.dest_stock || 0}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <input type="number" min="1" value={item.quantity} onChange={e=>updateItemQty(index, e.target.value)} className="w-24 bg-transparent border-b border-white/20 text-white text-right focus:outline-none focus:border-butterscotch px-2 py-1" />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button type="button" onClick={() => removeProductFromTo(index)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
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
                                                disabled={!formTo.source_branch_id}
                                                placeholder={formTo.source_branch_id ? "Search item by name in source branch..." : "Select source branch first to add items..."}
                                                value={productSearch}
                                                onChange={e=>setProductSearch(e.target.value)}
                                                className="bg-transparent border-none focus:outline-none text-white w-full text-sm"
                                            />
                                        </div>
                                        {/* Dropdown for search */}
                                        {productSearch && (
                                            <div className="absolute left-2 right-2 top-full mt-1 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-50">
                                                {availableSourceProducts.length > 0 ? (
                                                    availableSourceProducts.map(p => (
                                                        <div key={p.id} onClick={() => addProductToTo(p)} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 text-white flex justify-between">
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
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-2.5 rounded-lg shadow-lg transition-transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'receive' && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <button onClick={() => setView('list')} className="text-gray-400 hover:text-white transition-colors mr-2"><ArrowLeft size={20}/></button>
                                    Receive Transfer Order {currentTo?.to_number}
                                </h3>
                            </div>
                            <div className="p-6">
                                <table className="w-full text-left text-sm mb-8">
                                    <thead className="bg-black/40 text-gray-400 text-xs uppercase border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Item</th>
                                            <th className="px-6 py-3 font-semibold text-right">Ordered</th>
                                            <th className="px-6 py-3 font-semibold text-right">Received</th>
                                            <th className="px-6 py-3 font-semibold text-right text-butterscotch">To Receive</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receiveData.map((item, index) => (
                                            <tr key={index} className="border-b border-white/5 bg-black/20">
                                                <td className="px-6 py-4 font-medium text-white">{item.name} <div className="text-xs text-gray-500 font-normal">SKU {item.sku || '-'}</div></td>
                                                <td className="px-6 py-4 text-right text-gray-400">{item.ordered}</td>
                                                <td className="px-6 py-4 text-right text-gray-400">{item.received}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {item.received >= item.ordered ? (
                                                        <span className="text-green-400 font-semibold"><CheckCircle size={16} className="inline mr-1"/> Done</span>
                                                    ) : (
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max={item.ordered - item.received}
                                                            value={item.to_receive}
                                                            onChange={e => {
                                                                const newData = [...receiveData];
                                                                newData[index].to_receive = e.target.value === '' ? '' : parseInt(e.target.value);
                                                                setReceiveData(newData);
                                                            }}
                                                            className="w-24 bg-transparent border-b border-butterscotch text-white text-right focus:outline-none px-2 py-1" 
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex justify-end gap-4">
                                    <button onClick={() => setView('list')} className="px-6 py-2.5 rounded-lg font-bold text-gray-300 hover:text-white transition-colors">Cancel</button>
                                    <button onClick={handleReceiveItems} className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-2.5 rounded-lg shadow-lg transition-transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide">Receive Items</button>
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
                                <h3 className="text-xl font-bold text-white">Delete Transfer Order</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete TO <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete TO</button>
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
