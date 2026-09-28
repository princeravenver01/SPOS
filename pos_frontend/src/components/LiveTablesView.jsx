import React, { useState, useEffect } from 'react';
import { Clock, UserCircle, X, Maximize, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LiveTablesView() {
    const { cashier } = useAuth();
    const [areas, setAreas] = useState([]);
    const [tables, setTables] = useState([]);
    const [openTicketsList, setOpenTicketsList] = useState([]);
    const [activeAreaId, setActiveAreaId] = useState(null);
    const [activeTablePreview, setActiveTablePreview] = useState(null);
    const [reservationModal, setReservationModal] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchAreas = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/areas?branch_id=${cashier?.activeBranch?.id || ''}`);
            const data = await res.json();
            setAreas(data);
            if (data.length > 0 && !activeAreaId) {
                setActiveAreaId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch areas', error);
        }
    };

    const fetchTables = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/tables?branch_id=${cashier?.activeBranch?.id || ''}`);
            const data = await res.json();
            setTables(data);
        } catch (error) {
            console.error('Failed to fetch tables', error);
        }
    };

    const fetchOpenTicketsData = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/orders/open?branch_id=${cashier?.activeBranch?.id || ''}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setOpenTicketsList(data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch open tickets', error);
        }
    };

    const fetchReservations = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/reservations?branch_id=${cashier?.activeBranch?.id || ''}&status=upcoming`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setReservations(data);
            }
        } catch (error) {
            console.error('Failed to fetch reservations', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/customers?branch_id=${cashier?.activeBranch?.id || ''}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setCustomers(data);
            }
        } catch (error) {
            console.error('Failed to fetch customers', error);
        }
    };

    // Initial load
    useEffect(() => {
        fetchAreas();
        fetchTables();
        fetchOpenTicketsData();
        fetchReservations();
        fetchCustomers();
    }, [cashier]);

    // SSE Real-time Feed
    useEffect(() => {
        const eventSource = new EventSource('http://localhost:5000/api/orders/stream');

        eventSource.onmessage = (event) => {
            // Server pushed an update, re-fetch data instantly
            fetchOpenTicketsData();
            fetchTables();
            fetchReservations();
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
        };

        return () => {
            eventSource.close();
        };
    }, [cashier]);

    const activeArea = areas.find(a => a.id === activeAreaId) || areas[0];
    const filteredTables = tables.filter(t => t.area_id === activeAreaId);

    const getTableTickets = (tableId) => {
        return openTicketsList.filter(ot => ot.table_id === tableId);
    };

    return (
        <div className="h-screen glass-bg text-white font-sans overflow-hidden flex flex-col relative">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2 border-b border-white/5 glass-panel z-10 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-butterscotch flex items-center justify-center shadow-lg shadow-butterscotch/20">
                        <Layers className="text-charcoal-dark" size={16} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-widest uppercase text-white leading-none">Live Operations</h1>
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">Manager Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Connection
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                        Last Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Area Sidebar */}
                <div className="w-56 border-r border-white/5 glass-panel overflow-y-auto hidden md:block">
                    <div className="p-4">
                        <h2 className="text-[10px] text-butterscotch uppercase font-bold tracking-widest mb-4">Dining Areas</h2>
                        <div className="space-y-2">
                            {areas.map(area => (
                                <button
                                    key={area.id}
                                    onClick={() => setActiveAreaId(area.id)}
                                    className={`w-full text-left p-3 rounded-lg transition-all duration-300 flex items-center justify-between ${
                                        activeAreaId === area.id 
                                            ? 'bg-gradient-to-r from-butterscotch to-[#ffc633] text-charcoal font-bold shadow-lg shadow-butterscotch/20 translate-x-1' 
                                            : 'glass-card text-gray-300 hover:text-white hover:translate-x-1'
                                    }`}
                                >
                                    <span className="text-xs tracking-wide">{area.name}</span>
                                    {activeAreaId === area.id && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-charcoal"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table Map */}
                <div className="flex-1 p-2 relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h2 className="text-lg font-bold text-butterscotch">{activeArea?.name}</h2>
                    </div>

                    <div className="flex-1 overflow-auto p-1 flex items-center justify-center custom-scrollbar">
                        {activeArea ? (
                            <div 
                                className="relative shadow-2xl rounded-xl overflow-hidden bg-[#1a1a1a]"
                                style={{ 
                                    width: '800px', 
                                    height: '600px',
                                    backgroundImage: activeArea.map_image_url ? `url(http://localhost:5000${activeArea.map_image_url})` : 'none',
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            >
                                {!activeArea.map_image_url && (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-xl uppercase tracking-widest">
                                        No Map Image Found
                                    </div>
                                )}
                                
                                {/* Dashed lines for merged tables */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                    {filteredTables.filter(t => t.merged_with_table_id).map(childTable => {
                                        const parentTable = filteredTables.find(t => t.id == childTable.merged_with_table_id);
                                        if (!parentTable) return null;
                                        return (
                                            <line 
                                                key={`line-${childTable.id}`}
                                                x1={`${parentTable.x_position}%`}
                                                y1={`${parentTable.y_position}%`}
                                                x2={`${childTable.x_position}%`}
                                                y2={`${childTable.y_position}%`}
                                                stroke="#60a5fa" // blue-400
                                                strokeWidth="4"
                                                strokeDasharray="8,6"
                                                className="opacity-70"
                                            />
                                        );
                                    })}
                                </svg>

                                {filteredTables.map(table => {
                                    if (table.is_enabled === false) return null;
                                    
                                    const isChild = !!table.merged_with_table_id;
                                    const parentId = table.merged_with_table_id || table.id;
                                    const familyTableIds = [parentId, ...tables.filter(t => t.merged_with_table_id == parentId).map(t => t.id)];
                                    
                                    const tableTickets = openTicketsList.filter(ot => familyTableIds.some(fid => fid == ot.table_id));
                                    const tableReservations = reservations.filter(r => r.table_id == table.id);
                                    
                                    const isOccupied = tableTickets.length > 0;
                                    const isReserved = tableReservations.length > 0;
                                    const isSelected = activeTablePreview?.id === table.id;
                                    
                                    return (
                                        <button
                                            key={table.id}
                                            onClick={() => {
                                                if (isOccupied) {
                                                    setActiveTablePreview({
                                                        ...table,
                                                        tickets: tableTickets,
                                                        area_name: activeArea?.name
                                                    });
                                                } else {
                                                    // Open Reservation Modal
                                                    if (!isChild) {
                                                        setReservationModal(table);
                                                    }
                                                }
                                            }}
                                            className={`absolute w-20 h-20 border-2 rounded-full flex flex-col items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 focus:outline-none ${
                                                isSelected ? 'ring-4 ring-butterscotch ring-offset-4 ring-offset-black scale-110 z-10' : ''
                                            } ${
                                                isChild 
                                                ? 'bg-white/10 border-dashed border-gray-400 opacity-80 cursor-not-allowed'
                                                : isOccupied 
                                                ? 'bg-red-500/90 border-red-300 cursor-pointer hover:scale-110' 
                                                : 'bg-butterscotch border-white cursor-pointer hover:scale-110 opacity-60 hover:opacity-100'
                                            }`}
                                            style={{ 
                                                left: `${table.x_position}%`, 
                                                top: `${table.y_position}%`,
                                            }}
                                        >
                                            <span className={`font-bold leading-none text-xl ${isOccupied ? 'text-white' : 'text-charcoal'}`}>
                                                {table.name}
                                            </span>
                                            <span className={`text-[10px] leading-none mt-1 font-bold tracking-wider ${isOccupied ? 'text-white/80' : 'text-charcoal/70'}`}>
                                                CAP: {table.capacity || 4}
                                            </span>

                                            {isOccupied && (
                                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 rounded-full border-2 border-charcoal-dark flex items-center justify-center text-xs font-bold text-white shadow-xl animate-pulse">
                                                    {tableTickets.length}
                                                </div>
                                            )}

                                            {!isOccupied && isReserved && (
                                                <div className="absolute -bottom-3 bg-blue-600 rounded-full border border-charcoal-dark px-2 py-0.5 text-[9px] font-bold text-white shadow-xl whitespace-nowrap">
                                                    RSVP: {new Date(tableReservations[0].reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                            
                                            {isOccupied && tableTickets[0] && (
                                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 bg-black/80 backdrop-blur-sm border border-white/20 rounded shadow-lg p-1 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                    <div className="text-[10px] text-gray-300 truncate">
                                                        {tableTickets[0].customer_name ? tableTickets[0].customer_name : tableTickets[0].employee_name}
                                                    </div>
                                                    <div className="text-xs text-butterscotch font-bold">
                                                        ₱{parseFloat(tableTickets[0].total_amount).toFixed(2)}
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-lg">No area selected or map configured.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Preview Modal (Manager Read-Only) */}
            {activeTablePreview && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-black/40">
                            <div>
                                <h3 className="text-2xl font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <span className="text-butterscotch">#</span>
                                    {activeTablePreview.name}
                                </h3>
                                <p className="text-gray-400 text-sm tracking-widest uppercase">{activeTablePreview.area_name}</p>
                            </div>
                            <button 
                                onClick={() => setActiveTablePreview(null)}
                                className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors border border-white/5"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-charcoal-dark/50 custom-scrollbar space-y-4">
                            {getTableTickets(activeTablePreview.id).map(ticket => (
                                <div key={ticket.id} className="glass-card rounded-xl p-5 hover:border-butterscotch/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10">
                                        <div>
                                            <h4 className="text-white font-bold text-lg mb-1">{ticket.ticket_name}</h4>
                                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                                <span className="flex items-center"><Clock size={12} className="mr-1"/>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                                                <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5">By: {ticket.employee_name}</span>
                                                {ticket.customer_name && (
                                                    <span className="text-butterscotch flex items-center gap-1 bg-butterscotch/10 px-2 py-1 rounded-md border border-butterscotch/20">
                                                        <UserCircle size={12} />
                                                        {ticket.customer_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-butterscotch font-bold text-2xl tracking-tight">₱{parseFloat(ticket.total_amount).toFixed(2)}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full inline-block font-bold">
                                                {ticket.dining_option_name || 'Dine In'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {ticket.items && ticket.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-butterscotch font-bold min-w-[24px]">{parseFloat(item.quantity)}x</span>
                                                    <div>
                                                        <div className="text-gray-200">{item.name}</div>
                                                        {item.modifiers && item.modifiers.length > 0 && (
                                                            <div className="text-xs text-gray-500 mt-0.5 italic">
                                                                + {item.modifiers.map(m => m.name).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-gray-400 tabular-nums">
                                                    ₱{(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {ticket.discount_amount && parseFloat(ticket.discount_amount) > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm items-center">
                                            <div className="text-red-400 uppercase tracking-wider text-xs flex items-center gap-2">
                                                Discount Applied
                                                {ticket.discount_name && <span className="bg-red-500/10 px-2 py-0.5 rounded">{ticket.discount_name}</span>}
                                            </div>
                                            <div className="text-red-400 font-bold">
                                                -₱{parseFloat(ticket.discount_amount).toFixed(2)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Reservation Modal */}
            {reservationModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-panel rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-white/10">
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-black/40">
                            <div>
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                    Reserve Table {reservationModal.name}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setReservationModal(null)}
                                className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors border border-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form 
                            className="p-6 space-y-4"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                try {
                                    await fetch('http://localhost:5000/api/reservations', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            branch_id: cashier?.activeBranch?.id,
                                            table_id: reservationModal.id,
                                            customer_name: formData.get('customer_name'),
                                            pax: parseInt(formData.get('pax')),
                                            reservation_time: formData.get('reservation_time')
                                        })
                                    });
                                    setReservationModal(null);
                                    fetchReservations();
                                } catch (error) {
                                    console.error('Failed to create reservation', error);
                                }
                            }}
                        >
                            <div>
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Customer Name</label>
                                <input 
                                    type="text" 
                                    name="customer_name" 
                                    list="customer-names"
                                    required 
                                    className="w-full bg-black/20 border border-white/10 focus:border-butterscotch rounded-lg px-4 py-3 text-white focus:outline-none" 
                                    placeholder="Enter name or select saved customer" 
                                />
                                <datalist id="customer-names">
                                    {customers.map(c => (
                                        <option key={c.id} value={c.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Number of Guests (Pax)</label>
                                    <input type="number" name="pax" min="1" max={reservationModal.capacity + 2} defaultValue={1} required className="w-full bg-black/20 border border-white/10 focus:border-butterscotch rounded-lg px-4 py-3 text-white focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Reservation Time</label>
                                    <input type="datetime-local" name="reservation_time" required className="w-full bg-black/20 border border-white/10 focus:border-butterscotch rounded-lg px-4 py-3 text-white focus:outline-none" />
                                </div>
                            </div>
                            <button type="submit" className="w-full mt-4 py-4 font-bold text-charcoal bg-butterscotch hover:bg-butterscotch/90 rounded-xl transition-colors uppercase tracking-wider shadow-lg">
                                Confirm Reservation
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LiveTablesView;
