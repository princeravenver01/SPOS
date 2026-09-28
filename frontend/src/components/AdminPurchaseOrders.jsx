import React, { useState, useEffect } from 'react';
import { PackageSearch, Plus, X, Edit2, Trash2, CheckCircle, Search, Download, ChevronDown, Mail, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminPurchaseOrders() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [view, setView] = useState('list'); // 'list', 'form', 'receive'
    const [currentPo, setCurrentPo] = useState(null);

    const [formPo, setFormPo] = useState({
        supplier_id: '',
        branch_id: '',
        po_date: new Date().toISOString().split('T')[0],
        expected_on: '',
        notes: '',
        items: [],
        total_amount: 0
    });

    const [productSearch, setProductSearch] = useState('');
    const [receiveData, setReceiveData] = useState([]); // Array of items to receive

    const [isSending, setIsSending] = useState(false);
    
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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [posRes, suppRes, branchRes, prodRes] = await Promise.all([
                fetch('http://localhost:5000/api/purchase-orders'),
                fetch('http://localhost:5000/api/suppliers'),
                fetch('http://localhost:5000/api/branches'),
                fetch('http://localhost:5000/api/products')
            ]);
            setPurchaseOrders(await posRes.json());
            setSuppliers(await suppRes.json());
            setBranches(await branchRes.json());
            setProducts(await prodRes.json());
        } catch (err) {
            console.error('Error fetching data', err);
        }
    };

    const fetchSinglePo = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/purchase-orders/${id}`);
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleCreateNew = () => {
        setFormPo({
            supplier_id: '',
            branch_id: '',
            po_date: new Date().toISOString().split('T')[0],
            expected_on: '',
            notes: '',
            items: [],
            total_amount: 0
        });
        setCurrentPo(null);
        setView('form');
    };

    const handleEdit = async (id) => {
        const po = await fetchSinglePo(id);
        if (po) {
            setFormPo({
                supplier_id: po.supplier_id || '',
                branch_id: po.branch_id || '',
                po_date: po.po_date ? po.po_date.split('T')[0] : '',
                expected_on: po.expected_on ? po.expected_on.split('T')[0] : '',
                notes: po.notes || '',
                items: po.items || [],
                total_amount: po.total_amount,
                status: po.status
            });
            setCurrentPo(po);
            setView('form');
        }
    };

    const handleViewDetail = async (id) => {
        const po = await fetchSinglePo(id);
        if (po) {
            setCurrentPo(po);
            setView('detail');
        }
    };

    const handleOpenReceive = async (id) => {
        const po = await fetchSinglePo(id);
        if (po) {
            setCurrentPo(po);
            setReceiveData(po.items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                name: item.product_name,
                sku: item.sku,
                ordered: item.quantity,
                received: item.received,
                to_receive: 0
            })));
            setView('receive');
        }
    };

    const handleSavePo = async (e) => {
        e.preventDefault();
        
        if (!formPo.supplier_id) return showToast('error', 'Supplier is required.');
        if (!formPo.branch_id) return showToast('error', 'Destination branch is required.');
        if (!formPo.po_date) return showToast('error', 'Purchase order date is required.');
        if (!formPo.expected_on) return showToast('error', 'Expected on date is required.');
        if (!formPo.items || formPo.items.length === 0) return showToast('error', 'At least 1 item is required.');

        try {
            showToast('loading', 'Saving purchase order...');
            const method = currentPo ? 'PUT' : 'POST';
            const url = currentPo ? `http://localhost:5000/api/purchase-orders/${currentPo.id}` : `http://localhost:5000/api/purchase-orders`;
            
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formPo)
            });
            fetchData();
            setView('list');
            showToast('success', 'Purchase order saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save purchase order');
        }
    };

    const handleReceiveItems = async () => {
        try {
            const itemsToReceive = receiveData.filter(item => item.to_receive > 0).map(item => ({
                id: item.id,
                product_id: item.product_id,
                receive_qty: parseInt(item.to_receive) || 0
            }));
            
            if (itemsToReceive.length === 0) return showToast('error', 'Enter quantities to receive');

            showToast('loading', 'Receiving items...');
            await fetch(`http://localhost:5000/api/purchase-orders/${currentPo.id}/receive`, {
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
            showToast('loading', 'Deleting purchase order...');
            await fetch(`http://localhost:5000/api/purchase-orders/${deleteModal.id}`, { method: 'DELETE' });
            fetchData();
            setDeleteModal(null);
            if (view === 'detail') setView('list');
            showToast('success', 'Purchase order deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete purchase order');
        }
    };

    const handleSend = async (id) => {
        setIsSending(true);
        showToast('loading', 'Sending email to supplier...');
        try {
            const res = await fetch(`http://localhost:5000/api/purchase-orders/${id}/send`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                showToast('success', 'Email sent successfully to supplier!');
                fetchData();
            } else {
                showToast('error', data.error || 'Failed to send email');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network error. Failed to send email.');
        } finally {
            setIsSending(false);
        }
    };

    const addProductToPo = async (product) => {
        // Fetch incoming count for this product just for display in form
        let incoming = 0;
        try {
            const res = await fetch(`http://localhost:5000/api/purchase-orders`);
            const allPos = await res.json();
            for(let p of allPos) {
                if(p.status === 'Pending' || p.status === 'Partially Received') {
                    const single = await fetchSinglePo(p.id);
                    const item = single.items.find(i => i.product_id === product.id);
                    if(item) {
                        incoming += (item.quantity - item.received);
                    }
                }
            }
        } catch(e) {}

        const newItem = {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            current_stock: product.stock,
            incoming_stock: incoming,
            quantity: 1,
            cost: product.cost || 0,
            amount: product.cost || 0
        };

        const newItems = [...formPo.items, newItem];
        updateFormTotals(newItems);
        setProductSearch('');
    };

    const removeProductFromPo = (index) => {
        const newItems = [...formPo.items];
        newItems.splice(index, 1);
        updateFormTotals(newItems);
    };

    const updateItemQty = (index, qty) => {
        const newItems = [...formPo.items];
        newItems[index].quantity = qty === '' ? '' : parseInt(qty);
        const q = qty === '' ? 0 : (parseInt(qty) || 0);
        const c = parseFloat(newItems[index].cost) || 0;
        newItems[index].amount = q * c;
        updateFormTotals(newItems);
    };

    const updateItemCost = (index, cost) => {
        const newItems = [...formPo.items];
        newItems[index].cost = cost === '' ? '' : cost;
        const q = parseInt(newItems[index].quantity) || 0;
        const c = cost === '' ? 0 : (parseFloat(cost) || 0);
        newItems[index].amount = q * c;
        updateFormTotals(newItems);
    };

    const updateFormTotals = (items) => {
        const total = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        setFormPo({ ...formPo, items, total_amount: total });
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())));

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                
                {view === 'list' && (
                    <>
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">Purchase Orders</h2>
                                <p className="text-sm text-gray-400">Manage incoming inventory from suppliers.</p>
                            </div>
                        <button 
                                onClick={handleCreateNew}
                                className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2 uppercase text-sm tracking-wider"
                            >
                                <Plus size={18} /> Add Purchase Order
                            </button>
                        </div>

                        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex-1">
                            {/* Toolbar */}
                            <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Status: All</option>
                                </select>
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Supplier: All suppliers</option>
                                </select>
                                <select className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer appearance-none">
                                    <option className="text-gray-900">Branch: All branches</option>
                                </select>
                                <div className="ml-auto">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                            </div>
                            
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Purchase order #</th>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">Supplier</th>
                                        <th className="px-6 py-4 font-semibold">Branch</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold">Received</th>
                                        <th className="px-6 py-4 font-semibold">Expected on</th>
                                        <th className="px-6 py-4 font-semibold text-right">Total</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseOrders.map(po => {
                                        const progress = po.total_ordered > 0 ? Math.round((po.total_received / po.total_ordered) * 100) : 0;
                                        return (
                                            <tr key={po.id} onClick={() => handleViewDetail(po.id)} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                                                <td className="px-6 py-4 font-medium text-white">{po.po_number}</td>
                                                <td className="px-6 py-4">{po.po_date ? new Date(po.po_date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '-'}</td>
                                                <td className="px-6 py-4">{po.supplier_name || '-'}</td>
                                                <td className="px-6 py-4">{po.branch_name || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-semibold ${po.status === 'Draft' ? 'text-red-400' : po.status === 'Closed' ? 'text-gray-500' : po.status === 'Partially Received' ? 'text-butterscotch' : 'text-gray-300'}`}>
                                                        {po.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="w-24">
                                                        <div className="w-full bg-black/40 h-2 rounded-full mb-1 overflow-hidden">
                                                            <div className="bg-butterscotch h-2 rounded-full" style={{width: `${progress}%`}}></div>
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">{po.total_received} of {po.total_ordered}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{po.expected_on ? new Date(po.expected_on).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}) : '-'}</td>
                                                <td className="px-6 py-4 text-right text-white font-medium">{po.total_amount ? parseFloat(po.total_amount).toFixed(2) : '0.00'}</td>
                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-3 relative group">
                                                        <span className="text-gray-400 hover:text-white font-semibold cursor-pointer text-xs">MORE <ChevronDown size={14} className="inline"/></span>
                                                        
                                                        {/* Dropdown Menu */}
                                                        <div className="absolute right-0 top-full mt-2 w-32 glass-panel border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                                                            {po.status !== 'Draft' && po.status !== 'Closed' && (
                                                                <button onClick={() => handleOpenReceive(po.id)} className="text-left px-4 py-2.5 hover:bg-white/5 text-xs font-semibold text-white">Receive</button>
                                                            )}
                                                            {po.status !== 'Partially Received' && po.status !== 'Closed' && (
                                                                <button onClick={() => handleEdit(po.id)} className="text-left px-4 py-2.5 hover:bg-white/5 text-xs font-semibold text-white">Edit</button>
                                                            )}
                                                            {po.status !== 'Partially Received' && po.status !== 'Closed' && (
                                                                <button onClick={() => handleSend(po.id)} disabled={isSending} className="text-left px-4 py-2.5 hover:bg-white/5 text-xs font-semibold text-white disabled:opacity-50">{isSending ? 'Sending...' : 'Send'}</button>
                                                            )}
                                                            {po.status !== 'Partially Received' && po.status !== 'Closed' && (
                                                                <button onClick={() => setDeleteModal({id: po.id, name: po.po_number})} className="text-left px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-xs font-semibold">Delete</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {purchaseOrders.length === 0 && (
                                        <tr><td colSpan="9" className="text-center py-8 text-gray-500">No purchase orders found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {view === 'detail' && currentPo && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up">
                            {/* Header Top Bar */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                                <button onClick={() => setView('list')} className="text-gray-400 font-semibold hover:text-white transition-colors flex items-center gap-2 uppercase text-sm">
                                    <ArrowLeft size={16}/> Purchase orders
                                </button>
                                <div className="flex items-center gap-6">
                                    {currentPo.status !== 'Draft' && currentPo.status !== 'Closed' && (
                                        <button onClick={() => handleOpenReceive(currentPo.id)} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider">Receive</button>
                                    )}
                                    {currentPo.status !== 'Partially Received' && currentPo.status !== 'Closed' && (
                                        <button onClick={() => handleEdit(currentPo.id)} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider">Edit</button>
                                    )}
                                    {currentPo.status !== 'Partially Received' && currentPo.status !== 'Closed' && (
                                        <button onClick={() => handleSend(currentPo.id)} disabled={isSending} className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider disabled:opacity-50">{isSending ? 'Sending...' : 'Send'}</button>
                                    )}
                                    
                                    <div className="relative group flex items-center h-full py-2 -my-2">
                                        <button className="text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                            More <ChevronDown size={14}/>
                                        </button>
                                        <div className="absolute right-0 top-full w-32 glass-panel border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                                            {currentPo.status !== 'Partially Received' && currentPo.status !== 'Closed' && (
                                                <button onClick={() => setDeleteModal({id: currentPo.id, name: currentPo.po_number})} className="text-left px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-xs font-semibold">Delete</button>
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
                                        <h2 className="text-4xl font-light mb-1">{currentPo.po_number}</h2>
                                        <div className="text-gray-400 text-sm">{currentPo.status}</div>
                                    </div>
                                    <div className="w-48 text-right">
                                        <div className="w-full bg-black/40 h-2 rounded-full mb-2 overflow-hidden border border-white/10">
                                            <div className="bg-white/70 h-2 rounded-full" style={{width: `${currentPo.total_ordered > 0 ? Math.round((currentPo.total_received / currentPo.total_ordered) * 100) : 0}%`}}></div>
                                        </div>
                                        <div className="text-xs text-gray-400">Received {currentPo.total_received || 0} of {currentPo.total_ordered || 0}</div>
                                    </div>
                                </div>
                                
                                {/* Metadata Section */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-sm">
                                    <div className="col-span-2">
                                        <div className="mb-1 text-gray-400"><span className="font-semibold text-white">Date:</span> {currentPo.po_date ? new Date(currentPo.po_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '-'}</div>
                                        <div className="mb-6 text-gray-400"><span className="font-semibold text-white">Ordered by:</span> Admin</div>
                                        
                                        <div className="font-semibold text-white mb-2 mt-4">Supplier:</div>
                                        <div className="text-gray-400 leading-relaxed">
                                            {currentPo.supplier_name || '-'}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="font-semibold text-white mb-2 mt-[4.5rem]">Destination branch:</div>
                                        <div className="text-gray-400 leading-relaxed">
                                            {currentPo.branch_name || '-'}
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
                                            <th className="py-4 font-normal text-right">Purchase cost</th>
                                            <th className="py-4 font-normal text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {currentPo.items && currentPo.items.map((item, i) => (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="py-4">
                                                    <div className="font-medium text-white">{item.product_name}</div>
                                                    <div className="text-xs text-gray-500">SKU {item.sku || '-'}</div>
                                                </td>
                                                <td className="py-4 text-right text-gray-300">{item.quantity}</td>
                                                <td className="py-4 text-right text-gray-300">{parseFloat(item.cost || 0).toFixed(2)}</td>
                                                <td className="py-4 text-right text-white font-medium">{parseFloat(item.amount || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Footer Total */}
                                <div className="flex justify-end pt-6 border-t border-white/10 gap-8 mt-2">
                                    <div className="text-base font-bold text-white">Total</div>
                                    <div className="text-base font-bold text-white w-24 text-right">{parseFloat(currentPo.total_amount || 0).toFixed(2)}</div>
                                </div>
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
                                    {currentPo ? currentPo.po_number : 'New Purchase Order'}
                                    <span className="ml-2 text-xs font-medium text-gray-400 font-normal border border-white/10 px-2 py-0.5 rounded">{currentPo ? currentPo.status : 'Draft'}</span>
                                </h3>
                                <button onClick={() => setView('list')} className="text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleSavePo} className="p-6 text-sm text-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10">
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Supplier</label>
                                        <select value={formPo.supplier_id} onChange={e=>setFormPo({...formPo, supplier_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select a supplier</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Destination branch</label>
                                        <select value={formPo.branch_id} onChange={e=>setFormPo({...formPo, branch_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select a branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Purchase order date</label>
                                        <input type="date" value={formPo.po_date} onChange={e=>setFormPo({...formPo, po_date: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">Expected on</label>
                                        <input type="date" value={formPo.expected_on} onChange={e=>setFormPo({...formPo, expected_on: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-gray-400 font-medium mb-1">Notes</label>
                                        <textarea value={formPo.notes} onChange={e=>setFormPo({...formPo, notes: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors h-24 resize-none"></textarea>
                                    </div>
                                </div>
    
                                <div className="mb-4 flex items-center justify-between border-t border-white/10 pt-8">
                                    <h4 className="text-xl font-medium text-white">Items</h4>
                                </div>
    
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input type="text" value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search item" className="w-full bg-black/20 border border-white/10 rounded-lg focus:border-butterscotch py-3 pl-10 pr-4 outline-none text-sm text-white" />
                                    
                                    {productSearch && (
                                        <div className="absolute top-full left-0 right-0 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl mt-1 z-30 max-h-60 overflow-y-auto">
                                            {filteredProducts.map(p => (
                                                <div key={p.id} onClick={() => addProductToPo(p)} className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 flex justify-between">
                                                    <span>{p.name} <span className="text-xs text-gray-400 ml-2">{p.sku}</span></span>
                                                    <span className="text-gray-400 text-xs">Cost: {p.cost}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
    
                                <table className="w-full text-left border-t border-white/10">
                                    <thead className="text-gray-400 text-xs font-medium border-b border-white/10">
                                        <tr>
                                            <th className="py-4 font-normal">Item</th>
                                            <th className="py-4 font-normal text-right">In stock</th>
                                            <th className="py-4 font-normal text-right">Incoming</th>
                                            <th className="py-4 font-normal text-right">Quantity</th>
                                            <th className="py-4 font-normal text-right">Purchase cost</th>
                                            <th className="py-4 font-normal text-right">Amount</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formPo.items.map((item, index) => (
                                            <tr key={index} className="border-b border-white/5">
                                                <td className="py-4">
                                                    <div className="font-medium text-white">{item.product_name}</div>
                                                    <div className="text-xs text-gray-400">SKU {item.sku || '-'}</div>
                                                </td>
                                                <td className="py-4 text-right text-gray-400">{item.current_stock || 0}</td>
                                                <td className="py-4 text-right text-gray-400">{item.incoming_stock || 0}</td>
                                                <td className="py-4 text-right">
                                                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItemQty(index, e.target.value)} className="w-16 text-right bg-transparent border-b border-gray-600 focus:border-butterscotch py-1 outline-none text-white" />
                                                </td>
                                                <td className="py-4 text-right">
                                                    <input type="number" step="0.01" value={item.cost} onChange={(e) => updateItemCost(index, e.target.value)} className="w-20 text-right bg-transparent border-b border-gray-600 focus:border-butterscotch py-1 outline-none text-white" />
                                                </td>
                                                <td className="py-4 text-right text-white font-medium">
                                                    {parseFloat(item.amount || 0).toFixed(2)}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button type="button" onClick={() => removeProductFromPo(index)} className="text-gray-500 hover:text-red-500"><X size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {formPo.items.length === 0 && (
                                            <tr><td colSpan="7" className="text-center py-10 text-gray-500">Search and add items to order</td></tr>
                                        )}
                                    </tbody>
                                </table>
    
                                <div className="flex justify-end pt-6 border-t border-white/10 mt-6 gap-8 text-white">
                                    <div className="text-lg font-bold">Total</div>
                                    <div className="text-lg font-bold w-24 text-right">{parseFloat(formPo.total_amount || 0).toFixed(2)}</div>
                                </div>
    
                                <div className="flex justify-end gap-3 pt-8">
                                    <select 
                                        value={formPo.status} 
                                        onChange={e=>setFormPo({...formPo, status: e.target.value})}
                                        className="bg-black/20 border border-white/10 text-white px-4 py-2 rounded-lg font-medium outline-none appearance-none"
                                    >
                                        <option value="Draft" className="text-gray-900">Draft</option>
                                        <option value="Pending" className="text-gray-900">Pending</option>
                                    </select>
                                    <button type="button" onClick={() => setView('list')} className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:bg-white/10 border border-transparent">Cancel</button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(251,189,5,0.2)] uppercase text-sm tracking-wide">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'receive' && currentPo && (
                    <div className="flex-1 overflow-y-auto pb-10">
                        <div className="glass-panel rounded-2xl border border-white/10 shadow-sm animate-fade-in-up max-w-4xl mx-auto w-full">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                Items
                            </h3>
                            <button className="text-xs font-bold text-butterscotch uppercase hover:text-white transition-colors" onClick={() => {
                                setReceiveData(receiveData.map(item => ({...item, to_receive: item.ordered - item.received})));
                            }}>Mark All Received</button>
                        </div>
                        
                        <div className="p-6">
                            <table className="w-full text-left mb-8 text-white">
                                <thead className="text-gray-400 text-xs font-medium border-b border-white/10">
                                    <tr>
                                        <th className="py-4 font-normal">Item</th>
                                        <th className="py-4 font-normal text-right">Ordered</th>
                                        <th className="py-4 font-normal text-right">Received</th>
                                        <th className="py-4 font-normal text-right w-24">To receive</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receiveData.map((item, index) => (
                                        <tr key={item.id} className="border-b border-white/5">
                                            <td className="py-4">
                                                <div className="font-medium text-white">{item.name}</div>
                                                <div className="text-xs text-gray-400">SKU {item.sku || '-'}</div>
                                            </td>
                                            <td className="py-4 text-right text-gray-300">{item.ordered}</td>
                                            <td className="py-4 text-right text-gray-300">{item.received}</td>
                                            <td className="py-4 text-right">
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max={item.ordered - item.received}
                                                    value={item.to_receive} 
                                                    onChange={(e) => {
                                                        const newVal = [...receiveData];
                                                        newVal[index].to_receive = e.target.value;
                                                        setReceiveData(newVal);
                                                    }} 
                                                    className="w-16 text-right bg-transparent border-b border-gray-600 focus:border-butterscotch py-1 outline-none text-white" 
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end gap-3 bg-black/20 -m-6 p-6 border-t border-white/10 mt-6">
                                <button type="button" onClick={() => setView('list')} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm text-sm uppercase transition-colors">Cancel</button>
                                <button type="button" onClick={handleReceiveItems} className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-2.5 rounded-lg shadow-[0_0_15px_rgba(251,189,5,0.2)] text-sm uppercase">Receive</button>
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
                                <h3 className="text-xl font-bold text-white">Delete Purchase Order</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete PO <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete PO</button>
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
