import React, { useState, useRef, useEffect } from 'react';
import { Users, Search, Plus, Check, X, ShieldCheck, Upload, Download, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { provinces, getCityMunByProvince, getBarangayByMun } from 'phil-reg-prov-mun-brgy';

export default function AdminCustomers() {
    const [customers, setCustomers] = useState([]);
    const [branches, setBranches] = useState([]);

    const [isAdding, setIsAdding] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState(null);
    const fileInputRef = useRef(null);
    const [newCustomer, setNewCustomer] = useState({
        name: '', email: '', phone: '', address: '',
        provCode: '', cityCode: '', brgyCode: '',
        provinceName: '', cityName: '', brgyName: '',
        zipCode: '', code: '', description: '', branch_id: ''
    });

    const [codeStatus, setCodeStatus] = useState(null); // 'available', 'taken', or null
    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    useEffect(() => {
        fetchCustomers();
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            const data = await res.json();
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const getBranchName = (branchId) => {
        if (!branchId) return 'Global (All Branches)';
        const b = branches.find(b => b.id === branchId);
        return b ? b.name : 'Unknown Branch';
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/customers');
            const data = await res.json();
            setCustomers(data);
        } catch (err) {
            console.error('Failed to fetch customers', err);
        }
    };

    const handleProvinceChange = (e) => {
        const provCode = e.target.value;
        const provName = e.target.options[e.target.selectedIndex].text;
        setNewCustomer({ ...newCustomer, provCode, provinceName: provName, cityCode: '', cityName: '', brgyCode: '', brgyName: '' });
    };

    const handleCityChange = (e) => {
        const cityCode = e.target.value;
        const cityName = e.target.options[e.target.selectedIndex].text;
        setNewCustomer({ ...newCustomer, cityCode, cityName: cityName, brgyCode: '', brgyName: '' });
    };

    const handleBrgyChange = (e) => {
        const brgyCode = e.target.value;
        const brgyName = e.target.options[e.target.selectedIndex].text;
        setNewCustomer({ ...newCustomer, brgyCode, brgyName: brgyName });
    };

    const handleCodeChange = (e) => {
        const val = e.target.value.toUpperCase();
        setNewCustomer({ ...newCustomer, code: val });
        if (val.length < 3) {
            setCodeStatus(null);
            return;
        }
        // Real-time check, excluding the currently edited customer's code
        const isTaken = customers.some(c => c.customer_code && c.customer_code.toUpperCase() === val && c.id !== editingCustomerId);
        setCodeStatus(isTaken ? 'taken' : 'available');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (codeStatus === 'taken') {
            showToast('error', 'Customer code is already taken!');
            return;
        }
        
        const customerData = {
            ...newCustomer,
            province: newCustomer.provinceName,
            city: newCustomer.cityName,
            barangay: newCustomer.brgyName,
            zip_code: newCustomer.zipCode,
            customer_code: newCustomer.code,
            branch_id: newCustomer.branch_id || null
        };

        try {
            if (editingCustomerId) {
                await fetch(`http://localhost:5000/api/customers/${editingCustomerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
            } else {
                await fetch('http://localhost:5000/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
            }
            
            fetchCustomers();
            setIsAdding(false);
            setEditingCustomerId(null);
            setNewCustomer({ name: '', email: '', phone: '', address: '', provCode: '', cityCode: '', brgyCode: '', provinceName: '', cityName: '', brgyName: '', zipCode: '', code: '', description: '', branch_id: '' });
            setCodeStatus(null);
            showToast('success', editingCustomerId ? 'Customer updated successfully' : 'Customer created successfully');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save customer');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting customer...');
            await fetch(`http://localhost:5000/api/customers/${deleteModal.id}`, { method: 'DELETE' });
            fetchCustomers();
            setDeleteModal(null);
            showToast('success', 'Customer deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete customer.');
        }
    };

    const handleEdit = (customer) => {
        let pCode = '';
        let cCode = '';
        let bCode = '';

        if (customer.province) {
            const p = provinces.find(x => x.name === customer.province);
            if (p) {
                pCode = p.prov_code;
                if (customer.city) {
                    const cList = getCityMunByProvince(pCode);
                    const c = cList.find(x => x.name === customer.city);
                    if (c) {
                        cCode = c.mun_code;
                        if (customer.barangay) {
                            const bList = getBarangayByMun(cCode);
                            const b = bList.find(x => x.name === customer.barangay || x.brgy_code === customer.barangay);
                            if (b) bCode = b.brgy_code || b.name;
                        }
                    }
                }
            }
        }

        setEditingCustomerId(customer.id);
        setNewCustomer({
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            provCode: pCode,
            cityCode: cCode,
            brgyCode: bCode,
            provinceName: customer.province || '',
            cityName: customer.city || '',
            brgyName: customer.barangay || '',
            zipCode: customer.zip_code || '',
            code: customer.customer_code || '',
            description: customer.description || '',
            branch_id: customer.branch_id || ''
        });
        setCodeStatus(null);
        setIsAdding(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingCustomerId(null);
        setNewCustomer({ name: '', email: '', phone: '', address: '', provCode: '', cityCode: '', brgyCode: '', provinceName: '', cityName: '', brgyName: '', zipCode: '', code: '', description: '', branch_id: '' });
        setCodeStatus(null);
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            if (rows.length <= 1) {
                showToast('error', 'CSV file is empty or missing data rows. Please ensure it has a header row and data.');
                return;
            }
            
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            const newCustomers = [];

            for (let i = 1; i < rows.length; i++) {
                // Simple CSV split (ignores commas inside quotes for this mockup)
                const values = rows[i].split(',').map(v => v.trim());
                if (values.length < headers.length) continue;

                const customer = { id: Date.now() + i };
                headers.forEach((header, index) => {
                    if (header.includes('name')) customer.name = values[index];
                    else if (header.includes('email')) customer.email = values[index];
                    else if (header.includes('phone')) customer.phone = values[index];
                    else if (header.includes('address') || header.includes('street')) customer.address = values[index];
                    else if (header.includes('prov')) customer.province = values[index];
                    else if (header.includes('city')) customer.city = values[index];
                    else if (header.includes('brgy') || header.includes('barangay')) customer.barangay = values[index];
                    else if (header.includes('zip')) customer.zipCode = values[index];
                    else if (header.includes('code')) customer.code = values[index].toUpperCase();
                    else if (header.includes('desc') || header.includes('note')) customer.description = values[index];
                });

                if (!customer.name) customer.name = 'Imported Customer';
                if (!customer.code) customer.code = `IMP${Date.now() + i}`;

                newCustomers.push(customer);
            }

            try {
                showToast('loading', 'Importing customers...');
                // To do this fully bulk in the backend, you'd create a /api/customers/bulk endpoint.
                // For now, sequentially add (can be slow, but works for mockups)
                for (let cust of newCustomers) {
                    await fetch('http://localhost:5000/api/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cust)
                    });
                }
                fetchCustomers();
                showToast('success', `Successfully imported ${newCustomers.length} customers!`);
            } catch (err) {
                console.error(err);
                showToast('error', 'Failed to import some customers.');
            }
            
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const downloadCSVTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone,Address,Province,City,Barangay,Zip Code,Code,Description\nJuan Dela Cruz,juan@example.com,0917-000-0000,123 Main St,NCR,Makati,Bel-Air,1209,JUAN123,VIP";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "customers_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Customers</h2>
                        <p className="text-sm text-gray-400">Manage your loyal customers, accounts, and contact details.</p>
                    </div>
                    {!isAdding && (
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={downloadCSVTemplate}
                                className="bg-charcoal-light hover:bg-white/10 text-white font-bold px-4 py-3 rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                                title="Download Template"
                            >
                                <Download size={20} /> Template
                            </button>
                            <input 
                                type="file" 
                                accept=".csv" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={handleImportCSV} 
                            />
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="bg-charcoal-light hover:bg-white/10 text-white font-bold px-4 py-3 rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                            >
                                <Upload size={20} /> Import CSV
                            </button>
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                            >
                                <Plus size={20} /> Add Customer
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding && (
                        <div className="mb-8 p-8 glass-card rounded-2xl border border-charcoal-light animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                <Users size={20} className="text-butterscotch" /> {editingCustomerId ? 'Edit Customer Profile' : 'New Customer Profile'}
                            </h3>
                            
                            <form onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Full Name *</label>
                                        <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Maria Santos" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Customer Code *</label>
                                        <div className="relative">
                                            <input required type="text" value={newCustomer.code} onChange={handleCodeChange} className={`w-full bg-black/20 border rounded-lg px-4 py-3 text-white focus:outline-none transition-colors ${codeStatus === 'taken' ? 'border-red-500 focus:border-red-500' : codeStatus === 'available' ? 'border-green-500 focus:border-green-500' : 'border-white/10 focus:border-butterscotch'}`} placeholder="e.g. MARIAS123" />
                                            {codeStatus === 'available' && <Check size={18} className="absolute right-4 top-3.5 text-green-500" />}
                                            {codeStatus === 'taken' && <X size={18} className="absolute right-4 top-3.5 text-red-500" />}
                                        </div>
                                        {codeStatus === 'available' && <p className="text-xs text-green-500 mt-2 font-medium">Code is available!</p>}
                                        {codeStatus === 'taken' && <p className="text-xs text-red-500 mt-2 font-medium">Code is already in use.</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                                        <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. maria@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Phone Number *</label>
                                        <input required type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. 0917-XXX-XXXX" />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Street Address *</label>
                                    <input required type="text" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Unit / Floor / Bldg / Street" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Province *</label>
                                        <select required value={newCustomer.provCode} onChange={handleProvinceChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Select Province</option>
                                            {provinces.map(p => (
                                                <option key={p.prov_code} value={p.prov_code} className="text-gray-900">{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">City/Municipality *</label>
                                        <select required value={newCustomer.cityCode} onChange={handleCityChange} disabled={!newCustomer.provCode} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none disabled:opacity-50">
                                            <option value="" className="text-gray-900">Select City</option>
                                            {newCustomer.provCode && getCityMunByProvince(newCustomer.provCode).map(c => (
                                                <option key={c.mun_code} value={c.mun_code} className="text-gray-900">{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Barangay *</label>
                                        <select required value={newCustomer.brgyCode} onChange={handleBrgyChange} disabled={!newCustomer.cityCode} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none disabled:opacity-50">
                                            <option value="" className="text-gray-900">Select Barangay</option>
                                            {newCustomer.cityCode && getBarangayByMun(newCustomer.cityCode).map(b => (
                                                <option key={b.brgy_code || b.name} value={b.brgy_code || b.name} className="text-gray-900">{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Zip Code *</label>
                                        <input required type="text" value={newCustomer.zipCode} onChange={e => setNewCustomer({...newCustomer, zipCode: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. 1200" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Assigned Branch (Optional)</label>
                                        <select value={newCustomer.branch_id} onChange={e => setNewCustomer({...newCustomer, branch_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            <option value="" className="text-gray-900">Global (All Branches)</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Description</label>
                                        <input type="text" value={newCustomer.description} onChange={e => setNewCustomer({...newCustomer, description: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Any internal notes or labels" />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingCustomerId ? 'Update Customer' : 'Save Customer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {customers.map(c => (
                            <div key={c.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-1">{c.name}</h4>
                                        <div className="text-xs font-bold text-butterscotch bg-butterscotch/10 px-2 py-1 rounded inline-block uppercase tracking-wider mb-2">
                                            CODE: {c.customer_code || c.code}
                                        </div>
                                        <div className="text-xs font-bold text-gray-400 bg-white/10 px-2 py-1 rounded inline-block uppercase tracking-wider mb-2 ml-2">
                                            BRANCH: {getBranchName(c.branch_id)}
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-white transition-colors">
                                        <ShieldCheck size={20} />
                                    </button>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <p className="text-sm text-gray-300"><span className="text-gray-500 w-16 inline-block">Phone:</span> {c.phone}</p>
                                    {c.email && <p className="text-sm text-gray-300"><span className="text-gray-500 w-16 inline-block">Email:</span> {c.email}</p>}
                                    <p className="text-sm text-gray-300"><span className="text-gray-500 w-16 inline-block">Location:</span> {c.address}, {c.barangay}, {c.city}, {c.province} {c.zip_code || c.zipCode}</p>
                                </div>
                                <div className="flex justify-between items-end">
                                    {c.description ? (
                                        <div className="text-xs text-gray-400 pt-3 flex-1 mr-4">
                                            Note: {c.description}
                                        </div>
                                    ) : (
                                        <div className="flex-1 mr-4"></div>
                                    )}
                                    <div className="flex items-center gap-2 pt-3">
                                        <button 
                                            onClick={() => handleEdit(c)}
                                            className="text-butterscotch hover:text-white text-xs font-bold bg-butterscotch/10 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => setDeleteModal({id: c.id, name: c.name})}
                                            className="text-red-400 hover:text-white text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                            <h3 className="text-xl font-bold text-white">Delete Customer</h3>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Customer</button>
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
