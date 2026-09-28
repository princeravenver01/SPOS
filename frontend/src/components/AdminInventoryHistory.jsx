import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Calendar, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Store, User, ListFilter } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminInventoryHistory() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const productId = searchParams.get('product_id');
    
    const [history, setHistory] = useState([]);
    const [branches, setBranches] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [productDetails, setProductDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filter states
    const dateRanges = ['All time', 'Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Custom Range'];
    const [dateRangeIndex, setDateRangeIndex] = useState(0);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const dateFilter = dateRanges[dateRangeIndex];
    
    // Custom date range state
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [storeFilter, setStoreFilter] = useState('All stores');
    const [employeeFilter, setEmployeeFilter] = useState('All employees');
    const [reasonFilter, setReasonFilter] = useState('All reasons');

    // Sorting states
    const [sortColumn, setSortColumn] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    useEffect(() => {
        fetchBranches();
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (branches.length > 0) {
            fetchHistory();
        }
    }, [branches, productId]);

    useEffect(() => {
        if (productId) {
            fetch(`http://localhost:5000/api/products`)
                .then(res => res.json())
                .then(data => {
                    const prod = data.find(p => p.id === parseInt(productId));
                    if (prod) setProductDetails(prod);
                })
                .catch(console.error);
        }
    }, [productId]);

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            const data = await res.json();
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/employees');
            const data = await res.json();
            setAllEmployees(data);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let url = `http://localhost:5000/api/inventory-history`;
            if (productId) {
                url = `http://localhost:5000/api/inventory-history/product/${productId}`;
            }

            const res = await fetch(url);
            const data = await res.json();
            setHistory(data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        } finally {
            setLoading(false);
        }
    };

    const extractBaseReason = (reason) => reason.includes('#') ? reason.split(' #')[0] : reason;

    // Combine system employees and reasons with history
    const uniqueStores = ['All stores', ...branches.map(b => b.name)];
    const uniqueEmployees = ['All employees', ...new Set([...allEmployees.map(e => e.name), ...history.map(h => h.employee_name)])];
    const systemReasons = ['Manual Adjustment', 'Production', 'Disassembly', 'Received', 'Return', 'Damage', 'Loss'];
    const uniqueReasons = ['All reasons', ...new Set([...systemReasons, ...history.map(h => extractBaseReason(h.reason))])];

    // Derived filtered & sorted data
    const processedHistory = useMemo(() => {
        let result = [...history];

        // 1. Apply Filters
        if (storeFilter !== 'All stores') {
            result = result.filter(h => h.branch_name === storeFilter);
        }
        if (employeeFilter !== 'All employees') {
            result = result.filter(h => h.employee_name === employeeFilter);
        }
        if (reasonFilter !== 'All reasons') {
            result = result.filter(h => extractBaseReason(h.reason) === reasonFilter);
        }
        if (dateFilter !== 'All time') {
            const now = new Date();
            result = result.filter(h => {
                const date = new Date(h.created_at);
                if (dateFilter === 'Today') {
                    return date.toDateString() === now.toDateString();
                } else if (dateFilter === 'Yesterday') {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return date.toDateString() === yesterday.toDateString();
                } else if (dateFilter === 'Last 7 Days') {
                    const last7 = new Date(now);
                    last7.setDate(last7.getDate() - 7);
                    return date >= last7;
                } else if (dateFilter === 'Custom Range') {
                    if (!customStartDate || !customEndDate) return true;
                    const start = new Date(customStartDate);
                    start.setHours(0,0,0,0);
                    const end = new Date(customEndDate);
                    end.setHours(23,59,59,999);
                    return date >= start && date <= end;
                }
                return true;
            });
        }

        // 2. Apply Sorting
        result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];
            
            if (sortColumn === 'adjustment' || sortColumn === 'stock_after') {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else if (sortColumn === 'created_at') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [history, storeFilter, employeeFilter, reasonFilter, dateFilter, sortColumn, sortDirection]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc'); // Default to desc for dates
        }
    };

    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <ChevronUp className="inline-block opacity-20 ml-1" size={14} />;
        return sortDirection === 'asc' ? <ChevronUp className="inline-block text-butterscotch ml-1" size={14} /> : <ChevronDown className="inline-block text-butterscotch ml-1" size={14} />;
    };

    return (
        <AdminLayout>
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        {productId ? (
                            <button 
                                onClick={() => navigate('/admin/products')}
                                className="text-butterscotch hover:text-white flex items-center gap-2 text-sm font-bold mb-4 transition-colors"
                            >
                                <ArrowLeft size={16} /> Back to Products
                            </button>
                        ) : null}
                        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <History className="text-butterscotch" size={32} /> 
                            {productId && productDetails ? `Item history` : `Inventory history`}
                        </h2>
                        {productId && productDetails && (
                            <p className="text-sm text-gray-400">Viewing history for: <span className="font-bold text-white">{productDetails.name}</span></p>
                        )}
                    </div>
                </div>

                <div className="bg-charcoal-light rounded-xl shadow-lg flex-1 flex flex-col overflow-hidden relative max-w-7xl mx-auto w-full border border-white/5">
                    {/* Filter Bar */}
                    <div className="border-b border-white/5 p-4 bg-black/20 flex flex-wrap items-center gap-4 text-sm text-gray-300">
                        {/* Date Switcher UI */}
                        <div className="relative">
                            <div className="flex items-center gap-1 bg-black/40 rounded border border-white/10 focus-within:border-butterscotch transition-colors h-10">
                                <button 
                                    onClick={() => setDateRangeIndex(prev => prev > 0 ? prev - 1 : prev)}
                                    className={`px-2 py-1.5 h-full flex items-center justify-center transition-colors ${dateRangeIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-white hover:bg-white/5'}`}
                                    disabled={dateRangeIndex === 0}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div 
                                    onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                                    className="flex items-center gap-2 px-4 text-white text-sm font-medium whitespace-nowrap min-w-[130px] justify-center select-none cursor-pointer hover:text-butterscotch transition-colors"
                                >
                                    <Calendar size={16} className="text-gray-400" />
                                    {dateFilter}
                                </div>
                                <button 
                                    onClick={() => setDateRangeIndex(prev => prev < dateRanges.length - 1 ? prev + 1 : prev)}
                                    className={`px-2 py-1.5 h-full flex items-center justify-center transition-colors ${dateRangeIndex === dateRanges.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-white hover:bg-white/5'}`}
                                    disabled={dateRangeIndex === dateRanges.length - 1}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {isDateDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsDateDropdownOpen(false)}
                                    ></div>
                                    <div className="absolute top-full left-0 mt-2 w-full bg-charcoal border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                                        {dateRanges.map((range, idx) => (
                                            <div 
                                                key={range} 
                                                onClick={() => { setDateRangeIndex(idx); setIsDateDropdownOpen(false); }}
                                                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${idx === dateRangeIndex ? 'bg-butterscotch/20 text-butterscotch font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                {range}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {dateFilter === 'Custom Range' && (
                            <div className="flex items-center gap-2 bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors animate-fade-in">
                                <input 
                                    type="date" 
                                    value={customStartDate}
                                    onChange={e => setCustomStartDate(e.target.value)}
                                    className="bg-transparent text-sm text-white focus:outline-none placeholder-gray-500" 
                                />
                                <span className="text-gray-500">-</span>
                                <input 
                                    type="date" 
                                    value={customEndDate}
                                    onChange={e => setCustomEndDate(e.target.value)}
                                    className="bg-transparent text-sm text-white focus:outline-none placeholder-gray-500" 
                                />
                            </div>
                        )}
                        
                        <div className="flex items-center bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors relative">
                            <Store size={16} className="text-gray-400 absolute left-3 pointer-events-none" />
                            <select 
                                value={storeFilter}
                                onChange={e => setStoreFilter(e.target.value)}
                                className="bg-transparent pl-7 pr-4 w-full h-full focus:outline-none text-white appearance-none cursor-pointer"
                            >
                                {uniqueStores.map(store => <option key={store} value={store} className="bg-charcoal">{store}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
                        </div>
                        
                        <div className="flex items-center bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors relative">
                            <User size={16} className="text-gray-400 absolute left-3 pointer-events-none" />
                            <select 
                                value={employeeFilter}
                                onChange={e => setEmployeeFilter(e.target.value)}
                                className="bg-transparent pl-7 pr-4 w-full h-full focus:outline-none text-white appearance-none cursor-pointer"
                            >
                                {uniqueEmployees.map(emp => <option key={emp} value={emp} className="bg-charcoal">{emp}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
                        </div>
                        
                        <div className="flex items-center bg-black/40 px-3 h-10 rounded border border-white/10 focus-within:border-butterscotch transition-colors relative">
                            <ListFilter size={16} className="text-gray-400 absolute left-3 pointer-events-none" />
                            <select 
                                value={reasonFilter}
                                onChange={e => setReasonFilter(e.target.value)}
                                className="bg-transparent pl-7 pr-4 w-full h-full focus:outline-none text-white appearance-none cursor-pointer"
                            >
                                {uniqueReasons.map(r => <option key={r} value={r} className="bg-charcoal">{r}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-8">
                        {productId && productDetails && (
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                                <ArrowLeft size={20} className="text-gray-400 cursor-pointer hover:text-white" onClick={() => navigate('/admin/products')} />
                                {productDetails.name}
                            </h3>
                        )}

                        <table className="w-full text-left text-sm text-gray-300">
                            <thead>
                                <tr className="border-b-2 border-white/10 bg-black/40 select-none">
                                    <th onClick={() => handleSort('created_at')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors group">
                                        Date <SortIcon column="created_at" />
                                    </th>
                                    {!productId && (
                                        <th onClick={() => handleSort('product_name')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors group">
                                            Item <SortIcon column="product_name" />
                                        </th>
                                    )}
                                    <th onClick={() => handleSort('branch_name')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors group">
                                        Store <SortIcon column="branch_name" />
                                    </th>
                                    <th onClick={() => handleSort('employee_name')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors group">
                                        Employee <SortIcon column="employee_name" />
                                    </th>
                                    <th onClick={() => handleSort('reason')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs cursor-pointer hover:text-white transition-colors group">
                                        Reason <SortIcon column="reason" />
                                    </th>
                                    <th onClick={() => handleSort('adjustment')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Adjustment <SortIcon column="adjustment" />
                                    </th>
                                    <th onClick={() => handleSort('stock_after')} className="px-4 py-3 font-bold text-gray-400 uppercase tracking-wider text-xs text-right cursor-pointer hover:text-white transition-colors group">
                                        Stock after <SortIcon column="stock_after" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={productId ? 6 : 7} className="py-12 text-center text-gray-400">Loading history...</td>
                                    </tr>
                                ) : processedHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={productId ? 6 : 7} className="py-16 text-center">
                                            <History size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
                                            <p className="text-gray-400 text-lg">No inventory history found matching filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    processedHistory.map(item => (
                                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-4 whitespace-nowrap text-gray-300">
                                                {new Date(item.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                            </td>
                                            {!productId && (
                                                <td className="px-4 py-4 font-bold text-white group-hover:text-butterscotch transition-colors">{item.product_name}</td>
                                            )}
                                            <td className="px-4 py-4 text-gray-300">{item.branch_name}</td>
                                            <td className="px-4 py-4 text-gray-300">{item.employee_name}</td>
                                            <td className="px-4 py-4 text-gray-300">
                                                {item.reason.includes('#') ? (
                                                    <span>
                                                        {item.reason.split('#')[0]} 
                                                        <span className="text-butterscotch font-bold">#{item.reason.split('#')[1]}</span>
                                                    </span>
                                                ) : item.reason}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold">
                                                <span className={parseFloat(item.adjustment) > 0 ? 'text-green-400' : 'text-gray-400'}>
                                                    {parseFloat(item.adjustment) > 0 ? '+' : ''}{parseFloat(item.adjustment)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-white">
                                                {parseFloat(item.stock_after)}
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
