import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Download, 
    User,
    Receipt,
    Columns
} from 'lucide-react';
import AdminLayout from '../AdminLayout';

export default function AdminSalesByPaymentType() {
    const [salesData, setSalesData] = useState([]);
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
        fetchSalesByPaymentType();
    }, [startDate, endDate, employeeId]);

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees');
            const data = await response.json();
            setEmployees(data);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const fetchSalesByPaymentType = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/reports/sales-by-payment-type?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setHasData(data.tableData && data.tableData.length > 0);
                    setSalesData(data.tableData);
                }
            }
        } catch (error) {
            console.error("Failed to fetch sales by payment type", error);
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

                {/* Data Table */}
                <div className="glass-panel rounded-xl overflow-hidden flex flex-col relative">
                    {loading && (
                        <div className="absolute inset-0 bg-charcoal/50 z-20 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                        </div>
                    )}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <span className="font-semibold text-white tracking-wide text-sm">EXPORT</span>
                        <div className="flex items-center gap-4">
                            <button className="text-gray-400 hover:text-white transition-colors">
                                <Columns size={18} />
                            </button>
                            <button className="text-gray-400 hover:text-butterscotch transition-colors">
                                <Download size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                            <thead className="text-xs uppercase bg-black/20 text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Payment type</th>
                                    <th className="px-6 py-4 font-semibold text-right">Payment transactions</th>
                                    <th className="px-6 py-4 font-semibold text-right">Payment amount</th>
                                    <th className="px-6 py-4 font-semibold text-right">Refund transactions</th>
                                    <th className="px-6 py-4 font-semibold text-right">Refund amount</th>
                                    <th className="px-6 py-4 font-semibold text-right">Net amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!hasData ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                    <Receipt size={40} className="text-gray-400" />
                                                </div>
                                                <p className="text-lg font-medium text-gray-400 mb-1">No data to display</p>
                                                <p className="text-sm">There are no sales in the selected time period</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    salesData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white capitalize">{row.payment_type}</td>
                                            <td className="px-6 py-4 text-right text-white">{row.payment_transactions}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.payment_amount)}</td>
                                            <td className="px-6 py-4 text-right text-white">{row.refund_transactions}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.refund_amount)}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.net_amount)}</td>
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
