import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Check, X, Search, Upload, Trash2, Edit2, Download, Store, ArrowLeft, History, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

// Helper to generate EAN-13 barcode
const generateEAN13 = () => {
    let code = '200' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
};

// Helper to get initials
const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

// Colors for preset swatches
const LABEL_COLORS = ['#fbbd05', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];

export default function AdminProducts() {
    const navigate = useNavigate();
    const adminUser = JSON.parse(localStorage.getItem('spos_admin') || '{}');
    const branchIdsQuery = adminUser.branch_ids ? `branch_ids=${adminUser.branch_ids.join(',')}` : '';
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [modifiers, setModifiers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [managingBranchId, setManagingBranchId] = useState(null);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    // Complex Form State
    const [newProduct, setNewProduct] = useState({
        name: '', category_id: '', description: '', available: true, soldBy: 'each',
        price: '', cost: '', sku: '', barcode: '',
        isComposite: false, useProduction: false, components: [],
        trackStock: false, inStock: '', lowStock: '',
        hasVariants: false, variantOptions: [], generatedVariants: [],
        modifiers: [],
        labelColor: '#fbbd05', image: null
    });

    const [skuStatus, setSkuStatus] = useState(null); // 'available' | 'taken' | null
    const [componentSearch, setComponentSearch] = useState('');
    const [filteredComponents, setFilteredComponents] = useState([]);
    
    // Sync state
    const [syncingProductId, setSyncingProductId] = useState(null);
    const [syncTargetBranchId, setSyncTargetBranchId] = useState('');

    // Toast and Modal State
    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    const showToast = (type, message) => {
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    // Refs
    const imageInputRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (managingBranchId) {
            fetchProducts(managingBranchId);
            fetchCategories(managingBranchId);
            fetchModifiers(managingBranchId);
        }
    }, [managingBranchId]);

    const fetchCategories = async (branchId) => {
        try {
            const res = await fetch(`/api/categories?branch_id=${branchId}`);
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch categories', err);
            setCategories([]);
        }
    };

    const fetchModifiers = async (branchId) => {
        try {
            const res = await fetch(`/api/modifiers?branch_id=${branchId}`);
            const data = await res.json();
            setModifiers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch modifiers', err);
            setModifiers([]);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/branches');
            const data = await res.json();
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchProducts = async (branchId) => {
        if (!branchId) return;
        try {
            const res = await fetch(`/api/products?branch_id=${branchId}`);
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch products', err);
            setProducts([]);
        }
    };

    // Dynamic SKU & Barcode Generation
    useEffect(() => {
        if (!newProduct.barcode) {
            setNewProduct(prev => ({ ...prev, barcode: generateEAN13() }));
        }
    }, [newProduct.barcode]);

    const handleNameChange = (e) => {
        const name = e.target.value;
        const autoSku = name.toUpperCase().replace(/\s+/g, '-').substring(0, 10);
        setNewProduct(prev => ({ ...prev, name, sku: autoSku }));
        validateSku(autoSku);
    };

    const handleSkuChange = (e) => {
        const sku = e.target.value.toUpperCase();
        setNewProduct(prev => ({ ...prev, sku }));
        validateSku(sku);
    };

    const validateSku = (sku) => {
        if (sku.length < 3) {
            setSkuStatus(null);
            return;
        }
        const isTaken = products.some(p => p.sku === sku);
        setSkuStatus(isTaken ? 'taken' : 'available');
    };

    // Composite Item Logic
    useEffect(() => {
        if (componentSearch.trim() === '') {
            setFilteredComponents([]);
        } else {
            setFilteredComponents(products.filter(p => p.name.toLowerCase().includes(componentSearch.toLowerCase())));
        }
    }, [componentSearch, products]);

    const addComponent = (product) => {
        if (!newProduct.components.some(c => c.id === product.id)) {
            setNewProduct(prev => ({
                ...prev,
                components: [...prev.components, { ...product, qty: 1, cost: product.cost || 0 }]
            }));
        }
        setComponentSearch('');
    };

    const updateComponent = (id, field, val) => {
        setNewProduct(prev => ({
            ...prev,
            components: prev.components.map(c => c.id === id ? { ...c, [field]: val } : c)
        }));
    };

    const removeComponent = (id) => {
        setNewProduct(prev => ({
            ...prev,
            components: prev.components.filter(c => c.id !== id)
        }));
    };

    // Variant Logic (Shopify Style)
    const addVariantOption = () => {
        setNewProduct(prev => ({
            ...prev,
            variantOptions: [...prev.variantOptions, { name: '', values: '' }]
        }));
    };

    const updateVariantOption = (index, field, val) => {
        const newOptions = [...newProduct.variantOptions];
        newOptions[index][field] = val;
        setNewProduct(prev => ({ ...prev, variantOptions: newOptions }));
    };

    const handleSyncToBranch = async () => {
        if (!syncTargetBranchId) return showToast('error', 'Please select a target branch.');
        try {
            showToast('loading', 'Syncing product...');
            const res = await fetch(`/api/products/${syncingProductId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_branch_id: syncTargetBranchId })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('success', 'Product successfully synced to target branch!');
                setSyncingProductId(null);
                setSyncTargetBranchId('');
            } else {
                showToast('error', data.error || 'Sync failed.');
            }
        } catch (err) {
            console.error('Failed to sync', err);
            showToast('error', 'Failed to sync product');
        }
    };

    const confirmDelete = async () => {
        try {
            showToast('loading', 'Deleting product...');
            await fetch(`/api/products/${deleteModal.id}`, { method: 'DELETE' });
            fetchProducts(managingBranchId);
            setDeleteModal(null);
            showToast('success', 'Product deleted successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to delete product.');
        }
    };

    const removeVariantOption = (index) => {
        const newOptions = newProduct.variantOptions.filter((_, i) => i !== index);
        setNewProduct(prev => ({ ...prev, variantOptions: newOptions }));
    };

    // Generate Cartesian Product of variants to create sub-items
    useEffect(() => {
        if (!newProduct.hasVariants || newProduct.variantOptions.length === 0) {
            setNewProduct(prev => ({ ...prev, generatedVariants: [] }));
            return;
        }

        const validOptions = newProduct.variantOptions.filter(o => o.name && o.values);
        if (validOptions.length === 0) return;

        const arrays = validOptions.map(o => o.values.split(',').map(v => v.trim()).filter(v => v));
        
        if (arrays.some(a => a.length === 0)) return;

        const combine = (arrs) => arrs.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
        
        const combinations = combine(arrays);
        // Normalize single dimension
        const normalizedCombs = Array.isArray(combinations[0]) ? combinations : combinations.map(c => [c]);

        const generated = normalizedCombs.map((comb, idx) => {
            const variantName = comb.join(' / ');
            return {
                id: `var-${idx}`,
                name: variantName,
                sku: `${newProduct.sku || 'SKU'}-${comb.map(c => c.substring(0,3).toUpperCase()).join('')}`,
                price: newProduct.price || 0,
                stock: 0
            };
        });

        setNewProduct(prev => ({ ...prev, generatedVariants: generated }));
    }, [newProduct.variantOptions, newProduct.hasVariants, newProduct.sku, newProduct.price]);

    const updateGeneratedVariant = (id, field, val) => {
        setNewProduct(prev => ({
            ...prev,
            generatedVariants: prev.generatedVariants.map(v => v.id === id ? { ...v, [field]: val } : v)
        }));
    };

    // Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = (p) => {
        setEditingId(p.id);
        setNewProduct({
            name: p.name || '', category_id: p.category_id || '', description: p.description || '', available: p.is_available, soldBy: p.sold_by || 'each',
            price: p.price || '', cost: p.cost || '', sku: p.sku || '', barcode: p.barcode || '',
            isComposite: p.is_composite, useProduction: p.use_production, components: p.components || [],
            trackStock: p.track_stock, inStock: p.in_stock || '', lowStock: p.low_stock || '',
            hasVariants: p.hasVariants, variantOptions: [], generatedVariants: p.generatedVariants || [],
            modifiers: p.modifiers || [],
            labelColor: p.label_color || '#fbbd05', image: p.image_url || null
        });
        setIsAdding(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const payload = {
            branch_id: managingBranchId,
            name: newProduct.name,
            category_id: newProduct.category_id,
            description: newProduct.description,
            is_available: newProduct.available,
            sold_by: newProduct.soldBy,
            price: newProduct.price,
            cost: newProduct.cost,
            sku: newProduct.sku,
            barcode: newProduct.barcode,
            is_composite: newProduct.isComposite,
            use_production: newProduct.useProduction,
            components: newProduct.components,
            track_stock: newProduct.trackStock,
            in_stock: newProduct.inStock,
            low_stock: newProduct.lowStock,
            hasVariants: newProduct.hasVariants,
            generatedVariants: newProduct.generatedVariants,
            label_color: newProduct.labelColor,
            image_url: newProduct.image
        };

        if (skuStatus === 'taken') {
            showToast('error', 'SKU is already taken!');
            return;
        }
        
        try {
            showToast('loading', 'Saving product...');
            if (editingId) {
                await fetch(`/api/products/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            fetchProducts(managingBranchId);
            setIsAdding(false);
            setEditingId(null);
            setNewProduct({
                name: '', category_id: '', description: '', available: true, soldBy: 'each',
                price: '', cost: '', sku: '', barcode: '',
                isComposite: false, useProduction: false, components: [],
                trackStock: false, inStock: '', lowStock: '',
                hasVariants: false, variantOptions: [], generatedVariants: [],
                modifiers: [],
                labelColor: '#fbbd05', image: null
            });
            setSkuStatus(null);
            showToast('success', 'Product saved successfully!');
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save product');
        }
    };

    const groupedProducts = Array.isArray(products) ? products.reduce((acc, p) => {
        const cat = p.category_name || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {}) : {};

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            if (rows.length <= 1) {
                alert('CSV file is empty or missing data rows.');
                return;
            }
            
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            const newProductsList = [];

            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim());
                if (values.length < headers.length) continue;

                const prod = { 
                    id: Date.now() + i, 
                    color: LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)] 
                };

                headers.forEach((header, index) => {
                    if (header.includes('name')) prod.name = values[index];
                    else if (header.includes('category')) prod.category = values[index];
                    else if (header.includes('price')) prod.price = parseFloat(values[index]) || 0;
                    else if (header.includes('cost')) prod.cost = parseFloat(values[index]) || 0;
                    else if (header.includes('sku')) prod.sku = values[index].toUpperCase();
                    else if (header.includes('stock') || header.includes('qty')) prod.stock = parseInt(values[index]) || 0;
                });

                if (!prod.name) prod.name = 'Imported Product';
                if (!prod.sku) prod.sku = prod.name.toUpperCase().replace(/\s+/g, '-').substring(0, 10) + `-${i}`;
                if (!prod.price) prod.price = 0;
                if (!prod.stock) prod.stock = 0;
                if (!prod.category_id) prod.category_id = 1;

                newProductsList.push(prod);
            }

            try {
                showToast('loading', 'Importing products...');
                setIsImporting(true);
                for (let prod of newProductsList) {
                    await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...prod, branch_id: managingBranchId })
                    });
                }
                fetchProducts(managingBranchId);
                showToast('success', `Successfully imported ${newProductsList.length} products!`);
            } catch (err) {
                console.error(err);
                showToast('error', 'Failed to import some products.');
            } finally {
                setIsImporting(false);
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const downloadCSVTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Category,Price,Cost,SKU,Stock\nClassic Burger,Mains,150.00,80.00,BURGER-01,50\nIced Tea,Drinks,50.00,15.00,TEA-01,100";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "products_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                {!managingBranchId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full animate-fade-in-up">
                        <div className="w-16 h-16 rounded-full bg-butterscotch/20 flex items-center justify-center mb-6">
                            <Store size={32} className="text-butterscotch" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">Select Branch to Manage Products</h2>
                        <p className="text-gray-400 mb-8 text-center max-w-lg">Choose a branch to view, add, or edit its specific product catalog and inventory.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setManagingBranchId(branch.id)}
                                    className="glass-card p-6 rounded-2xl hover:border-butterscotch transition-all group text-left flex flex-col items-start gap-3"
                                >
                                    <div className="p-3 rounded-lg bg-charcoal group-hover:bg-butterscotch/20 transition-colors">
                                        <Store size={24} className="text-gray-400 group-hover:text-butterscotch transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-butterscotch transition-colors">{branch.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{branch.address}</p>
                                    </div>
                                </button>
                            ))}
                            {branches.length === 0 && (
                                <div className="col-span-full text-center p-8 border border-dashed border-white/20 rounded-xl text-gray-500">
                                    No branches configured. Please add a branch in Settings first.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-end justify-between mb-8">
                            <div>
                                <button 
                                    onClick={() => { setManagingBranchId(null); setIsAdding(false); }}
                                    className="text-butterscotch hover:text-white flex items-center gap-2 text-sm font-bold mb-4 transition-colors"
                                >
                                    <ArrowLeft size={16} /> Back to Branch Selection
                                </button>
                                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                    Products <span className="text-sm font-normal text-gray-400 bg-black/30 px-3 py-1 rounded-full border border-white/5">{branches.find(b => b.id === managingBranchId)?.name}</span>
                                </h2>
                                <p className="text-sm text-gray-400">Manage your inventory, composite items, and variants for this branch.</p>
                            </div>
                            {!isAdding && (
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={downloadCSVTemplate}
                                className="bg-charcoal-light hover:bg-white/10 text-white font-bold px-4 py-3 rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                                title="Download Template"
                            >
                                <Download size={20} /> Template
                            </button>
                            <input 
                                type="file" 
                                accept=".csv" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={handleImportCSV} 
                            />
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="bg-charcoal-light hover:bg-white/10 text-white font-bold px-4 py-3 rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                            >
                                <Upload size={20} /> Import CSV
                            </button>
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] flex items-center gap-2"
                            >
                                <Plus size={20} /> Add Product
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isAdding ? (
                        <div className="bg-[#1a1f2e] rounded-2xl p-8 border border-white/10 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Package className="text-butterscotch" /> {editingId ? 'Edit Product' : 'New Product'}
                            </h3>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-10">
                                {/* 1. BASIC INFO */}
                                <section>
                                    <h4 className="text-lg font-bold text-butterscotch mb-4">1. Basic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Product Name *</label>
                                            <input required type="text" value={newProduct.name} onChange={handleNameChange} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="e.g. Classic Cheeseburger" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Category *</label>
                                            <select required value={newProduct.category_id} onChange={e => setNewProduct({...newProduct, category_id: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                                <option value="" className="text-gray-900">Select Category</option>
                                                {categories.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Description</label>
                                        <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors h-24" placeholder="Brief description of the product..."></textarea>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Available for Sale</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={newProduct.available} onChange={e => setNewProduct({...newProduct, available: e.target.checked})} />
                                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-butterscotch"></div>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Sold By</label>
                                            <select value={newProduct.soldBy} onChange={e => setNewProduct({...newProduct, soldBy: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none">
                                                <option value="each" className="text-gray-900">Each</option>
                                                <option value="weight" className="text-gray-900">Weight/Volume</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Cost (PHP)</label>
                                            <input type="number" step="0.01" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Price (PHP) *</label>
                                            <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Margin</label>
                                            <div className="w-full bg-black/10 border border-white/5 rounded-lg px-4 py-3 text-gray-400 flex items-center justify-between">
                                                <span className={`font-bold ${newProduct.price > 0 && (((newProduct.price - (newProduct.cost || 0)) / newProduct.price) * 100) > 0 ? 'text-green-400' : ''}`}>
                                                    {newProduct.price > 0 ? (((newProduct.price - (newProduct.cost || 0)) / newProduct.price) * 100).toFixed(1) : 0}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">SKU</label>
                                            <div className="relative">
                                                <input type="text" value={newProduct.sku} onChange={handleSkuChange} className={`w-full bg-black/20 border rounded-lg px-4 py-3 text-white focus:outline-none transition-colors ${skuStatus === 'taken' ? 'border-red-500 focus:border-red-500' : skuStatus === 'available' ? 'border-green-500 focus:border-green-500' : 'border-white/10 focus:border-butterscotch'}`} />
                                                {skuStatus === 'available' && <Check size={18} className="absolute right-4 top-3.5 text-green-500" />}
                                                {skuStatus === 'taken' && <X size={18} className="absolute right-4 top-3.5 text-red-500" />}
                                            </div>
                                            {skuStatus === 'taken' && <p className="text-xs text-red-500 mt-2">SKU is already in use.</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Barcode (EAN-13)</label>
                                            <input type="text" readOnly value={newProduct.barcode} className="w-full bg-black/10 border border-white/5 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed" />
                                        </div>
                                    </div>
                                </section>

                                {/* 2. INVENTORY */}
                                <section className="pt-6 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-bold text-butterscotch">2. Inventory</h4>
                                        {editingId && (
                                            <button 
                                                type="button" 
                                                onClick={() => navigate(`/admin/inventory-history?product_id=${editingId}`)}
                                                className="flex items-center gap-2 px-4 py-2 border-2 border-butterscotch text-butterscotch rounded-lg font-bold hover:bg-butterscotch hover:text-charcoal transition-colors text-sm"
                                            >
                                                <History size={16} /> VIEW HISTORY
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Composite Toggle */}
                                    <div className="flex flex-col gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={newProduct.isComposite} onChange={e => setNewProduct({...newProduct, isComposite: e.target.checked})} />
                                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-butterscotch"></div>
                                            </label>
                                            <div>
                                                <p className="font-bold text-white">Composite Item</p>
                                                <p className="text-xs text-gray-400">Enable if this product is made up of other ingredients/products.</p>
                                            </div>
                                        </div>

                                        {newProduct.isComposite && (
                                            <div className="flex items-center gap-4 pl-4 border-l-2 border-white/10 animate-fade-in">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={newProduct.useProduction} onChange={e => setNewProduct({...newProduct, useProduction: e.target.checked})} />
                                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-butterscotch"></div>
                                                </label>
                                                <div>
                                                    <p className="font-bold text-white text-sm">Use Production</p>
                                                    <p className="text-xs text-gray-400">Produce composite items manually via the Production section.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {newProduct.isComposite && (
                                        <div className="mb-8 pl-4 border-l-2 border-butterscotch animate-fade-in-up">
                                            <div className="relative mb-4">
                                                <Search size={18} className="absolute left-4 top-3 text-gray-400" />
                                                <input type="text" value={componentSearch} onChange={e => setComponentSearch(e.target.value)} placeholder="Search to add component..." className="w-full bg-black/30 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" />
                                                {filteredComponents.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-charcoal border border-white/10 rounded-lg shadow-2xl max-h-40 overflow-y-auto">
                                                        {filteredComponents.map(c => (
                                                            <div key={c.id} onClick={() => addComponent(c)} className="p-3 hover:bg-white/10 cursor-pointer flex justify-between items-center text-sm">
                                                                <span>{c.name}</span>
                                                                <span className="text-gray-400 text-xs">SKU: {c.sku}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {newProduct.components.length > 0 && (
                                                <table className="w-full text-sm text-left text-gray-300">
                                                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                                                        <tr>
                                                            <th className="px-4 py-3 rounded-tl-lg">Component</th>
                                                            <th className="px-4 py-3">Quantity</th>
                                                            <th className="px-4 py-3">Cost (PHP)</th>
                                                            <th className="px-4 py-3 rounded-tr-lg"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {newProduct.components.map(comp => (
                                                            <tr key={comp.id} className="border-b border-white/5">
                                                                <td className="px-4 py-3 font-medium text-white">{comp.name}</td>
                                                                <td className="px-4 py-3">
                                                                    <input type="number" step="0.1" value={comp.qty} onChange={e => updateComponent(comp.id, 'qty', e.target.value)} className="w-20 bg-black/20 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-butterscotch" />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <input type="number" step="0.01" value={comp.cost} onChange={e => updateComponent(comp.id, 'cost', e.target.value)} className="w-24 bg-black/20 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-butterscotch" />
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button type="button" onClick={() => removeComponent(comp.id)} className="text-red-400 hover:text-white transition-colors">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    {/* Track Stock Toggle */}
                                    <div className="flex items-center gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={newProduct.trackStock} onChange={e => setNewProduct({...newProduct, trackStock: e.target.checked})} />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-butterscotch"></div>
                                        </label>
                                        <div>
                                            <p className="font-bold text-white">Track Stock</p>
                                            <p className="text-xs text-gray-400">Monitor inventory levels and receive low stock alerts.</p>
                                        </div>
                                    </div>

                                    {newProduct.trackStock && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-butterscotch animate-fade-in-up">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">In Stock</label>
                                                <input type="number" value={newProduct.inStock} onChange={e => setNewProduct({...newProduct, inStock: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Current quantity" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Low Stock Threshold</label>
                                                <input type="number" value={newProduct.lowStock} onChange={e => setNewProduct({...newProduct, lowStock: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors" placeholder="Trigger alert at quantity" />
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* 3. VARIANTS */}
                                <section className="pt-6 border-t border-white/10">
                                    <h4 className="text-lg font-bold text-butterscotch mb-4">3. Variants</h4>
                                    <div className="flex items-center gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={newProduct.hasVariants} onChange={e => setNewProduct({...newProduct, hasVariants: e.target.checked})} />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-butterscotch"></div>
                                        </label>
                                        <div>
                                            <p className="font-bold text-white">This product has multiple options</p>
                                            <p className="text-xs text-gray-400">Like different sizes or flavors.</p>
                                        </div>
                                    </div>

                                    {newProduct.hasVariants && (
                                        <div className="pl-4 border-l-2 border-butterscotch animate-fade-in-up">
                                            {newProduct.variantOptions.map((opt, index) => (
                                                <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-end">
                                                    <div className="col-span-4">
                                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Option Name</label>
                                                        <input type="text" value={opt.name} onChange={e => updateVariantOption(index, 'name', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch" placeholder="e.g. Size" />
                                                    </div>
                                                    <div className="col-span-7">
                                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Values (comma-separated)</label>
                                                        <input type="text" value={opt.values} onChange={e => updateVariantOption(index, 'values', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch" placeholder="e.g. Small, Medium, Large" />
                                                    </div>
                                                    <div className="col-span-1 pb-3 text-center">
                                                        <button type="button" onClick={() => removeVariantOption(index)} className="text-red-400 hover:text-white transition-colors">
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            <button type="button" onClick={addVariantOption} className="text-sm font-bold text-butterscotch hover:text-white transition-colors flex items-center gap-2 mb-6">
                                                <Plus size={16} /> Add another option
                                            </button>

                                            {newProduct.generatedVariants.length > 0 && (
                                                <div className="mt-6 bg-black/20 rounded-xl overflow-hidden border border-white/5">
                                                    <table className="w-full text-sm text-left text-gray-300">
                                                        <thead className="text-xs text-gray-400 uppercase bg-white/5">
                                                            <tr>
                                                                <th className="px-4 py-3">Variant</th>
                                                                <th className="px-4 py-3">Price (PHP)</th>
                                                                <th className="px-4 py-3">Stock</th>
                                                                <th className="px-4 py-3">SKU</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {newProduct.generatedVariants.map(v => (
                                                                <tr key={v.id} className="border-b border-white/5">
                                                                    <td className="px-4 py-3 font-medium text-white">{v.name}</td>
                                                                    <td className="px-4 py-3">
                                                                        <input type="number" step="0.01" value={v.price} onChange={e => updateGeneratedVariant(v.id, 'price', e.target.value)} className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-butterscotch" />
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <input type="number" value={v.stock} onChange={e => updateGeneratedVariant(v.id, 'stock', e.target.value)} className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-butterscotch" />
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <input type="text" value={v.sku} onChange={e => updateGeneratedVariant(v.id, 'sku', e.target.value)} className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-butterscotch text-xs" />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </section>

                                {/* 4. MODIFIERS */}
                                <section className="pt-6 border-t border-white/10">
                                    <h4 className="text-lg font-bold text-butterscotch mb-4">4. Add-ons & Modifiers</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {modifiers.length === 0 ? (
                                            <p className="text-sm text-gray-500 col-span-full">No modifiers available in this branch. Create them first in the Modifiers tab.</p>
                                        ) : (
                                            modifiers.map(mod => {
                                                const isSelected = newProduct.modifiers?.includes(mod.id);
                                                return (
                                                    <div 
                                                        key={mod.id} 
                                                        onClick={() => setNewProduct(prev => ({
                                                            ...prev,
                                                            modifiers: isSelected ? prev.modifiers.filter(m => m !== mod.id) : [...(prev.modifiers || []), mod.id]
                                                        }))}
                                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-butterscotch/10 border-butterscotch' : 'bg-black/20 border-white/10 hover:border-white/30'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-butterscotch border-butterscotch' : 'border-gray-500'}`}>
                                                                {isSelected && <div className="w-2.5 h-2.5 bg-charcoal rounded-sm" />}
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold ${isSelected ? 'text-butterscotch' : 'text-white'}`}>{mod.name}</p>
                                                                <p className="text-xs text-gray-400">{mod.is_required ? 'Required' : 'Optional'} (Max {mod.max_selections})</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </section>

                                {/* 5. POS REPRESENTATION */}
                                <section className="pt-6 border-t border-white/10">
                                    <h4 className="text-lg font-bold text-butterscotch mb-4">5. POS Representation</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Button Label Color</label>
                                            <div className="flex items-center gap-3 mt-4">
                                                {LABEL_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setNewProduct({...newProduct, labelColor: color})}
                                                        className={`w-10 h-10 rounded-full transition-transform ${newProduct.labelColor === color ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Product Image</label>
                                            <div className="flex items-center gap-4 mt-2">
                                                {newProduct.image ? (
                                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                                                        <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button type="button" onClick={() => setNewProduct({...newProduct, image: null})} className="text-red-400 hover:text-red-300"><Trash2 size={20} /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div onClick={() => imageInputRef.current.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-gray-400 hover:border-butterscotch hover:text-butterscotch cursor-pointer transition-colors">
                                                        <Upload size={24} className="mb-1" />
                                                        <span className="text-[10px] uppercase font-bold tracking-wider">Upload</span>
                                                    </div>
                                                )}
                                                <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                                    <button type="button" onClick={() => setIsAdding(false)} className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10">
                                        Cancel
                                    </button>
                                    <button type="submit" className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">
                                        Save Product
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">SKU</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Cost</th>
                                        <th className="px-6 py-4">Price</th>
                                        <th className="px-6 py-4">Margin</th>
                                        <th className="px-6 py-4">Stock</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedProducts).map(([category, prods]) => (
                                        <React.Fragment key={category}>
                                            <tr className="bg-black/40 border-y border-white/10">
                                                <td colSpan="8" className="px-6 py-3 font-bold text-butterscotch text-xs uppercase tracking-wider">
                                                    {category}
                                                </td>
                                            </tr>
                                            {prods.map(p => (
                                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-inner" style={{ backgroundColor: p.label_color || '#fbbd05', color: '#1a1f2e' }}>
                                                                {getInitials(p.name)}
                                                            </div>
                                                        )}
                                                        {p.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-butterscotch">{p.sku || '-'}</td>
                                                    <td className="px-6 py-4">{p.category_name || '-'}</td>
                                                    <td className="px-6 py-4 text-gray-400">PHP {parseFloat(p.cost || 0).toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-white">PHP {parseFloat(p.price || 0).toFixed(2)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs font-bold ${p.price > 0 && (((p.price - (p.cost || 0)) / p.price) * 100) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {p.price > 0 ? (((p.price - (p.cost || 0)) / p.price) * 100).toFixed(1) : 0}%
                                                        </span>
                                                    </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${p.in_stock > 10 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {p.in_stock ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSyncingProductId(p.id)}
                                                    className="text-butterscotch hover:text-white transition-colors mr-3"
                                                    title="Sync to Branch"
                                                >
                                                    <Store size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(p)}
                                                    className="text-gray-400 hover:text-white transition-colors mr-3"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteModal(p)}
                                                    className="text-gray-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </React.Fragment>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    </div>
                    </>
                )}

                {/* Sync Modal */}
                {syncingProductId && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                        <div className="bg-charcoal p-8 rounded-2xl w-full max-w-md border border-charcoal-light shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">Sync Product to Branch</h3>
                            <p className="text-sm text-gray-400 mb-6">This will copy the product (and its variants/components) to the selected branch. Inventory stock will start at 0.</p>
                            
                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Select Target Branch</label>
                            <select 
                                value={syncTargetBranchId} 
                                onChange={e => setSyncTargetBranchId(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none mb-8"
                            >
                                <option value="" disabled>-- Select a Branch --</option>
                                {branches.filter(b => b.id !== managingBranchId).map(b => (
                                    <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                                ))}
                            </select>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setSyncingProductId(null)} className="px-6 py-2 rounded-xl text-white font-bold hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={handleSyncToBranch} className="px-6 py-2 rounded-xl bg-butterscotch text-charcoal font-bold hover:bg-butterscotch/90 transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)]">Sync Product</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                        <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-4 text-red-400">
                                <div className="p-3 bg-red-500/20 rounded-full">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Delete Product</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete Product</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border glass-panel ${toast.type === 'success' ? 'bg-[#1a2e1f] border-green-500/30 text-green-400' : toast.type === 'error' ? 'bg-[#2e1a1a] border-red-500/30 text-red-400' : 'bg-charcoal border-butterscotch/30 text-butterscotch'}`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertTriangle size={20} /> : <Loader2 size={20} className="animate-spin" />}
                        <span className="font-medium text-sm">{toast.message}</span>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
