import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';

const DEFAULT_PERMISSIONS = {
    pos_access: false, void_orders: false, apply_discounts: false, refund_payments: false,
    view_dashboard: false, view_reports: false, manage_inventory: false, 
    manage_categories: false, manage_modifiers: false, manage_discounts: false,
    manage_customers: false, manage_employees: false, manage_suppliers: false, manage_purchase_orders: false, manage_access_roles: false, 
    manage_settings: false
};

export default function AdminAccessRoles() {
    const [roles, setRoles] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [newRole, setNewRole] = useState({
        name: '',
        permissions: {
            pos_access: false,
            void_orders: false,
            apply_discounts: false,
            refund_payments: false,
            view_dashboard: false,
            view_reports: false,
            manage_inventory: false,
            manage_categories: false,
            manage_modifiers: false,
            manage_discounts: false,
            manage_customers: false,
            manage_employees: false,
            manage_access_roles: false,
            manage_settings: false
        }
    });
    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch('/api/access-roles');
            const data = await res.json();
            setRoles(data);
        } catch (err) {
            console.error('Failed to fetch roles', err);
        }
    };

    const handlePermissionChange = (key) => {
        setNewRole({
            ...newRole,
            permissions: {
                ...newRole.permissions,
                [key]: !newRole.permissions[key]
            }
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            showToast('loading', editingRoleId ? 'Updating role...' : 'Saving role...');
            if (editingRoleId) {
                const res = await fetch(`/api/access-roles/${editingRoleId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRole)
                });
                if (!res.ok) throw new Error('Failed to update');
            } else {
                const res = await fetch('/api/access-roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRole)
                });
                if (!res.ok) throw new Error('Failed to create');
            }
            fetchRoles();
            setIsAdding(false);
            setEditingRoleId(null);
            resetForm();
            showToast('success', editingRoleId ? 'Role updated successfully!' : 'Role saved successfully!');
        } catch (err) {
            showToast('error', 'Failed to save role. Name might be duplicate.');
            console.error(err);
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting role...');
            const res = await fetch(`/api/access-roles/${deleteModal.id}`, { method: 'DELETE' });
            if (!res.ok) {
                const errorData = await res.json();
                showToast('error', errorData.error || 'Failed to delete role');
                return;
            }
            fetchRoles();
            setDeleteModal(null);
            showToast('success', 'Role deleted successfully!');
        } catch (err) {
            console.error('Failed to delete role', err);
            showToast('error', 'Network error.');
        }
    };

    const handleEdit = (role) => {
        setEditingRoleId(role.id);
        const parsedPerms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || {});
        setNewRole({
            name: role.name,
            permissions: { ...DEFAULT_PERMISSIONS, ...parsedPerms }
        });
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setNewRole({
            name: '',
            permissions: { ...DEFAULT_PERMISSIONS }
        });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingRoleId(null);
        resetForm();
    };

    const PERMISSION_LABELS = {
        pos_access: "Point of Sale (Checkout)",
        void_orders: "Void Orders & Items",
        apply_discounts: "Apply Custom Discounts",
        refund_payments: "Process Refunds",
        view_dashboard: "View Admin Dashboard",
        view_reports: "View Sales Reports",
        manage_inventory: "Manage Products & Inventory",
        manage_categories: "Manage Categories",
        manage_modifiers: "Manage Modifiers",
        manage_discounts: "Manage Discounts",
        manage_customers: "Manage Customers",
        manage_employees: "Manage Staff Profiles",
        manage_suppliers: "Manage Suppliers",
        manage_purchase_orders: "Manage Purchase Orders",
        manage_access_roles: "Manage Access Roles",
        manage_settings: "Manage System Settings"
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Access Roles</h2>
                        <p className="text-sm text-gray-400">Define custom roles and specific system permissions.</p>
                    </div>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Role
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding && (
                        <div className="mb-8 p-8 glass-card rounded-2xl border border-charcoal-light animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                <ShieldCheck size={20} className="text-butterscotch" /> {editingRoleId ? 'Edit Access Role' : 'New Access Role'}
                            </h3>
                            
                            <form onSubmit={handleSave}>
                                <div className="mb-8">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Role Name *</label>
                                    <input required type="text" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} className="w-full max-w-md bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Supervisor" />
                                </div>

                                <div className="mb-8">
                                    <label className="block text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">System Permissions</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {Object.entries(newRole.permissions).map(([key, value]) => (
                                            <div key={key} className={`border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors ${value ? 'bg-butterscotch/10 border-butterscotch text-butterscotch' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`} onClick={() => handlePermissionChange(key)}>
                                                <span className="font-semibold text-sm">{PERMISSION_LABELS[key] || key}</span>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${value ? 'bg-butterscotch border-butterscotch text-charcoal' : 'border-white/30'}`}>
                                                    {value && <ShieldCheck size={14} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingRoleId ? 'Update Role' : 'Save Role'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {roles.map(role => {
                            const rawPerms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || {});
                            const perms = { ...DEFAULT_PERMISSIONS, ...rawPerms };
                            const activePermsCount = Object.values(perms).filter(Boolean).length;
                            const totalPermsCount = Object.keys(perms).length;

                            return (
                                <div key={role.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                                {role.name} 
                                            </h4>
                                            <div className="text-xs font-bold px-2 py-1 rounded bg-white/10 text-gray-300">
                                                {activePermsCount} / {totalPermsCount} Permissions
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {Object.entries(perms).map(([key, value]) => value && (
                                                <span key={key} className="text-[10px] font-bold text-butterscotch bg-butterscotch/10 px-2 py-1 rounded border border-butterscotch/20 uppercase tracking-wider">
                                                    {key.replace('_', ' ')}
                                                </span>
                                            ))}
                                            {activePermsCount === 0 && <span className="text-xs text-gray-500 italic">No permissions assigned</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 border-t border-white/10 pt-4 mt-2">
                                        <button onClick={() => handleEdit(role)} className="flex-1 flex items-center justify-center gap-2 text-butterscotch hover:text-white text-xs font-bold bg-butterscotch/10 px-3 py-2 rounded-lg transition-colors">
                                            <Edit2 size={14} /> Edit
                                        </button>
                                        <button onClick={() => setDeleteModal({id: role.id, name: role.name})} className="flex-1 flex items-center justify-center gap-2 text-red-400 hover:text-white text-xs font-bold bg-red-500/10 px-3 py-2 rounded-lg transition-colors">
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
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
                            <h3 className="text-xl font-bold text-white">Delete Access Role</h3>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to remove <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Role</button>
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
