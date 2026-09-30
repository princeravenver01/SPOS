import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Link, Unlink } from 'lucide-react';

class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-4">TableSelectorModal Crashed</h1>
            <pre className="bg-black/50 p-4 rounded text-left whitespace-pre-wrap">{this.state.error?.message}</pre>
            <pre className="bg-black/50 p-4 rounded text-left whitespace-pre-wrap mt-4 text-xs">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const TableSelectorModalInner = ({ branchId, openTicketsList, onSelectTable, onClose }) => {
    const [areas, setAreas] = useState([]);
    const [tables, setTables] = useState([]);
    const [activeAreaId, setActiveAreaId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [mergeParentId, setMergeParentId] = useState(null);

    useEffect(() => {
        const fetchAreasAndTables = async () => {
            try {
                if (!branchId) return;
                
                // Fetch areas
                const areasRes = await fetch(`/api/areas?branch_id=${branchId}`);
                const areasData = await areasRes.json();
                if (Array.isArray(areasData)) {
                    setAreas(areasData);
                    // No longer auto-selecting the first area if there are multiple areas,
                    // but if there is ONLY ONE area, we should probably auto-select it.
                    if (areasData.length === 1) {
                        setActiveAreaId(areasData[0].id);
                    }
                } else {
                    setAreas([]);
                }

                // Fetch tables
                const tablesRes = await fetch(`/api/tables?branch_id=${branchId}`);
                const tablesData = await tablesRes.json();
                if (Array.isArray(tablesData)) {
                    setTables(tablesData);
                } else {
                    setTables([]);
                }
            } catch (err) {
                console.error("Failed to fetch areas/tables:", err);
                setAreas([]);
                setTables([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAreasAndTables();
    }, [branchId]);

    const activeArea = areas.find(a => a.id === activeAreaId);
    const activeTables = tables.filter(t => t.area_id === activeAreaId);

    // Calculate occupied tables based on openTicketsList
    const getTableTickets = (tableId) => {
        if (!openTicketsList) return [];
        return openTicketsList.filter(ot => ot.table_id == tableId);
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-charcoal-dark/50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">Select Table</h2>
                    {activeAreaId !== null && (
                        <div className="flex gap-2 bg-black/40 p-1 rounded-lg">
                            {areas.map(area => (
                                <button
                                    key={area.id}
                                    onClick={() => setActiveAreaId(area.id)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                                        activeAreaId === area.id 
                                        ? 'bg-butterscotch text-charcoal' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {area.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            setIsMergeMode(!isMergeMode);
                            setMergeParentId(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                            isMergeMode 
                            ? 'bg-butterscotch text-charcoal shadow-[0_0_15px_rgba(230,172,0,0.3)]' 
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                    >
                        {isMergeMode ? <Link size={16} /> : <Unlink size={16} />}
                        {isMergeMode ? 'Merge Mode Active' : 'Merge Tables'}
                    </button>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center">
                {loading ? (
                    <div className="text-white text-lg animate-pulse">Loading Map...</div>
                ) : activeAreaId === null && areas.length > 1 ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full p-8">
                            {areas.map(area => (
                                <button 
                                    key={area.id}
                                    onClick={() => setActiveAreaId(area.id)}
                                    className="bg-charcoal-dark border border-white/20 hover:border-butterscotch hover:bg-white/5 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all shadow-xl group"
                                >
                                    <span className="text-3xl font-bold text-white group-hover:text-butterscotch uppercase tracking-widest">{area.name}</span>
                                    <span className="text-gray-400 text-sm">Click to view tables</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : activeArea ? (
                    <div 
                        className="relative border border-white/10 shadow-2xl rounded-xl overflow-hidden"
                        style={{ 
                            width: '800px', 
                            height: '600px',
                            backgroundImage: activeArea.map_image_url ? `url(${activeArea.map_image_url})` : 'none',
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#1a1a1a'
                        }}
                    >
                        {!activeArea.map_image_url && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-xl uppercase tracking-widest">
                                No Map Image Found
                            </div>
                        )}

                        {/* Dashed lines for merged tables */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            {activeTables.filter(t => t.merged_with_table_id).map(childTable => {
                                const parentTable = activeTables.find(t => t.id == childTable.merged_with_table_id);
                                if (!parentTable) return null;
                                return (
                                    <line 
                                        key={`line-${childTable.id}`}
                                        x1={`${parentTable.x_position}%`}
                                        y1={`${parentTable.y_position}%`}
                                        x2={`${childTable.x_position}%`}
                                        y2={`${childTable.y_position}%`}
                                        stroke="#3b82f6" // blue-500
                                        strokeWidth="4"
                                        strokeDasharray="8,6"
                                        className="opacity-60"
                                    />
                                );
                            })}
                        </svg>

                        {/* Tables */}
                        {activeTables.map(table => {
                            if (table.is_enabled === false) return null;
                            
                            // A table is occupied if it or any of its children have tickets
                            const isParent = tables.some(t => t.merged_with_table_id == table.id);
                            const isChild = !!table.merged_with_table_id;
                            
                            const parentId = table.merged_with_table_id || table.id;
                            const familyTableIds = [parentId, ...tables.filter(t => t.merged_with_table_id == parentId).map(t => t.id)];
                            
                            const tickets = openTicketsList ? openTicketsList.filter(ot => familyTableIds.some(fid => fid == ot.table_id)) : [];
                            const isOccupied = tickets.length > 0;
                            
                            const isMergeParent = isMergeMode && mergeParentId == table.id;
                            const isMergeChild = isMergeMode && table.merged_with_table_id == mergeParentId && mergeParentId !== null;

                            const handleTableClick = async () => {
                                if (isMergeMode) {
                                    if (!mergeParentId) {
                                        if (isChild) {
                                            alert("This table is already merged into another table. Select a parent table first.");
                                            return;
                                        }
                                        setMergeParentId(table.id);
                                    } else {
                                        if (table.id === mergeParentId) {
                                            setMergeParentId(null); // Deselect parent
                                            return;
                                        }
                                        
                                        // Toggle merge link
                                        const newParentId = isChild && table.merged_with_table_id === mergeParentId ? null : mergeParentId;
                                        try {
                                            await fetch(`/api/tables/${table.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ merged_with_table_id: newParentId })
                                            });
                                            // Update local state
                                            setTables(tables.map(t => t.id === table.id ? { ...t, merged_with_table_id: newParentId } : t));
                                        } catch(e) { console.error(e); }
                                    }
                                } else {
                                    // Normal click -> save to parent
                                    let targetTable = table;
                                    if (table.merged_with_table_id) {
                                        targetTable = tables.find(t => t.id == table.merged_with_table_id) || table;
                                    }
                                    
                                    // Calculate combined name and total capacity for merged tables
                                    const family = [targetTable, ...tables.filter(t => t.merged_with_table_id == targetTable.id)];
                                    let combinedName = targetTable.name;
                                    let totalCapacity = targetTable.capacity;
                                    
                                    if (family.length > 1) {
                                        combinedName = family.map(t => t.name).join(''); // e.g. A1A2A3
                                        totalCapacity = family.reduce((sum, t) => sum + (t.capacity || 4), 0);
                                    }
                                    
                                    onSelectTable({ ...targetTable, combinedName, totalCapacity }, activeArea);
                                }
                            };

                            return (
                                <button 
                                    key={table.id}
                                    onClick={handleTableClick}
                                    className={`absolute w-16 h-16 border-2 rounded-full flex flex-col items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 group transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-butterscotch/50 ${
                                        isMergeParent 
                                        ? 'bg-blue-500 border-blue-300 ring-4 ring-blue-500/50' 
                                        : isMergeChild 
                                        ? 'bg-blue-900 border-blue-500'
                                        : isChild 
                                        ? 'bg-white/10 border-dashed border-gray-400 opacity-80'
                                        : isOccupied 
                                        ? 'bg-red-500/90 border-red-300' 
                                        : 'bg-butterscotch border-white hover:bg-butterscotch/90'
                                    }`}
                                    style={{ 
                                        left: `${table.x_position}%`, 
                                        top: `${table.y_position}%`,
                                    }}
                                >
                                    <span className={`font-bold leading-none text-lg ${isOccupied ? 'text-white' : 'text-charcoal'}`}>
                                        {table.name}
                                    </span>
                                    <span className={`text-[9px] leading-none mt-1 font-bold tracking-wider ${isOccupied ? 'text-white/80' : 'text-charcoal/70'}`}>
                                        CAP: {table.capacity}
                                    </span>
                                    
                                    {/* Occupied Indicators */}
                                    {isOccupied && (
                                        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-charcoal-dark shadow-xl">
                                            {tickets.length}
                                        </div>
                                    )}

                                    {/* Hover tooltip for occupied tables */}
                                    {isOccupied && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-charcoal-dark border border-white/20 rounded-lg shadow-2xl p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 border-b border-white/10 pb-1">Open Tickets</div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                {tickets.map(t => (
                                                    <div key={t.id} className="flex justify-between items-center text-sm">
                                                        <span className="text-white truncate" title={t.ticket_name}>{t.ticket_name}</span>
                                                        <span className="text-butterscotch font-bold">?{parseFloat(t.gross_amount).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-gray-500 text-lg">No map areas configured for this branch.</div>
                )}
            </div>
            
            <div className="h-16 border-t border-white/10 bg-charcoal-dark/50 flex items-center justify-center text-gray-400 text-sm">
                {isMergeMode 
                    ? (mergeParentId ? "Click other tables to merge them into the selected parent table. Click the parent again to cancel." : "Click a primary table to become the parent.")
                    : "Click on any table to assign the current ticket to it. You can assign multiple tickets to the same table."
                }
            </div>
        </div>
    );
};

const TableSelectorModal = (props) => (
  <LocalErrorBoundary>
    <TableSelectorModalInner {...props} />
  </LocalErrorBoundary>
);

export default TableSelectorModal;
