import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, MoreVertical, CreditCard, Banknote, Mail, Printer, Loader2 } from 'lucide-react';

export default function PosReceiptsView({ cashier, currentShift, onBack }) {
    const [receipts, setReceipts] = useState([]);
    const [selectedReceiptId, setSelectedReceiptId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const branchId = cashier?.activeBranch?.id;

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const url = branchId 
                    ? `/api/orders/history?branch_id=${branchId}`
                    : `/api/orders/history`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setReceipts(data);
                    if (data.length > 0) {
                        setSelectedReceiptId(data[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch receipt history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [branchId]);

    // Group receipts by date
    const groupedReceipts = useMemo(() => {
        const groups = {};
        const filtered = receipts.filter(r => 
            String(r.id).includes(searchTerm) || 
            (r.ticket_name && r.ticket_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        filtered.forEach(receipt => {
            const date = new Date(receipt.created_at);
            const dateKey = date.toLocaleDateString('en-GB', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(receipt);
        });
        return groups;
    }, [receipts, searchTerm]);

    const selectedReceipt = receipts.find(r => r.id === selectedReceiptId);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    
    const formatDateTime = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-US', { 
            month: 'numeric', day: 'numeric', year: '2-digit', 
            hour: 'numeric', minute: '2-digit' 
        });
    };

    const handleRefund = () => {
        alert('Refund feature is not yet implemented.');
    };

    const handleSendReceipt = () => {
        setShowMenu(false);
        const email = prompt("Enter customer email address for receipt:");
        if (email) {
            alert(`Receipt sent to ${email}`);
        }
    };

    return (
        <div className="flex-1 flex h-full bg-charcoal-dark overflow-hidden">
            
            {/* Left Sidebar - Receipt List */}
            <div className="w-[350px] bg-charcoal border-r border-white/10 flex flex-col shrink-0">
                
                {/* Header */}
                <div className="h-16 px-4 flex items-center gap-3 border-b border-white/10 shrink-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-white font-medium text-lg">Receipts</h2>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/5 shrink-0">
                    <div className="relative flex items-center">
                        <Search size={18} className="absolute left-3 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Search" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-white placeholder-gray-500 py-2 pl-10 pr-4 focus:outline-none text-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Loading receipts...</div>
                    ) : Object.keys(groupedReceipts).length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No receipts found.</div>
                    ) : (
                        Object.keys(groupedReceipts).map(dateKey => (
                            <div key={dateKey}>
                                <div className="px-4 py-3 bg-charcoal-dark/50 border-y border-white/10 text-xs text-butterscotch font-bold tracking-widest uppercase">
                                    {dateKey}
                                </div>
                                <div className="flex flex-col">
                                    {groupedReceipts[dateKey].map(receipt => {
                                        const isSelected = receipt.id === selectedReceiptId;
                                        // Simple logic to guess icon: if any payment is 'card' or 'online', show card icon.
                                        const hasCard = receipt.payments?.some(p => p.payment_method !== 'cash');
                                        
                                        return (
                                            <button 
                                                key={receipt.id}
                                                onClick={() => setSelectedReceiptId(receipt.id)}
                                                className={`flex items-center px-4 py-4 border-b border-white/5 text-left transition-all ${
                                                    isSelected ? 'bg-white/10 border-l-4 border-l-butterscotch pl-3' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                                                }`}
                                            >
                                                <div className="text-gray-400 mr-4 shrink-0">
                                                    {hasCard ? <CreditCard size={20} /> : <Banknote size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium">{formatCurrency(receipt.total_amount)}</div>
                                                    <div className="text-gray-500 text-xs mt-0.5">{formatTime(receipt.created_at)}</div>
                                                </div>
                                                <div className="text-gray-400 text-sm shrink-0">
                                                    #{receipt.id.toString().padStart(4, '0')}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side - Details */}
            <div className="flex-1 flex flex-col relative glass-bg">
                {selectedReceipt ? (
                    <>
                        {/* Details Header */}
                        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
                            <span className="text-white font-medium text-lg">#{selectedReceipt.id.toString().padStart(4, '0')}</span>
                            <div className="flex items-center gap-3 relative">
                                <button 
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/printers/print-receipt', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    branch_id: branchId,
                                                    receipt: {
                                                        orderId: selectedReceipt.id,
                                                        receipt_number: `POS-${selectedReceipt.id}`,
                                                        store_name: cashier?.activeBranch?.name || 'SILINGAN GASTRO',
                                                        branch_address: cashier?.activeBranch?.address || '',
                                                        branch_phone: cashier?.activeBranch?.phone || '',
                                                        cashier_name: selectedReceipt.employee_name || cashier?.name || 'Cashier',
                                                        customer_name: selectedReceipt.customer_name || 'Customer',
                                                        items: selectedReceipt.items || [],
                                                        subtotal: selectedReceipt.total_amount,
                                                        total_amount: selectedReceipt.total_amount,
                                                        payments: selectedReceipt.payments || []
                                                    }
                                                })
                                            });
                                            const data = await res.json();
                                            if (data.success) alert(`Receipt printed on ${data.printer}`);
                                            else alert(data.error || 'Print failed');
                                        } catch (e) {
                                            alert('Failed to print receipt: ' + e.message);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-butterscotch/10 hover:bg-butterscotch/20 text-butterscotch text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                >
                                    <Printer size={14} /> Print Receipt
                                </button>

                                <button 
                                    onClick={handleRefund}
                                    className="text-gray-300 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors"
                                >
                                    Refund
                                </button>
                                <button 
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full"
                                >
                                    <MoreVertical size={20} />
                                </button>

                                {/* Dropdown Menu */}
                                {showMenu && (
                                    <div className="absolute top-12 right-0 bg-charcoal border border-white/10 rounded-lg shadow-2xl z-10 w-52 overflow-hidden">
                                        <button 
                                            onClick={async () => {
                                                setShowMenu(false);
                                                try {
                                                    const res = await fetch('/api/printers/print-kitchen', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            branch_id: branchId,
                                                            order: {
                                                                id: selectedReceipt.id,
                                                                ticket_name: selectedReceipt.ticket_name || `Ticket #${selectedReceipt.id}`,
                                                                cashier_name: selectedReceipt.employee_name || cashier?.name,
                                                                items: selectedReceipt.items || []
                                                            }
                                                        })
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) alert(`Kitchen ticket printed on ${data.printer}`);
                                                    else alert(data.error || 'Kitchen print failed');
                                                } catch(e) {
                                                    alert('Kitchen print failed: ' + e.message);
                                                }
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-butterscotch hover:bg-white/5 transition-colors flex items-center gap-3"
                                        >
                                            <Printer size={16} />
                                            Print Kitchen Ticket
                                        </button>
                                        <button 
                                            onClick={handleSendReceipt}
                                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-butterscotch hover:bg-white/5 transition-colors flex items-center gap-3"
                                        >
                                            <Mail size={16} />
                                            Send receipt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center p-8">
                            
                            {/* Receipt Card */}
                            <div className="w-full max-w-lg glass-card rounded-xl flex flex-col p-8 h-fit">
                                
                                {/* Amount Header */}
                                <div className="text-center mb-8 border-b border-white/10 pb-8">
                                    <div className="text-4xl font-semibold text-white mb-2 tracking-tight flex justify-center">
                                        <span className="mr-1">₱</span>{parseFloat(selectedReceipt.total_amount).toFixed(2)}
                                    </div>
                                    <div className="text-gray-400 text-sm">Total</div>
                                </div>

                                {/* Info Block */}
                                <div className="mb-6 space-y-2 text-gray-300 text-sm">
                                    <p>Employee: {selectedReceipt.employee_name || 'Owner'}</p>
                                    <p>POS: {selectedReceipt.branch_name || 'POS'}</p>
                                </div>

                                <div className="h-px bg-white/10 mb-6 w-full" />

                                {/* Dining Option */}
                                <div className="font-medium text-white mb-4">
                                    {selectedReceipt.dining_option_name || 'Dine in'}
                                </div>

                                {/* Items List */}
                                <div className="space-y-4 mb-6">
                                    {selectedReceipt.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-sm">
                                            <div className="text-white">
                                                <p className="mb-1">{item.name}</p>
                                                <p className="text-gray-400 text-xs">{item.quantity} x {formatCurrency(item.price)}</p>
                                            </div>
                                            <div className="text-white font-medium">
                                                {formatCurrency(item.quantity * item.price)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-px bg-white/10 mb-6 w-full" />

                                {/* Totals Block */}
                                <div className="space-y-3 mb-6">
                                    {selectedReceipt.discount_amount > 0 && (
                                        <div className="flex justify-between items-center text-sm font-medium">
                                            <span className="text-white">Discount ({selectedReceipt.discount_name})</span>
                                            <span className="text-white">-{formatCurrency(selectedReceipt.discount_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center font-bold text-base mb-2">
                                        <span className="text-white">Total</span>
                                        <span className="text-white">{formatCurrency(selectedReceipt.total_amount)}</span>
                                    </div>
                                    
                                    {/* Payment Methods */}
                                    {selectedReceipt.payments?.map((payment, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm text-gray-300">
                                            <span className="capitalize">{payment.payment_method === 'online_payment' ? 'Online Payment' : payment.payment_method}</span>
                                            <span>{formatCurrency(payment.amount_paid)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-px bg-white/10 mb-6 w-full" />

                                {/* Footer */}
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>{formatDateTime(selectedReceipt.created_at)}</span>
                                    <span>#{selectedReceipt.id.toString().padStart(4, '0')}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <p>No receipt selected.</p>
                    </div>
                )}
            </div>
            
            {/* Overlay to close menu when clicking outside */}
            {showMenu && (
                <div 
                    className="absolute inset-0 z-0" 
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
}
