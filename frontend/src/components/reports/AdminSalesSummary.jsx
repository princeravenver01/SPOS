import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Download, 
    Info, 
    User,
    FileText,
    Receipt,
    Columns
} from 'lucide-react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    ReferenceDot
} from 'recharts';
import AdminLayout from '../AdminLayout';

export default function AdminSalesSummary() {
    const [salesData, setSalesData] = useState({
        totals: {
            gross_sales: 0,
            refunds: 0,
            discounts: 0,
            net_sales: 0,
            gross_profit: 0
        },
        chartData: []
    });
    const [loading, setLoading] = useState(true);
    const [hasData, setHasData] = useState(false);
    const [timeGrouping, setTimeGrouping] = useState('Days');
    
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
        fetchSalesSummary();
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

    const fetchSalesSummary = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/reports/sales-summary?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setHasData(data.chartData && data.chartData.length > 0);

                    // Generate all dates in range
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const allDates = [];
                    
                    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                        allDates.push({
                            date: dt.toISOString().split('T')[0],
                            gross_sales: 0,
                            refunds: 0,
                            discounts: 0,
                            net_sales: 0,
                            cogs: 0,
                            gross_profit: 0
                        });
                    }

                    // Merge with actual data
                    const mergedChartData = allDates.map(day => {
                        const actualData = data.chartData.find(d => d.date === day.date);
                        return actualData ? { ...day, ...actualData } : day;
                    });

                    setSalesData({
                        totals: data.totals,
                        chartData: mergedChartData
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch sales summary", error);
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

    const formatDate = (dateString) => {
        const options = { day: 'numeric', month: 'short' };
        return new Date(dateString).toLocaleDateString('en-GB', options);
    };

    const getGroupedData = () => {
        if (!salesData.chartData || salesData.chartData.length === 0) return [];
        if (timeGrouping === 'Days') return salesData.chartData;

        const grouped = {};
        salesData.chartData.forEach(day => {
            const d = new Date(day.date + 'T00:00:00'); // local time midnight
            let key;
            let displayDate;

            if (timeGrouping === 'Months') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                displayDate = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            } else if (timeGrouping === 'Weeks') {
                const dayOfWeek = d.getDay();
                const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
                const weekStart = new Date(d);
                weekStart.setDate(diff);
                key = weekStart.toISOString().split('T')[0];
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                displayDate = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
            }

            if (!grouped[key]) {
                grouped[key] = {
                    date: key,
                    displayDate: displayDate,
                    gross_sales: 0,
                    refunds: 0,
                    discounts: 0,
                    net_sales: 0,
                    cogs: 0,
                    gross_profit: 0
                };
            }

            grouped[key].gross_sales += Number(day.gross_sales);
            grouped[key].refunds += Number(day.refunds);
            grouped[key].discounts += Number(day.discounts);
            grouped[key].net_sales += Number(day.net_sales);
            grouped[key].cogs += Number(day.cogs);
            grouped[key].gross_profit += Number(day.gross_profit);
        });

        return Object.values(grouped);
    };

    const displayData = getGroupedData();

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

            {/* Metrics Cards */}
            <div className="grid grid-cols-5 gap-4">
                {[
                    { label: 'Gross sales', value: salesData.totals.gross_sales, color: 'border-butterscotch' },
                    { label: 'Refunds', value: salesData.totals.refunds, color: 'border-transparent' },
                    { label: 'Discounts', value: salesData.totals.discounts, color: 'border-transparent' },
                    { label: 'Net sales', value: salesData.totals.net_sales, color: 'border-transparent' },
                    { label: 'Gross profit', value: salesData.totals.gross_profit, color: 'border-transparent' }
                ].map((metric, idx) => (
                    <div key={idx} className={`glass-panel p-6 rounded-xl border-t-4 ${metric.color} flex flex-col justify-center items-center text-center relative hover:bg-white/5 transition-colors cursor-pointer`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-400">{metric.label}</span>
                            <Info size={14} className="text-gray-500 hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(metric.value)}</h3>
                        <p className="text-xs text-gray-500 mt-1">{formatCurrency(0)} (0%)</p>
                    </div>
                ))}
            </div>

            {/* Chart Area */}
            <div className="glass-panel p-6 rounded-xl flex-1 min-h-[400px] flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 z-10">
                    <h3 className="text-lg font-semibold text-white">Gross sales</h3>
                    <div className="flex gap-4">
                        <select 
                            className="bg-charcoal border border-charcoal-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none cursor-pointer"
                            value={timeGrouping}
                            onChange={(e) => setTimeGrouping(e.target.value)}
                        >
                            <option value="Days">Days</option>
                            <option value="Weeks">Weeks</option>
                            <option value="Months">Months</option>
                        </select>
                    </div>
                </div>
                
                <div className="w-full h-[350px] relative z-10 mt-4">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis 
                                    dataKey={timeGrouping === 'Days' ? 'date' : 'displayDate'} 
                                    tickFormatter={timeGrouping === 'Days' ? formatDate : undefined} 
                                    stroke="rgba(255,255,255,0.3)" 
                                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                                    dy={10}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis 
                                    tickFormatter={(value) => `₱${value}`}
                                    stroke="rgba(255,255,255,0.3)" 
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    allowDecimals={false}
                                    domain={[0, 'auto']}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }}
                                    itemStyle={{ color: '#FBBD05' }}
                                    formatter={(value) => [formatCurrency(value), 'Gross Sales']}
                                    labelFormatter={(label) => timeGrouping === 'Days' ? formatDate(label) : label}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="gross_sales" 
                                    stroke="#FBBD05" 
                                    strokeWidth={3}
                                    dot={{ fill: '#1f2937', stroke: '#FBBD05', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: '#FBBD05' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
                
                {/* Decorative background gradient */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-butterscotch/5 rounded-full blur-3xl -z-0 pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Data Table */}
            <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
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
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-black/20 text-gray-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Gross sales</th>
                                <th className="px-6 py-4 font-semibold text-right">Refunds</th>
                                <th className="px-6 py-4 font-semibold text-right">Discounts</th>
                                <th className="px-6 py-4 font-semibold text-right">Net sales</th>
                                <th className="px-6 py-4 font-semibold text-right">Cost of goods</th>
                                <th className="px-6 py-4 font-semibold text-right">Gross profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!hasData ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center">
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
                                displayData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{timeGrouping === 'Days' ? formatDate(row.date) : row.displayDate}</td>
                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(row.gross_sales)}</td>
                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(row.refunds)}</td>
                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(row.discounts)}</td>
                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(row.net_sales)}</td>
                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(row.cogs)}</td>
                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(row.gross_profit)}</td>
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
