import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Calendar, Store, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminInventoryValuation() {
    const [searchParams] = useSearchParams();
    const branchId = searchParams.get('branch_id');
    
    const [valuationData, setValuationData] = useState([]);
    const [branches, setBranches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [dateFilter, setDateFilter] = useState('');
    const [storeFilter, setStoreFilter] = useState(branchId || 'All stores');
    const [categoryFilter, setCategoryFilter] = useState('All categories');

    // Sorting states
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    useEffect(() => {
        fetchBranches();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (branches.length > 0) {
            fetchValuation();
        }
    }, [branches, storeFilter, dateFilter]);

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            const data = await res.json();
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/categories');
            const data = await res.json();
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const fetchValuation = async () => {
        setLoading(true);
        try {
            let url = `http://localhost:5000/api/inventory-valuation?t=${Date.now()}`;
            if (storeFilter !== 'All stores') {
                url += `&branch_id=${storeFilter}`;
            }
            if (dateFilter) {
                url += `&date=${dateFilter}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            setValuationData(data);
        } catch (err) {
            console.error('Failed to fetch valuation data', err);
        } finally {
            setLoading(false);
        }
    };

    // Derived filtered & sorted data
    const processedData = useMemo(() => {
        let result = [...valuationData];

        // 1. Apply Filters (Store and Date are handled by API, Category is local)
        if (categoryFilter !== 'All categories') {
            result = result.filter(item => item.category_name === categoryFilter);
        }

        // 2. Apply Sorting
        result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];
            
            if (['in_stock', 'cost', 'price', 'inventory_value', 'retail_value', 'potential_profit', 'margin'].includes(sortColumn)) {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [valuationData, categoryFilter, sortColumn, sortDirection]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc'); // Default desc for numbers
        }
    };

    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <ChevronUp className="inline-block opacity-20 ml-1" size={14} />;
        return sortDirection === 'asc' ? <ChevronUp className="inline-block text-butterscotch ml-1" size={14} /> : <ChevronDown className="inline-block text-butterscotch ml-1" size={14} />;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);
    };

    const formatPercent = (value) => {
        return `${(value || 0).toFixed(2)}%`;
    };

    // Calculate totals based on filtered processedData
    const totals = useMemo(() => {
        return processedData.reduce((acc, curr) => {
            acc.inventoryValue += curr.inventory_value;
            acc.retailValue += curr.retail_value;
            acc.potentialProfit += curr.potential_profit;
            return acc;
        }, { inventoryValue: 0, retailValue: 0, potentialProfit: 0 });
    }, [processedData]);

    const totalMargin = totals.retailValue > 0 ? (totals.potentialProfit / totals.retailValue) * 100 : 0;

    return (
        <AdminLayout>
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Calculator className="text-butterscotch" size={32} /> 
                            Inventory Valuation
                        </h2>
                        <p className="text-sm text-gray-400">
                            {dateFilter 
                                ? `The data is calculated at the end of the day for ${dateFilter}` 
                                : `The data is calculated based on current real-time stock`}
                        </p>
                    </div>
                </div>

                {/* Top Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-charcoal-light border border-white/5 p-6 rounded-xl shadow-lg flex flex-col justify-center">
                        <span className="text-sm text-gray-400 font-medium mb-1">Total inventory value</span>
                        <span className="text-3xl font-bold text-white">{formatCurrency(totals.inventoryValue)}</span>
                    </div>
                    <div className="bg-charcoal-light border border-white/5 p-6 rounded-xl shadow-lg flex flex-col justify-center">
                        <span className="text-sm text-gray-400 font-medium mb-1">Total retail value</span>
                        <span className="text-3xl font-bold text-white">{formatCurrency(totals.retailValue)}</span>
                    </div>
                    <div className="bg-charcoal-light border border-white/5 p-6 rounded-xl shadow-lg flex flex-col justify-center">
                        <span className="text-sm text-gray-400 font-medium mb-1">Potential profit</span>
                        <span className="text-3xl font-bold text-white">{formatCurrency(totals.potentialProfit)}</span>
                    </div>
                    <div className="bg-charcoal-light border border-white/5 p-6 rounded-xl shadow-lg flex flex-col justify-center">
                        <span className="text-sm text-gray-400 font-medium mb-1">Margin</span>
                        <span className="text-3xl font-bold text-white">{formatPercent(totalMargin)}</span>
                    </div>
                </div>

                <div className="bg-charcoal-light rounded-xl shadow-lg flex-1 flex flex-col overflow-hidden relative max-w-7xl w-full border border-white/5">
                    {/* Filter Bar */}
                    <div className="border-b border-white/5 p-4 bg-black/20 flex flex-wrap items-center gap-4 text-sm text-gray-300">
                        {/* Custom Date Input */}
                        <div className="flex items-center gap-2 bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors">
                            <Calendar size={16} className="text-gray-400" />
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={e => setDateFilter(e.target.value)}
                                className="bg-transparent text-sm text-white focus:outline-none placeholder-gray-500 w-[130px]" 
                                title="Select a historical date"
                            />
                            {dateFilter && (
                                <button onClick={() => setDateFilter('')} className="text-gray-500 hover:text-white ml-2 text-xs">Clear</button>
                            )}
                        </div>
                        
                        <div className="flex items-center bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors relative">
                            <Store size={16} className="text-gray-400 absolute left-3 pointer-events-none" />
                            <select 
                                value={storeFilter}
                                onChange={e => setStoreFilter(e.target.value)}
                                className="bg-transparent pl-7 pr-4 w-full h-full focus:outline-none text-white appearance-none cursor-pointer"
                            >
                                <option className="bg-charcoal" value="All stores">All stores</option>
                                {branches.map(b => <option key={b.id} value={b.id} className="bg-charcoal">{b.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
                        </div>
                        
                        <div className="flex items-center bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors relative">
                            <Filter size={16} className="text-gray-400 absolute left-3 pointer-events-none" />
                            <select 
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="bg-transparent pl-7 pr-4 w-full h-full focus:outline-none text-white appearance-none cursor-pointer"
                            >
                                <option className="bg-charcoal" value="All categories">All categories</option>
                                {categories.map(c => <option key={c.id} value={c.name} className="bg-charcoal">{c.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        <table className="w-full text-left text-sm text-gray-300">
                            <thead>
                                <tr className="border-b-2 border-white/10 bg-black/40 select-none">
                                    <th onClick={() => handleSort('name')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors group">
                                        Item <SortIcon column="name" />
                                    </th>
                                    <th onClick={() => handleSort('in_stock')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        In stock <SortIcon column="in_stock" />
                                    </th>
                                    <th onClick={() => handleSort('cost')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Cost <SortIcon column="cost" />
                                    </th>
                                    <th onClick={() => handleSort('inventory_value')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Inventory value <SortIcon column="inventory_value" />
                                    </th>
                                    <th onClick={() => handleSort('retail_value')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Retail value <SortIcon column="retail_value" />
                                    </th>
                                    <th onClick={() => handleSort('potential_profit')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Potential profit <SortIcon column="potential_profit" />
                                    </th>
                                    <th onClick={() => handleSort('margin')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Margin <SortIcon column="margin" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-gray-400">Calculating valuation...</td>
                                    </tr>
                                ) : processedData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-16 text-center">
                                            <Calculator size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
                                            <p className="text-gray-400 text-lg">No tracked items found matching filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    processedData.map(item => (
                                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-4 font-bold text-white transition-colors">{item.name}</td>
                                            <td className="px-4 py-4 text-right text-gray-300">
                                                {parseFloat(item.in_stock)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-gray-300">
                                                {formatCurrency(item.cost)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-white">
                                                {formatCurrency(item.inventory_value)}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-white">
                                                {formatCurrency(item.retail_value)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-gray-300">
                                                {formatCurrency(item.potential_profit)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-gray-300">
                                                {formatPercent(item.margin)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
