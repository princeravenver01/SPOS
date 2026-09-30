import React, { useState, useEffect } from 'react';
import { X, Plus, MoreVertical, Square, CheckSquare, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SplitTicketModal({ 
    isOpen, 
    onClose, 
    originalTicket, 
    onSaveSuccess,
    showToast,
    openTicketsConfig,
    openTicketsList,
    clearCart
}) {
    const { cashier } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]); // Array of split_id
    const [isSaving, setIsSaving] = useState(false);
    
    // Edit Ticket Name State
    const [editingTicketIndex, setEditingTicketIndex] = useState(null);
    const [customNameValue, setCustomNameValue] = useState('');
    const [dropdownTicketIndex, setDropdownTicketIndex] = useState(null);

    useEffect(() => {
        if (isOpen && originalTicket) {
            // Unroll quantities into individual items with a unique split_id
            const unrolledItems = [];
            originalTicket.items.forEach(item => {
                const qty = parseInt(item.quantity) || 1;
                for (let i = 0; i < qty; i++) {
                    unrolledItems.push({
                        ...item,
                        quantity: 1, // force quantity to 1 for split view
                        split_id: Math.random().toString(36).substring(2, 11)
                    });
                }
            });

            setTickets([{
                is_original: true,
                ticket_name: originalTicket.ticket_name || (originalTicket.id ? `Order #${originalTicket.id}` : ''),
                items: unrolledItems
            }]);
            setSelectedItems([]);
            
            // If it's an unsaved ticket, force them to name the first column immediately
            if (!originalTicket.id) {
                setEditingTicketIndex(0);
            } else {
                setEditingTicketIndex(null);
            }
            
            setCustomNameValue('');
        }
    }, [isOpen, originalTicket]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (window.confirm('Are you sure you want to discard your changes?')) {
            onClose();
        }
    };

    const getNextIncrementedName = (baseName) => {
        // Strip any existing _N suffix to get the true base
        const baseMatch = baseName.match(/^(.+?)(?:_(\d+))?$/);
        const root = baseMatch ? baseMatch[1] : baseName;
        
        // Find the highest existing suffix number for this root
        let maxNum = 0;
        tickets.forEach(t => {
            if (t.ticket_name === root) maxNum = Math.max(maxNum, 0);
            const m = t.ticket_name.match(new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)$`));
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        });
        // Also check open tickets globally
        openTicketsList?.forEach(ot => {
            if (ot.ticket_name === root) maxNum = Math.max(maxNum, 0);
            const m = ot.ticket_name.match(new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)$`));
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        });
        
        return `${root}_${maxNum + 1}`;
    };

    const handleAddTicket = () => {
        setTickets(prev => [
            ...prev,
            {
                is_original: false,
                ticket_name: `Ticket ${prev.length + 1}`,
                items: []
            }
        ]);
        setEditingTicketIndex(tickets.length);
        setCustomNameValue('');
    };

    const handleAddTicketFrom = (sourceIndex) => {
        const sourceName = tickets[sourceIndex]?.ticket_name || 'Ticket';
        const newName = getNextIncrementedName(sourceName);
        setTickets(prev => [
            ...prev,
            {
                is_original: false,
                ticket_name: newName,
                items: []
            }
        ]);
        setDropdownTicketIndex(null);
    };

    const handleDeleteTicket = (tIndex) => {
        if (tickets.length <= 1) return; // Can't delete the last ticket
        setTickets(prev => {
            const newTickets = [...prev];
            const deletedTicket = newTickets[tIndex];
            // Move items from deleted ticket back to the first ticket
            if (deletedTicket.items.length > 0) {
                const firstTicketIdx = tIndex === 0 ? 1 : 0;
                newTickets[firstTicketIdx] = {
                    ...newTickets[firstTicketIdx],
                    items: [...newTickets[firstTicketIdx].items, ...deletedTicket.items]
                };
            }
            newTickets.splice(tIndex, 1);
            return newTickets;
        });
        setSelectedItems([]);
        setDropdownTicketIndex(null);
    };

    const toggleItemSelection = (split_id) => {
        setSelectedItems(prev => 
            prev.includes(split_id) 
                ? prev.filter(id => id !== split_id)
                : [...prev, split_id]
        );
    };

    const handleMoveHere = (targetTicketIndex) => {
        if (selectedItems.length === 0) return;

        setTickets(prev => {
            const newTickets = prev.map(t => ({ ...t, items: [...t.items] }));
            
            // Find items to move
            const itemsToMove = [];
            newTickets.forEach(t => {
                for (let i = t.items.length - 1; i >= 0; i--) {
                    if (selectedItems.includes(t.items[i].split_id)) {
                        itemsToMove.push(t.items[i]);
                        t.items.splice(i, 1);
                    }
                }
            });

            // Move them to target
            newTickets[targetTicketIndex].items.push(...itemsToMove);
            return newTickets;
        });

        setSelectedItems([]); // Clear selection after move
    };

    const handleNameSelect = (name) => {
        if (editingTicketIndex !== null && name.trim() !== '') {
            setTickets(prev => {
                const newTickets = [...prev];
                newTickets[editingTicketIndex].ticket_name = name.trim();
                return newTickets;
            });
            setEditingTicketIndex(null);
            setCustomNameValue('');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (originalTicket.id) {
                const res = await fetch(`/api/orders/${originalTicket.id}/split`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tickets })
                });
                if (res.ok) {
                    showToast('Ticket split successfully');
                    onSaveSuccess();
                    onClose();
                } else {
                    showToast('Failed to split ticket');
                }
            } else {
                // Split an unsaved ticket (the cart)
                const validTickets = tickets.filter(t => t.items.length > 0);
                if (validTickets.length === 0) {
                    showToast('Cannot save empty tickets');
                    setIsSaving(false);
                    return;
                }
                
                let allSuccess = true;
                for (let t of validTickets) {
                    const total_amount = t.items.reduce((sum, item) => sum + (parseFloat(item.price_at_time || item.price || 0)), 0);
                    const orderData = {
                        user_id: cashier?.id,
                        ticket_name: t.ticket_name,
                        dining_option_id: originalTicket.dining_option_id || 1,
                        total_amount: total_amount,
                        status: 'open',
                        items: t.items.map(i => ({
                            id: i.product_id || i.id, // backend expects id in /create
                            quantity: 1,
                            price: parseFloat(i.price_at_time || i.price || 0)
                        }))
                    };
                    
                    const res = await fetch('/api/orders/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderData)
                    });
                    
                    if (!res.ok) {
                        allSuccess = false;
                    }
                }
                
                if (allSuccess) {
                    showToast('Tickets created successfully');
                    if(clearCart) clearCart();
                    onSaveSuccess();
                    onClose();
                } else {
                    showToast('Some tickets failed to save');
                }
            }
        } catch (e) {
            console.error(e);
            showToast('Error saving split tickets');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="absolute inset-0 bg-charcoal-dark z-[100] flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-4">
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                    <h2 className="text-xl font-bold text-white tracking-wide">Split ticket</h2>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-butterscotch font-bold tracking-widest uppercase hover:text-white transition-colors disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Content (Horizontal Scrolling Columns) */}
            <div className="flex-1 flex p-4 gap-4 overflow-x-auto custom-scrollbar relative">
                
                {/* Name Editor Overlay */}
                {editingTicketIndex !== null && (
                    <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center p-4">
                        <div className="bg-[#2a2a2a] border border-white/10 p-6 rounded-lg w-full max-w-md shadow-2xl relative">
                            <button onClick={() => setEditingTicketIndex(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <X size={24}/>
                            </button>
                            <h3 className="text-xl font-bold text-butterscotch mb-4 uppercase tracking-wider">Name Ticket</h3>
                            
                            <div className="space-y-4">
                                {(() => {
                                    const isCustomNameInUse = customNameValue.trim() !== '' && (
                                        openTicketsList?.some(ot => ot.ticket_name.toLowerCase() === customNameValue.trim().toLowerCase()) || 
                                        tickets.some((t, idx) => idx !== editingTicketIndex && t.ticket_name.toLowerCase() === customNameValue.trim().toLowerCase())
                                    );
                                    
                                    return (
                                        <>
                                {openTicketsConfig?.usePredefined && openTicketsConfig.predefinedTickets?.length > 0 && (
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Select Predefined</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            {openTicketsConfig.predefinedTickets.map((ticketName, i) => {
                                                const isUsedGlobally = openTicketsList?.some(ot => ot.ticket_name === ticketName);
                                                const isUsedInSplit = tickets.some((t, idx) => idx !== editingTicketIndex && t.ticket_name === ticketName);
                                                const isUsed = isUsedGlobally || isUsedInSplit;
                                                
                                                return (
                                                    <button 
                                                        key={i}
                                                        disabled={isUsed}
                                                        onClick={() => handleNameSelect(ticketName)}
                                                        className={`p-3 rounded text-left font-medium border border-white/5 transition-colors ${
                                                            isUsed 
                                                            ? 'bg-black/10 opacity-30 cursor-not-allowed text-gray-500'
                                                            : 'bg-black/30 hover:bg-butterscotch hover:text-black text-gray-300'
                                                        }`}
                                                    >
                                                        {ticketName} {isUsed ? '(In Use)' : ''}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Or Custom Name</label>
                                    <input 
                                        type="text" 
                                        value={customNameValue}
                                        onChange={(e) => setCustomNameValue(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                        placeholder="Enter ticket name"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !isCustomNameInUse) handleNameSelect(customNameValue);
                                        }}
                                        autoFocus
                                    />
                                    {customNameValue.trim() && isCustomNameInUse && (
                                        <p className="text-red-500 text-xs mt-2 font-bold">This ticket name is already in use.</p>
                                    )}
                                    <button 
                                        onClick={() => handleNameSelect(customNameValue)}
                                        disabled={!customNameValue.trim() || isCustomNameInUse}
                                        className="w-full mt-4 bg-butterscotch text-black font-bold p-3 rounded uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                                    >
                                        Apply Name
                                    </button>
                                </div>
                                </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {tickets.map((ticket, tIndex) => {
                    const ticketTotal = ticket.items.reduce((sum, item) => sum + (parseFloat(item.price_at_time || item.price || 0)), 0);
                    const allSelectedItemsInThisColumn = selectedItems.length > 0 && selectedItems.every(id => ticket.items.some(item => item.split_id === id));
                    
                    return (
                        <div key={tIndex} className="min-w-[300px] w-[300px] bg-[#2a2a2a] rounded-lg flex flex-col border border-white/5 relative">
                            {/* Column Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <span className="text-white font-medium truncate pr-2">{ticket.ticket_name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleAddTicketFrom(tIndex)} className="text-gray-400 hover:text-white" title="Add Ticket">
                                        <Plus size={18} />
                                    </button>
                                    <div className="relative">
                                        <button onClick={() => setDropdownTicketIndex(dropdownTicketIndex === tIndex ? null : tIndex)} className="text-gray-400 hover:text-white" title="Options">
                                            <MoreVertical size={18} />
                                        </button>
                                        {dropdownTicketIndex === tIndex && (
                                            <>
                                                <div className="fixed inset-0 z-20" onClick={() => setDropdownTicketIndex(null)} />
                                                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-30 min-w-[160px] overflow-hidden">
                                                    <button 
                                                        onClick={() => { setDropdownTicketIndex(null); setEditingTicketIndex(tIndex); setCustomNameValue(''); }}
                                                        className="w-full text-left px-4 py-3 flex items-center gap-3 text-gray-300 hover:bg-white/5 transition-colors text-sm"
                                                    >
                                                        <Pencil size={14}/> Rename
                                                    </button>
                                                    <button 
                                                        disabled={tickets.length <= 1}
                                                        onClick={() => handleDeleteTicket(tIndex)}
                                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm ${tickets.length <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-red-400 hover:bg-red-500/10'}`}
                                                    >
                                                        <Trash2 size={14}/> Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {ticket.items.map(item => {
                                    const isSelected = selectedItems.includes(item.split_id);
                                    return (
                                        <div 
                                            key={item.split_id}
                                            onClick={() => toggleItemSelection(item.split_id)}
                                            className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${isSelected ? 'bg-butterscotch/10 border border-butterscotch/30' : 'hover:bg-white/5 border border-transparent'}`}
                                        >
                                            {isSelected ? <CheckSquare className="text-butterscotch shrink-0" size={20} /> : <Square className="text-gray-500 shrink-0" size={20} />}
                                            <span className="flex-1 text-gray-200 truncate">{item.name || item.product_name || 'Item'}</span>
                                            <span className="text-white">₱{parseFloat(item.price_at_time || item.price || 0).toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Column Footer */}
                            <div className="p-4 bg-black/20 border-t border-white/10 mt-auto">
                                <div className="flex justify-between items-center mb-4 px-2 font-bold">
                                    <span className="text-white">Total</span>
                                    <span className="text-butterscotch">₱{ticketTotal.toFixed(2)}</span>
                                </div>
                                
                                {selectedItems.length > 0 ? (
                                    allSelectedItemsInThisColumn ? (
                                        <div className="w-full p-3 rounded border border-white/10 text-center text-gray-500 uppercase tracking-wider text-sm font-bold">
                                            Items Selected
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleMoveHere(tIndex)}
                                            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white font-bold p-3 rounded uppercase tracking-wider transition-colors"
                                        >
                                            Move Here
                                        </button>
                                    )
                                ) : (
                                    <div className="w-full p-3 rounded border border-white/10 text-center text-gray-500 uppercase tracking-wider text-sm font-bold">
                                        Select items to move
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Empty Add Column button at the end to make adding obvious */}
                <button 
                    onClick={handleAddTicket}
                    className="min-w-[300px] w-[300px] border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-butterscotch hover:border-butterscotch/50 hover:bg-butterscotch/5 transition-all"
                >
                    <Plus size={32} className="mb-2" />
                    <span className="font-bold uppercase tracking-widest text-sm">Add Ticket</span>
                </button>
            </div>
        </div>
    );
}
