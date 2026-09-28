import React, { useState, useEffect } from 'react';
import { 
    Menu, 
    Search, 
    UserPlus, 
    MoreVertical, 
    ChevronDown, 
    Grid,
    Clock,
    LogOut,
    ShoppingCart,
    Trash2,
    X,
    CheckCircle2,
    ArrowRightLeft,
    ArrowLeft,
    ArrowRight,
    UserCircle,
    CheckSquare,
    Square,
    Edit3,
    Split,
    RefreshCw,
    MessageSquare,
    Minus,
    Plus,
    LayoutGrid,
    ChevronRight
} from 'lucide-react';
import ShiftManagement from './ShiftManagement';
import ItemsGrid from './ItemsGrid';
import SplitTicketModal from './SplitTicketModal';
import AddItemModal from './AddItemModal';
import CustomerSelectionModal from './CustomerSelectionModal';
import CheckoutModal from './CheckoutModal';
import PosReceiptsView from './PosReceiptsView';
import TableSelectorModal from './TableSelectorModal';
import TicketNamePromptModal from './TicketNamePromptModal';
import { useAuth } from '../context/AuthContext';

export default function PosTerminal() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isShiftOpen, setIsShiftOpen] = useState(false);
    const [currentShift, setCurrentShift] = useState(null);
    const [currentView, setCurrentView] = useState('Sales'); // 'Sales' or 'Shift'
    const [isTableSelectorModalOpen, setIsTableSelectorModalOpen] = useState(false);
    const [ticketNamePrompt, setTicketNamePrompt] = useState(null);
    const { cashier, logout } = useAuth();

    // --- Cart & Tax & Dining State ---
    const [cart, setCart] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [diningOptions, setDiningOptions] = useState([]);
    const [selectedDiningOption, setSelectedDiningOption] = useState(null);
    const [isDiningDropdownOpen, setIsDiningDropdownOpen] = useState(false);
    const [activeDiscount, setActiveDiscount] = useState(null);
    const [cartCustomer, setCartCustomer] = useState(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    
    // --- Open Tickets State ---
    const [activeOpenTicket, setActiveOpenTicket] = useState(null);
    const [isSaveTicketModalOpen, setIsSaveTicketModalOpen] = useState(false);
    const [isOpenTicketsModalOpen, setIsOpenTicketsModalOpen] = useState(false);
    const [openTicketsConfig, setOpenTicketsConfig] = useState(null);
    const [openTicketsList, setOpenTicketsList] = useState([]);
    
    // --- Split & Ticket Actions ---
    const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false);
    const [isSplitTicketModalOpen, setIsSplitTicketModalOpen] = useState(false);
    const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
    const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
    const [editTicketName, setEditTicketName] = useState('');
    const [editingCartItem, setEditingCartItem] = useState(null); // { ...item, tempQty, tempComment }
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    // --- POS Pages & Setup Mode ---
    const [posPages, setPosPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null); // null means 'All items'
    const [setupMode, setSetupMode] = useState(false);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [activeGridSlot, setActiveGridSlot] = useState(null); // { pageId, index }
    const [isPageContextOpen, setIsPageContextOpen] = useState(null); // pageId
    const [contextMenuPos, setContextMenuPos] = useState(null); // { x, y }

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [activeTablePreview, setActiveTablePreview] = useState(null);
    const [amountTendered, setAmountTendered] = useState('');
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // --- Advanced Open Tickets ---
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [selectedTicketIds, setSelectedTicketIds] = useState([]);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [employeesList, setEmployeesList] = useState([]);

    const sortedOpenTickets = [...openTicketsList].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'ticket_name') { aVal = (aVal || '').toLowerCase(); bVal = (bVal || '').toLowerCase(); }
        else if (sortConfig.key === 'total_amount') { aVal = parseFloat(aVal || 0); bVal = parseFloat(bVal || 0); }
        else if (sortConfig.key === 'created_at') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
        else if (sortConfig.key === 'employee_name') { aVal = (aVal || '').toLowerCase(); bVal = (bVal || '').toLowerCase(); }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const toggleTicketSelection = (id, e) => {
        e.stopPropagation();
        setSelectedTicketIds(prev => prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]);
    };
    
    const fetchOpenTicketsData = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/orders/open?branch_id=${cashier?.activeBranch?.id || ''}`);
            if (res.ok) setOpenTicketsList(await res.json());
        } catch (err) { console.error(err); }
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let addedTax = 0;
    let includedTax = 0;
    taxes.forEach(t => {
        const rate = parseFloat(t.rate) / 100;
        if (t.calculation_type === 'added') {
            addedTax += subtotal * rate;
        } else if (t.calculation_type === 'included') {
            includedTax += subtotal - (subtotal / (1 + rate));
        }
    });

    const displayTax = addedTax + includedTax;
    
    let discountAmount = 0;
    if (activeDiscount) {
        if (activeDiscount.discount_type === 'percentage') {
            discountAmount = subtotal * (parseFloat(activeDiscount.value) / 100);
        } else {
            discountAmount = parseFloat(activeDiscount.value);
        }
    }
    
    const total = subtotal - discountAmount + addedTax;

    const applyDiscount = (discount) => {
        setActiveDiscount(discount);
        showToast(`Discount "${discount.name}" applied`);
    };

    const addToCart = (product) => {
        const stock = parseFloat(product.in_stock || 0);
        
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            const currentQty = existingItem ? existingItem.quantity : 0;
            
            if (currentQty >= stock) {
                showToast(`${product.name} is out of stock (${Math.floor(stock)} available)`);
                return prevCart;
            }
            
            if (existingItem) {
                return prevCart.map(item => 
                    item.id === product.id 
                        ? { ...item, quantity: item.quantity + 1 } 
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1, price: parseFloat(product.price), in_stock: stock }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return item;
                    if (newQty > parseFloat(item.in_stock || 0)) {
                        showToast(`Only ${Math.floor(item.in_stock || 0)} in stock`);
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
        });
    };

    const removeFromCart = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    const clearCart = () => {
        if (window.confirm('Clear cart?')) {
            setCart([]);
            setCartCustomer(null);
            setActiveDiscount(null);
        }
    };

    const handleCheckoutComplete = () => {
        setCart([]);
        setCartCustomer(null);
        setAmountTendered('');
        setActiveOpenTicket(null);
        setIsCheckoutModalOpen(false);
        setActiveDiscount(null);
        fetchOpenTicketsData();
        showToast('Transaction Complete!');
    };

    const handleSaveTicket = async (ticketName, tableId = null, pax = 1) => {
        if (!selectedDiningOption) {
            alert('Please select a dining option first!');
            return;
        }
        
        setIsProcessingCheckout(true);
        try {
            const payload = {
                user_id: cashier.id,
                shift_id: currentShift?.id || null,
                customer_id: cartCustomer?.id || null,
                dining_option_id: selectedDiningOption?.id || null,
                ticket_name: ticketName,
                table_id: tableId || null,
                items: cart,
                total_amount: total,
                status: 'open',
                discount_id: activeDiscount ? activeDiscount.id : null,
                discount_amount: discountAmount,
                branch_id: cashier?.activeBranch?.id || null,
                pax: pax || 1
            };

            let res;
            if (activeOpenTicket) {
                res = await fetch(`http://localhost:5000/api/orders/${activeOpenTicket.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('http://localhost:5000/api/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            const data = await res.json();
            if (data.success || res.ok) {
                showToast('Ticket saved successfully!');
                setIsSaveTicketModalOpen(false);
                setCart([]);
                setCartCustomer(null);
                setActiveDiscount(null);
                setActiveOpenTicket(null);
                fetchOpenTicketsData();
            } else {
                alert(data.error || 'Failed to save ticket');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during saving ticket.');
        } finally {
            setIsProcessingCheckout(false);
        }
    };

    // Generate incremental ticket name like "Ticket 1", "Ticket 2", etc.
    const getNextTicketName = () => {
        let maxNum = 0;
        openTicketsList?.forEach(ot => {
            const m = ot.ticket_name?.match(/^Ticket\s+(\d+)$/);
            if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
        });
        return `Ticket ${maxNum + 1}`;
    };

    const handleAddPage = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/pos_pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `Page ${posPages.length + 1}`, sort_order: posPages.length })
            });
            if (res.ok) {
                const newPage = await res.json();
                setPosPages([...posPages, newPage]);
                setActivePageId(newPage.id);
            }
        } catch (e) { console.error(e); }
    };

    const handleDeletePage = async (id) => {
        if (!confirm('Are you sure you want to delete this page?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/pos_pages/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPosPages(posPages.filter(p => p.id !== id));
                if (activePageId === id) setActivePageId(null);
                setIsPageContextOpen(null);
            }
        } catch (e) { console.error(e); }
    };

    const handleMovePage = async (index, direction) => {
        if (direction === 'left' && index === 0) return;
        if (direction === 'right' && index === posPages.length - 1) return;

        const newPages = [...posPages];
        const swapIndex = direction === 'left' ? index - 1 : index + 1;
        
        const temp = newPages[index];
        newPages[index] = newPages[swapIndex];
        newPages[swapIndex] = temp;
        
        newPages.forEach((p, i) => p.sort_order = i);
        
        setPosPages(newPages);
        setIsPageContextOpen(null);

        try {
            await Promise.all([
                fetch(`http://localhost:5000/api/pos_pages/${newPages[index].id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newPages[index].name, sort_order: newPages[index].sort_order })
                }),
                fetch(`http://localhost:5000/api/pos_pages/${newPages[swapIndex].id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newPages[swapIndex].name, sort_order: newPages[swapIndex].sort_order })
                })
            ]);
        } catch (e) {
            console.error('Failed to move page', e);
        }
    };

    useEffect(() => {
        const fetchCurrentShift = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/shifts/current?branch_id=${cashier?.activeBranch?.id || ''}&cashier_id=${cashier?.id || ''}`);
                const data = await res.json();
                if (data.success) {
                    setIsShiftOpen(true);
                    setCurrentShift(data.shift);
                } else {
                    setIsShiftOpen(false);
                    setCurrentShift(null);
                }
            } catch (err) {
                console.error('Failed to fetch shift:', err);
            }
        };
        fetchCurrentShift();

        const fetchTaxes = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/taxes');
                if (res.ok) {
                    const data = await res.json();
                    setTaxes(data);
                }
            } catch (err) {
                console.error('Failed to fetch taxes:', err);
            }
        };
        fetchTaxes();

        const fetchDiningOptions = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/dining-options');
                if (res.ok) {
                    const data = await res.json();
                    setDiningOptions(data);
                    if (data.length > 0) setSelectedDiningOption(data[0]);
                }
            } catch (err) {
                console.error('Failed to fetch dining options:', err);
            }
        };
        fetchDiningOptions();
        
        const fetchSettings = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.openTicketsConfig) {
                        try {
                            let parsed = JSON.parse(data.openTicketsConfig);
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                            setOpenTicketsConfig(parsed);
                        } catch (e) {}
                    }
                }
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            }
        };
        fetchSettings();

        const fetchPosPages = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/pos_pages?branch_id=${cashier?.activeBranch?.id || ''}`);
                if (res.ok) {
                    const data = await res.json();
                    setPosPages(data);
                    if (data.length > 0) {
                        // Default to the first page
                        setActivePageId(prev => prev === null ? data[0].id : prev);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch pos pages:', err);
            }
        };
        fetchPosPages();
    }, []);

    return (
        <div className="flex h-screen glass-bg text-gray-200 overflow-hidden font-sans select-none relative">
            
            {/* Dark overlay for sidebar */}
            {isSidebarOpen && (
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" 
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Drawer */}
            <div className={`absolute top-0 left-0 h-full w-80 glass-panel !rounded-none z-50 transform transition-transform duration-300 ease-in-out flex flex-col !border-y-0 !border-l-0 border-r border-white/10 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full bg-[#1e1e1e]">
                    <div className="h-16 px-6 border-b border-white/10 flex items-center gap-4 shrink-0 bg-charcoal/40">
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                            <img src="/logo.png" alt="Silingan" className="h-full w-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-butterscotch font-black text-xl leading-tight tracking-wide">SILINGAN</h1>
                            <span className="text-gray-400 text-xs tracking-widest uppercase mt-0.5">GASTRO POS</span>
                        </div>
                    </div>
                    <div className="flex-1 py-4 flex flex-col gap-1 bg-charcoal-dark/20">
                        {['Sales', 'Receipts', 'Tables', 'Shift', 'Settings', 'Back Office'].map(item => (
                            <button 
                                key={item} 
                                onClick={() => {
                                    if (item === 'Tables') {
                                        fetchOpenTicketsData();
                                        setIsTableSelectorModalOpen(true);
                                    } else if (item === 'Sales' || item === 'Shift' || item === 'Receipts') {
                                        setCurrentView(item);
                                    } else if (item === 'Settings') {
                                        window.open('http://localhost:5174/admin/settings', '_blank');
                                    } else if (item === 'Back Office') {
                                        window.open('http://localhost:5174/admin', '_blank');
                                    }
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left px-6 py-4 font-medium transition-colors ${
                                    currentView === item 
                                    ? 'bg-white/10 text-butterscotch border-l-4 border-butterscotch' 
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                                }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-white/10 bg-charcoal/40 flex flex-col gap-3">
                        <div className="text-sm text-gray-400 text-center">
                            Cashier: <span className="text-white font-medium">{cashier?.name || cashier?.username}</span>
                        </div>
                        <button 
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-bold border border-red-500/20"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </div>

            {currentView === 'Shift' ? (
                <ShiftManagement 
                    onMenuClick={() => setIsSidebarOpen(true)}
                    isShiftOpen={isShiftOpen}
                    setIsShiftOpen={setIsShiftOpen}
                    currentShift={currentShift}
                    setCurrentShift={setCurrentShift}
                    setCurrentView={setCurrentView}
                />
            ) : currentView === 'Receipts' ? (
                <PosReceiptsView 
                    cashier={cashier}
                    currentShift={currentShift}
                    onBack={() => setCurrentView('Sales')}
                />
            ) : (
                <>
                    {/* LEFT AREA: full width on mobile, 65% width on desktop */}
                    <div className="flex-1 flex flex-col border-r border-white/10 w-full min-w-0">
                
                {/* Left Header */}
                <header className="h-14 sm:h-16 px-2 sm:px-4 glass-panel flex items-center justify-between !border-0 !border-b !border-white/10 !shadow-none !rounded-none">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-1 sm:-ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10 shrink-0"
                        >
                            <Menu size={22} />
                        </button>
                        
                        <div className="h-6 sm:h-8 w-px bg-white/10 mx-1 shrink-0"></div>
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black flex items-center justify-center">
                            <img src="/logo.png" alt="Silingan" className="h-full w-full object-cover" />
                        </div>
                        <div className="h-6 sm:h-8 w-px bg-white/10 mx-1 shrink-0"></div>
                        
                        {cashier?.activeBranch && (
                            <span className="text-[10px] sm:text-xs font-bold bg-[#1e1e1e] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-butterscotch mr-1 sm:mr-2 border border-white/5 tracking-wider uppercase shrink-0 max-w-[100px] sm:max-w-none truncate">
                                {cashier.activeBranch.name}
                            </span>
                        )}
                        
                        {activePageId === null ? (
                            <button className="flex items-center gap-1.5 text-base sm:text-lg font-medium text-white hover:text-butterscotch transition-colors truncate">
                                <span className="truncate">All items</span> <ChevronDown size={16} className="text-gray-400 shrink-0" />
                            </button>
                        ) : (
                            <span className="text-base sm:text-lg font-medium text-white tracking-wide truncate max-w-[120px] sm:max-w-none">
                                {posPages.find(p => p.id === activePageId)?.name || 'Custom Page'}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => { setActivePageId(null); setSetupMode(false); }}
                            className={`p-2 transition-colors rounded-lg ${activePageId === null ? 'text-butterscotch bg-white/10' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/50'}`}
                            title="All Items Grid"
                        >
                            <LayoutGrid size={22} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-charcoal-light/50">
                            <Search size={22} />
                        </button>
                    </div>
                </header>

                {/* Left Body (Grid or Shift Closed State) */}
                <div className="flex-1 bg-transparent flex items-center justify-center relative">
                    {!isShiftOpen ? (
                        <div className="flex flex-col items-center justify-center gap-4 text-center fade-in">
                            <div className="w-24 h-24 rounded-full border-[6px] border-gray-500 flex items-center justify-center text-gray-500 mb-2">
                                <Clock size={48} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl text-gray-300">Shift is closed</h2>
                            <p className="text-gray-500 text-sm mb-4">Open a shift to perform sales</p>
                            <button 
                                onClick={() => setCurrentView('Shift')}
                                className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal-dark font-bold px-8 py-3 rounded uppercase tracking-wider text-sm transition-colors shadow-lg"
                            >
                                Open Shift
                            </button>
                        </div>
                    ) : (
                        <div className="absolute inset-0">
                            <ItemsGrid 
                                addToCart={addToCart} 
                                applyDiscount={applyDiscount}
                                setupMode={setupMode}
                                activePage={activePageId ? posPages.find(p => p.id === activePageId) : null}
                                onSlotClick={(index) => {
                                    if (!activePageId) return;
                                    setActiveGridSlot({ pageId: activePageId, index });
                                    setIsAddItemModalOpen(true);
                                }}
                                onLongPress={() => setSetupMode(!setupMode)}
                            />
                        </div>
                    )}
                </div>

                {/* Left Footer - Pages Navigation */}
                <footer className="h-12 bg-charcoal-dark flex items-center px-4 !border-0 !border-t !border-white/10 overflow-x-auto custom-scrollbar no-scrollbar gap-2 shrink-0 mb-14 md:mb-0">
                    {posPages.map((page, index) => (
                        <div key={page.id} className="relative h-full flex items-center shrink-0 group">
                            <button 
                                onClick={() => setActivePageId(page.id)}
                                className={`px-4 h-full flex items-center gap-2 text-xs font-medium tracking-widest uppercase border-b-2 transition-colors ${activePageId === page.id ? 'border-butterscotch text-butterscotch' : 'border-transparent text-gray-500 hover:text-white'}`}
                            >
                                {page.name}
                            </button>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (isPageContextOpen === page.id) {
                                        setIsPageContextOpen(null);
                                        setContextMenuPos(null);
                                    } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setIsPageContextOpen(page.id);
                                        setContextMenuPos({ x: rect.left, y: rect.top });
                                    }
                                }}
                                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical size={14} />
                            </button>
                            
                        </div>
                    ))}
                    <button 
                        onClick={handleAddPage}
                        className="px-4 h-full flex items-center text-xs font-medium tracking-widest uppercase text-gray-500 hover:text-white shrink-0 border-b-2 border-transparent gap-1"
                    >
                        <Plus size={14} /> Add Page
                    </button>
                    
                    <div className="flex-1"></div>
                    <button 
                        onClick={() => setSetupMode(!setupMode)}
                        className={`text-gray-500 hover:text-white transition-colors p-2 ${setupMode ? 'text-butterscotch' : ''}`}
                        title="Toggle Setup Mode"
                    >
                        <Grid size={18} />
                    </button>
                </footer>

                {/* Global Context Menu */}
                {isPageContextOpen && contextMenuPos && (
                    <div 
                        className="fixed w-40 bg-[#2a2a2a] border border-white/10 rounded shadow-2xl py-1 z-[100]"
                        style={{ left: contextMenuPos.x, bottom: window.innerHeight - contextMenuPos.y + 8 }}
                    >
                        {posPages.findIndex(p => p.id === isPageContextOpen) > 0 && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePage(posPages.findIndex(p => p.id === isPageContextOpen), 'left');
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                            >
                                <ArrowLeft size={14} /> Move Left
                            </button>
                        )}
                        {posPages.findIndex(p => p.id === isPageContextOpen) < posPages.length - 1 && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMovePage(posPages.findIndex(p => p.id === isPageContextOpen), 'right');
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                            >
                                <ArrowRight size={14} /> Move Right
                            </button>
                        )}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const page = posPages.find(p => p.id === isPageContextOpen);
                                const newName = prompt('Enter new page name:', page.name);
                                if (newName) {
                                    fetch(`http://localhost:5000/api/pos_pages/${page.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ name: newName, sort_order: page.sort_order })
                                    }).then(() => {
                                        setPosPages(posPages.map(p => p.id === page.id ? { ...p, name: newName } : p));
                                        setIsPageContextOpen(null);
                                    });
                                }
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                        >
                            <Edit3 size={14} /> Rename
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(isPageContextOpen);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-2"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                )}
            </div>

                {/* Mobile Floating Cart Summary Bar */}
                {!setupMode && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1e1e1e] border-t border-white/10 px-4 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-md">
                        <button 
                            onClick={() => setIsMobileCartOpen(true)}
                            className="flex items-center gap-3 text-left focus:outline-none"
                        >
                            <div className="relative p-2.5 bg-white/10 rounded-full text-butterscotch">
                                <ShoppingCart size={20} />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-butterscotch text-black font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1e1e1e]">
                                        {cart.reduce((s, i) => s + i.quantity, 0)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 font-medium">
                                    {cart.length === 0 ? 'Cart Empty' : `${cart.reduce((s, i) => s + i.quantity, 0)} item(s)`}
                                </div>
                                <div className="text-base font-bold text-white leading-tight">
                                    ₱{total.toFixed(2)}
                                </div>
                            </div>
                        </button>

                        <div className="flex items-center gap-2">
                            {cart.length === 0 ? (
                                <button 
                                    onClick={() => {
                                        fetchOpenTicketsData();
                                        setIsOpenTicketsModalOpen(true);
                                    }}
                                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider uppercase rounded flex items-center gap-1.5 transition-all"
                                >
                                    Tickets
                                </button>
                            ) : (
                                <button 
                                    onClick={() => {
                                        fetchOpenTicketsData();
                                        setIsSaveTicketModalOpen(true);
                                    }}
                                    className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider uppercase rounded transition-all"
                                >
                                    Save
                                </button>
                            )}

                            <button 
                                disabled={cart.length === 0 || isProcessingCheckout}
                                onClick={() => setIsCheckoutModalOpen(true)}
                                className="px-4 py-2.5 bg-butterscotch hover:bg-[#e5aa00] text-black font-bold text-xs tracking-wider uppercase rounded flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                Charge
                            </button>

                            <button 
                                onClick={() => setIsMobileCartOpen(true)}
                                className="p-2.5 text-gray-400 hover:text-white bg-white/5 rounded transition-colors"
                                title="View Ticket"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Mobile Cart Sheet / Modal */}
                {isMobileCartOpen && !setupMode && (
                    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div 
                            className="absolute inset-0"
                            onClick={() => setIsMobileCartOpen(false)}
                        />
                        <div className="relative w-full max-h-[90vh] bg-[#1e1e1e] border-t border-white/10 rounded-t-2xl flex flex-col z-10 shadow-2xl overflow-hidden animate-slide-up">
                            {/* Drawer Header */}
                            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#2a2a2a] shrink-0">
                                <div className={`flex items-center gap-2 ${activeOpenTicket ? 'text-white' : 'text-butterscotch'}`}>
                                    <ShoppingCart size={18} />
                                    <span className="font-semibold tracking-wide truncate max-w-[200px]">
                                        {activeOpenTicket ? (activeOpenTicket.ticket_name || `Order #${activeOpenTicket.id}`) : getNextTicketName()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative dropdown-container">
                                        <button 
                                            onClick={() => setIsTicketDropdownOpen(!isTicketDropdownOpen)} 
                                            className="text-gray-400 hover:text-white transition-colors p-2"
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                        {isTicketDropdownOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-52 bg-[#333333] border border-[#444] rounded shadow-2xl z-50 py-1">
                                                <button onClick={() => { setIsTicketDropdownOpen(false); setIsConfirmClearOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-white/5 text-gray-300 flex items-center gap-4 transition-colors"><Trash2 size={16}/> Clear {activeOpenTicket ? 'ticket' : 'order'}</button>
                                                
                                                <button 
                                                    disabled={!activeOpenTicket}
                                                    onClick={() => { if(!activeOpenTicket) return; setIsTicketDropdownOpen(false); setEditTicketName(activeOpenTicket.ticket_name || ''); setIsEditTicketOpen(true); }}
                                                    className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${!activeOpenTicket ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5'}`}
                                                ><Edit3 size={16}/> Edit ticket</button>
                                                
                                                <button 
                                                    disabled={!activeOpenTicket && cart.length === 0}
                                                    onClick={() => { if(!activeOpenTicket && cart.length === 0) return; setIsTicketDropdownOpen(false); setIsSplitTicketModalOpen(true); }} 
                                                    className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${(!activeOpenTicket && cart.length === 0) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5'}`}
                                                ><Split size={16}/> Split ticket</button>
                                                
                                                <button 
                                                    onClick={() => { setIsTicketDropdownOpen(false); fetchOpenTicketsData(); showToast('Synced successfully'); }} 
                                                    className="w-full text-left px-4 py-3 flex items-center gap-4 transition-colors text-gray-300 hover:bg-white/5"
                                                ><RefreshCw size={16}/> Sync</button>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setIsMobileCartOpen(false)}
                                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Customer Selection */}
                            <div className="relative border-b border-white/5 shrink-0">
                                <button 
                                    onClick={() => setIsCustomerModalOpen(true)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <UserCircle size={16} className={cartCustomer ? "text-butterscotch" : "text-gray-500"} />
                                        <span className={cartCustomer ? "text-butterscotch font-medium tracking-wide uppercase text-xs" : "text-gray-500 font-medium uppercase tracking-wide text-xs"}>
                                            {cartCustomer ? cartCustomer.name : "Add Customer"}
                                        </span>
                                    </span>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Dining Option Selector */}
                            <div className="relative border-b border-white/5 shrink-0">
                                <button 
                                    onClick={() => setIsDiningDropdownOpen(!isDiningDropdownOpen)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={selectedDiningOption ? "text-butterscotch font-medium tracking-wide uppercase text-xs" : "text-gray-500"}>
                                            {selectedDiningOption ? selectedDiningOption.name : "Select Dining Option"}
                                        </span>
                                    </span>
                                    <ChevronDown size={16} className={`transition-transform ${isDiningDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isDiningDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 bg-[#2a2a2a] border border-white/10 shadow-xl z-30">
                                        {diningOptions.length === 0 ? (
                                            <div className="p-3 text-sm text-gray-500 text-center">No options available</div>
                                        ) : (
                                            diningOptions.map(option => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        setSelectedDiningOption(option);
                                                        setIsDiningDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedDiningOption?.id === option.id ? 'bg-butterscotch/20 text-butterscotch font-medium uppercase tracking-wide text-xs' : 'text-gray-400 hover:bg-white/10 hover:text-white uppercase tracking-wide text-xs'}`}
                                                >
                                                    {option.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cart Items List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-[160px] max-h-[45vh]">
                                {cart.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-3">
                                        <ShoppingCart size={32} className="opacity-20" />
                                        <p className="text-sm">Cart is empty</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => setEditingCartItem({ ...item, tempQty: item.quantity, tempComment: item.comment || '' })}
                                            className="bg-white/5 rounded p-3 hover:bg-white/10 transition-colors cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-gray-200 font-medium text-sm">{item.name}</span>
                                                <span className="text-white font-semibold text-sm">₱{(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="text-gray-400">₱{item.price.toFixed(2)} / ea</span>
                                                    <span className="text-gray-500 ml-2">× {item.quantity}</span>
                                                </div>
                                            </div>
                                            {item.comment && (
                                                <p className="text-xs text-butterscotch/70 mt-1 italic">💬 {item.comment}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Cart Footer */}
                            <div className="bg-black/60 p-4 border-t border-white/5 space-y-2 shrink-0">
                                <div className="flex justify-between text-gray-400 text-xs">
                                    <span>Subtotal</span>
                                    <span>₱{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-xs">
                                    <span>Tax {taxes.some(t => t.calculation_type === 'included') ? '(Included)' : ''}</span>
                                    <span>₱{displayTax.toFixed(2)}</span>
                                </div>
                                {activeDiscount && (
                                    <div className="flex justify-between text-red-400 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span>Discount ({activeDiscount.name})</span>
                                            <button onClick={() => setActiveDiscount(null)} className="text-gray-500 hover:text-red-300">
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <span>-₱{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-white text-lg font-bold py-1.5 border-t border-white/10">
                                    <span>Total</span>
                                    <span className="text-butterscotch">₱{total.toFixed(2)}</span>
                                </div>
                                
                                <div className="flex gap-2 pt-1">
                                    {cart.length === 0 ? (
                                        <button 
                                            disabled={isProcessingCheckout}
                                            onClick={() => {
                                                setIsMobileCartOpen(false);
                                                fetchOpenTicketsData();
                                                setIsOpenTicketsModalOpen(true);
                                            }}
                                            className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Open Tickets
                                        </button>
                                    ) : (
                                        <button 
                                            disabled={isProcessingCheckout}
                                            onClick={() => {
                                                setIsMobileCartOpen(false);
                                                fetchOpenTicketsData();
                                                setIsSaveTicketModalOpen(true);
                                            }}
                                            className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save
                                        </button>
                                    )}
                                    <button 
                                        disabled={cart.length === 0 || isProcessingCheckout}
                                        onClick={() => {
                                            setIsMobileCartOpen(false);
                                            setIsCheckoutModalOpen(true);
                                        }}
                                        className="flex-1 h-12 bg-butterscotch hover:bg-[#e5aa00] text-black font-bold text-xs tracking-widest uppercase rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        Charge ₱{total.toFixed(2)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Right Sidebar (Hidden on mobile < md) */}
                {!setupMode ? (
                    <div className="hidden md:flex md:w-[380px] bg-black/40 flex-col relative z-20 shrink-0">
                        {/* Cart Header */}
                        <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#2a2a2a]">
                            <div className={`flex items-center gap-2 ${activeOpenTicket ? 'text-white' : 'text-butterscotch'}`}>
                                {!activeOpenTicket && <ShoppingCart size={18} />}
                                <span className="font-semibold tracking-wide truncate max-w-[150px]">
                                    {activeOpenTicket ? (activeOpenTicket.ticket_name || `Order #${activeOpenTicket.id}`) : getNextTicketName()}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative dropdown-container">
                                    <button 
                                        onClick={() => setIsTicketDropdownOpen(!isTicketDropdownOpen)} 
                                        className="text-gray-400 hover:text-white transition-colors p-1"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {isTicketDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-52 bg-[#333333] border border-[#444] rounded shadow-2xl z-50 py-1">
                                            <button onClick={() => { setIsTicketDropdownOpen(false); setIsConfirmClearOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-white/5 text-gray-300 flex items-center gap-4 transition-colors"><Trash2 size={16}/> Clear {activeOpenTicket ? 'ticket' : 'order'}</button>
                                            
                                            <button 
                                                disabled={!activeOpenTicket}
                                                onClick={() => { if(!activeOpenTicket) return; setIsTicketDropdownOpen(false); setEditTicketName(activeOpenTicket.ticket_name || ''); setIsEditTicketOpen(true); }}
                                                className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${!activeOpenTicket ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5'}`}
                                            ><Edit3 size={16}/> Edit ticket</button>
                                            
                                            <button 
                                                disabled={!activeOpenTicket}
                                                onClick={async () => { 
                                                    if(!activeOpenTicket) return; 
                                                    setIsTicketDropdownOpen(false);
                                                    setSelectedTicketIds([activeOpenTicket.id]); 
                                                    try { const res = await fetch('http://localhost:5000/api/employees'); if (res.ok) setEmployeesList(await res.json()); } catch(e) {} 
                                                    setIsAssignModalOpen(true); 
                                                }} 
                                                className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${!activeOpenTicket ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5'}`}
                                            ><UserPlus size={16}/> Assign ticket</button>
                                            
                                            <button 
                                                disabled={!activeOpenTicket && cart.length === 0}
                                                onClick={() => { if(!activeOpenTicket && cart.length === 0) return; setIsTicketDropdownOpen(false); setIsSplitTicketModalOpen(true); }} 
                                                className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${(!activeOpenTicket && cart.length === 0) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5'}`}
                                            ><Split size={16}/> Split ticket</button>
                                            
                                            <button 
                                                disabled={cart.length === 0 && !activeOpenTicket}
                                                onClick={async () => { 
                                                    if(cart.length === 0 && !activeOpenTicket) return; 
                                                    setIsTicketDropdownOpen(false); 
                                                    
                                                    // If unsaved, save first
                                                    let ticketId = activeOpenTicket?.id;
                                                    if (!ticketId && cart.length > 0) {
                                                        try {
                                                            const total = cart.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
                                                            const res = await fetch('http://localhost:5000/api/orders/create', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    user_id: cashier.id,
                                                                    shift_id: currentShift?.id || null,
                                                                    dining_option_id: selectedDiningOption?.id || null,
                                                                    ticket_name: getNextTicketName(),
                                                                    items: cart,
                                                                    total_amount: total,
                                                                    status: 'open',
                                                                    discount_id: activeDiscount ? activeDiscount.id : null,
                                                                    discount_amount: discountAmount
                                                                })
                                                            });
                                                            const data = await res.json();
                                                            if (data.success) {
                                                                ticketId = data.orderId;
                                                                await fetchOpenTicketsData();
                                                            } else { showToast('Failed to save ticket first'); return; }
                                                        } catch(e) { showToast('Error saving ticket'); return; }
                                                    }

                                                    setSelectedTicketIds([ticketId]); 
                                                    setIsMoveModalOpen(true); 
                                                }} 
                                                className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${(cart.length === 0 && !activeOpenTicket) ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5'}`}
                                            ><ArrowRightLeft size={16}/> Move ticket</button>
                                            
                                            <button 
                                                onClick={() => { setIsTicketDropdownOpen(false); fetchOpenTicketsData(); showToast('Synced successfully'); }} 
                                                className="w-full text-left px-4 py-3 flex items-center gap-4 transition-colors text-gray-300 hover:bg-white/5"
                                            ><RefreshCw size={16}/> Sync</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Customer Selection */}
                        <div className="relative border-b border-white/5">
                            <button 
                                onClick={() => setIsCustomerModalOpen(true)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300"
                            >
                                <span className="flex items-center gap-2">
                                    <UserCircle size={16} className={cartCustomer ? "text-butterscotch" : "text-gray-500"} />
                                    <span className={cartCustomer ? "text-butterscotch font-medium tracking-wide uppercase text-xs" : "text-gray-500 font-medium uppercase tracking-wide text-xs"}>
                                        {cartCustomer ? cartCustomer.name : "Add Customer"}
                                    </span>
                                </span>
                                <ChevronRight size={16} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Dining Option Selector */}
                        <div className="relative border-b border-white/5">
                            <button 
                                onClick={() => setIsDiningDropdownOpen(!isDiningDropdownOpen)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300"
                            >
                                <span className="flex items-center gap-2">
                                    <span className={selectedDiningOption ? "text-butterscotch font-medium tracking-wide uppercase text-xs" : "text-gray-500"}>
                                        {selectedDiningOption ? selectedDiningOption.name : "Select Dining Option"}
                                    </span>
                                </span>
                                <ChevronDown size={16} className={`transition-transform ${isDiningDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isDiningDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 bg-charcoal border border-white/10 shadow-xl z-30">
                                    {diningOptions.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-500 text-center">No options available</div>
                                    ) : (
                                        diningOptions.map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => {
                                                    setSelectedDiningOption(option);
                                                    setIsDiningDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedDiningOption?.id === option.id ? 'bg-butterscotch/20 text-butterscotch font-medium uppercase tracking-wide text-xs' : 'text-gray-400 hover:bg-white/10 hover:text-white uppercase tracking-wide text-xs'}`}
                                            >
                                                {option.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                                    <ShoppingCart size={32} className="opacity-20" />
                                    <p>Cart is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setEditingCartItem({ ...item, tempQty: item.quantity, tempComment: item.comment || '' })}
                                        className="bg-white/5 rounded p-3 hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-gray-200 font-medium">{item.name}</span>
                                            <span className="text-white font-semibold">₱{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <div>
                                                <span className="text-gray-400">₱{item.price.toFixed(2)} / ea</span>
                                                <span className="text-gray-500 ml-2">× {item.quantity}</span>
                                            </div>
                                        </div>
                                        {item.comment && (
                                            <p className="text-xs text-butterscotch/70 mt-1 italic">💬 {item.comment}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Cart Footer */}
                        <div className="bg-black/60 p-4 border-t border-white/5 space-y-3">
                            <div className="flex justify-between text-gray-400 text-sm">
                                <span>Subtotal</span>
                                <span>₱{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-sm">
                                <span>Tax {taxes.some(t => t.calculation_type === 'included') ? '(Included)' : ''}</span>
                                <span>₱{displayTax.toFixed(2)}</span>
                            </div>
                            {activeDiscount && (
                                <div className="flex justify-between text-red-400 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>Discount ({activeDiscount.name})</span>
                                        <button onClick={() => setActiveDiscount(null)} className="text-gray-500 hover:text-red-300">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <span>-₱{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-white text-xl font-bold py-2 border-t border-white/10">
                                <span>Total</span>
                                <span>₱{total.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                                {cart.length === 0 ? (
                                    <button 
                                        disabled={isProcessingCheckout}
                                        onClick={() => {
                                            fetchOpenTicketsData();
                                            setIsOpenTicketsModalOpen(true);
                                        }}
                                        className="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest uppercase rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Open Tickets
                                    </button>
                                ) : (
                                    <button 
                                        disabled={isProcessingCheckout}
                                        onClick={() => {
                                            fetchOpenTicketsData();
                                            setIsSaveTicketModalOpen(true);
                                        }}
                                        className="flex-1 h-14 bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest uppercase rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Save
                                    </button>
                                )}
                                <button 
                                    disabled={cart.length === 0 || isProcessingCheckout}
                                    onClick={() => setIsCheckoutModalOpen(true)}
                                    className="flex-1 h-14 bg-butterscotch hover:bg-[#e5aa00] text-black font-bold tracking-widest uppercase rounded flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Charge ₱{total.toFixed(2)}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:flex md:w-[380px] bg-transparent border-l border-white/10 flex-col relative z-20 shrink-0">
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                            <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-600 flex items-center justify-center mb-6">
                                <Grid size={48} className="text-gray-500" />
                            </div>
                            <h3 className="text-xl text-white font-bold mb-2">Item layout setup</h3>
                            <p className="text-sm">
                                Add your most used items, categories, and discounts on the pages for fast access.
                            </p>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <button 
                                onClick={() => setSetupMode(false)}
                                className="w-full h-14 bg-butterscotch hover:bg-[#e5aa00] text-black font-bold tracking-widest uppercase rounded flex items-center justify-center transition-all shadow-lg"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
                </>
            )}

            {/* Payment / Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                total={total}
                cart={cart}
                activeOpenTicket={activeOpenTicket}
                cashier={cashier}
                currentShift={currentShift}
                setCurrentShift={setCurrentShift}
                selectedDiningOption={selectedDiningOption}
                activeDiscount={activeDiscount}
                discountAmount={discountAmount}
                cartCustomer={cartCustomer}
                branchId={cashier?.activeBranch?.id || null}
                onComplete={handleCheckoutComplete}
            />

            {/* Save Ticket Modal */}
            {isSaveTicketModalOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-charcoal-dark border border-white/10 p-6 rounded-lg w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setIsSaveTicketModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                        
                        <h2 className="text-xl font-bold text-butterscotch mb-6 uppercase tracking-wider">Save Ticket</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <button 
                                    onClick={() => {
                                        setIsSaveTicketModalOpen(false);
                                        fetchOpenTicketsData();
                                        setIsTableSelectorModalOpen(true);
                                    }}
                                    className="w-full bg-charcoal hover:bg-white/5 border border-butterscotch text-butterscotch font-bold p-4 rounded-xl flex justify-center items-center gap-2 transition-colors uppercase tracking-widest shadow-lg"
                                >
                                    Map to Table
                                </button>
                                {activeOpenTicket?.table_id && (
                                    <button 
                                        onClick={() => {
                                            const ticketName = activeOpenTicket.ticket_name;
                                            handleSaveTicket(ticketName, activeOpenTicket.table_id);
                                        }}
                                        className="w-full bg-butterscotch hover:bg-butterscotch-dark text-charcoal font-bold p-4 rounded-xl flex justify-center items-center gap-2 transition-colors uppercase tracking-widest shadow-lg mt-4"
                                    >
                                        Save Changes (Same Table)
                                    </button>
                                )}
                            </div>
                            
                            {openTicketsConfig?.usePredefined && openTicketsConfig.predefinedTickets?.length > 0 && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Select Predefined</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {openTicketsConfig.predefinedTickets.map((ticket, i) => {
                                            const isUsed = openTicketsList.some(ot => ot.ticket_name === ticket && ot.id !== activeOpenTicket?.id);
                                            return (
                                                <button 
                                                    key={i}
                                                    disabled={isUsed}
                                                    onClick={() => handleSaveTicket(ticket)}
                                                    className={`p-3 rounded text-left font-medium border border-white/5 transition-colors ${
                                                        isUsed 
                                                        ? 'bg-black/10 opacity-30 cursor-not-allowed text-gray-500'
                                                        : 'bg-black/30 hover:bg-butterscotch hover:text-black text-gray-300'
                                                    }`}
                                                >
                                                    {ticket} {isUsed ? '(In Use)' : ''}
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
                                    id="customTicketName"
                                    className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                    placeholder="Enter ticket name"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            handleSaveTicket(e.target.value.trim());
                                        }
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        const val = document.getElementById('customTicketName').value.trim();
                                        if(val) handleSaveTicket(val);
                                    }}
                                    className="w-full mt-3 bg-butterscotch hover:bg-[#e5aa00] text-black font-bold p-3 rounded transition-colors"
                                >
                                    Save as Custom
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Tickets Modal */}
            {isOpenTicketsModalOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-charcoal-dark border border-white/10 p-6 rounded-lg w-full max-w-4xl shadow-2xl relative max-h-[80vh] flex flex-col">
                        {/* Dynamic Action Bar */}
                        {selectedTicketIds.length > 0 ? (
                            <div className="flex items-center justify-between mb-6 bg-white/5 p-3 rounded-lg border border-butterscotch/30">
                                <span className="text-butterscotch font-medium">{selectedTicketIds.length} selected</span>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={async () => {
                                            if(window.confirm('Are you sure you want to delete the selected ticket(s)?')) {
                                                for(let id of selectedTicketIds) {
                                                    await fetch(`http://localhost:5000/api/orders/${id}`, { method: 'DELETE' });
                                                }
                                                showToast('Tickets deleted');
                                                setSelectedTicketIds([]);
                                                fetchOpenTicketsData();
                                            }
                                        }}
                                        className="text-gray-400 hover:text-red-400 transition-colors" title="Delete"
                                    ><Trash2 size={20} /></button>
                                    
                                    {selectedTicketIds.length === 1 && (
                                        <>
                                            <button 
                                                onClick={() => setIsMoveModalOpen(true)}
                                                className="text-gray-400 hover:text-white transition-colors" title="Move/Merge to..."
                                            ><ArrowRightLeft size={20} /></button>
                                            
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch('http://localhost:5000/api/employees');
                                                        if (res.ok) setEmployeesList(await res.json());
                                                    } catch(e) {}
                                                    setIsAssignModalOpen(true);
                                                }}
                                                className="text-gray-400 hover:text-white transition-colors" title="Assign to..."
                                            ><UserCircle size={20} /></button>
                                        </>
                                    )}
                                    <button onClick={() => setSelectedTicketIds([])} className="ml-4 text-gray-500 hover:text-white"><X size={20} /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setIsOpenTicketsModalOpen(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                                <h2 className="text-xl font-bold text-butterscotch mb-6 uppercase tracking-wider">Open Tickets</h2>
                            </>
                        )}
                        
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-gray-300">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400">
                                        <th className="pb-3 w-12 px-4"></th>
                                        <th className="pb-3 font-medium px-4 cursor-pointer hover:text-butterscotch transition-colors" onClick={() => handleSort('ticket_name')}>
                                            Ticket {sortConfig.key === 'ticket_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="pb-3 font-medium px-4 cursor-pointer hover:text-butterscotch transition-colors" onClick={() => handleSort('total_amount')}>
                                            Amount {sortConfig.key === 'total_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="pb-3 font-medium px-4 cursor-pointer hover:text-butterscotch transition-colors" onClick={() => handleSort('created_at')}>
                                            Time {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="pb-3 font-medium px-4 cursor-pointer hover:text-butterscotch transition-colors" onClick={() => handleSort('employee_name')}>
                                            Employee {sortConfig.key === 'employee_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="pb-3 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedOpenTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-gray-500">No open tickets found.</td>
                                        </tr>
                                    ) : (
                                        sortedOpenTickets.map(ticket => {
                                            const isSelected = selectedTicketIds.includes(ticket.id);
                                            return (
                                                <tr 
                                                    key={ticket.id} 
                                                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isSelected ? 'bg-butterscotch/10' : ''}`}
                                                >
                                                    <td className="py-4 px-4" onClick={(e) => toggleTicketSelection(ticket.id, e)}>
                                                        {isSelected ? <CheckSquare className="text-butterscotch" size={20} /> : <Square className="text-gray-500" size={20} />}
                                                    </td>
                                                    <td className="py-4 px-4 text-white font-medium">{ticket.ticket_name || `Order #${ticket.id}`}</td>
                                                    <td className="py-4 px-4 text-butterscotch font-bold">₱{parseFloat(ticket.total_amount).toFixed(2)}</td>
                                                    <td className="py-4 px-4 text-sm text-gray-400">{new Date(ticket.created_at).toLocaleTimeString()}</td>
                                                    <td className="py-4 px-4">{ticket.employee_name || 'System'}</td>
                                                    <td className="py-4 px-4 text-right">
                                                        <button 
                                                            onClick={() => {
                                                                setActiveOpenTicket(ticket);
                                                                setCart(ticket.items.map(item => ({...item, in_stock: 999})));
                                                                setActiveDiscount(ticket.discount_id ? {
                                                                    id: ticket.discount_id,
                                                                    name: ticket.discount_name,
                                                                    discount_type: ticket.discount_type,
                                                                    value: ticket.discount_value
                                                                } : null);
                                                                if(ticket.dining_option_id) {
                                                                    const opt = diningOptions.find(d => d.id === ticket.dining_option_id);
                                                                    if(opt) setSelectedDiningOption(opt);
                                                                }
                                                                if(ticket.customer_id) {
                                                                    setCartCustomer({ id: ticket.customer_id, name: ticket.customer_name });
                                                                } else {
                                                                    setCartCustomer(null);
                                                                }
                                                                setIsOpenTicketsModalOpen(false);
                                                            }}
                                                            className="px-4 py-2 bg-butterscotch hover:bg-[#e5aa00] text-black font-bold text-sm rounded shadow-lg transition-all"
                                                        >
                                                            Open
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Move Ticket */}
            {isMoveModalOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-charcoal-dark border border-white/10 rounded-lg w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 rounded-t-lg">
                            <div className="flex items-center gap-3">
                                <ArrowRightLeft size={18} className="text-butterscotch" />
                                <h2 className="text-lg font-bold text-white">Move ticket to...</h2>
                            </div>
                            <button onClick={() => setIsMoveModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-charcoal-dark z-10">
                                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider text-xs">
                                        <th className="py-3 px-4 text-left w-10"></th>
                                        <th className="py-3 px-4 text-left">Ticket</th>
                                        <th className="py-3 px-4 text-left">Amount</th>
                                        <th className="py-3 px-4 text-left">Time</th>
                                        <th className="py-3 px-4 text-left">Employee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openTicketsList.filter(t => t.id !== selectedTicketIds[0]).map(t => (
                                        <tr 
                                            key={t.id}
                                            onClick={async () => {
                                                const sourceTicket = openTicketsList.find(ot => ot.id === selectedTicketIds[0]);
                                                const isPredefined = openTicketsConfig?.predefinedTickets?.includes(sourceTicket?.ticket_name);
                                                
                                                try {
                                                    const res = await fetch(`http://localhost:5000/api/orders/${selectedTicketIds[0]}/merge`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ target_order_id: t.id, delete_source: !isPredefined })
                                                    });
                                                    if (res.ok) {
                                                        showToast('Ticket moved successfully');
                                                        setIsMoveModalOpen(false);
                                                        setSelectedTicketIds([]);
                                                        setActiveOpenTicket(null);
                                                        setCart([]);
                                                        fetchOpenTicketsData();
                                                    } else {
                                                        showToast('Failed to move ticket');
                                                    }
                                                } catch (e) { console.error(e); }
                                            }}
                                            className="border-b border-white/5 hover:bg-butterscotch/10 cursor-pointer transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <Square className="text-gray-500" size={20} />
                                            </td>
                                            <td className="py-4 px-4 text-white font-medium">{t.ticket_name || `Order #${t.id}`}</td>
                                            <td className="py-4 px-4 text-butterscotch font-bold">₱{parseFloat(t.total_amount).toFixed(2)}</td>
                                            <td className="py-4 px-4 text-sm text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</td>
                                            <td className="py-4 px-4 text-gray-300">{t.employee_name || 'System'}</td>
                                        </tr>
                                    ))}
                                    {openTicketsList.filter(t => t.id !== selectedTicketIds[0]).length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="py-8 text-center text-gray-500">No other open tickets to move to</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Assign Ticket */}
            {isAssignModalOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-charcoal-dark border border-white/10 p-6 rounded-lg w-full max-w-md shadow-2xl relative flex flex-col">
                        <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors">
                            <ArrowRightLeft size={20} />
                        </button>
                        <h2 className="text-lg font-bold text-white mb-4 text-center">Assign ticket to...</h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {employeesList.map(emp => (
                                <button 
                                    key={emp.id}
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`http://localhost:5000/api/orders/${selectedTicketIds[0]}/assign`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ user_id: emp.id })
                                            });
                                            if (res.ok) {
                                                showToast(`Assigned to ${emp.username}`);
                                                setIsAssignModalOpen(false);
                                                setSelectedTicketIds([]);
                                                fetchOpenTicketsData();
                                            }
                                        } catch (e) {}
                                    }}
                                    className="w-full text-left bg-black/30 hover:bg-butterscotch hover:text-black text-gray-300 p-3 rounded transition-colors font-medium border border-white/5 flex items-center gap-3"
                                >
                                    <UserCircle size={18} /> {emp.username} {emp.name ? `(${emp.name})` : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}            {/* Toast Notification */}
            {toastMessage && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] bg-charcoal-dark border border-butterscotch text-white px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(251,221,5,0.2)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="text-butterscotch" size={24} />
                    <span className="font-medium tracking-wide">{toastMessage}</span>
                </div>
            )}

            {/* Edit Cart Item Modal */}
            {editingCartItem && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setEditingCartItem(null)}>
                    <div className="bg-[#2a2a2a] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        {/* Item Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-white font-bold text-lg">{editingCartItem.name}</h3>
                                <p className="text-gray-400 text-sm">₱{editingCartItem.price.toFixed(2)} / ea</p>
                            </div>
                            <button onClick={() => setEditingCartItem(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Quantity */}
                        <div className="mb-5">
                            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Quantity</label>
                            <div className="flex items-center bg-black/30 rounded-lg p-2">
                                <button 
                                    onClick={() => setEditingCartItem(prev => ({ ...prev, tempQty: Math.max(1, prev.tempQty - 1) }))}
                                    className="w-10 h-10 flex-shrink-0 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <Minus size={18} />
                                </button>
                                <input 
                                    type="number" 
                                    value={editingCartItem.tempQty}
                                    onChange={e => {
                                        const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                        setEditingCartItem(prev => ({ ...prev, tempQty: val }));
                                    }}
                                    onBlur={() => {
                                        let val = parseInt(editingCartItem.tempQty);
                                        const maxQty = Math.floor(parseFloat(editingCartItem.in_stock || 0));
                                        if (isNaN(val) || val < 1) val = 1;
                                        if (val > maxQty) {
                                            val = maxQty;
                                            showToast(`Only ${maxQty} available`);
                                        }
                                        setEditingCartItem(prev => ({ ...prev, tempQty: val }));
                                    }}
                                    className="flex-1 min-w-0 bg-transparent text-white text-center text-2xl font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min="1"
                                />
                                <button 
                                    onClick={() => {
                                        const maxQty = Math.floor(parseFloat(editingCartItem.in_stock || 0));
                                        setEditingCartItem(prev => (parseInt(prev.tempQty) || 0) < maxQty ? ({ ...prev, tempQty: (parseInt(prev.tempQty) || 0) + 1 }) : prev);
                                    }}
                                    className="w-10 h-10 flex-shrink-0 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-sm text-butterscotch font-medium">
                                    Subtotal: ₱{(editingCartItem.price * editingCartItem.tempQty).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {Math.floor(editingCartItem.in_stock || 0)} in stock
                                </p>
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="mb-5">
                            <label className="text-gray-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MessageSquare size={12} /> Comment
                            </label>
                            <textarea 
                                value={editingCartItem.tempComment}
                                onChange={e => setEditingCartItem(prev => ({ ...prev, tempComment: e.target.value }))}
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-butterscotch transition-colors resize-none h-20 mt-1"
                                placeholder="e.g. No onions, extra spicy..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    removeFromCart(editingCartItem.id);
                                    setEditingCartItem(null);
                                }}
                                className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold py-3 rounded-lg hover:bg-red-500/20 transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} /> Remove
                            </button>
                            <button 
                                disabled={parseInt(editingCartItem.tempQty) > Math.floor(parseFloat(editingCartItem.in_stock || 0)) || isNaN(parseInt(editingCartItem.tempQty)) || parseInt(editingCartItem.tempQty) < 1}
                                onClick={() => {
                                    let finalQty = parseInt(editingCartItem.tempQty);
                                    if (isNaN(finalQty) || finalQty < 1) finalQty = 1;
                                    const maxQty = Math.floor(parseFloat(editingCartItem.in_stock || 0));
                                    if (finalQty > maxQty) finalQty = maxQty;
                                    
                                    setCart(prev => prev.map(ci => 
                                        ci.id === editingCartItem.id 
                                            ? { ...ci, quantity: finalQty, comment: editingCartItem.tempComment.trim() || undefined }
                                            : ci
                                    ));
                                    setEditingCartItem(null);
                                }}
                                className="flex-1 bg-butterscotch text-black font-bold py-3 rounded-lg hover:bg-white transition-colors uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-butterscotch"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Clear Modal */}
            {isConfirmClearOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-[#2a2a2a] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl p-6 flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Trash2 className="text-red-400" size={28} />
                        </div>
                        <h3 className="text-white text-lg font-bold text-center">
                            {activeOpenTicket ? 'Void this ticket?' : 'Clear current order?'}
                        </h3>
                        <p className="text-gray-400 text-sm text-center leading-relaxed">
                            {activeOpenTicket 
                                ? `Are you sure you want to remove "${activeOpenTicket.ticket_name || 'this ticket'}"? This will void the ticket and clear all items.`
                                : 'Are you sure you want to clear all items from the current order?'
                            }
                        </p>
                        <div className="flex gap-3 w-full mt-2">
                            <button 
                                onClick={() => setIsConfirmClearOpen(false)}
                                className="flex-1 bg-white/5 border border-white/10 text-gray-300 font-bold py-3 rounded-lg hover:bg-white/10 transition-colors uppercase tracking-wider text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    if (activeOpenTicket) {
                                        // Void the ticket in backend
                                        try {
                                            await fetch(`http://localhost:5000/api/orders/${activeOpenTicket.id}`, {
                                                method: 'DELETE'
                                            });
                                        } catch(e) { console.error(e); }
                                    }
                                    clearCart(); 
                                    setActiveOpenTicket(null); 
                                    setIsConfirmClearOpen(false);
                                    fetchOpenTicketsData();
                                    showToast(activeOpenTicket ? 'Ticket voided' : 'Order cleared');
                                }}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors uppercase tracking-wider text-sm"
                            >
                                {activeOpenTicket ? 'Void' : 'Clear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Ticket Modal */}
            {isEditTicketOpen && activeOpenTicket && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-[#2a2a2a] border border-white/10 rounded-xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-butterscotch uppercase tracking-wider">Edit Ticket</h3>
                            <button onClick={() => setIsEditTicketOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Ticket Name</label>
                                <input 
                                    type="text" 
                                    value={editTicketName}
                                    onChange={(e) => setEditTicketName(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded p-3 text-white focus:outline-none focus:border-butterscotch transition-colors"
                                    placeholder="Enter new ticket name"
                                    autoFocus
                                />
                            </div>
                            
                            {openTicketsConfig?.usePredefined && openTicketsConfig.predefinedTickets?.length > 0 && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Or select predefined</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {openTicketsConfig.predefinedTickets.map((name, i) => {
                                            const isUsed = openTicketsList.some(ot => ot.ticket_name === name && ot.id !== activeOpenTicket.id);
                                            return (
                                                <button 
                                                    key={i}
                                                    disabled={isUsed}
                                                    onClick={() => setEditTicketName(name)}
                                                    className={`p-3 rounded text-left font-medium border transition-colors ${
                                                        editTicketName === name 
                                                        ? 'bg-butterscotch text-black border-butterscotch'
                                                        : isUsed 
                                                            ? 'bg-black/10 opacity-30 cursor-not-allowed text-gray-500 border-white/5'
                                                            : 'bg-black/30 hover:bg-butterscotch hover:text-black text-gray-300 border-white/5'
                                                    }`}
                                                >
                                                    {name} {isUsed ? '(In Use)' : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button 
                                disabled={!editTicketName.trim()}
                                onClick={async () => {
                                    if (!editTicketName.trim()) {
                                        showToast('Please enter a ticket name');
                                        return;
                                    }
                                    
                                    try {
                                        const res = await fetch(`http://localhost:5000/api/orders/${activeOpenTicket.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                                ticket_name: editTicketName.trim(),
                                                items: cart,
                                                total_amount: total,
                                                dining_option_id: selectedDiningOption?.id || null,
                                                discount_id: activeDiscount ? activeDiscount.id : null,
                                                discount_amount: discountAmount
                                            })
                                        });
                                        if (res.ok) {
                                            setActiveOpenTicket(prev => ({ ...prev, ticket_name: editTicketName.trim() }));
                                            setIsEditTicketOpen(false);
                                            fetchOpenTicketsData();
                                            showToast('Ticket updated');
                                        } else {
                                            showToast('Failed to update ticket');
                                        }
                                    } catch(e) { showToast('Error updating ticket'); }
                                }}
                                className="w-full bg-butterscotch text-black font-bold p-3 rounded-lg uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CustomerSelectionModal 
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={(customer) => setCartCustomer(customer)}
            />

            <AddItemModal 
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                activeGridSlot={activeGridSlot}
                posPages={posPages}
                setPosPages={setPosPages}
            />

            {/* Split Ticket Modal */}
            <SplitTicketModal
                isOpen={isSplitTicketModalOpen}
                onClose={() => setIsSplitTicketModalOpen(false)}
                originalTicket={activeOpenTicket ? { ...activeOpenTicket, items: cart } : (cart.length > 0 ? { id: null, ticket_name: 'Current Order', items: cart } : null)}
                showToast={showToast}
                openTicketsConfig={openTicketsConfig}
                openTicketsList={openTicketsList}
                clearCart={clearCart}
                onSaveSuccess={() => {
                    // Refresh open tickets data and close current active ticket view if split was successful
                    fetchOpenTicketsData();
                    setActiveOpenTicket(null);
                    setCart([]);
                }}
            />

            {/* Table Selector Modal */}
            {isTableSelectorModalOpen && (
                <TableSelectorModal 
                    branchId={cashier?.activeBranch?.id || null}
                    openTicketsList={openTicketsList}
                    onSelectTable={(table, area) => {
                        setIsTableSelectorModalOpen(false);
                        if (cart.length > 0) {
                            setTicketNamePrompt({ 
                                tableId: table.id, 
                                tableName: table.combinedName || table.name, 
                                capacity: table.totalCapacity || table.capacity || 4 
                            });
                        } else {
                            const existingTickets = openTicketsList.filter(ot => ot.table_id === table.id);
                            setActiveTablePreview({
                                table,
                                area,
                                tickets: existingTickets
                            });
                        }
                    }}
                    onClose={() => setIsTableSelectorModalOpen(false)}
                />
            )}

            {ticketNamePrompt && (
                <TicketNamePromptModal
                    tableName={`Table ${ticketNamePrompt.tableName}`}
                    capacity={ticketNamePrompt.capacity}
                    openTicketsList={openTicketsList}
                    onConfirm={(finalName, pax) => {
                        handleSaveTicket(finalName, ticketNamePrompt.tableId, pax);
                        setTicketNamePrompt(null);
                    }}
                    onClose={() => setTicketNamePrompt(null)}
                />
            )}

            {/* Table Preview Modal */}
            {activeTablePreview && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-charcoal-dark border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40">
                            <div>
                                <h2 className="text-2xl font-bold text-white uppercase tracking-widest">
                                    Table {activeTablePreview.table.name}
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">{activeTablePreview.area.name}</p>
                            </div>
                            <button 
                                onClick={() => setActiveTablePreview(null)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={28} />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {activeTablePreview.tickets.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-400 text-lg mb-6">No active tickets for this table.</p>
                                    <button 
                                        onClick={() => {
                                            setActiveTablePreview(null);
                                            setCartCustomer(null);
                                            setCart([]);
                                            setTotal(0);
                                            setActiveDiscount(null);
                                            setActiveOpenTicket(null);
                                            setIsSidebarOpen(false);
                                            setCurrentView('Sales');
                                        }}
                                        className="bg-butterscotch hover:bg-butterscotch-dark text-charcoal font-bold px-8 py-3 rounded-xl transition-all shadow-lg uppercase tracking-widest"
                                    >
                                        Create New Ticket
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeTablePreview.tickets.map(ticket => (
                                        <div key={ticket.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-butterscotch/50 transition-colors">
                                            {/* Ticket Header */}
                                            <div className="p-4 bg-black/20 flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-white font-bold text-lg">{ticket.ticket_name}</h3>
                                                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                                        <span><Clock size={12} className="inline mr-1"/>{new Date(ticket.created_at).toLocaleTimeString()}</span>
                                                        <span>By: {ticket.employee_name}</span>
                                                        {ticket.customer_name && (
                                                            <span className="text-butterscotch flex items-center gap-1">
                                                                <UserCircle size={12} />
                                                                {ticket.customer_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-butterscotch font-bold text-xl">₱{parseFloat(ticket.total_amount).toFixed(2)}</div>
                                                    <button 
                                                        onClick={() => {
                                                            // Load into POS directly from the ticket object
                                                            setActiveOpenTicket(ticket);
                                                            setCart(ticket.items ? ticket.items.map(item => ({...item, quantity: parseFloat(item.quantity), in_stock: 999})) : []);
                                                            if (ticket.customer_id) {
                                                                setCartCustomer({
                                                                    id: ticket.customer_id,
                                                                    name: ticket.customer_name
                                                                });
                                                            } else {
                                                                setCartCustomer(null);
                                                            }
                                                            setActiveDiscount(ticket.discount_id ? {
                                                                id: ticket.discount_id,
                                                                name: ticket.discount_name,
                                                                type: ticket.discount_type,
                                                                value: ticket.discount_value
                                                            } : null);
                                                            if(ticket.dining_option_id) {
                                                                const opt = diningOptions.find(d => d.id === ticket.dining_option_id);
                                                                if(opt) setSelectedDiningOption(opt);
                                                            }
                                                            setActiveTablePreview(null);
                                                            setIsSidebarOpen(false);
                                                            setCurrentView('Sales');
                                                        }}
                                                        className="mt-2 text-xs bg-charcoal border border-butterscotch text-butterscotch px-3 py-1 rounded hover:bg-butterscotch hover:text-charcoal transition-colors font-bold uppercase tracking-wider"
                                                    >
                                                        Open in POS
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Ticket Details (Items) */}
                                            <div className="p-4 bg-white/5 border-t border-white/5">
                                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                                    {ticket.items && ticket.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm text-gray-300 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                                            <div className="flex gap-2">
                                                                <span className="text-butterscotch font-bold">{item.quantity}x</span>
                                                                <span>{item.name}</span>
                                                            </div>
                                                            <span>₱{(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    {(!ticket.items || ticket.items.length === 0) && (
                                                        <div className="text-gray-500 text-sm italic">No items</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
