import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Save, Power } from 'lucide-react';

export default function TableMapper({ area, onClose, showToast }) {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);
    const [draggingTableId, setDraggingTableId] = useState(null);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTableData, setNewTableData] = useState({ name: '', capacity: 4 });
    const [activeTableId, setActiveTableId] = useState(null);
    const [editingTableId, setEditingTableId] = useState(null);

    // Derived state for real-time validation
    const isNameTaken = tables.some(
        t => t.name.trim().toLowerCase() === newTableData.name.trim().toLowerCase() && t.id !== editingTableId
    );

    // Fetch existing tables for this area
    const fetchTables = async () => {
        try {
            const res = await fetch(`/api/tables?area_id=${area.id}`);
            const data = await res.json();
            setTables(data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch tables', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (area) fetchTables();
    }, [area]);

    const handleAddTableSubmit = async (e) => {
        e.preventDefault();
        if (!newTableData.name || isNameTaken) return;
        
        try {
            const url = editingTableId 
                ? `/api/tables/${editingTableId}`
                : '/api/tables';
            const method = editingTableId ? 'PUT' : 'POST';
            
            const payload = editingTableId 
                ? { name: newTableData.name, capacity: parseInt(newTableData.capacity) || 4 }
                : {
                    area_id: area.id,
                    name: newTableData.name,
                    capacity: parseInt(newTableData.capacity) || 4,
                    is_enabled: true,
                    x_position: 10,
                    y_position: 10
                };

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                if (editingTableId) {
                    setTables(tables.map(t => t.id === editingTableId ? { ...t, name: newTableData.name, capacity: payload.capacity } : t));
                    showToast('Table updated');
                } else {
                    setTables([...tables, data]);
                    showToast('Table added');
                }
                setShowAddModal(false);
                setNewTableData({ name: '', capacity: 4 });
                setEditingTableId(null);
            } else {
                alert(data.error || 'Failed to save table');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openEditModal = (table, e) => {
        e.stopPropagation();
        setEditingTableId(table.id);
        setNewTableData({ name: table.name, capacity: table.capacity });
        setShowAddModal(true);
        setActiveTableId(null);
    };

    const handleToggleEnable = async (table, e) => {
        e.stopPropagation();
        try {
            const newStatus = !table.is_enabled;
            const res = await fetch(`/api/tables/${table.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_enabled: newStatus })
            });
            if (res.ok) {
                setTables(tables.map(t => t.id === table.id ? { ...t, is_enabled: newStatus } : t));
                showToast(newStatus ? 'Table Enabled' : 'Table Disabled');
                setActiveTableId(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTable = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Delete this table?')) return;
        try {
            await fetch(`/api/tables/${id}`, { method: 'DELETE' });
            setTables(tables.filter(t => t.id !== id));
            showToast('Table deleted');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSavePositions = async () => {
        try {
            for (let table of tables) {
                await fetch(`/api/tables/${table.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        x_position: table.x_position,
                        y_position: table.y_position
                    })
                });
            }
            showToast('Positions saved!');
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save positions');
        }
    };

    // --- Drag and Drop Logic ---
    const handleMouseDown = (e, tableId) => {
        e.preventDefault(); // Prevent default text selection
        setDraggingTableId(tableId);
    };

    const handleMouseMove = (e) => {
        if (!draggingTableId || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        
        // Calculate percentages
        let xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        let yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Clamp to 0-100
        xPercent = Math.max(0, Math.min(xPercent, 100));
        yPercent = Math.max(0, Math.min(yPercent, 100));

        setTables(tables.map(t => t.id === draggingTableId ? { ...t, x_position: xPercent, y_position: yPercent } : t));
    };

    const handleMouseUp = () => {
        setDraggingTableId(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-charcoal border border-charcoal-light rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/20">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Map Tables: {area.name}</h2>
                        <p className="text-sm text-gray-400 mt-1">Drag and drop tables to position them on the map.</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => {
                                setEditingTableId(null);
                                setNewTableData({ name: '', capacity: 4 });
                                setShowAddModal(true);
                            }} 
                            className="bg-charcoal-light hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Plus size={18} /> Add Table
                        </button>
                        <button onClick={handleSavePositions} className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors">
                            <Save size={18} /> Save Map
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Map Area */}
                <div 
                    className="flex-1 relative bg-black/50 overflow-hidden" 
                    onMouseMove={handleMouseMove} 
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white">Loading...</div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/10"
                            style={{ 
                                width: '800px', // Fixed aspect ratio box for mapping
                                height: '600px',
                                backgroundImage: area.map_image_url ? `url(${area.map_image_url})` : 'none',
                                backgroundSize: 'contain',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                backgroundColor: '#1a1a1a'
                            }}
                        >
                            {!area.map_image_url && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-xl">
                                    No Map Image Provided
                                </div>
                            )}

                            {/* Tables */}
                            {tables.map(table => (
                                <div 
                                    key={table.id}
                                    onMouseDown={(e) => handleMouseDown(e, table.id)}
                                    onClick={() => setActiveTableId(activeTableId === table.id ? null : table.id)}
                                    className={`absolute w-16 h-16 border-2 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transform -translate-x-1/2 -translate-y-1/2 select-none group transition-all ${
                                        table.is_enabled !== false ? 'bg-butterscotch border-white' : 'bg-gray-700 border-gray-500 opacity-60'
                                    }`}
                                    style={{ 
                                        left: `${table.x_position}%`, 
                                        top: `${table.y_position}%`,
                                        zIndex: draggingTableId === table.id || activeTableId === table.id ? 10 : 1
                                    }}
                                >
                                    <span className={`font-bold leading-none text-lg ${table.is_enabled !== false ? 'text-charcoal' : 'text-gray-300'}`}>{table.name}</span>
                                    <span className={`text-[9px] leading-none mt-1 font-bold tracking-wider ${table.is_enabled !== false ? 'text-charcoal/70' : 'text-gray-400'}`}>CAP: {table.capacity}</span>
                                    
                                    {/* Action Menu Popover */}
                                    {activeTableId === table.id && (
                                        <div 
                                            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-charcoal border border-charcoal-light rounded-xl shadow-2xl p-2 flex flex-col gap-1 w-32 z-50"
                                            onMouseDown={(e) => e.stopPropagation()} // Prevent dragging when interacting with menu
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button 
                                                onClick={(e) => openEditModal(table, e)}
                                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/10 text-white transition-colors"
                                            >
                                                <Save size={14} className="text-blue-400" /> Edit Details
                                            </button>
                                            <button 
                                                onClick={(e) => handleToggleEnable(table, e)}
                                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/10 text-white transition-colors"
                                            >
                                                <Power size={14} className={table.is_enabled !== false ? 'text-red-400' : 'text-green-400'} />
                                                {table.is_enabled !== false ? 'Disable' : 'Enable'}
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteTable(table.id, e)}
                                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Add Table Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleAddTableSubmit} className="bg-charcoal border border-charcoal-light rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingTableId ? 'Edit Table Details' : 'Add New Table'}
                            </h3>
                            <button type="button" onClick={() => { setShowAddModal(false); setEditingTableId(null); }} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Table Name/Number</label>
                                <input 
                                    type="text" 
                                    value={newTableData.name}
                                    onChange={(e) => setNewTableData({...newTableData, name: e.target.value})}
                                    placeholder="e.g. T1, Bar 1"
                                    className={`w-full bg-black/20 border rounded-lg px-4 py-3 text-white focus:outline-none transition-colors ${
                                        newTableData.name.trim() === '' ? 'border-white/10 focus:border-butterscotch' : 
                                        isNameTaken ? 'border-red-500 focus:border-red-500' : 'border-green-500 focus:border-green-500'
                                    }`}
                                    required
                                    autoFocus
                                />
                                {newTableData.name.trim() !== '' && (
                                    <p className={`text-xs font-bold mt-2 ${isNameTaken ? 'text-red-400' : 'text-green-400'}`}>
                                        {isNameTaken ? 'Name is already taken.' : 'Name is available.'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Maximum Capacity</label>
                                <input 
                                    type="number" 
                                    value={newTableData.capacity}
                                    onChange={(e) => setNewTableData({...newTableData, capacity: e.target.value})}
                                    min="1"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                    required
                                />
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button type="button" onClick={() => { setShowAddModal(false); setEditingTableId(null); }} className="flex-1 bg-charcoal-light hover:bg-white/10 text-white font-bold py-3 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isNameTaken}
                                className={`flex-1 font-bold py-3 rounded-lg transition-colors shadow-lg ${
                                    isNameTaken ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-butterscotch hover:bg-butterscotch/90 text-charcoal'
                                }`}
                            >
                                {editingTableId ? 'Save Changes' : 'Add Table'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
