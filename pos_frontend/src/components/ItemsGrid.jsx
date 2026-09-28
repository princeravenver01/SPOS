import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';

export default function ItemsGrid({ addToCart, applyDiscount, setupMode, activePage, onSlotClick, onLongPress }) {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [activeCategoryName, setActiveCategoryName] = useState('');

    const getInitials = (name) => {
        if (!name) return '';
        return name.split(' ').map(word => word.charAt(0).toUpperCase()).slice(0, 2).join('');
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/products');
                const data = await res.json();
                setProducts(data);
            } catch (err) {
                console.error('Failed to fetch products', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Reset category filter if activePage changes or we enter setup mode
    useEffect(() => {
        setActiveCategoryId(null);
    }, [activePage?.id, setupMode]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-gray-500">
                Loading items...
            </div>
        );
    }

    const renderProductCard = (product) => {
        const isOutOfStock = parseFloat(product.in_stock || 0) <= 0;
        
        return (
            <button 
                key={product.id}
                className={`glass-card flex flex-col h-32 rounded-lg overflow-hidden border transition-colors group relative ${isOutOfStock ? 'border-red-500/20 opacity-50 cursor-not-allowed' : 'border-white/5 hover:border-butterscotch/50'}`}
                onClick={() => !isOutOfStock && addToCart && addToCart(product)}
                disabled={isOutOfStock}
            >
                {/* Image or Initial block */}
                {product.image_url ? (
                    <div className="h-20 w-full overflow-hidden shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="h-20 w-full flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-90" style={{ backgroundColor: product.label_color || '#fbbd05' }}>
                        <span className="text-black/70 font-bold text-2xl tracking-widest drop-shadow-sm">{getInitials(product.name)}</span>
                    </div>
                )}
                
                {/* Out of Stock Badge */}
                {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Out of Stock</span>
                    </div>
                )}
                
                {/* Stock count badge for low stock */}
                {!isOutOfStock && parseFloat(product.in_stock || 0) <= parseFloat(product.low_stock || 5) && (
                    <div className="absolute top-1 right-1 bg-orange-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {Math.floor(product.in_stock)} left
                    </div>
                )}

                <div className="flex-1 p-2 px-3 flex flex-col justify-between w-full bg-black/20">
                    <span className="text-white font-medium text-xs text-left leading-tight line-clamp-2 group-hover:text-butterscotch transition-colors">
                        {product.name}
                    </span>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-gray-400 text-[11px] text-left">
                            ₱{Number(product.price).toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-[10px] font-medium">
                            {product.in_stock != null ? Math.floor(product.in_stock) : 0} left
                        </span>
                    </div>
                </div>
            </button>
        );
    };

    // 1. If we are in category filter mode (normal mode, clicked a category on a page)
    if (activeCategoryId && !setupMode) {
        const categoryProducts = products.filter(p => p.category_id === activeCategoryId);
        return (
            <div className="flex flex-col h-full overflow-hidden p-4">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10 shrink-0">
                    <button 
                        onClick={() => setActiveCategoryId(null)}
                        className="bg-black/30 hover:bg-white/10 p-2 rounded-lg text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-bold text-white">{activeCategoryName}</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
                        {categoryProducts.length > 0 ? categoryProducts.map(renderProductCard) : (
                            <div className="col-span-full text-center py-10 text-gray-500">No products in this category</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleTouchStart = (e) => {
        const timer = setTimeout(() => {
            // We need a way to trigger setupMode toggle, but ItemsGrid only receives setupMode, it doesn't have setSetupMode.
            // I should pass setSetupMode from PosTerminal. 
            // Wait, we can just pass onLongPress prop from PosTerminal to ItemsGrid.
            if (onLongPress) onLongPress();
        }, 800); // 800ms for long press
        e.target.dataset.timer = timer;
    };

    const handleTouchEnd = (e) => {
        const timer = e.target.dataset.timer;
        if (timer) {
            clearTimeout(timer);
            delete e.target.dataset.timer;
        }
    };

    // 2. If a Custom Page is active
    if (activePage) {
        // Render 25 slots (5x5)
        const totalSlots = 25;
        const slots = Array.from({ length: totalSlots }, (_, i) => {
            const item = activePage.items?.find(it => it.grid_index === i);
            return { index: i, item };
        });

        return (
            <div 
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 p-2 sm:p-4 h-full pb-24 md:pb-20 overflow-y-auto custom-scrollbar"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                {slots.map(slot => {
                    if (slot.item) {
                        const { item } = slot;
                        
                        if (item.type === 'product') {
                            const isOutOfStock = parseFloat(item.in_stock || 0) <= 0;
                            return (
                                <button 
                                    key={slot.index}
                                    className={`glass-card flex flex-col h-32 rounded-lg overflow-hidden border transition-colors group relative ${setupMode ? 'border-blue-500 hover:border-blue-400' : isOutOfStock ? 'border-red-500/20 opacity-50 cursor-not-allowed' : 'border-white/5 hover:border-butterscotch/50'}`}
                                    onClick={() => {
                                        if (setupMode) {
                                            onSlotClick(slot.index);
                                        } else if (!isOutOfStock && addToCart) {
                                            // Make sure we pass the full product object matching cart shape
                                            const fullProduct = products.find(p => p.id === item.reference_id) || { ...item, id: item.reference_id };
                                            addToCart(fullProduct);
                                        }
                                    }}
                                    disabled={!setupMode && isOutOfStock}
                                >
                                    {item.image_url ? (
                                        <div className="h-20 w-full overflow-hidden shrink-0">
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="h-20 w-full flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-90" style={{ backgroundColor: item.label_color || '#fbbd05' }}>
                                            <span className="text-black/70 font-bold text-2xl tracking-widest drop-shadow-sm">{getInitials(item.name)}</span>
                                        </div>
                                    )}
                                    {setupMode && (
                                        <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">
                                            EDIT
                                        </div>
                                    )}
                                    <div className="flex-1 p-2 px-3 flex flex-col justify-between w-full bg-black/20">
                                        <span className="text-white font-medium text-xs text-left leading-tight line-clamp-2 group-hover:text-butterscotch transition-colors">
                                            {item.name}
                                        </span>
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-gray-400 text-[11px] text-left">
                                                ₱{Number(item.price).toFixed(2)}
                                            </span>
                                            <span className="text-gray-500 text-[10px] font-medium">
                                                {item.in_stock != null ? Math.floor(item.in_stock) : 0} left
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        } else if (item.type === 'category') {
                            return (
                                <button 
                                    key={slot.index}
                                    className={`glass-card flex flex-col h-32 rounded-lg overflow-hidden border transition-colors group relative ${setupMode ? 'border-blue-500 hover:border-blue-400' : 'border-white/5 hover:border-white/30'}`}
                                    onClick={() => {
                                        if (setupMode) {
                                            onSlotClick(slot.index);
                                        } else {
                                            setActiveCategoryId(item.reference_id);
                                            setActiveCategoryName(item.name);
                                        }
                                    }}
                                    style={{ backgroundColor: item.color || '#333' }}
                                >
                                    <div className="flex-1 w-full flex items-center justify-center p-2 text-center bg-black/40 hover:bg-black/20 transition-colors">
                                        <span className="text-white font-bold text-sm tracking-wide drop-shadow-md uppercase">
                                            {item.name}
                                        </span>
                                    </div>
                                    {setupMode && (
                                        <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">
                                            EDIT
                                        </div>
                                    )}
                                </button>
                            );
                        } else if (item.type === 'discount') {
                            return (
                                <button 
                                    key={slot.index}
                                    className={`glass-card flex flex-col h-32 rounded-lg overflow-hidden border transition-colors group relative ${setupMode ? 'border-blue-500 hover:border-blue-400' : 'border-white/5 hover:border-purple-500/50'}`}
                                    onClick={() => {
                                        if (setupMode) {
                                            onSlotClick(slot.index);
                                        } else {
                                            if (applyDiscount) {
                                                const fullDiscount = { ...item, id: item.reference_id, quantity: 1, price: 0, is_discount: true };
                                                applyDiscount(fullDiscount);
                                            }
                                        }
                                    }}
                                >
                                    <div className="flex-1 w-full flex items-center justify-center p-2 text-center transition-colors group-hover:bg-white/5">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 border border-purple-500/50 mb-2">
                                            <span className="text-purple-400 font-bold text-xl">%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-2 px-3 flex flex-col justify-end w-full bg-black/20">
                                        <span className="text-white font-medium text-xs text-center leading-tight line-clamp-2 group-hover:text-purple-400 transition-colors">
                                            {item.name}
                                        </span>
                                        <span className="text-gray-400 text-[11px] text-center mt-1">
                                            {item.discount_type === 'percentage' ? `${item.value}%` : `₱${Number(item.value).toFixed(2)}`}
                                        </span>
                                    </div>
                                    {setupMode && (
                                        <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10">
                                            EDIT
                                        </div>
                                    )}
                                </button>
                            );
                        }
                    }

                    // Empty slot
                    if (setupMode) {
                        return (
                            <button
                                key={slot.index}
                                onClick={() => onSlotClick(slot.index)}
                                className="h-32 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:border-white/30 hover:bg-white/5 transition-colors"
                            >
                                <Plus size={32} />
                            </button>
                        );
                    }

                    return <div key={slot.index} className="h-32 rounded-lg invisible"></div>; // Keep grid intact
                })}
            </div>
        );
    }

    // 3. Default "All Items" view
    return (
        <div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 p-2 sm:p-4 h-full pb-24 md:pb-20 overflow-y-auto custom-scrollbar"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
        >
            {products.length > 0 ? products.map(renderProductCard) : (
                <div className="col-span-full text-center py-10 text-gray-500">No products found</div>
            )}
        </div>
    );
}
