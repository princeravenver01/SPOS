import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Download, 
    User,
    Receipt,
    Columns,
    TrendingUp
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import AdminLayout from '../AdminLayout';

const PIE_COLORS = ['#FBBD05', '#34A853', '#4285F4', '#EA4335', '#9C27B0'];

export default function AdminSalesByItem() {
    const [salesData, setSalesData] = useState({
        tableData: [],
        top5Items: [],
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
        fetchSalesByItem();
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

    const fetchSalesByItem = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/reports/sales-by-item?startDate=${startDate}&endDate=${endDate}&employeeId=${employeeId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setHasData(data.tableData && data.tableData.length > 0);

                    // Generate all dates in range for the Bar Chart
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const allDates = [];
                    
                    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                        allDates.push({
                            date: dt.toISOString().split('T')[0],
                            net_sales: 0
                        });
                    }

                    // Merge with actual chart data
                    const mergedChartData = allDates.map(day => {
                        const actualData = data.chartData.find(d => d.date === day.date);
                        return actualData ? { ...day, ...actualData } : day;
                    });

                    setSalesData({
                        tableData: data.tableData,
                        top5Items: data.top5Items,
                        chartData: mergedChartData
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch sales by item", error);
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
            const d = new Date(day.date + 'T00:00:00');
            let key;
            let displayDate;

            if (timeGrouping === 'Months') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                displayDate = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            } else if (timeGrouping === 'Weeks') {
                const dayOfWeek = d.getDay();
                const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
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
                    net_sales: 0
                };
            }

            grouped[key].net_sales += Number(day.net_sales);
        });

        return Object.values(grouped);
    };

    const displayChartData = getGroupedData();

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

                {/* Charts Area */}
                <div className="flex gap-6 h-[400px]">
                    {/* Top 5 Items */}
                    <div className="glass-panel p-6 rounded-xl w-1/3 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6 z-10">
                            <h3 className="text-lg font-semibold text-white">Top 5 items</h3>
                            <span className="text-xs text-gray-400">Net sales</span>
                        </div>
                        <div className="flex-1 w-full relative z-10">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                                </div>
                            ) : !hasData || salesData.top5Items.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <TrendingUp size={32} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">No data to display</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salesData.top5Items}
                                            dataKey="net_sales"
                                            nameKey="item_name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                        >
                                            {salesData.top5Items.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            height={36} 
                                            iconType="circle"
                                            formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Sales by Item Chart */}
                    <div className="glass-panel p-6 rounded-xl w-2/3 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6 z-10">
                            <h3 className="text-lg font-semibold text-white">Sales by item chart</h3>
                            <div className="flex gap-4">
                                <select className="bg-charcoal border border-charcoal-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none cursor-pointer">
                                    <option value="Bar">Bar</option>
                                </select>
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
                        
                        <div className="flex-1 w-full relative z-10">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterscotch"></div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                            formatter={(value) => [formatCurrency(value), 'Net Sales']}
                                            labelFormatter={(label) => timeGrouping === 'Days' ? formatDate(label) : label}
                                        />
                                        <Bar 
                                            dataKey="net_sales" 
                                            fill="#FBBD05" 
                                            radius={[4, 4, 0, 0]} 
                                            maxBarSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {/* Decorative background gradient */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-butterscotch/5 rounded-full blur-3xl -z-0 pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
                    </div>
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
                        <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                            <thead className="text-xs uppercase bg-black/20 text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Item</th>
                                    <th className="px-6 py-4 font-semibold">Category</th>
                                    <th className="px-6 py-4 font-semibold text-right">Items sold</th>
                                    <th className="px-6 py-4 font-semibold text-right">Gross sales</th>
                                    <th className="px-6 py-4 font-semibold text-right">Refunds</th>
                                    <th className="px-6 py-4 font-semibold text-right">Discounts</th>
                                    <th className="px-6 py-4 font-semibold text-right">Net sales</th>
                                    <th className="px-6 py-4 font-semibold text-right">Cost of goods</th>
                                    <th className="px-6 py-4 font-semibold text-right">Gross profit</th>
                                    <th className="px-6 py-4 font-semibold text-right">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!hasData ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-16 text-center">
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
                                    salesData.tableData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{row.item_name}</td>
                                            <td className="px-6 py-4 text-white">{row.category_name || 'Uncategorized'}</td>
                                            <td className="px-6 py-4 text-right text-white">{row.items_sold}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.gross_sales)}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.refunds)}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.discounts)}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.net_sales)}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.cogs)}</td>
                                            <td className="px-6 py-4 text-right text-white">{formatCurrency(row.gross_profit)}</td>
                                            <td className="px-6 py-4 text-right text-white">{row.margin.toFixed(2)}%</td>
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
