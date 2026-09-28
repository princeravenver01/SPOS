import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, Check, CreditCard, Mail, ChevronDown, Wifi, CheckCircle2 } from 'lucide-react';

export default function CheckoutModal({ 
    isOpen, 
    onClose, 
    total, 
    cart, 
    activeOpenTicket, 
    cashier, 
    currentShift, 
    setCurrentShift,
    selectedDiningOption,
    activeDiscount,
    discountAmount,
    cartCustomer,
    branchId,
    onComplete
}) {
    const [view, setView] = useState('pay');
    const [amountTendered, setAmountTendered] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Split state
    const [splitCount, setSplitCount] = useState(2);
    const [splits, setSplits] = useState([]);

    // Receipt state
    const [totalPaid, setTotalPaid] = useState(0);
    const [changeDue, setChangeDue] = useState(0);
    const [receiptEmail, setReceiptEmail] = useState('');

    useEffect(() => {
        if (isOpen) {
            setView('pay');
            setAmountTendered(total.toFixed(2));
            setIsProcessing(false);
            setSplitCount(2);
            setSplits([]);
            setTotalPaid(0);
            setChangeDue(0);
            setReceiptEmail('');
        }
    }, [isOpen, total]);

    useEffect(() => {
        if (view === 'split') {
            const perSplit = parseFloat((total / splitCount).toFixed(2));
            const newSplits = [];
            for (let i = 0; i < splitCount; i++) {
                const amt = i === splitCount - 1 
                    ? parseFloat((total - perSplit * (splitCount - 1)).toFixed(2))
                    : perSplit;
                newSplits.push({ id: i, method: 'cash', amount: amt, charged: false });
            }
            setSplits(newSplits);
        }
    }, [splitCount, view, total]);

    const totalCharged = splits.filter(s => s.charged).reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const remaining = total - totalCharged;

    const quickAmounts = [
        Math.ceil(total / 10) * 10,
        200,
        500,
        1000
    ].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

    const handleCharge = async (paymentMethod = 'cash', chargeAmount = null) => {
        if (!selectedDiningOption) {
            alert('Please select a dining option first!');
            return;
        }
        const amt = chargeAmount || parseFloat(amountTendered);
        if (isNaN(amt) || amt < total) {
            alert('Amount must be at least the total due.');
            return;
        }
        setIsProcessing(true);
        try {
            const url = activeOpenTicket 
                ? `http://localhost:5000/api/orders/${activeOpenTicket.id}/checkout`
                : 'http://localhost:5000/api/orders/create';
            const payments = [{ method: paymentMethod, amount: total }];
            const payload = activeOpenTicket ? {
                shift_id: currentShift?.id || null,
                payments,
                total_amount: total,
                discount_id: activeDiscount?.id || null,
                discount_amount: discountAmount || 0
            } : {
                user_id: cashier.id,
                shift_id: currentShift?.id || null,
                table_id: null,
                customer_id: cartCustomer?.id || null,
                dining_option_id: selectedDiningOption?.id || null,
                items: cart,
                total_amount: total,
                payments,
                discount_id: activeDiscount?.id || null,
                discount_amount: discountAmount || 0,
                branch_id: branchId || null
            };
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                if (currentShift && paymentMethod === 'cash') {
                    setCurrentShift({
                        ...currentShift,
                        cash_payments: parseFloat(currentShift.cash_payments || 0) + total
                    });
                }
                setTotalPaid(amt);
                setChangeDue(amt - total);
                setView('receipt');
            } else {
                alert(data.error || 'Failed to checkout');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during checkout.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSplitCharge = async (splitIndex) => {
        const split = splits[splitIndex];
        if (split.charged) return;
        const updatedSplits = [...splits];
        updatedSplits[splitIndex] = { ...split, charged: true };
        setSplits(updatedSplits);

        const allCharged = updatedSplits.every(s => s.charged);
        if (allCharged) {
            if (!selectedDiningOption) {
                alert('Please select a dining option first!');
                updatedSplits[splitIndex] = { ...split, charged: false };
                setSplits(updatedSplits);
                return;
            }
            setIsProcessing(true);
            try {
                const url = activeOpenTicket 
                    ? `http://localhost:5000/api/orders/${activeOpenTicket.id}/checkout`
                    : 'http://localhost:5000/api/orders/create';
                const payments = updatedSplits.map(s => ({ method: s.method, amount: parseFloat(s.amount) }));
                const payload = activeOpenTicket ? {
                    shift_id: currentShift?.id || null,
                    payments,
                    total_amount: total,
                    discount_id: activeDiscount?.id || null,
                    discount_amount: discountAmount || 0
                } : {
                    user_id: cashier.id,
                    shift_id: currentShift?.id || null,
                    table_id: null,
                    customer_id: cartCustomer?.id || null,
                    dining_option_id: selectedDiningOption?.id || null,
                    items: cart,
                    total_amount: total,
                    payments,
                    discount_id: activeDiscount?.id || null,
                    discount_amount: discountAmount || 0,
                    branch_id: branchId || null
                };
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    const cashTotal = updatedSplits.filter(s => s.method === 'cash').reduce((sum, s) => sum + parseFloat(s.amount), 0);
                    if (currentShift && cashTotal > 0) {
                        setCurrentShift({
                            ...currentShift,
                            cash_payments: parseFloat(currentShift.cash_payments || 0) + cashTotal
                        });
                    }
                    setTotalPaid(total);
                    setChangeDue(0);
                    setView('receipt');
                } else {
                    updatedSplits[splitIndex] = { ...split, charged: false };
                    setSplits(updatedSplits);
                    alert(data.error || 'Failed to checkout');
                }
            } catch (err) {
                console.error(err);
                updatedSplits[splitIndex] = { ...split, charged: false };
                setSplits(updatedSplits);
                alert('An error occurred during checkout.');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const updateSplitAmount = (index, newAmount) => {
        const updatedSplits = [...splits];
        updatedSplits[index] = { ...updatedSplits[index], amount: parseFloat(newAmount) || 0 };
        setSplits(updatedSplits);
    };

    const updateSplitMethod = (index, method) => {
        const updatedSplits = [...splits];
        updatedSplits[index] = { ...updatedSplits[index], method };
        setSplits(updatedSplits);
    };

    const removeSplit = (index) => {
        if (splits.length <= 2) return;
        const updatedSplits = splits.filter((_, i) => i !== index);
        setSplitCount(updatedSplits.length);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-charcoal-dark z-50 flex animate-fade-in">
            {/* Left Sidebar - Ticket Summary */}
            <div className="w-[280px] bg-charcoal border-r border-white/10 flex flex-col">
                {/* Ticket Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg tracking-wide">Ticket</h3>
                    {cartCustomer && (
                        <span className="text-xs text-butterscotch bg-butterscotch/10 px-2 py-1 rounded font-medium">
                            {cartCustomer.name}
                        </span>
                    )}
                </div>

                {/* Dining Option */}
                <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-gray-500 text-sm">{selectedDiningOption?.name || 'Dine in'}</p>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
                    {cart.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-sm border-b border-white/5 pb-3">
                            <span className="text-gray-300">{item.name} x {item.quantity}</span>
                            <span className="text-white font-medium ml-2 whitespace-nowrap">₱{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>

                {/* Discount */}
                {activeDiscount && (
                    <div className="px-4 py-2 border-t border-white/5 flex justify-between text-sm">
                        <span className="text-butterscotch">{activeDiscount.name}</span>
                        <span className="text-butterscotch">-₱{(discountAmount || 0).toFixed(2)}</span>
                    </div>
                )}

                {/* Total */}
                <div className="p-4 border-t border-white/10 bg-charcoal-dark/50">
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-base">Total</span>
                        <span className="text-white font-bold text-base">₱{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Right Main Content */}
            <div className="flex-1 flex flex-col glass-bg">

                {/* ===== PAY VIEW ===== */}
                {view === 'pay' && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <button 
                                onClick={onClose}
                                className="text-gray-400 hover:text-butterscotch transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <button 
                                onClick={() => setView('split')}
                                className="text-gray-400 hover:text-butterscotch transition-colors font-bold uppercase tracking-widest text-sm"
                            >
                                SPLIT
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col items-center justify-start pt-10 px-6 animate-fade-in-up">
                            {/* Total Display */}
                            <div className="text-center mb-10">
                                <p className="text-5xl font-bold text-white mb-2 tracking-tight" style={{fontFamily: 'Inter, sans-serif'}}>
                                    ₱{total.toFixed(2)}
                                </p>
                                <p className="text-gray-500 text-sm uppercase tracking-wider">Total amount due</p>
                            </div>

                            {/* Cash Input Row */}
                            <div className="w-full max-w-xl mb-8">
                                <label className="text-butterscotch text-xs font-semibold mb-3 block uppercase tracking-wider">Cash received</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 flex items-center border-b-2 border-white/15 pb-2 group hover:border-butterscotch/50 transition-colors focus-within:border-butterscotch">
                                        <CreditCard className="text-gray-500 mr-3 group-focus-within:text-butterscotch transition-colors" size={20} />
                                        <span className="text-white text-lg mr-1 font-medium">₱</span>
                                        <input
                                            type="number"
                                            className="bg-transparent text-white text-lg flex-1 focus:outline-none font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={amountTendered}
                                            onChange={(e) => setAmountTendered(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        disabled={isProcessing || !amountTendered || parseFloat(amountTendered) < total}
                                        onClick={() => handleCharge('cash')}
                                        className="bg-charcoal-light hover:bg-white/15 text-white font-bold px-8 py-3 rounded-lg transition-all uppercase tracking-widest text-sm disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl active:scale-95"
                                    >
                                        {isProcessing ? 'Processing...' : 'CHARGE'}
                                    </button>
                                </div>
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="w-full max-w-xl grid grid-cols-4 gap-3 mb-8">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmountTendered(amt.toFixed(2))}
                                        className="glass-card !transform-none py-3 rounded-xl text-white text-sm font-semibold hover:!border-butterscotch/30 hover:text-butterscotch active:scale-95 transition-all"
                                    >
                                        ₱{amt.toFixed(2)}
                                    </button>
                                ))}
                            </div>

                            {/* Online Payment */}
                            <div className="w-full max-w-xl">
                                <button
                                    disabled={isProcessing}
                                    onClick={() => handleCharge('online_payment', total)}
                                    className="w-full glass-card !transform-none py-4 rounded-xl text-white flex items-center justify-center gap-3 font-semibold hover:!border-butterscotch/30 hover:text-butterscotch active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
                                >
                                    <Wifi size={20} />
                                    ONLINE PAYMENT
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ===== SPLIT VIEW ===== */}
                {view === 'split' && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <button 
                                onClick={() => setView('pay')}
                                className="text-gray-400 hover:text-butterscotch transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <span className="text-white font-bold text-lg tracking-wide">
                                Remaining <span className="text-butterscotch">₱{remaining.toFixed(2)}</span>
                            </span>
                            <div className="w-6" />
                        </div>

                        <div className="flex-1 flex flex-col items-center pt-8 px-6 overflow-y-auto custom-scrollbar animate-fade-in-up">
                            {/* Split Counter */}
                            <div className="flex items-center gap-8 mb-8">
                                <button
                                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                                    className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-butterscotch hover:border-butterscotch/40 transition-all active:scale-90"
                                >
                                    <Minus size={20} />
                                </button>
                                <div className="text-center">
                                    <p className="text-5xl font-bold text-white">{splitCount}</p>
                                    <p className="text-gray-500 text-sm uppercase tracking-wider mt-1">Payments</p>
                                </div>
                                <button
                                    onClick={() => setSplitCount(splitCount + 1)}
                                    className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center text-gray-400 hover:text-butterscotch hover:border-butterscotch/40 transition-all active:scale-90"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Split Rows */}
                            <div className="w-full max-w-2xl border-t border-white/10 pt-6 space-y-5">
                                {splits.map((split, i) => (
                                    <div key={split.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${split.charged ? 'bg-butterscotch/5 border border-butterscotch/20' : 'bg-white/[0.02] border border-white/5 hover:border-white/10'}`}>
                                        {/* Delete */}
                                        <button
                                            onClick={() => removeSplit(i)}
                                            disabled={splits.length <= 2 || split.charged}
                                            className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        {/* Method Dropdown */}
                                        <div className="relative w-44">
                                            <select
                                                value={split.method}
                                                onChange={(e) => updateSplitMethod(i, e.target.value)}
                                                disabled={split.charged}
                                                className="w-full bg-transparent text-white border-b border-white/15 pb-2 pt-1 appearance-none focus:outline-none focus:border-butterscotch cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed pr-6 text-sm font-medium"
                                            >
                                                <option value="cash" className="bg-charcoal text-white">Cash</option>
                                                <option value="online_payment" className="bg-charcoal text-white">Online Payment</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>

                                        <div className="flex-1" />

                                        {/* Amount */}
                                        <div className="flex items-center border-b border-white/15 pb-2 w-32 focus-within:border-butterscotch transition-colors">
                                            <span className="text-white mr-1 font-medium">₱</span>
                                            <input
                                                type="number"
                                                value={split.amount}
                                                onChange={(e) => updateSplitAmount(i, e.target.value)}
                                                disabled={split.charged}
                                                className="bg-transparent text-white text-right w-full focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>

                                        {/* Charge Button */}
                                        <button
                                            onClick={() => handleSplitCharge(i)}
                                            disabled={split.charged || isProcessing || split.amount <= 0}
                                            className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${
                                                split.charged 
                                                    ? 'bg-butterscotch/20 text-butterscotch border border-butterscotch/30 cursor-default'
                                                    : 'bg-butterscotch hover:bg-butterscotch/90 text-charcoal-dark shadow-lg shadow-butterscotch/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none'
                                            }`}
                                        >
                                            {split.charged ? (
                                                <span className="flex items-center gap-1.5"><Check size={14} /> PAID</span>
                                            ) : 'CHARGE'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ===== RECEIPT VIEW ===== */}
                {view === 'receipt' && (
                    <>
                        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in-up">
                            {/* Success Icon */}
                            <div className="w-20 h-20 rounded-full bg-butterscotch/10 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(251,189,5,0.15)]">
                                <CheckCircle2 className="text-butterscotch" size={40} />
                            </div>

                            {/* Total Paid & Change */}
                            <div className="flex items-center gap-12 mb-16">
                                <div className="text-center">
                                    <p className="text-4xl font-bold text-white/60 line-through decoration-white/30 decoration-1">₱{totalPaid.toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs mt-2 uppercase tracking-wider">Total paid</p>
                                </div>
                                <div className="w-px h-20 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-4xl font-bold text-butterscotch">₱{changeDue.toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs mt-2 uppercase tracking-wider">Change</p>
                                </div>
                            </div>

                            {/* Email Receipt */}
                            <div className="w-full max-w-lg flex items-center border-b border-white/10 pb-3 group hover:border-white/20 transition-colors focus-within:border-butterscotch/50">
                                <Mail className="text-gray-500 mr-3 group-focus-within:text-butterscotch transition-colors" size={20} />
                                <input
                                    type="email"
                                    placeholder="Enter email"
                                    value={receiptEmail}
                                    onChange={(e) => setReceiptEmail(e.target.value)}
                                    className="bg-transparent text-white flex-1 focus:outline-none placeholder-gray-600 text-sm"
                                />
                                <button 
                                    className="text-gray-500 hover:text-butterscotch transition-colors font-bold text-xs uppercase tracking-widest"
                                    onClick={() => {
                                        if (receiptEmail) alert('Receipt sent to ' + receiptEmail);
                                    }}
                                >
                                    SEND RECEIPT
                                </button>
                            </div>
                        </div>

                        {/* New Sale Button */}
                        <div className="p-6">
                            <button
                                onClick={() => onComplete()}
                                className="w-full bg-butterscotch hover:bg-butterscotch/90 text-charcoal-dark font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 text-base uppercase tracking-widest shadow-lg shadow-butterscotch/20 hover:shadow-butterscotch/30 active:scale-[0.98]"
                            >
                                <Check size={22} />
                                NEW SALE
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
