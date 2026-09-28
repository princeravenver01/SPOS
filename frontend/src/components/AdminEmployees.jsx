import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, UserCog, Trash2, Edit2, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminEmployees() {
    const [employees, setEmployees] = useState([]);

    const [isAdding, setIsAdding] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);
    const [roles, setRoles] = useState([]);
    const [branches, setBranches] = useState([]);
    const [newEmployee, setNewEmployee] = useState({
        name: '', email: '', phone: '', role_id: '', username: '', pin: '', branch_ids: []
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
        fetchEmployees();
        fetchRoles();
        fetchBranches();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/access-roles');
            const data = await res.json();
            setRoles(data);
            if (data.length > 0) {
                setNewEmployee(prev => ({ ...prev, role_id: data[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch roles', err);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            const data = await res.json();
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/employees');
            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const empToSave = {
            ...newEmployee,
            username: newEmployee.username || newEmployee.email.split('@')[0] || newEmployee.name.replace(/\s+/g, '').toLowerCase() || `user${Date.now()}`
        };
        
        if (!editingEmployeeId) {
            empToSave.pin = newEmployee.pin || '1234';
        } else if (newEmployee.pin && newEmployee.pin.trim() !== '') {
            empToSave.pin = newEmployee.pin;
        } else {
            delete empToSave.pin;
        }

        try {
            showToast('loading', editingEmployeeId ? 'Updating employee...' : 'Saving employee...');
            if (editingEmployeeId) {
                await fetch(`http://localhost:5000/api/employees/${editingEmployeeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(empToSave)
                });
            } else {
                await fetch('http://localhost:5000/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(empToSave)
                });
            }
            fetchEmployees();
            setIsAdding(false);
            setEditingEmployeeId(null);
            setNewEmployee({ name: '', email: '', phone: '', role_id: roles.length > 0 ? roles[0].id : '', username: '', pin: '', branch_ids: [] });
            showToast('success', editingEmployeeId ? 'Employee updated successfully!' : 'Employee saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save employee');
        }
    };

    const handleEdit = (employee) => {
        setEditingEmployeeId(employee.id);
        setNewEmployee({
            name: employee.name || '',
            email: employee.email || '',
            phone: employee.phone || '',
            role_id: employee.role_id || (roles.length > 0 ? roles[0].id : ''),
            username: employee.username || '',
            pin: '', // Leave blank for security, only update if typed
            branch_ids: employee.branch_ids || []
        });
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingEmployeeId(null);
        setNewEmployee({ name: '', email: '', phone: '', role_id: roles.length > 0 ? roles[0].id : '', branch_ids: [] });
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting employee...');
            const res = await fetch(`http://localhost:5000/api/employees/${deleteModal.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchEmployees();
                setDeleteModal(null);
                showToast('success', 'Employee deleted successfully!');
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Failed to delete employee.');
            }
        } catch (err) {
            console.error('Failed to delete employee', err);
            showToast('error', 'Network error.');
        }
    };

    const getRoleColor = (roleName) => {
        const lower = String(roleName || '').toLowerCase();
        if (lower.includes('admin')) return 'text-purple-400 bg-purple-500/10';
        if (lower.includes('manager')) return 'text-blue-400 bg-blue-500/10';
        return 'text-butterscotch bg-butterscotch/10';
    };

    const hasPosAccess = (roleId) => {
        const role = roles.find(r => r.id == roleId);
        if (!role || !role.permissions) return false;
        let perms = role.permissions;
        if (typeof perms === 'string') {
            try {
                perms = JSON.parse(perms);
            } catch(e) {
                return false;
            }
        }
        // It could be true, "true", or 1
        return perms.pos_access === true || perms.pos_access === 'true' || perms.pos_access === 1;
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Employees</h2>
                        <p className="text-sm text-gray-400">Manage staff profiles and assign system roles.</p>
                    </div>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Employee
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding && (
                        <div className="mb-8 p-8 glass-card rounded-2xl border border-charcoal-light animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
                                <UserCog size={20} className="text-butterscotch" /> {editingEmployeeId ? 'Edit Employee Profile' : 'New Employee Profile'}
                            </h3>
                            
                            <form onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Full Name *</label>
                                        <input required type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Maria Santos" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">System Role *</label>
                                        <select required value={newEmployee.role_id} onChange={e => setNewEmployee({...newEmployee, role_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id} className="text-gray-900">{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                                        <input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. maria@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Phone Number *</label>
                                        <input required type="text" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. 0917-XXX-XXXX" />
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Assigned Branches</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {branches.map(branch => {
                                            const isChecked = newEmployee.branch_ids.includes(branch.id);
                                            return (
                                                <label key={branch.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'border-butterscotch bg-butterscotch/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}>
                                                    <input 
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setNewEmployee({...newEmployee, branch_ids: [...newEmployee.branch_ids, branch.id]});
                                                            } else {
                                                                setNewEmployee({...newEmployee, branch_ids: newEmployee.branch_ids.filter(id => id !== branch.id)});
                                                            }
                                                        }}
                                                    />
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${isChecked ? 'bg-butterscotch border-butterscotch' : 'border-gray-500'}`}>
                                                        {isChecked && <CheckCircle size={14} className="text-charcoal" />}
                                                    </div>
                                                    <span className={`text-sm ${isChecked ? 'text-white font-medium' : 'text-gray-400'}`}>{branch.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {hasPosAccess(newEmployee.role_id) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-butterscotch/5 border border-butterscotch/20 rounded-xl">
                                        <div className="col-span-full">
                                            <h4 className="text-butterscotch text-sm font-bold flex items-center gap-2 mb-2"><ShieldCheck size={16} /> POS Access Credentials</h4>
                                            <p className="text-xs text-gray-400">This role has POS access enabled. Please set a unique username and PIN for login.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">POS Username *</label>
                                            <input required type="text" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} className="w-full bg-black/40 border border-butterscotch/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Unique Username" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">POS PIN (4-6 digits) {editingEmployeeId && '(Leave blank to keep current)'}</label>
                                            <input required={!editingEmployeeId} type="password" maxLength={6} pattern="\d*" value={newEmployee.pin} onChange={e => setNewEmployee({...newEmployee, pin: e.target.value})} className="w-full bg-black/40 border border-butterscotch/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors tracking-widest font-mono" placeholder="****" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button" onClick={handleCancel} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        {editingEmployeeId ? 'Update Employee' : 'Save Employee'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {employees.map(emp => (
                            <div key={emp.id} className="glass-card p-6 rounded-2xl flex justify-between items-start">
                                <div>
                                    <h4 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                        {emp.name} 
                                        {emp.role === 'administrator' && <ShieldCheck size={16} className="text-purple-400" />}
                                    </h4>
                                    <div className={`text-xs font-bold px-2 py-1 rounded inline-block uppercase tracking-wider mb-4 ${getRoleColor(emp.role)}`}>
                                        {emp.role}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-300"><span className="text-gray-500 w-16 inline-block">Phone:</span> {emp.phone}</p>
                                        {emp.email && <p className="text-sm text-gray-300"><span className="text-gray-500 w-16 inline-block">Email:</span> {emp.email}</p>}
                                        {emp.branch_ids && emp.branch_ids.length > 0 && (
                                            <p className="text-sm text-gray-300">
                                                <span className="text-gray-500 w-16 inline-block">Branches:</span> 
                                                <span className="text-butterscotch/90">{branches.filter(b => emp.branch_ids.includes(b.id)).map(b => b.name).join(', ')}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={() => handleEdit(emp)}
                                        className="text-butterscotch hover:text-white text-xs font-bold bg-butterscotch/10 px-3 py-1.5 rounded-lg transition-colors text-center"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => setDeleteModal({id: emp.id, name: emp.name})}
                                        className="text-red-400 hover:text-white text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors text-center"
                                    >
                                        Remove
                                    </button>
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
                            <h3 className="text-xl font-bold text-white">Delete Employee</h3>
                        </div>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to remove <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Employee</button>
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
