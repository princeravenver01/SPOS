import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export default function AddItemModal({ isOpen, onClose, activeGridSlot, posPages, setPosPages }) {
    const [activeTab, setActiveTab] = useState('ITEMS'); // ITEMS, CATEGORIES, DISCOUNTS
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [itemsRes, catRes, discRes] = await Promise.all([
                    fetch('http://localhost:5000/api/products'),
                    fetch('http://localhost:5000/api/categories'),
                    fetch('http://localhost:5000/api/discounts')
                ]);
                
                if (itemsRes.ok) setItems(await itemsRes.json());
                if (catRes.ok) setCategories(await catRes.json());
                if (discRes.ok) setDiscounts(await discRes.json());
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isOpen]);

    const handleSelect = async (type, reference_id) => {
        if (!activeGridSlot) return;

        const { pageId, index } = activeGridSlot;
        
        // Find current page
        const currentPage = posPages.find(p => p.id === pageId);
        if (!currentPage) return;

        // Create new item
        const newItem = {
            grid_index: index,
            type,
            reference_id
        };

        // Update items array (replace existing item at this index)
        const updatedItems = [...(currentPage.items || [])].filter(i => i.grid_index !== index);
        updatedItems.push(newItem);

        // Save to backend
        try {
            const res = await fetch(`http://localhost:5000/api/pos_pages/${pageId}/items`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });

            if (res.ok) {
                // Update local state by refetching pages (to get all joined data like names/colors)
                const pagesRes = await fetch('http://localhost:5000/api/pos_pages');
                if (pagesRes.ok) {
                    setPosPages(await pagesRes.json());
                }
                onClose();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearSlot = async () => {
        if (!activeGridSlot) return;
        const { pageId, index } = activeGridSlot;
        const currentPage = posPages.find(p => p.id === pageId);
        if (!currentPage) return;

        const updatedItems = [...(currentPage.items || [])].filter(i => i.grid_index !== index);

        try {
            const res = await fetch(`http://localhost:5000/api/pos_pages/${pageId}/items`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });

            if (res.ok) {
                const pagesRes = await fetch('http://localhost:5000/api/pos_pages');
                if (pagesRes.ok) {
                    setPosPages(await pagesRes.json());
                }
                onClose();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    let displayList = [];
    if (activeTab === 'ITEMS') displayList = items;
    else if (activeTab === 'CATEGORIES') displayList = categories;
    else if (activeTab === 'DISCOUNTS') displayList = discounts;

    displayList = displayList.filter(item => 
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-center items-center p-4">
            <div className="bg-[#1e1e1e] border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-black/20">
                    <h3 className="text-xl font-bold text-white tracking-wider">Add item to the page</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs & Search */}
                <div className="border-b border-white/10 shrink-0 bg-black/20">
                    <div className="flex px-4">
                        {['ITEMS', 'CATEGORIES', 'DISCOUNTS'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 h-12 text-sm font-bold tracking-widest transition-colors border-b-2 ${
                                    activeTab === tab 
                                    ? 'text-butterscotch border-butterscotch' 
                                    : 'text-gray-500 border-transparent hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                        <div className="flex-1 flex justify-end items-center px-4">
                            <Search size={18} className="text-gray-500" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none text-white text-sm focus:outline-none ml-2 w-32"
                                placeholder="Search..."
                            />
                        </div>
                    </div>
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-center py-10 text-gray-500">Loading...</div>
                    ) : displayList.length > 0 ? (
                        displayList.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(activeTab === 'ITEMS' ? 'product' : activeTab === 'CATEGORIES' ? 'category' : 'discount', item.id)}
                                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg p-4 flex items-center justify-between transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    {activeTab === 'ITEMS' ? (
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: item.label_color || '#555' }}>
                                            <span className="text-black/80 font-bold text-xs">
                                                {item.name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    ) : activeTab === 'CATEGORIES' ? (
                                        <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: item.color || '#555' }}></div>
                                    ) : (
                                        <div className="w-10 h-10 rounded flex items-center justify-center bg-purple-500 shrink-0 text-white font-bold">%</div>
                                    )}
                                    <span className="text-white font-medium">{item.name}</span>
                                </div>
                                {activeTab === 'ITEMS' && (
                                    <span className="text-gray-400">₱{Number(item.price).toFixed(2)}</span>
                                )}
                                {activeTab === 'DISCOUNTS' && (
                                    <span className="text-gray-400">{item.type === 'percentage' ? `${item.value}%` : `₱${Number(item.value).toFixed(2)}`}</span>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-500">No matching items found</div>
                    )}
                </div>

                {/* Footer (Clear Slot) */}
                <div className="h-16 border-t border-white/10 px-6 flex items-center justify-between shrink-0 bg-black/20">
                    <button 
                        onClick={handleClearSlot}
                        className="text-red-400 hover:text-red-300 text-sm font-bold tracking-widest uppercase transition-colors"
                    >
                        Clear Slot
                    </button>
                </div>
            </div>
        </div>
    );
}
