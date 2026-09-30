import React, { useState, useEffect } from 'react';
import { 
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [branchPerformance, setBranchPerformance] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // We no longer need the branch dropdown because we are displaying all branches in the top cards
    // but the tables below can just show 'all' data.
    const branchId = 'all'; 

    useEffect(() => {
        fetchAllDashboardData();
    }, []);

    const fetchAllDashboardData = async () => {
        setLoading(true);
        try {
            const [transactionsRes, itemsRes, performanceRes, branchesRes] = await Promise.all([
                fetch(`/api/dashboard/recent-transactions?branchId=${branchId}`),
                fetch(`/api/dashboard/top-items?branchId=${branchId}`),
                fetch(`/api/dashboard/branch-performance`).catch(() => null),
                fetch(`/api/branches`).catch(() => null)
            ]);

            if (transactionsRes.ok) {
                const transactionsData = await transactionsRes.json();
                if (transactionsData.success) {
                    setRecentTransactions(transactionsData.transactions);
                }
            }

            if (itemsRes.ok) {
                const itemsData = await itemsRes.json();
                if (itemsData.success) {
                    setTopItems(itemsData.items);
                }
            }

            if (performanceRes && performanceRes.ok) {
                const perfData = await performanceRes.json();
                if (perfData.success) {
                    setBranchPerformance(perfData.performance);
                }
            }

            if (branchesRes && branchesRes.ok) {
                const branchesData = await branchesRes.json();
                setBranches(branchesData);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <AdminLayout>
            <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-10">
                {/* Dashboard Content */}
                <div className="flex-1">
                    
                    {/* Header Section (Screenshot match) */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pt-2">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-bold text-white tracking-wide">
                                    Welcome back, <span className="text-butterscotch">admin</span>
                                </h2>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-butterscotch/30 bg-butterscotch/10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-butterscotch animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-butterscotch tracking-widest uppercase">LIVE</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">Overview of all branch performance.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold rounded-lg shadow-lg shadow-butterscotch/20 transition-all">
                                <span>Access POS</span>
                            </button>
                            <div className="px-4 py-2.5 glass-panel border border-white/10 rounded-lg text-sm text-gray-300 shadow-sm">
                                {today}
                            </div>
                        </div>
                    </div>

                    {/* Branch Performance Cards Grid */}
                    <div className="max-h-[520px] overflow-y-auto pr-4 mb-10 pb-4 border-b border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading && branches.length === 0 ? (
                            <div className="col-span-full py-12 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                            </div>
                        ) : branches.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                No branches found.
                            </div>
                        ) : (
                            branches.map(branch => {
                                const perf = branchPerformance.find(p => p.branch_id === branch.id) || {
                                    itemsSoldToday: 0,
                                    transactionsToday: 0,
                                    grossSalesToday: 0,
                                    totalProducts: 0,
                                    lowStockAlerts: 0
                                };
                                return (
                                <div key={branch.id} className="glass-panel border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-lg">
                                    <div className="p-5 border-b border-white/10 bg-black/20">
                                        <h3 className="text-xl font-bold text-white tracking-wide">{branch.name}</h3>
                                    </div>
                                    <div className="p-5 flex flex-col gap-4 text-sm font-medium">
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Sales:</span>
                                            <span className="text-butterscotch font-bold">{perf.itemsSoldToday} sold today</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Transactions:</span>
                                            <span className="text-white font-bold">{perf.transactionsToday} transactions today</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Total Sales:</span>
                                            <span className="text-white font-bold">{formatCurrency(perf.grossSalesToday)} today</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-gray-400">Total Products:</span>
                                            <span className="text-white font-bold">{perf.totalProducts} items</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Low Stock Alert:</span>
                                            <span className="text-red-400 font-bold">{perf.lowStockAlerts}</span>
                                        </div>
                                        
                                    </div>
                                </div>
                                );
                            })
                        )}
                        </div>
                    </div>

                    {/* Main Dashboard Grid (Recent Transactions & Top Items) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Recent Activity */}
                        <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col relative">
                            {loading && (
                                <div className="absolute inset-0 bg-charcoal/50 z-20 flex items-center justify-center backdrop-blur-sm">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                                </div>
                            )}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
                                <button className="text-sm font-semibold text-butterscotch hover:text-butterscotch/80 transition-colors">View All</button>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="bg-black/20">
                                        <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-white/10">
                                            <th className="py-4 px-6">Order ID</th>
                                            <th className="py-4 px-6">Time</th>
                                            <th className="py-4 px-6">Customer/Table</th>
                                            <th className="py-4 px-6">Status</th>
                                            <th className="py-4 px-6 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {recentTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-12 text-center text-gray-500">No recent transactions found.</td>
                                            </tr>
                                        ) : (
                                            recentTransactions.map((tx) => (
                                                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                                    <td className="py-4 px-6 font-medium text-white group-hover:text-butterscotch">#ORD-{tx.id.toString().padStart(4, '0')}</td>
                                                    <td className="py-4 px-6 text-gray-400">{formatTime(tx.created_at)}</td>
                                                    <td className="py-4 px-6 text-gray-300">
                                                        {tx.customer_name ? tx.customer_name : (tx.table_name ? `Table ${tx.table_name}` : 'Walk-in')}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        {tx.status === 'paid' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                                                                <CheckCircle2 size={12} /> Paid
                                                            </span>
                                                        ) : tx.status === 'open' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-butterscotch/10 border border-butterscotch/20 text-butterscotch text-xs font-medium">
                                                                <Clock size={12} /> Open
                                                            </span>
                                                        ) : tx.status === 'cancelled' || tx.status === 'refunded' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                                                                <AlertCircle size={12} /> {tx.status === 'refunded' ? 'Refunded' : 'Cancelled'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs font-medium">
                                                                {tx.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-bold text-white">{formatCurrency(tx.total_amount)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Top Selling Items */}
                        <div className="glass-panel rounded-xl flex flex-col relative overflow-hidden">
                            {loading && (
                                <div className="absolute inset-0 bg-charcoal/50 z-20 flex items-center justify-center backdrop-blur-sm">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cddc39]"></div>
                                </div>
                            )}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h2 className="text-lg font-bold text-white">Top Items (All Time)</h2>
                                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400">
                                    <TrendingUp size={18} />
                                </button>
                            </div>
                            <div className="p-6 flex-1 flex flex-col gap-5 bg-black/10">
                                {topItems.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500">No items sold yet.</div>
                                ) : (
                                    topItems.map((item, index) => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-charcoal flex items-center justify-center font-bold text-white border border-white/10 shadow-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">{item.item_name}</div>
                                                    <div className="text-xs text-gray-400">{item.category_name || 'Uncategorized'}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-white">{item.total_sold}</div>
                                                <div className="text-xs text-gray-500">sold overall</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
