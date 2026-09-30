import React, { useState } from 'react';
import { Menu, Clock } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function ShiftManagement({ onMenuClick, isShiftOpen, setIsShiftOpen, currentShift, setCurrentShift, setCurrentView }) {
    const { cashier } = useAuth();
    const [activeModal, setActiveModal] = useState(null); // 'cash_management', 'close_shift'
    const [startingCash, setStartingCash] = useState('0.00');
    const [actualCash, setActualCash] = useState('0.00');
    const [isProcessing, setIsProcessing] = useState(false);

    // If shift is completely closed, show the "Specify cash amount" screen
    if (!isShiftOpen) {
        return (
            <div className="flex-1 flex flex-col relative z-0">
                {/* Header */}
                <header className="h-16 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#1e1e1e]">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onMenuClick}
                            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-medium text-white tracking-wide">Shift</h1>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                        <Clock size={22} />
                    </button>
                </header>

                {/* Main Content Centered */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 w-[450px]">
                        <p className="text-gray-300 mb-6 text-[15px]">Specify the cash amount in your drawer at the start of the shift</p>
                        
                        <div className="mb-8">
                            <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                            <div className="relative border-b border-gray-600 focus-within:border-butterscotch transition-colors pb-1">
                                <span className="absolute left-0 bottom-1 text-white">₱</span>
                                <input 
                                    type="number"
                                    className="w-full bg-transparent text-white text-lg pl-4 outline-none"
                                    value={startingCash}
                                    onChange={(e) => setStartingCash(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={isProcessing}
                            onClick={async () => {
                                setIsProcessing(true);
                                try {
                                    const res = await fetch('/api/shifts/open', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            cashier_id: cashier.id,
                                            cashier_name: cashier.name || cashier.username,
                                            starting_cash: parseFloat(startingCash),
                                            branch_id: cashier?.activeBranch?.id
                                        })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        setCurrentShift(data.shift);
                                        setIsShiftOpen(true);
                                        if (setCurrentView) setCurrentView('Sales');
                                    } else {
                                        alert(data.error || 'Failed to open shift');
                                    }
                                } catch (err) {
                                    console.error(err);
                                    alert('Failed to connect to the server. Is the backend running?');
                                } finally {
                                    setIsProcessing(false);
                                }
                            }}
                            className="w-full border border-butterscotch/80 text-butterscotch font-medium py-3 text-sm tracking-widest hover:bg-butterscotch/10 transition-colors uppercase disabled:opacity-50"
                        >
                            {isProcessing ? 'Opening...' : 'Open Shift'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative z-0">
            {/* Header */}
            <header className="h-16 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#1e1e1e]">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onMenuClick}
                        className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                    >
                        <Menu size={24} />
                    </button>
                    <h1 className="text-xl font-medium text-white tracking-wide">Shift</h1>
                </div>
                <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                    <Clock size={22} />
                </button>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col items-center">
                <div className="w-full max-w-[700px] glass-panel p-6 bg-[#1a1a1c]/80 border-0 shadow-lg">
                    
                    {/* Action Buttons */}
                    <div className="flex gap-4 mb-8">
                        <button 
                            onClick={() => setActiveModal('cash_management')}
                            className="flex-1 border border-butterscotch/80 text-butterscotch font-medium py-3 text-sm tracking-widest hover:bg-butterscotch/10 transition-colors uppercase"
                        >
                            Cash Management
                        </button>
                        <button 
                            onClick={() => setActiveModal('close_shift')}
                            className="flex-1 border border-butterscotch/80 text-butterscotch font-medium py-3 text-sm tracking-widest hover:bg-butterscotch/10 transition-colors uppercase"
                        >
                            Close Shift
                        </button>
                    </div>

                    {/* Shift Info */}
                    <div className="space-y-4 mb-8">
                        <div className="text-gray-300 text-[15px]">Shift ID: {currentShift?.id || '-'}</div>
                        <div className="flex justify-between text-[15px] border-b border-white/10 pb-4">
                            <span className="text-gray-300">Shift opened: {currentShift?.cashier_name || cashier?.name || '-'}</span>
                            <span className="text-gray-300">
                                {currentShift?.opened_at ? new Date(currentShift.opened_at).toLocaleString() : '-'}
                            </span>
                        </div>
                    </div>

                    {/* Cash Drawer Section */}
                    <div className="mb-8">
                        <h3 className="text-butterscotch/90 font-medium mb-4 text-sm tracking-wide">Cash drawer</h3>
                        
                        <div className="space-y-4 text-[15px]">
                            <div className="flex justify-between">
                                <span className="text-gray-300">Starting cash</span>
                                <span className="text-white">₱{parseFloat(currentShift?.starting_cash || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Cash payments</span>
                                <span className="text-white">₱{parseFloat(currentShift?.cash_payments || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Cash refunds</span>
                                <span className="text-white">₱{parseFloat(currentShift?.cash_refunds || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Paid in</span>
                                <span className="text-white">₱{parseFloat(currentShift?.paid_in || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Paid out</span>
                                <span className="text-white">₱{parseFloat(currentShift?.paid_out || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t border-white/5 mt-4">
                                <span className="text-white">Expected cash amount</span>
                                <span className="text-white">
                                    ₱{(
                                        parseFloat(currentShift?.starting_cash || 0) + 
                                        parseFloat(currentShift?.cash_payments || 0) - 
                                        parseFloat(currentShift?.cash_refunds || 0) + 
                                        parseFloat(currentShift?.paid_in || 0) - 
                                        parseFloat(currentShift?.paid_out || 0)
                                    ).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sales Summary Section */}
                    <div>
                        <h3 className="text-butterscotch/90 font-medium mb-4 text-sm tracking-wide">Sales summary</h3>
                        
                        <div className="space-y-4 text-[15px]">
                            <div className="flex justify-between font-bold">
                                <span className="text-white">Gross sales</span>
                                <span className="text-white">₱0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Refunds</span>
                                <span className="text-white">₱0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-300">Discounts</span>
                                <span className="text-white">₱0.00</span>
                            </div>
                            <div className="flex justify-between font-bold pt-2 border-t border-white/5 mt-4">
                                <span className="text-white">Net sales</span>
                                <span className="text-white">₱0.00</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Cash Management Modal */}
            {activeModal === 'cash_management' && (
                <div className="fixed inset-0 z-[60] bg-[#121212]/95 backdrop-blur flex flex-col">
                    <header className="h-16 px-4 flex items-center gap-4 bg-[#1e1e1e] border-b border-white/5 shrink-0">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full">
                            <span className="text-2xl leading-none">&times;</span>
                        </button>
                        <h2 className="text-lg font-medium text-white">Cash management</h2>
                    </header>
                    <div className="flex-1 flex justify-center p-8">
                        <div className="glass-panel bg-[#1a1a1c]/80 p-8 w-full max-w-[600px] border-0 h-fit mt-10">
                            <div className="mb-8">
                                <label className="text-xs text-gray-500 mb-1 block">Amount</label>
                                <div className="relative border-b border-gray-600 focus-within:border-butterscotch transition-colors pb-1">
                                    <span className="absolute left-0 bottom-1 text-white">₱</span>
                                    <input type="number" defaultValue="0.00" className="w-full bg-transparent text-white text-lg pl-4 outline-none" />
                                </div>
                            </div>
                            <div className="mb-10">
                                <label className="text-xs text-gray-500 mb-1 block">Comment</label>
                                <div className="border-b border-gray-600 focus-within:border-butterscotch transition-colors pb-1">
                                    <input type="text" className="w-full bg-transparent text-white text-lg outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setActiveModal(null)} className="flex-1 border border-white/20 text-gray-300 hover:text-white font-medium py-3 text-sm tracking-widest hover:bg-white/5 transition-colors uppercase">
                                    Pay In
                                </button>
                                <button onClick={() => setActiveModal(null)} className="flex-1 border border-white/20 text-gray-300 hover:text-white font-medium py-3 text-sm tracking-widest hover:bg-white/5 transition-colors uppercase">
                                    Pay Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Shift Modal */}
            {activeModal === 'close_shift' && (
                <div className="fixed inset-0 z-[60] bg-[#121212]/95 backdrop-blur flex flex-col">
                    <header className="h-16 px-4 flex items-center gap-4 bg-[#1e1e1e] border-b border-white/5 shrink-0">
                        <button onClick={() => setActiveModal(null)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full">
                            <span className="text-2xl leading-none">&times;</span>
                        </button>
                        <h2 className="text-lg font-medium text-white">Close shift</h2>
                        <div className="ml-auto">
                            <Clock size={20} className="text-gray-400" />
                        </div>
                    </header>
                    <div className="flex-1 flex justify-center p-8">
                        <div className="glass-panel bg-[#1a1a1c]/80 p-8 w-full max-w-[600px] border-0 h-fit mt-10">
                            
                            <div className="flex justify-between items-center mb-6 text-[15px]">
                                <span className="text-gray-300">Expected cash amount</span>
                                <span className="text-white">
                                    ₱{(
                                        parseFloat(currentShift?.starting_cash || 0) + 
                                        parseFloat(currentShift?.cash_payments || 0) - 
                                        parseFloat(currentShift?.cash_refunds || 0) + 
                                        parseFloat(currentShift?.paid_in || 0) - 
                                        parseFloat(currentShift?.paid_out || 0)
                                    ).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                            </div>
                            
                            <div className="flex justify-between items-end mb-6 text-[15px]">
                                <span className="text-gray-300 mb-1">Actual cash amount</span>
                                <div className="w-[150px] relative border-b border-gray-600 focus-within:border-butterscotch transition-colors pb-1">
                                    <span className="absolute left-0 bottom-1 text-white">₱</span>
                                    <input 
                                        type="number" 
                                        value={actualCash}
                                        onChange={(e) => setActualCash(e.target.value)}
                                        className="w-full bg-transparent text-white text-right text-lg outline-none" 
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center font-bold mb-8 pb-8 border-b border-white/10 text-[15px]">
                                <span className="text-white">Difference</span>
                                <span className="text-white">
                                    ₱{(
                                        parseFloat(actualCash || 0) - (
                                            parseFloat(currentShift?.starting_cash || 0) + 
                                            parseFloat(currentShift?.cash_payments || 0) - 
                                            parseFloat(currentShift?.cash_refunds || 0) + 
                                            parseFloat(currentShift?.paid_in || 0) - 
                                            parseFloat(currentShift?.paid_out || 0)
                                        )
                                    ).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </span>
                            </div>

                            <button 
                                disabled={isProcessing}
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        const expected = (
                                            parseFloat(currentShift?.starting_cash || 0) + 
                                            parseFloat(currentShift?.cash_payments || 0) - 
                                            parseFloat(currentShift?.cash_refunds || 0) + 
                                            parseFloat(currentShift?.paid_in || 0) - 
                                            parseFloat(currentShift?.paid_out || 0)
                                        );
                                        const actual = parseFloat(actualCash || 0);
                                        
                                        const res = await fetch('/api/shifts/close', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                shift_id: currentShift.id,
                                                expected_cash: expected,
                                                actual_cash: actual,
                                                difference: actual - expected
                                            })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            setActiveModal(null);
                                            setIsShiftOpen(false);
                                            setCurrentShift(null);
                                        } else {
                                            alert(data.error || 'Failed to close shift');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                className="w-full border border-butterscotch/80 text-butterscotch font-medium py-3 text-sm tracking-widest hover:bg-butterscotch/10 transition-colors uppercase disabled:opacity-50"
                            >
                                {isProcessing ? 'Closing...' : 'Close Shift'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
