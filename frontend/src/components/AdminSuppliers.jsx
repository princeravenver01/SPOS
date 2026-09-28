import React, { useState, useEffect } from 'react';
import { Truck, Plus, X, Edit2, Trash2, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { provinces, getCityMunByProvince, getBarangayByMun } from 'phil-reg-prov-mun-brgy';

export default function AdminSuppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [newSupplier, setNewSupplier] = useState({
        name: '', email: '', phone: '', website: '',
        address_1: '', address_2: '', province: '', city: '',
        barangay: '', zip_code: '', note: '',
        provCode: '', cityCode: '', brgyCode: ''
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
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/suppliers');
            const data = await res.json();
            setSuppliers(data);
        } catch (err) {
            console.error('Failed to fetch suppliers', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            showToast('loading', 'Saving supplier...');
            if (editingSupplierId) {
                await fetch(`http://localhost:5000/api/suppliers/${editingSupplierId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSupplier)
                });
            } else {
                await fetch('http://localhost:5000/api/suppliers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSupplier)
                });
            }
            fetchSuppliers();
            setIsAdding(false);
            setEditingSupplierId(null);
            resetForm();
            showToast('success', 'Supplier saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save supplier');
        }
    };

    const handleEdit = (supplier) => {
        setEditingSupplierId(supplier.id);
        setNewSupplier({
            name: supplier.name || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            website: supplier.website || '',
            address_1: supplier.address_1 || '',
            address_2: supplier.address_2 || '',
            province: supplier.province || '',
            city: supplier.city || '',
            barangay: supplier.barangay || '',
            zip_code: supplier.zip_code || '',
            note: supplier.note || '',
            provCode: '', cityCode: '', brgyCode: '' // To fully support edit we would map names back to codes, but for simplicity we reset or let user re-select if needed, or if we had codes saved we could use them. We will just leave them blank so user can reselect if they want to edit location.
        });
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting supplier...');
            await fetch(`http://localhost:5000/api/suppliers/${deleteModal.id}`, { method: 'DELETE' });
            fetchSuppliers();
            setDeleteModal(null);
            showToast('success', 'Supplier deleted successfully!');
        } catch (err) {
            console.error('Failed to delete supplier', err);
            showToast('error', 'Failed to delete supplier.');
        }
    };

    const resetForm = () => {
        setNewSupplier({
            name: '', email: '', phone: '', website: '',
            address_1: '', address_2: '', province: '', city: '',
            barangay: '', zip_code: '', note: '',
            provCode: '', cityCode: '', brgyCode: ''
        });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingSupplierId(null);
        resetForm();
    };

    const handleProvinceChange = (e) => {
        const provCode = e.target.value;
        const provName = e.target.options[e.target.selectedIndex].text;
        setNewSupplier({ ...newSupplier, provCode, province: provName, cityCode: '', city: '', brgyCode: '', barangay: '' });
    };

    const handleCityChange = (e) => {
        const cityCode = e.target.value;
        const cityName = e.target.options[e.target.selectedIndex].text;
        setNewSupplier({ ...newSupplier, cityCode, city: cityName, brgyCode: '', barangay: '' });
    };

    const handleBrgyChange = (e) => {
        const brgyCode = e.target.value;
        const brgyName = e.target.options[e.target.selectedIndex].text;
        setNewSupplier({ ...newSupplier, brgyCode, barangay: brgyName });
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Suppliers</h2>
                        <p className="text-sm text-gray-400">Manage your supply chain contacts and vendors.</p>
                    </div>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Supplier
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding ? (
                        <div className="bg-[#1a1f2e] rounded-2xl p-8 border border-white/10 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Truck className="text-butterscotch" /> {editingSupplierId ? 'Edit Supplier' : 'New Supplier'}
                                </h3>
                                <button onClick={handleCancel} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-8">
                                <div>
                                    <h4 className="text-sm font-bold text-butterscotch mb-4 uppercase tracking-wider">Contact Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Supplier Name *</label>
                                            <input required type="text" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Acme Corp" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
                                            <input type="email" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. contact@acme.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Phone</label>
                                            <input type="text" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. 0917 123 4567" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Website</label>
                                            <input type="text" value={newSupplier.website} onChange={e => setNewSupplier({...newSupplier, website: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. https://www.acme.com" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <h4 className="text-sm font-bold text-butterscotch mb-4 uppercase tracking-wider">Address</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Address 1</label>
                                            <input type="text" value={newSupplier.address_1} onChange={e => setNewSupplier({...newSupplier, address_1: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Street address, P.O. box, etc." />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Address 2</label>
                                            <input type="text" value={newSupplier.address_2} onChange={e => setNewSupplier({...newSupplier, address_2: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Apartment, suite, unit, building, floor, etc." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Province</label>
                                            <select value={newSupplier.provCode} onChange={handleProvinceChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                                <option value="" className="text-gray-900">Select Province</option>
                                                {provinces.map(p => (
                                                    <option key={p.prov_code} value={p.prov_code} className="text-gray-900">{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">City</label>
                                            <select value={newSupplier.cityCode} onChange={handleCityChange} disabled={!newSupplier.provCode} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none disabled:opacity-50">
                                                <option value="" className="text-gray-900">Select City</option>
                                                {newSupplier.provCode && getCityMunByProvince(newSupplier.provCode).map(c => (
                                                    <option key={c.mun_code} value={c.mun_code} className="text-gray-900">{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Barangay</label>
                                            <select value={newSupplier.brgyCode} onChange={handleBrgyChange} disabled={!newSupplier.cityCode} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none disabled:opacity-50">
                                                <option value="" className="text-gray-900">Select Barangay</option>
                                                {newSupplier.cityCode && getBarangayByMun(newSupplier.cityCode).map(b => (
                                                    <option key={b.brgy_code || b.name} value={b.brgy_code || b.name} className="text-gray-900">{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Zip Code</label>
                                            <input type="text" value={newSupplier.zip_code} onChange={e => setNewSupplier({...newSupplier, zip_code: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Zip Code" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <h4 className="text-sm font-bold text-butterscotch mb-4 uppercase tracking-wider">Additional Information</h4>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Note</label>
                                        <textarea value={newSupplier.note} onChange={e => setNewSupplier({...newSupplier, note: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors h-24" placeholder="Any additional notes about this supplier..."></textarea>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingSupplierId ? 'Update Supplier' : 'Save Supplier'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Location</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map(sup => (
                                        <tr key={sup.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-base">{sup.name}</div>
                                                {sup.website && <div className="text-xs text-gray-500 hover:text-butterscotch mt-1"><a href={sup.website} target="_blank" rel="noopener noreferrer">{sup.website}</a></div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {sup.phone && <div className="text-white text-sm">{sup.phone}</div>}
                                                    {sup.email && <div className="text-xs text-gray-400">{sup.email}</div>}
                                                    {!sup.phone && !sup.email && <span className="text-gray-500 italic">No contact info</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-white">{sup.city ? `${sup.city}, ${sup.province}` : sup.province || sup.city || 'No location specified'}</span>
                                                    {(sup.address_1 || sup.barangay) && <span className="text-xs text-gray-400">{sup.address_1} {sup.barangay}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleEdit(sup)} className="text-gray-400 hover:text-white transition-colors mr-3">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => setDeleteModal(sup)} className="text-gray-400 hover:text-red-400 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {suppliers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                No suppliers found. Click "Add Supplier" to create one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                            <h3 className="text-xl font-bold text-white">Delete Supplier</h3>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Supplier</button>
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
