import React, { useContext, useState } from 'react';
import { PosContext } from '../context/PosContext';
import { ShoppingCart, LogOut, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

export default function PosGrid() {
    const { 
        menuItems, 
        selectedCategory, 
        setSelectedCategory, 
        activeTicket, 
        dispatchTicket,
        user,
        setUser
    } = useContext(PosContext);

    const [selectedItemForModifiers, setSelectedItemForModifiers] = useState(null);
    const [selectedModifierOptions, setSelectedModifierOptions] = useState({});
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    const handleItemClick = (item) => {
        if (item.modifiers && item.modifiers.length > 0) {
            setSelectedItemForModifiers(item);
            setSelectedModifierOptions({});
        } else {
            dispatchTicket({ type: 'ADD_ITEM', payload: { ...item, cartItemId: `item_${item.id}_${Date.now()}` } });
        }
    };

    const toggleModifierOption = (modifierId, option, modifier) => {
        setSelectedModifierOptions(prev => {
            const currentSelected = prev[modifierId] || [];
            const isSelected = currentSelected.some(o => o.id === option.id);
            
            if (isSelected) {
                return { ...prev, [modifierId]: currentSelected.filter(o => o.id !== option.id) };
            } else {
                if (currentSelected.length >= modifier.max_selections) {
                    if (modifier.max_selections === 1) {
                        return { ...prev, [modifierId]: [option] };
                    }
                    return prev;
                }
                return { ...prev, [modifierId]: [...currentSelected, option] };
            }
        });
    };

    const confirmModifiers = () => {
        if (!selectedItemForModifiers) return;
        
        let isValid = true;
        let additionalPrice = 0;
        const selectedModsDetails = [];

        for (const mod of selectedItemForModifiers.modifiers) {
            const selected = selectedModifierOptions[mod.id] || [];
            if (mod.is_required && selected.length === 0) {
                isValid = false;
                alert(`Please select at least one option for ${mod.name}`);
                break;
            }
            selected.forEach(opt => {
                additionalPrice += parseFloat(opt.price) || 0;
                selectedModsDetails.push(`${mod.name}: ${opt.name}`);
            });
        }

        if (isValid) {
            const finalPrice = parseFloat(selectedItemForModifiers.price) + additionalPrice;
            const cartItemId = `item_${selectedItemForModifiers.id}_${JSON.stringify(selectedModifierOptions)}`;
            
            dispatchTicket({ 
                type: 'ADD_ITEM', 
                payload: { 
                    ...selectedItemForModifiers, 
                    price: finalPrice, 
                    cartItemId,
                    selectedModsDetails 
                } 
            });
            setSelectedItemForModifiers(null);
            setSelectedModifierOptions({});
        }
    };

    const categories = ['All', ...new Set(menuItems.map(item => item.category_name))];
    
    const filteredItems = selectedCategory === 'All' 
        ? menuItems 
        : menuItems.filter(item => item.category_name === selectedCategory);

    const totalItemCount = activeTicket.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = activeTicket.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.12; // 12% tax example
    const total = subtotal + tax;

    const handleCheckout = async () => {
        if (activeTicket.length === 0) return;
        
        try {
            const res = await fetch('http://localhost:5000/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    table_id: 1, // Defaulting for now
                    items: activeTicket,
                    total_amount: total
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Order #${data.orderId} processed successfully!`);
                dispatchTicket({ type: 'CLEAR_TICKET' });
                setIsMobileCartOpen(false);
            }
        } catch (e) {
            alert('Failed to process order. Ensure backend is running.');
        }
    };

    // Shared Cart/Ticket Component for Desktop Sidebar & Mobile Bottom Sheet Drawer
    const CartContent = ({ isMobile = false }) => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3 font-bold text-white text-base md:text-lg tracking-wide">
                    <div className="p-2 bg-butterscotch/20 rounded-lg">
                        <ShoppingCart size={18} className="text-butterscotch"/>
                    </div>
                    <span>Active Ticket</span>
                    {totalItemCount > 0 && (
                        <span className="text-xs bg-butterscotch/20 text-butterscotch px-2 py-0.5 rounded-full font-semibold">
                            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeTicket.length > 0 && (
                        <button 
                            onClick={() => dispatchTicket({ type: 'CLEAR_TICKET' })}
                            className="text-gray-400 hover:text-red-400 transition-colors p-2 glass-card rounded-lg border-none"
                            title="Clear Ticket"
                        >
                            <Trash2 size={16}/>
                        </button>
                    )}
                    {isMobile && (
                        <button 
                            onClick={() => setIsMobileCartOpen(false)}
                            className="text-gray-400 hover:text-white p-2 glass-card rounded-lg border-none"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Ticket Items List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-2.5">
                {activeTicket.length === 0 ? (
                    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-gray-500 space-y-3">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full glass-card flex items-center justify-center">
                            <ShoppingCart size={20} className="text-gray-600" />
                        </div>
                        <span className="italic font-medium text-xs md:text-sm">Ticket is empty</span>
                    </div>
                ) : (
                    activeTicket.map(item => (
                        <div key={item.cartItemId || item.id} className="flex justify-between items-center p-3 glass-card border border-white/5 rounded-xl group">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="font-bold text-white text-xs md:text-sm mb-0.5 truncate">{item.name}</div>
                                {item.selectedModsDetails && item.selectedModsDetails.length > 0 && (
                                    <div className="text-[10px] text-gray-400 mb-1 leading-tight line-clamp-2">
                                        {item.selectedModsDetails.join(', ')}
                                    </div>
                                )}
                                <div className="text-xs text-butterscotch font-medium">
                                    ₱{Number(item.price).toFixed(2)} <span className="text-gray-500">x {item.quantity}</span>
                                </div>
                            </div>
                            <div className="font-extrabold text-white text-xs md:text-sm whitespace-nowrap mr-3">
                                ₱{(Number(item.price) * item.quantity).toFixed(2)}
                            </div>
                            <button 
                                onClick={() => dispatchTicket({ type: 'REMOVE_ITEM', payload: item })}
                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center glass-card border-none text-red-400 hover:text-red-300 rounded-lg hover:bg-white/10 transition-colors shrink-0 text-sm font-bold"
                            >
                                -
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Checkout Panel */}
            <div className="p-4 md:p-6 border-t border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-gray-400 font-medium text-xs md:text-sm">
                        <span>Subtotal</span>
                        <span className="text-gray-300">₱{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 font-medium text-xs md:text-sm">
                        <span>Tax (12%)</span>
                        <span className="text-gray-300">₱{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg md:text-2xl font-black text-white pt-2 border-t border-white/10">
                        <span>Total</span>
                        <span className="text-butterscotch">₱{total.toFixed(2)}</span>
                    </div>
                </div>
                
                <button 
                    onClick={handleCheckout}
                    disabled={activeTicket.length === 0}
                    className={`w-full py-3.5 md:py-4 rounded-xl text-sm md:text-lg font-black transition-all duration-300 transform shadow-xl
                        ${activeTicket.length > 0 
                            ? 'bg-butterscotch hover:bg-butterscotch/90 text-charcoal shadow-butterscotch/20 hover:-translate-y-0.5 active:scale-[0.98]' 
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5 shadow-none'
                        }`}
                >
                    CHARGE ₱{(total).toFixed(2)}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen glass-bg text-white font-sans overflow-hidden animate-fade-in-up">
            
            {/* MOBILE TOP BAR (Visible on < md) */}
            <div className="md:hidden flex items-center justify-between p-3 border-b border-white/10 glass-panel z-20 shrink-0">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
                    <span className="font-bold text-sm tracking-wide text-white">Silingan POS</span>
                </div>
                <button 
                    onClick={() => setUser(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 glass-card text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold border-red-500/30"
                >
                    <LogOut size={14}/> Lock
                </button>
            </div>

            {/* MOBILE CATEGORY CHIPS (Horizontal scroll on < md) */}
            <div className="md:hidden overflow-x-auto custom-scrollbar flex items-center gap-2 p-2.5 border-b border-white/10 bg-black/20 shrink-0 whitespace-nowrap">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                            selectedCategory === cat 
                            ? 'bg-butterscotch text-charcoal shadow-md' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* DESKTOP LEFT SIDEBAR - CATEGORIES (Hidden on mobile, visible md:flex) */}
            <div className="hidden md:flex md:w-48 lg:w-56 glass-panel flex-col h-full border-r border-white/10 z-20 shrink-0">
                <div className="p-5 border-b border-white/10 text-center flex items-center justify-center gap-2">
                    <img src="/logo.png" alt="Logo" className="h-6" />
                    <span className="font-bold text-white tracking-wide">Menu</span>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full py-3.5 px-3 rounded-xl font-bold transition-all text-xs md:text-sm text-left truncate ${
                                selectedCategory === cat 
                                ? 'bg-butterscotch text-charcoal shadow-[0_0_15px_rgba(251,189,5,0.3)] transform translate-x-1' 
                                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-white/10">
                    <button 
                        onClick={() => setUser(null)}
                        className="w-full flex items-center justify-center gap-2 py-3 glass-card text-red-400 hover:text-red-300 rounded-xl font-bold border-red-500/30 hover:bg-red-500/10 transition-colors text-xs md:text-sm"
                    >
                        <LogOut size={16}/> Lock Register
                    </button>
                </div>
            </div>

            {/* CENTER AREA - MENU ITEMS GRID */}
            <div className="flex-1 p-3 md:p-6 overflow-y-auto h-full custom-scrollbar z-10 relative pb-24 md:pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                    {filteredItems.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="glass-card rounded-xl md:rounded-2xl cursor-pointer overflow-hidden border border-white/10 active:scale-95 transition-all group flex flex-col"
                        >
                            <div className="h-24 sm:h-28 md:h-32 relative overflow-hidden shrink-0">
                                <img 
                                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop'} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                <div className="absolute bottom-1.5 left-2 md:bottom-2 md:left-3">
                                    <p className="text-butterscotch font-extrabold text-sm md:text-lg shadow-black drop-shadow-md">
                                        ₱{Number(item.price).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div className="p-2.5 md:p-4 backdrop-blur-md bg-black/20 flex-1 flex items-center">
                                <h3 className="font-bold text-white text-xs md:text-sm leading-tight line-clamp-2">{item.name}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DESKTOP RIGHT SIDEBAR - TICKET/CHECKOUT (Hidden on mobile, visible md:flex) */}
            <div className="hidden md:flex md:w-72 lg:w-80 xl:w-96 glass-panel flex-col h-full border-l border-white/10 z-20 shrink-0">
                <CartContent isMobile={false} />
            </div>

            {/* MOBILE FLOATING BOTTOM CART BAR (Visible on < md) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 p-3 bg-charcoal/95 backdrop-blur-lg border-t border-white/10 shadow-2xl safe-area-pb">
                <div className="flex items-center justify-between gap-3">
                    <button 
                        onClick={() => setIsMobileCartOpen(true)}
                        className="flex-1 flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 text-left transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <ShoppingCart size={20} className="text-butterscotch" />
                                {totalItemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-butterscotch text-charcoal font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                        {totalItemCount}
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block leading-tight">Total</span>
                                <span className="font-extrabold text-white text-sm">₱{total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-butterscotch font-bold">
                            View Ticket <ChevronUp size={16} />
                        </div>
                    </button>

                    <button 
                        onClick={handleCheckout}
                        disabled={activeTicket.length === 0}
                        className={`px-5 py-3 rounded-xl text-sm font-black transition-all shrink-0
                            ${activeTicket.length > 0 
                                ? 'bg-butterscotch hover:bg-butterscotch/90 text-charcoal shadow-lg shadow-butterscotch/20 active:scale-95' 
                                : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                            }`}
                    >
                        Charge
                    </button>
                </div>
            </div>

            {/* MOBILE CART / TICKET DRAWER MODAL (Slides up when isMobileCartOpen is true) */}
            {isMobileCartOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-charcoal border-t border-white/15 rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up">
                        <CartContent isMobile={true} />
                    </div>
                </div>
            )}

            {/* MODIFIERS MODAL (Responsive for mobile & desktop) */}
            {selectedItemForModifiers && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-charcoal border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-y-auto custom-scrollbar shadow-2xl">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
                            <div>
                                <h3 className="text-base md:text-xl font-bold text-white leading-tight">Customize {selectedItemForModifiers.name}</h3>
                                <p className="text-xs text-butterscotch font-bold mt-0.5">Base: ₱{Number(selectedItemForModifiers.price).toFixed(2)}</p>
                            </div>
                            <button onClick={() => setSelectedItemForModifiers(null)} className="text-gray-400 hover:text-white p-1">
                                <X size={22} />
                            </button>
                        </div>
                        
                        {selectedItemForModifiers.modifiers.map(mod => {
                            const selected = selectedModifierOptions[mod.id] || [];
                            return (
                                <div key={mod.id} className="mb-5 pb-5 border-b border-white/5 last:border-0">
                                    <div className="flex justify-between items-baseline mb-2.5">
                                        <h4 className="font-bold text-white text-xs md:text-sm">{mod.name}</h4>
                                        <span className="text-[10px] md:text-xs text-gray-400">
                                            {mod.is_required ? 'Required' : 'Optional'} 
                                            {mod.max_selections > 1 ? ` (Max: ${mod.max_selections})` : ' (Choose 1)'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {mod.options.map(opt => {
                                            const isSelected = selected.some(o => o.id === opt.id);
                                            const price = parseFloat(opt.price) || 0;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => toggleModifierOption(mod.id, opt, mod)}
                                                    className={`p-2.5 md:p-3 rounded-xl border text-left flex justify-between items-center transition-colors active:scale-98 ${isSelected ? 'bg-butterscotch/10 border-butterscotch' : 'bg-black/20 border-white/10 hover:border-white/30'}`}
                                                >
                                                    <span className={`text-xs md:text-sm font-medium ${isSelected ? 'text-butterscotch' : 'text-gray-300'}`}>{opt.name}</span>
                                                    {price > 0 && (
                                                        <span className="text-[11px] text-gray-400 font-semibold">+₱{price.toFixed(2)}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        
                        <div className="mt-4 pt-2">
                            <button onClick={confirmModifiers} className="w-full bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-black py-3.5 md:py-4 rounded-xl shadow-[0_0_15px_rgba(251,189,5,0.2)] transition-all transform hover:-translate-y-0.5 active:scale-98 text-sm md:text-base">
                                Confirm & Add to Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
