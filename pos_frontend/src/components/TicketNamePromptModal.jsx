import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';

export default function TicketNamePromptModal({ tableName, capacity, openTicketsList, onConfirm, onClose }) {
    const [customSuffix, setCustomSuffix] = useState('');
    const [pax, setPax] = useState('1');
    const [error, setError] = useState(null);

    const prefix = `${tableName} - `;
    const previewName = `${prefix}${customSuffix}`.trim();

    const handlePaxChange = (e) => {
        let val = e.target.value;
        if (val === '') {
            setPax('');
            return;
        }
        let num = parseInt(val, 10);
        if (isNaN(num)) return;
        if (num > capacity + 2) {
            num = capacity + 2;
        }
        setPax(num.toString());
    };

    // Check for uniqueness in real-time
    useEffect(() => {
        if (!customSuffix.trim()) {
            setError(null);
            return;
        }

        const isDuplicate = openTicketsList.some(
            ticket => ticket.ticket_name.toLowerCase() === previewName.toLowerCase()
        );

        if (isDuplicate) {
            setError('This ticket name is already in use. Please choose a different name.');
        } else if (pax > (capacity + 2)) {
            setError(`Capacity exceeded. This table's max allowance is ${capacity + 2} guests.`);
        } else {
            setError(null);
        }
    }, [customSuffix, previewName, openTicketsList, pax, capacity]);

    const handleConfirm = () => {
        if (!customSuffix.trim()) {
            setError('Please enter a custom name.');
            return;
        }
        const parsedPax = parseInt(pax, 10) || 1;
        if (parsedPax > (capacity + 2)) {
            setError(`Capacity exceeded. This table's max allowance is ${capacity + 2} guests.`);
            return;
        }
        if (error) {
            return; // Can't submit if there's an error
        }
        onConfirm(previewName, parsedPax);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-charcoal border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform scale-100 transition-transform">
                <div className="p-6 border-b border-white/10 bg-black/30 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white tracking-widest uppercase">Name This Ticket</h3>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6">
                    <label className="block text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
                        Ticket Name Prefix
                    </label>
                    <div className="flex items-stretch mb-4">
                        <div className="bg-white/5 border border-white/10 border-r-0 rounded-l-lg px-4 py-4 text-butterscotch font-bold flex items-center">
                            {prefix}
                        </div>
                        <input
                            type="text"
                            value={customSuffix}
                            onChange={(e) => setCustomSuffix(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                            }}
                            autoFocus
                            placeholder="e.g. John Doe"
                            className="flex-1 bg-black/20 border border-white/10 focus:border-butterscotch rounded-r-lg px-4 py-4 text-white text-lg focus:outline-none transition-colors"
                        />
                    </div>

                    <label className="block text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
                        Number of Guests (Pax) <span className="text-xs text-gray-500 font-normal normal-case ml-2">(Max {capacity + 2})</span>
                    </label>
                    <div className="mb-6">
                        <input
                            type="number"
                            min="1"
                            max={capacity + 2}
                            value={pax}
                            onChange={handlePaxChange}
                            className="w-full bg-black/20 border border-white/10 focus:border-butterscotch rounded-lg px-4 py-4 text-white text-lg focus:outline-none transition-colors"
                        />
                    </div>

                    {error ? (
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-6 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <AlertTriangle size={18} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-green-400 text-sm mb-6 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                            <Check size={18} className="shrink-0" />
                            <p>Name is available and formatted correctly.</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 font-bold text-gray-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!!error || !customSuffix.trim()}
                            className="flex-1 py-4 font-bold text-charcoal bg-butterscotch hover:bg-butterscotch/90 rounded-xl transition-colors uppercase tracking-wider shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save Ticket
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
