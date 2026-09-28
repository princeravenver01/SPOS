import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight,
    User,
    Receipt
} from 'lucide-react';
import AdminLayout from '../AdminLayout';

export default function AdminTaxes() {
    const [salesData, setSalesData] = useState([]);
    const [summary, setSummary] = useState({
        taxableSales: 0,
        nonTaxableSales: 0,
        totalNetSales: 0
    });
    const [loading, setLoading] = useState(true);
    const [hasData, setHasData] = useState(false);
    
    // Default date range: Past 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [employeeId, setEmployeeId] = useState('all');
    
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        fetchTaxes();
    }, [startDate, endDate, employeeId]);

    const fetchEmployees = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/employees');
            const data = await response.json();
            setEmployees(data);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const fetchTaxes = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/reports/taxes?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setHasData(data.tableData && data.tableData.length > 0);
                    setSalesData(data.tableData);
                    setSummary(data.summary || {
                        taxableSales: 0,
                        nonTaxableSales: 0,
                        totalNetSales: 0
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch taxes", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);
    };

    const handleDateShift = (direction) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (direction === 'prev') {
            start.setDate(start.getDate() - diffDays);
            end.setDate(end.getDate() - diffDays);
        } else {
            start.setDate(start.getDate() + diffDays);
            end.setDate(end.getDate() + diffDays);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    return (
        <AdminLayout>
            <div className="flex flex-col space-y-6 max-w-7xl mx-auto pb-10">
                {/* Top Controls */}
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <div className="flex items-center bg-charcoal rounded-lg border border-charcoal-light overflow-hidden">
                        <button 
                            onClick={() => handleDateShift('prev')}
                            className="px-3 py-2 text-gray-400 hover:text-white hover:bg-charcoal-light transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 border-x border-charcoal-light cursor-pointer hover:bg-charcoal-light/50 transition-colors">
                            <Calendar size={16} className="text-gray-400" />
                            <input 
                                type="date" 
                                className="bg-transparent text-sm text-white focus:outline-none"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-gray-500">-</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-sm text-white focus:outline-none"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => handleDateShift('next')}
                            className="px-3 py-2 text-gray-400 hover:text-white hover:bg-charcoal-light transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-charcoal rounded-lg border border-charcoal-light px-4 py-2">
                        <User size={16} className="text-gray-400" />
                        <select 
                            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                        >
                            <option value="all">All employees</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Summary Ribbon */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <h4 className="text-sm text-gray-400 mb-2 z-10">Taxable sales</h4>
                        <p className="text-3xl font-bold text-white z-10">{formatCurrency(summary.taxableSales)}</p>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-0"></div>
                    </div>
                    <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <h4 className="text-sm text-gray-400 mb-2 z-10">Non-taxable sales</h4>
                        <p className="text-3xl font-bold text-white z-10">{formatCurrency(summary.nonTaxableSales)}</p>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-0"></div>
                    </div>
                    <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <h4 className="text-sm text-gray-400 mb-2 z-10">Total net sales</h4>
                        <p className="text-3xl font-bold text-white z-10">{formatCurrency(summary.totalNetSales)}</p>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-0"></div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="glass-panel rounded-xl overflow-hidden flex flex-col relative mt-2">
                    {loading && (
                        <div className="absolute inset-0 bg-charcoal/50 z-20 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                        </div>
                    )}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <span className="font-semibold text-white tracking-wide text-sm">EXPORT</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                            <thead className="text-xs uppercase bg-black/20 text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tax name</th>
                                    <th className="px-6 py-4 font-semibold text-right">Tax rate</th>
                                    <th className="px-6 py-4 font-semibold text-right">Taxable sales</th>
                                    <th className="px-6 py-4 font-semibold text-right">Tax amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!hasData ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                    <Receipt size={40} className="text-gray-400" />
                                                </div>
                                                <p className="text-lg font-medium text-gray-400 mb-1">No data to display</p>
                                                <p className="text-sm">There are no taxable sales in the selected time period</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    salesData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{row.tax_name}</td>
                                            <td className="px-6 py-4 text-right text-white">{row.tax_rate}%</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.taxable_sales)}</td>
                                            <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(row.tax_amount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400 bg-black/20">
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1">
                                <button className="w-8 h-8 flex items-center justify-center rounded border border-white/10 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50">
                                    <ChevronLeft size={16} />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded border border-white/10 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                            <span>Page: <input type="number" value="1" readOnly className="w-12 bg-charcoal border border-white/10 rounded px-2 py-1 text-center mx-2 text-white" /> of 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <select className="bg-charcoal border border-white/10 rounded px-2 py-1 focus:outline-none text-white">
                                <option>10</option>
                                <option>25</option>
                                <option>50</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
