import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Receipt, 
    Package, 
    ShoppingCart, 
    Users, 
    Clock,
    FileText,
    Settings,
    Bell,
    ChevronDown,
    Truck,
    ArrowLeftRight,
    Activity,
    ClipboardList,
    Factory,
    History,
    Calculator,
    BarChart3,
    CreditCard,
    Tags,
    Percent,
    User,
    LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const [collapsedGroups, setCollapsedGroups] = useState({
        overview: true,
        reports: true,
        inventory: true,
        people: true,
        config: true
    });

    useEffect(() => {
        const path = location.pathname;
        setCollapsedGroups(prev => ({
            ...prev,
            overview: (path === '/admin/dashboard' || path === '/admin') ? false : prev.overview,
            reports: path.startsWith('/admin/reports') ? false : prev.reports,
            inventory: ['/admin/products', '/admin/categories', '/admin/modifiers', '/admin/discounts', '/admin/suppliers', '/admin/purchase-orders', '/admin/transfer-orders', '/admin/stock-adjustments', '/admin/inventory-counts', '/admin/productions', '/admin/inventory-history', '/admin/inventory-valuation'].some(p => path.startsWith(p)) ? false : prev.inventory,
            people: ['/admin/customers', '/admin/employees', '/admin/access-roles'].some(p => path.startsWith(p)) ? false : prev.people,
            config: path.startsWith('/admin/settings') ? false : prev.config
        }));
    }, [location.pathname]);

    const toggleGroup = (group) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    useEffect(() => {
        const adminUser = localStorage.getItem('spos_admin');
        if (!adminUser && location.pathname !== '/admin') {
            navigate('/admin');
        }
    }, [location.pathname, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('spos_admin');
        navigate('/admin');
    };

    return (
        <div className="flex h-screen glass-bg text-white font-sans overflow-hidden">
            
            {/* Sidebar */}
            <div className="w-64 flex flex-col h-full glass-panel shrink-0 z-20">
                {/* Logo Area */}
                <div className="flex items-center gap-3 p-6 border-b border-white/5 h-20">
                    <img src="/logo.png" alt="Logo" className="h-8 rounded-full" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-tight tracking-wide text-butterscotch">SILINGAN</span>
                        <span className="text-[10px] text-gray-400 tracking-widest uppercase">Gastro POS</span>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    
                    <div 
                        className="px-6 mb-2 text-xs font-semibold text-gray-500 tracking-wider flex justify-between items-center cursor-pointer hover:text-white transition-colors group"
                        onClick={() => toggleGroup('overview')}
                    >
                        <span>OVERVIEW</span>
                        <ChevronDown size={14} className={`transform transition-transform ${collapsedGroups['overview'] ? '-rotate-90' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedGroups['overview'] ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
                        <nav className="space-y-1 px-3 mb-6">
                            <Link to="/admin/dashboard" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname === '/admin/dashboard' ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <LayoutDashboard size={18} />
                                    <span>Dashboard</span>
                                </div>
                            </Link>
                        </nav>
                    </div>

                    <div 
                        className="px-6 mb-2 text-xs font-semibold text-gray-500 tracking-wider flex justify-between items-center cursor-pointer hover:text-white transition-colors group"
                        onClick={() => toggleGroup('reports')}
                    >
                        <span>REPORTS</span>
                        <ChevronDown size={14} className={`transform transition-transform ${collapsedGroups['reports'] ? '-rotate-90' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${collapsedGroups['reports'] ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
                        <nav className="space-y-1 px-3 mb-6">
                            <Link to="/admin/reports/sales-summary" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/sales-summary') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <BarChart3 size={18} />
                                    <span>Sales summary</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/sales-by-item" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/sales-by-item') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Package size={18} />
                                    <span className="text-sm">Sales by item</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/sales-by-category" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/sales-by-category') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <FileText size={18} />
                                    <span className="text-sm">Sales by category</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/sales-by-employee" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/sales-by-employee') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Users size={18} />
                                    <span className="text-sm">Sales by employee</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/sales-by-payment-type" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/sales-by-payment-type') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <CreditCard size={18} />
                                    <span className="text-sm">Sales by payment type</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/receipts" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/receipts') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Receipt size={18} />
                                    <span className="text-sm">Receipts</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/sales-by-modifier" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/sales-by-modifier') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Settings size={18} />
                                    <span className="text-sm">Sales by modifier</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/discounts" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/discounts') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Tags size={18} />
                                    <span className="text-sm">Discounts</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/taxes" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/taxes') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Percent size={18} />
                                    <span className="text-sm">Taxes</span>
                                </div>
                            </Link>
                            <Link to="/admin/reports/shifts" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/reports/shifts') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Clock size={18} />
                                    <span className="text-sm">Shifts</span>
                                </div>
                            </Link>
                        </nav>
                    </div>

                    <div 
                        className="px-6 mb-2 text-xs font-semibold text-gray-500 tracking-wider flex justify-between items-center cursor-pointer hover:text-white transition-colors group"
                        onClick={() => toggleGroup('inventory')}
                    >
                        <span>PRODUCTS & INVENTORY</span>
                        <ChevronDown size={14} className={`transform transition-transform ${collapsedGroups['inventory'] ? '-rotate-90' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${collapsedGroups['inventory'] ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'}`}>
                        <nav className="space-y-1 px-3 mb-6">
                            <Link to="/admin/products" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/products') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Package size={18} />
                                    <span>Products</span>
                                </div>
                            </Link>
                            <Link to="/admin/categories" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/categories') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <FileText size={18} />
                                    <span>Categories</span>
                                </div>
                            </Link>
                            <Link to="/admin/modifiers" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/modifiers') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Settings size={18} />
                                    <span>Modifiers</span>
                                </div>
                            </Link>
                            <Link to="/admin/discounts" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/discounts') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Receipt size={18} />
                                    <span>Discounts</span>
                                </div>
                            </Link>
                            <Link to="/admin/suppliers" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/suppliers') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Truck size={18} />
                                    <span>Suppliers</span>
                                </div>
                            </Link>
                            <Link to="/admin/purchase-orders" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/purchase-orders') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <ShoppingCart size={18} />
                                    <span>Purchase Orders</span>
                                </div>
                            </Link>
                            <Link to="/admin/transfer-orders" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/transfer-orders') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <ArrowLeftRight size={18} />
                                    <span>Transfer Orders</span>
                                </div>
                            </Link>
                            <Link to="/admin/stock-adjustments" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/stock-adjustments') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Activity size={18} />
                                    <span>Stock Adjustments</span>
                                </div>
                            </Link>
                            <Link to="/admin/inventory-counts" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/inventory-counts') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <ClipboardList size={18} />
                                    <span>Inventory Counts</span>
                                </div>
                            </Link>
                            <Link to="/admin/productions" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/productions') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Factory size={18} />
                                    <span>Production</span>
                                </div>
                            </Link>
                            <Link to="/admin/inventory-history" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/inventory-history') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <History size={18} />
                                    <span>Inventory History</span>
                                </div>
                            </Link>
                            <Link to="/admin/inventory-valuation" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/inventory-valuation') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Calculator size={18} />
                                    <span>Inventory Valuation</span>
                                </div>
                            </Link>
                        </nav>
                    </div>

                    <div 
                        className="px-6 mb-2 text-xs font-semibold text-gray-500 tracking-wider flex justify-between items-center cursor-pointer hover:text-white transition-colors group"
                        onClick={() => toggleGroup('people')}
                    >
                        <span>PEOPLE & PROFILES</span>
                        <ChevronDown size={14} className={`transform transition-transform ${collapsedGroups['people'] ? '-rotate-90' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedGroups['people'] ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'}`}>
                        <nav className="space-y-1 px-3 mb-6">
                            <Link to="/admin/customers" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/customers') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Users size={18} />
                                    <span>Customers</span>
                                </div>
                            </Link>
                            <Link to="/admin/employees" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/employees') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Clock size={18} />
                                    <span>Employees</span>
                                </div>
                            </Link>
                            <Link to="/admin/access-roles" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/access-roles') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Users size={18} />
                                    <span>Access Roles</span>
                                </div>
                            </Link>
                        </nav>
                    </div>

                    <div 
                        className="px-6 mb-2 text-xs font-semibold text-gray-500 tracking-wider flex justify-between items-center cursor-pointer hover:text-white transition-colors group"
                        onClick={() => toggleGroup('config')}
                    >
                        <span>CONFIGURATION</span>
                        <ChevronDown size={14} className={`transform transition-transform ${collapsedGroups['config'] ? '-rotate-90' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedGroups['config'] ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
                        <nav className="space-y-1 px-3 mb-6">
                            <Link to="/admin/settings" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${location.pathname.startsWith('/admin/settings') ? 'bg-charcoal-light/30 text-butterscotch border-l-4 border-butterscotch' : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border-l-4 border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <Settings size={18} />
                                    <span>Settings</span>
                                </div>
                            </Link>
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                
                {/* Top Header */}
                <header className="h-20 glass-panel flex items-center justify-between px-8 shrink-0 rounded-bl-3xl border-t-0 border-r-0 border-l-0 relative z-50">
                    <div>
                        <h1 className="text-xl font-bold text-white capitalize">{pathSegments[pathSegments.length - 1] || 'Dashboard'}</h1>
                        <p className="text-xs text-gray-400">Manage your POS system settings</p>
                    </div>
                    <div className="flex items-center gap-6 relative">
                        <button className="text-gray-400 hover:text-butterscotch transition-all duration-300 relative">
                            <Bell size={20} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse-slow"></span>
                        </button>
                        <div className="h-6 w-px bg-white/10"></div>
                        
                        <div className="relative group">
                            <button className="flex items-center gap-3 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-charcoal-light/50 border border-white/10 flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <div className="text-left hidden md:block">
                                    <div className="text-white font-bold text-xs leading-none">Admin</div>
                                    <div className="text-[10px] text-gray-500 mt-1">Superuser</div>
                                </div>
                                <ChevronDown size={14} className="ml-1 opacity-50" />
                            </button>
                            
                            <div className="absolute right-0 mt-3 w-48 bg-charcoal border border-charcoal-light rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-2 group-hover:translate-y-0">
                                <div className="py-2">
                                    <Link to="/admin/account" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                                        <Settings size={16} />
                                        Account Settings
                                    </Link>
                                    <div className="h-px bg-white/5 my-1"></div>
                                    <button 
                                        onClick={handleLogout} 
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-white hover:bg-red-500/10 transition-colors text-left"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-8 animate-fade-in-up relative z-10">
                    {children}
                </main>
            </div>
        </div>
    );
}
