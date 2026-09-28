import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Check, Store, Image as ImageIcon, ArrowLeft, Trash2, Monitor, Loader2, AlertTriangle, CheckCircle, Printer, Wifi, RefreshCw } from 'lucide-react';
import AdminLayout from './AdminLayout';
import TableMapper from './TableMapper';
import { provinces, getCityMunByProvince, getBarangayByMun } from 'phil-reg-prov-mun-brgy';

const MultiSelectDropdown = ({ options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleOption = (val) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };
    
    const toggleAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(o => o.value));
        }
    };
    
    let display = placeholder;
    if (selected.length === options.length && options.length > 0) {
        display = 'All selected';
    } else if (selected.length > 0) {
        if (selected.length === 1) {
            const opt = options.find(o => o.value === selected[0]);
            display = opt ? opt.label : placeholder;
        } else {
            display = `${selected.length} selected`;
        }
    }
    
    return (
        <div className="relative">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2.5 text-left text-white focus:outline-none focus:border-butterscotch flex justify-between items-center"
            >
                <span className="truncate">{display}</span>
                <ChevronDown size={16} className="text-gray-400 shrink-0 ml-2" />
            </button>
            
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-charcoal-dark border border-charcoal-light rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-charcoal-light">
                        <label className="flex items-center gap-3 cursor-pointer text-sm text-white px-2 py-1.5 hover:bg-charcoal-light/30 rounded">
                            <input 
                                type="checkbox" 
                                checked={selected.length === options.length && options.length > 0} 
                                onChange={toggleAll}
                                className="accent-butterscotch w-4 h-4 cursor-pointer"
                            />
                            <span className="font-bold">Select All</span>
                        </label>
                    </div>
                    <div className="p-2 space-y-1">
                        {options.map(opt => (
                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 px-2 py-1.5 hover:bg-charcoal-light/30 rounded transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selected.includes(opt.value)} 
                                    onChange={() => toggleOption(opt.value)}
                                    className="accent-butterscotch w-4 h-4 cursor-pointer"
                                />
                                <span>{opt.label}</span>
                            </label>
                        ))}
                    </div>
                    {/* Backdrop to close when clicking outside (simple implementation) */}
                    <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)}></div>
                </div>
            )}
        </div>
    );
};

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState('Features');

    const tabs = [
        'Features',
        'Billing & Subscriptions',
        'Payment Types',
        'Loyalty',
        'Taxes',
        'Receipt',
        'Printers',
        'Branches',
        'Tables',
        'POS Devices'
    ];

    const [features, setFeatures] = useState({
        shifts: true,
        openTickets: true,
        kitchenPrinters: false,
        customerDisplays: false,
        diningOptions: true,
        lowStockNotification: true,
        negativeStockAlerts: true,
        embeddedBarcodes: false
    });

    // Payment Types State
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [newPayment, setNewPayment] = useState({ type: 'card', name: '', branch: '' });

    // Taxes State
    const [taxes, setTaxes] = useState([]);
    const [newTax, setNewTax] = useState({
        name: '', 
        rate: '', 
        rateType: '%', 
        calculationType: 'added', 
        applicableBranches: [], 
        dependsOnDining: false, 
        diningOptions: []
    });

    // Receipt Settings State
    const [managingReceiptsBranchId, setManagingReceiptsBranchId] = useState('');
    const [receiptSettings, setReceiptSettings] = useState({
        logoFile: null,
        logoUrl: null,
        header: '',
        footer: '',
        showCustomerInfo: true
    });

    // Branches State
    const [branches, setBranches] = useState([]);
    const [newBranch, setNewBranch] = useState({
        name: '', address: '', provCode: '', cityCode: '', brgyCode: '',
        provinceName: '', cityName: '', brgyName: '',
        postalCode: '', phone: '', description: ''
    });
    const [editingBranchId, setEditingBranchId] = useState(null);

    // Open Tickets State
    const [openTicketsConfig, setOpenTicketsConfig] = useState({
        usePredefined: false,
        predefinedTickets: []
    });
    const [newPredefinedTicket, setNewPredefinedTicket] = useState('');

    // Printers State (Kitchen & Counter)
    const [printersList, setPrintersList] = useState([]);
    const [newPrinter, setNewPrinter] = useState({
        name: '',
        type: 'counter',
        ip_address: '',
        port: 9100,
        paper_width: '58mm',
        branch_id: '',
        auto_print: true
    });
    const [testingPrinterId, setTestingPrinterId] = useState(null);
    const [testResults, setTestResults] = useState({});

    // POS Devices State
    const [posDevices, setPosDevices] = useState([]);
    const [newPosDevice, setNewPosDevice] = useState({ name: '', branchId: '' });

    // Dining Options State
    const [diningOptionsList, setDiningOptionsList] = useState([]);
    const [newDiningOptionName, setNewDiningOptionName] = useState('');

    // Tables & Areas State
    const [areas, setAreas] = useState([]);
    const [managingTablesForBranchId, setManagingTablesForBranchId] = useState(null);
    const [mappingArea, setMappingArea] = useState(null);
    const [newArea, setNewArea] = useState({ name: '', type: 'Indoor', mapImage: null });
    
    // Fetch areas for a branch
    const fetchAreas = async (branchId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/areas?branch_id=${branchId}`);
            const data = await res.json();
            setAreas(data);
        } catch (err) {
            console.error('Failed to fetch areas', err);
        }
    };

    const handleAddArea = async (e) => {
        e.preventDefault();
        if (!newArea.name || !newArea.mapImage) {
            showToast('error', 'Name and Area Map are required');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('branch_id', managingTablesForBranchId);
            formData.append('name', newArea.name);
            formData.append('type', newArea.type);
            if (newArea.mapImage) {
                formData.append('map_image', newArea.mapImage);
            }

            const res = await fetch('http://localhost:5000/api/areas', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                fetchAreas(managingTablesForBranchId);
                setNewArea({ name: '', type: 'Indoor', mapImage: null });
                showToast('Area added successfully');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save area');
        }
    };

    const handleDeleteArea = async (id) => {
        setDeleteModal({
            name: 'this area',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/areas/${id}`, { method: 'DELETE' });
                setAreas(areas.filter(a => a.id !== id));
                showToast('success', 'Area removed');
            }
        });
    };

    const [toast, setToast] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);

    const showToast = (type, message) => {
        if (message === undefined) {
            message = type;
            type = 'success';
        }
        setToast({ type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast(null), 4000);
        }
    };

    const confirmDelete = async () => {
        if (deleteModal && deleteModal.onConfirm) {
            try {
                showToast('loading', 'Deleting...');
                await deleteModal.onConfirm();
                setDeleteModal(null);
            } catch (err) {
                console.error(err);
                showToast('error', 'Failed to delete');
            }
        }
    };

    // --- API helpers ---
    const saveSetting = async (key, value) => {
        try {
            await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
        } catch (err) {
            console.error('Failed to save setting', key, err);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/branches');
            const data = await res.json();
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    // Load all settings on mount
    useEffect(() => {
        fetchBranches();
        (async () => {
            try {
                const res = await fetch('http://localhost:5000/api/settings');
                const data = await res.json();

                if (data.features) {
                    try { setFeatures(JSON.parse(data.features)); } catch {}
                }
                // Payment Types, Taxes, and Dining Options are now fetched via their own APIs
                if (data.receiptSettings) {
                    try { setReceiptSettings(JSON.parse(data.receiptSettings)); } catch {}
                }
                if (data.openTicketsConfig) {
                    try { 
                        let parsed = JSON.parse(data.openTicketsConfig);
                        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                        setOpenTicketsConfig(parsed); 
                    } catch {}
                }
                if (data.diningOptions) {
                    try { setDiningOptionsList(JSON.parse(data.diningOptions)); } catch {}
                }
                if (data.posDevices) {
                    try { setPosDevices(JSON.parse(data.posDevices)); } catch {}
                }
            } catch (err) {
                console.error('Failed to load settings', err);
            }
        })();
    }, []);

    const fetchTaxes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/taxes');
            const data = await res.json();
            setTaxes(data);
        } catch (err) {
            console.error('Failed to fetch taxes', err);
        }
    };

    const fetchPayments = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/payments');
            const data = await res.json();
            setPaymentTypes(data);
        } catch (err) {
            console.error('Failed to fetch payments', err);
        }
    };

    const fetchDiningOptions = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/dining-options');
            const data = await res.json();
            setDiningOptionsList(data);
        } catch (err) {
            console.error('Failed to fetch dining options', err);
        }
    };

    const fetchPosDevices = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/pos-devices');
            const data = await res.json();
            setPosDevices(data);
        } catch (err) {
            console.error('Failed to fetch pos devices', err);
        }
    };

    const fetchPrinters = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/printers');
            const data = await res.json();
            setPrintersList(data);
        } catch (err) {
            console.error('Failed to fetch printers', err);
        }
    };

    useEffect(() => {
        fetchTaxes();
        fetchPayments();
        fetchDiningOptions();
        fetchPosDevices();
        fetchPrinters();
    }, []);

    const toggleFeature = (key) => {
        setFeatures(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            saveSetting('features', updated);
            return updated;
        });
        showToast('Feature setting updated successfully');
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!newPayment.name) return;
        
        try {
            const payload = {
                type: newPayment.type,
                name: newPayment.name,
                branch_id: newPayment.branch ? parseInt(newPayment.branch) : null
            };

            const res = await fetch('http://localhost:5000/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchPayments();
                setNewPayment({ type: 'card', name: '', branch: '' });
                showToast('Payment type saved successfully');
            } else {
                showToast('error', 'Failed to save payment type');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save payment type');
        }
    };

    const handleDeletePayment = async (id) => {
        setDeleteModal({
            name: 'this payment type',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/payments/${id}`, { method: 'DELETE' });
                await fetchPayments();
                showToast('success', 'Payment type removed');
            }
        });
    };

    const handleAddDiningOption = async (e) => {
        e.preventDefault();
        if (!newDiningOptionName) return;
        
        try {
            const res = await fetch('http://localhost:5000/api/dining-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDiningOptionName })
            });

            if (res.ok) {
                await fetchDiningOptions();
                setNewDiningOptionName('');
                showToast('Dining option added successfully');
            } else {
                showToast('error', 'Failed to save dining option or it already exists');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDiningOption = async (id) => {
        setDeleteModal({
            name: 'this dining option',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/dining-options/${id}`, { method: 'DELETE' });
                await fetchDiningOptions();
                showToast('success', 'Dining option removed');
            }
        });
    };

    const handleAddTax = async (e) => {
        e.preventDefault();
        if (!newTax.name || !newTax.rate) return;
        
        try {
            const res = await fetch('http://localhost:5000/api/taxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTax)
            });
            
            if (res.ok) {
                await fetchTaxes();
                setNewTax({
                    name: '', rate: '', rateType: '%', calculationType: 'added', applicableBranches: [], dependsOnDining: false, diningOptions: []
                });
                showToast('Tax rule saved successfully');
            } else {
                showToast('error', 'Failed to save tax');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save tax');
        }
    };

    const handleDeleteTax = async (id) => {
        setDeleteModal({
            name: 'this tax',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/taxes/${id}`, { method: 'DELETE' });
                await fetchTaxes();
                showToast('success', 'Tax deleted');
            }
        });
    };

    // Fetch receipt settings when branch changes
    useEffect(() => {
        if (!managingReceiptsBranchId) {
            setReceiptSettings({ logoFile: null, logoUrl: null, header: '', footer: '', showCustomerInfo: true });
            return;
        }
        
        const fetchReceiptSettings = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/receipts?branch_id=${managingReceiptsBranchId}`);
                const data = await res.json();
                if (data) {
                    setReceiptSettings({
                        logoFile: null,
                        logoUrl: data.logo_url,
                        header: data.header_text || '',
                        footer: data.footer_text || '',
                        showCustomerInfo: data.show_customer_info === 1 || data.show_customer_info === true
                    });
                } else {
                    setReceiptSettings({ logoFile: null, logoUrl: null, header: '', footer: '', showCustomerInfo: true });
                }
            } catch (err) {
                console.error('Failed to fetch receipt settings', err);
            }
        };
        fetchReceiptSettings();
    }, [managingReceiptsBranchId]);

    const handleSaveReceipt = async (e) => {
        e.preventDefault();
        if (!managingReceiptsBranchId) {
            showToast('error', 'Please select a branch first');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('branch_id', managingReceiptsBranchId);
            formData.append('header_text', receiptSettings.header);
            formData.append('footer_text', receiptSettings.footer);
            formData.append('show_customer_info', receiptSettings.showCustomerInfo);
            if (receiptSettings.logoFile) {
                formData.append('logo', receiptSettings.logoFile);
            } else if (!receiptSettings.logoUrl) {
                formData.append('remove_logo', 'true');
            }

            const res = await fetch('http://localhost:5000/api/receipts', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setReceiptSettings({ ...receiptSettings, logoUrl: data.logo_url, logoFile: null });
                showToast('Receipt settings saved');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save receipt settings');
        }
    };

    const handleProvinceChange = (e) => {
        const provCode = e.target.value;
        const provName = e.target.options[e.target.selectedIndex].text;
        setNewBranch({ ...newBranch, provCode, provinceName: provName, cityCode: '', cityName: '', brgyCode: '', brgyName: '' });
    };

    const handleCityChange = (e) => {
        const cityCode = e.target.value;
        const cityName = e.target.options[e.target.selectedIndex].text;
        setNewBranch({ ...newBranch, cityCode, cityName: cityName, brgyCode: '', brgyName: '' });
    };

    const handleBrgyChange = (e) => {
        const brgyCode = e.target.value;
        const brgyName = e.target.options[e.target.selectedIndex].text;
        setNewBranch({ ...newBranch, brgyCode, brgyName: brgyName });
    };

    const handleAddBranch = async (e) => {
        e.preventDefault();
        if (!newBranch.name || !newBranch.provCode || !newBranch.cityCode || !newBranch.brgyCode) {
            showToast('error', 'Please complete the address dropdowns');
            return;
        }

        try {
            if (editingBranchId) {
                await fetch(`http://localhost:5000/api/branches/${editingBranchId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBranch)
                });
                showToast('Branch updated successfully');
            } else {
                await fetch('http://localhost:5000/api/branches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBranch)
                });
                showToast('Branch added successfully');
            }
            
            fetchBranches();
            setEditingBranchId(null);
            setNewBranch({ name: '', address: '', provCode: '', cityCode: '', brgyCode: '', provinceName: '', cityName: '', brgyName: '', postalCode: '', phone: '', description: '' });
        } catch (err) {
            console.error('Failed to save branch', err);
            showToast('error', 'Failed to save branch');
        }
    };

    const handleAddPosDevice = async (e) => {
        e.preventDefault();
        if (!newPosDevice.name || !newPosDevice.branchId) {
            showToast('error', 'Please complete all fields');
            return;
        }
        
        try {
            const res = await fetch('http://localhost:5000/api/pos-devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newPosDevice.name, branch_id: newPosDevice.branchId })
            });

            if (res.ok) {
                await fetchPosDevices();
                setNewPosDevice({ name: '', branchId: '' });
                showToast('POS Device added successfully');
            } else {
                showToast('error', 'Failed to save POS device');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save POS device');
        }
    };

    const handleDeletePosDevice = async (id) => {
        setDeleteModal({
            name: 'this POS device',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/pos-devices/${id}`, { method: 'DELETE' });
                await fetchPosDevices();
                showToast('success', 'POS Device removed');
            }
        });
    };

    const handleAddPrinter = async (e) => {
        e.preventDefault();
        if (!newPrinter.name || !newPrinter.ip_address) {
            showToast('error', 'Please provide a printer name and IP address');
            return;
        }

        try {
            const res = await fetch('http://localhost:5000/api/printers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPrinter)
            });

            if (res.ok) {
                await fetchPrinters();
                setNewPrinter({
                    name: '',
                    type: 'counter',
                    ip_address: '',
                    port: 9100,
                    paper_width: '58mm',
                    branch_id: '',
                    auto_print: true
                });
                showToast('Printer configured successfully');
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Failed to save printer');
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to save printer');
        }
    };

    const handleDeletePrinter = async (id) => {
        setDeleteModal({
            name: 'this printer',
            onConfirm: async () => {
                await fetch(`http://localhost:5000/api/printers/${id}`, { method: 'DELETE' });
                await fetchPrinters();
                showToast('success', 'Printer removed');
            }
        });
    };

    const handleTestPrinterConnection = async (printer) => {
        setTestingPrinterId(printer.id);
        setTestResults(prev => ({ ...prev, [printer.id]: { loading: true } }));
        try {
            const res = await fetch('http://localhost:5000/api/printers/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: printer.ip_address, port: printer.port })
            });
            const data = await res.json();
            setTestResults(prev => ({ ...prev, [printer.id]: { loading: false, success: data.connected, message: data.message } }));
            if (data.connected) {
                showToast('Printer is online and connected!');
            } else {
                showToast('error', data.message || 'Cannot connect to printer');
            }
        } catch (err) {
            setTestResults(prev => ({ ...prev, [printer.id]: { loading: false, success: false, message: err.message } }));
            showToast('error', 'Connection test failed');
        } finally {
            setTestingPrinterId(null);
        }
    };

    const handleTestPrint = async (printer) => {
        setTestingPrinterId(printer.id);
        try {
            const res = await fetch('http://localhost:5000/api/printers/test-print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip_address: printer.ip_address,
                    port: printer.port,
                    type: printer.type,
                    paper_width: printer.paper_width
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Test receipt printed on ${printer.name}!`);
            } else {
                showToast('error', data.error || 'Print failed');
            }
        } catch (err) {
            showToast('error', err.message || 'Print error');
        } finally {
            setTestingPrinterId(null);
        }
    };

    const handleEditBranch = (branch) => {
        setEditingBranchId(branch.id);
        setNewBranch({
            name: branch.name || '',
            address: branch.address || '',
            provCode: branch.provCode || '',
            cityCode: branch.cityCode || '',
            brgyCode: branch.brgyCode || '',
            provinceName: branch.province || '',
            cityName: branch.city || '',
            brgyName: branch.barangay || '',
            postalCode: branch.postalCode || '',
            phone: branch.phone || '',
            description: branch.description || ''
        });
        // Scroll to top of the form smoothly
        document.getElementById('branch-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEditBranch = () => {
        setEditingBranchId(null);
        setNewBranch({ name: '', address: '', provCode: '', cityCode: '', brgyCode: '', provinceName: '', cityName: '', brgyName: '', postalCode: '', phone: '', description: '' });
    };

    const ToggleSwitch = ({ active, onClick }) => (
        <button 
            onClick={onClick}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${active ? 'bg-butterscotch' : 'bg-charcoal-light'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`}></div>
        </button>
    );

    return (
        <AdminLayout>
            <div className="flex flex-col h-full">
                
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
                    <p className="text-sm text-gray-400">Manage your system configurations and active features.</p>
                </div>

                <div className="flex flex-1 gap-8 overflow-hidden">
                    
                    {/* Settings Navigation */}
                    <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 pb-8">
                        {['Features', ...(features.openTickets ? ['Open Tickets'] : []), ...(features.diningOptions ? ['Dining Options'] : []), 'Payment Types', 'Taxes', 'Receipt', 'Printers', 'Branches', 'Tables', 'POS Devices', 'Billing & Subscriptions', 'Loyalty'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full text-left px-5 py-3.5 rounded-xl font-medium transition-all ${
                                    activeTab === tab 
                                    ? 'bg-charcoal text-butterscotch shadow-lg border border-charcoal-light' 
                                    : 'text-gray-400 hover:text-white hover:bg-charcoal-light/20 border border-transparent'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Settings Content Area */}
                    <div className="flex-1 bg-charcoal border border-charcoal-light rounded-2xl p-8 overflow-y-auto">
                        
                        {activeTab === 'Features' && (
                            <div className="max-w-3xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Configure POS Features</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-5 glass-card rounded-xl">
                                        <div>
                                            <div className="font-bold text-white mb-1">Shifts</div>
                                            <div className="text-sm text-gray-400">Track cash that goes in and out of your drawer.</div>
                                        </div>
                                        <ToggleSwitch active={features.shifts} onClick={() => toggleFeature('shifts')} />
                                    </div>

                                    {/* Open Tickets */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Open Tickets</div>
                                            <div className="text-sm text-gray-400">Allow cashiers to save and edit orders before completing a payment.</div>
                                        </div>
                                        <ToggleSwitch active={features.openTickets} onClick={() => toggleFeature('openTickets')} />
                                    </div>

                                    {/* Kitchen Printers */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Kitchen Printers</div>
                                            <div className="text-sm text-gray-400">Send orders to a kitchen printer or display automatically.</div>
                                        </div>
                                        <ToggleSwitch active={features.kitchenPrinters} onClick={() => toggleFeature('kitchenPrinters')} />
                                    </div>

                                    {/* Customer Displays */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Customer Displays</div>
                                            <div className="text-sm text-gray-400">Display order information to customers at the time of purchase.</div>
                                        </div>
                                        <ToggleSwitch active={features.customerDisplays} onClick={() => toggleFeature('customerDisplays')} />
                                    </div>

                                    {/* Dining Options */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Dining Options</div>
                                            <div className="text-sm text-gray-400">Mark orders as dine-in, takeout, or for delivery.</div>
                                        </div>
                                        <ToggleSwitch active={features.diningOptions} onClick={() => toggleFeature('diningOptions')} />
                                    </div>

                                    {/* Low stock notification */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Low Stock Notifications</div>
                                            <div className="text-sm text-gray-400">Get daily emails on items that are low or out of stock.</div>
                                        </div>
                                        <ToggleSwitch active={features.lowStockNotification} onClick={() => toggleFeature('lowStockNotification')} />
                                    </div>

                                    {/* Negative Stock alerts */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Negative Stock Alerts</div>
                                            <div className="text-sm text-gray-400">Warn cashiers attempting to sell more inventory than available in stock.</div>
                                        </div>
                                        <ToggleSwitch active={features.negativeStockAlerts} onClick={() => toggleFeature('negativeStockAlerts')} />
                                    </div>

                                    {/* weight embedded barcodes */}
                                    <div className="flex items-center justify-between p-4 bg-charcoal-dark/30 rounded-xl border border-charcoal-light/50 hover:border-charcoal-light transition-colors">
                                        <div>
                                            <div className="font-bold text-white mb-1">Weight Embedded Barcodes</div>
                                            <div className="text-sm text-gray-400">Allow scanning of barcodes with embedded weight metrics.</div>
                                        </div>
                                        <ToggleSwitch active={features.embeddedBarcodes} onClick={() => toggleFeature('embeddedBarcodes')} />
                                    </div>

                                </div>
                            </div>
                        )}

                        {activeTab === 'Open Tickets' && (
                            <div className="max-w-2xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Open Tickets Configuration</h3>
                                
                                <div className="flex items-center justify-between p-5 glass-card rounded-xl mb-6">
                                    <div>
                                        <div className="font-bold text-white mb-1">Use predefined tickets</div>
                                        <div className="text-sm text-gray-400 max-w-md">This feature allows you to quickly assign names to open tickets. For example, Table 1, Table 2, etc. <span className="text-butterscotch cursor-pointer ml-1 hover:underline">Learn more</span></div>
                                    </div>
                                    <ToggleSwitch 
                                        active={openTicketsConfig.usePredefined} 
                                        onClick={() => {
                                            const newConfig = { ...openTicketsConfig, usePredefined: !openTicketsConfig.usePredefined };
                                            setOpenTicketsConfig(newConfig);
                                            saveSetting('openTicketsConfig', newConfig);
                                        }} 
                                    />
                                </div>

                                <div className="glass-card p-6 rounded-xl">
                                    <h4 className="font-bold text-gray-300 mb-4 text-sm uppercase tracking-wider">Predefined Tickets</h4>
                                    
                                    <div className="space-y-2 mb-6">
                                        {openTicketsConfig.predefinedTickets.map((ticket, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-charcoal-dark/50 rounded-lg border border-charcoal-light/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-gray-500 cursor-grab">≡</div>
                                                    <div className="text-white font-medium">{ticket}</div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newTickets = openTicketsConfig.predefinedTickets.filter((_, i) => i !== index);
                                                        setOpenTicketsConfig({ ...openTicketsConfig, predefinedTickets: newTickets });
                                                    }}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {openTicketsConfig.predefinedTickets.length === 0 && (
                                            <div className="text-gray-500 text-sm text-center py-4 italic">No predefined tickets added yet.</div>
                                        )}
                                    </div>

                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (!newPredefinedTicket.trim()) return;
                                        setOpenTicketsConfig({ 
                                            ...openTicketsConfig, 
                                            predefinedTickets: [...openTicketsConfig.predefinedTickets, newPredefinedTicket.trim()] 
                                        });
                                        setNewPredefinedTicket('');
                                    }} className="flex gap-3 mb-6">
                                        <input 
                                            type="text" 
                                            value={newPredefinedTicket}
                                            onChange={(e) => setNewPredefinedTicket(e.target.value)}
                                            placeholder="Enter ticket name (e.g. VIP 1)"
                                            className="flex-1 bg-charcoal border border-charcoal-light rounded-lg px-3 py-2 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600"
                                        />
                                        <button type="submit" className="text-butterscotch border border-butterscotch hover:bg-butterscotch/10 px-4 py-2 rounded-lg font-bold text-sm transition-colors uppercase tracking-wider flex items-center gap-2">
                                            + Add
                                        </button>
                                    </form>
                                    
                                    <div className="pt-4 border-t border-charcoal-light/50 flex justify-end gap-3">
                                        <button 
                                            onClick={() => window.location.reload()}
                                            className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-charcoal-light/20 font-bold text-sm transition-colors"
                                        >
                                            CANCEL
                                        </button>
                                        <button 
                                            onClick={() => {
                                                saveSetting('openTicketsConfig', openTicketsConfig);
                                                showToast('Open tickets configuration saved');
                                            }}
                                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                                        >
                                            SAVE CHANGES
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Dining Options' && (
                            <div className="max-w-2xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Manage Dining Options</h3>
                                
                                <form onSubmit={handleAddDiningOption} className="glass-card p-6 rounded-xl mb-8 flex items-end gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">New Dining Option Name</label>
                                        <input 
                                            type="text" 
                                            value={newDiningOptionName}
                                            onChange={(e) => setNewDiningOptionName(e.target.value)}
                                            placeholder="e.g. Drive-Thru, UberEats"
                                            className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600"
                                            required
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-2 rounded-lg transition-colors shadow-sm shrink-0"
                                    >
                                        Add Option
                                    </button>
                                </form>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-300 mb-4 text-sm uppercase tracking-wider">Active Dining Options</h4>
                                    {diningOptionsList.map(option => (
                                        <div key={option.id} className="flex items-center justify-between p-4 glass-card rounded-lg border-none shadow-none">
                                            <div className="font-bold text-white text-lg">{option.name}</div>
                                            <button 
                                                onClick={() => handleDeleteDiningOption(option.id)}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    {diningOptionsList.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-charcoal-light rounded-lg text-gray-500">
                                            No dining options configured. Add one above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Payment Types' && (
                            <div className="max-w-3xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Manage Payment Types</h3>
                                
                                <form onSubmit={handleAddPayment} className="glass-card p-6 rounded-xl mb-8">
                                    <h4 className="font-bold text-white mb-4">Add New Payment Type</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Type</label>
                                            <select 
                                                value={newPayment.type}
                                                onChange={(e) => setNewPayment({...newPayment, type: e.target.value})}
                                                className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2 text-white focus:outline-none focus:border-butterscotch"
                                            >
                                                <option value="card">Card</option>
                                                <option value="cash">Cash</option>
                                                <option value="check">Check</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Name</label>
                                            <input 
                                                type="text" 
                                                value={newPayment.name}
                                                onChange={(e) => setNewPayment({...newPayment, name: e.target.value})}
                                                placeholder="e.g. Visa/Mastercard"
                                                className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Branches</label>
                                            <select 
                                                value={newPayment.branch}
                                                onChange={(e) => setNewPayment({...newPayment, branch: e.target.value})}
                                                className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2 text-white focus:outline-none focus:border-butterscotch"
                                            >
                                                <option value="">All Branches</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            type="submit" 
                                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-2 rounded-lg transition-colors shadow-sm"
                                        >
                                            Save Payment Type
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-300 mb-4 text-sm uppercase tracking-wider">Active Payment Types</h4>
                                    {paymentTypes.map(payment => (
                                        <div key={payment.id} className="flex items-center justify-between p-4 glass-card rounded-lg border-none shadow-none">
                                            <div>
                                                <div className="font-bold text-white text-lg">{payment.name}</div>
                                                <div className="text-sm text-gray-400 capitalize">{payment.type} • {payment.branch}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeletePayment(payment.id)}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    {paymentTypes.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-charcoal-light rounded-lg text-gray-500">
                                            No payment types configured. Add one above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Taxes' && (
                            <div className="max-w-3xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Manage Taxes</h3>
                                
                                <form onSubmit={handleAddTax} className="glass-card p-6 rounded-xl mb-8">
                                    <h4 className="font-bold text-white mb-6">Add New Tax</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Name</label>
                                            <input 
                                                type="text" 
                                                value={newTax.name}
                                                onChange={(e) => setNewTax({...newTax, name: e.target.value})}
                                                placeholder="e.g. VAT"
                                                className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Tax Rate</label>
                                            <div className="flex">
                                                <input 
                                                    type="number" 
                                                    value={newTax.rate}
                                                    onChange={(e) => setNewTax({...newTax, rate: e.target.value})}
                                                    placeholder="0.00"
                                                    className="w-full bg-charcoal border border-charcoal-light border-r-0 rounded-l-lg px-3 py-2.5 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600"
                                                    required
                                                />
                                                <select 
                                                    value={newTax.rateType}
                                                    onChange={(e) => setNewTax({...newTax, rateType: e.target.value})}
                                                    className="bg-charcoal border border-charcoal-light rounded-r-lg px-3 py-2.5 text-white focus:outline-none focus:border-butterscotch border-l-0"
                                                >
                                                    <option value="%">%</option>
                                                    <option value="₱">₱ (Fiat)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Type</label>
                                        <select 
                                            value={newTax.calculationType}
                                            onChange={(e) => setNewTax({...newTax, calculationType: e.target.value})}
                                            className="w-full bg-charcoal border border-charcoal-light rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-butterscotch"
                                        >
                                            <option value="added">Added to the price</option>
                                            <option value="included">Included in the price</option>
                                        </select>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Applicable Branches</label>
                                        <MultiSelectDropdown 
                                            options={branches.map(b => ({ label: b.name, value: b.id }))}
                                            selected={newTax.applicableBranches || []}
                                            onChange={(val) => setNewTax({...newTax, applicableBranches: val})}
                                            placeholder="Select branches..."
                                        />
                                    </div>

                                    <div className="border border-charcoal-light rounded-lg p-5 bg-charcoal-dark/50 mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <div className="font-bold text-white mb-1 text-sm">Tax application depends on dining option</div>
                                                <div className="text-xs text-gray-400">Configure specific tax rules based on how the customer dines.</div>
                                            </div>
                                            <ToggleSwitch active={newTax.dependsOnDining} onClick={(e) => { e.preventDefault(); setNewTax({...newTax, dependsOnDining: !newTax.dependsOnDining}) }} />
                                        </div>

                                        {newTax.dependsOnDining && (
                                            <div className="space-y-4 pt-4 border-t border-charcoal-light/50">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">When dining option is</label>
                                                    <MultiSelectDropdown 
                                                        options={diningOptionsList.map(o => ({ label: o.name, value: o.id }))}
                                                        selected={newTax.diningOptions || []}
                                                        onChange={(val) => setNewTax({...newTax, diningOptions: val})}
                                                        placeholder="Select dining options..."
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <button 
                                            type="submit" 
                                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-2.5 rounded-lg transition-colors shadow-sm"
                                        >
                                            Save Tax
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-300 mb-4 text-sm uppercase tracking-wider">Active Taxes</h4>
                                    {taxes.map(tax => (
                                        <div key={tax.id} className="flex items-center justify-between p-4 glass-card rounded-lg border-none shadow-none">
                                            <div>
                                                <div className="font-bold text-white text-lg">{tax.name} <span className="text-butterscotch ml-2">{tax.rate}{tax.rateType}</span></div>
                                                <div className="text-sm text-gray-400 capitalize">
                                                    {tax.calculationType} to price 
                                                    {tax.dependsOnDining ? ' • Conditional application' : ''}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteTax(tax.id)}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    {taxes.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-charcoal-light rounded-lg text-gray-500">
                                            No taxes configured. Add one above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Receipt' && (
                            <div className="max-w-3xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Receipt Settings</h3>
                                
                                <div className="mb-6">
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Select Branch</label>
                                    <select 
                                        value={managingReceiptsBranchId}
                                        onChange={(e) => setManagingReceiptsBranchId(e.target.value)}
                                        className="w-full bg-charcoal border border-charcoal-light rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                    >
                                        <option value="">-- Select a Branch --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {managingReceiptsBranchId && (
                                <form onSubmit={handleSaveReceipt} className="glass-card p-6 rounded-xl mb-8">
                                    <div className="space-y-6 mb-6">
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Receipt Logo</label>
                                            
                                            <div className="flex items-center gap-4">
                                                {receiptSettings.logoFile ? (
                                                    <div className="h-16 w-16 rounded bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                                                        <img 
                                                            src={URL.createObjectURL(receiptSettings.logoFile)} 
                                                            alt="Logo Preview" 
                                                            className="max-h-full max-w-full object-contain"
                                                        />
                                                    </div>
                                                ) : receiptSettings.logoUrl ? (
                                                    <div className="h-16 w-16 rounded bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                                        <img 
                                                            src={`http://localhost:5000${receiptSettings.logoUrl}`} 
                                                            alt="Logo Preview" 
                                                            className="max-h-full max-w-full object-contain"
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setReceiptSettings({...receiptSettings, logoUrl: null, logoFile: null})}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                        >
                                                            <Trash2 size={16} className="text-red-400" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="h-16 w-16 rounded bg-black/20 border border-dashed border-white/20 flex items-center justify-center text-gray-500 shrink-0">
                                                        Logo
                                                    </div>
                                                )}
                                                
                                                <div className="flex-1">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                setReceiptSettings({...receiptSettings, logoFile: e.target.files[0]});
                                                            }
                                                        }}
                                                        className="block w-full text-sm text-gray-400
                                                            file:mr-4 file:py-2.5 file:px-4
                                                            file:rounded-lg file:border-0
                                                            file:text-sm file:font-bold file:bg-butterscotch file:text-charcoal
                                                            hover:file:bg-butterscotch/90 file:cursor-pointer file:transition-colors"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-2">Upload a high-contrast image (PNG or JPG) to be printed on receipts.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Header Message</label>
                                            <textarea 
                                                value={receiptSettings.header}
                                                onChange={(e) => setReceiptSettings({...receiptSettings, header: e.target.value})}
                                                placeholder="e.g. Silingan Gastro\n123 Main St, City\nContact: 555-0192"
                                                rows="3"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors custom-scrollbar"
                                            ></textarea>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Footer Message</label>
                                            <textarea 
                                                value={receiptSettings.footer}
                                                onChange={(e) => setReceiptSettings({...receiptSettings, footer: e.target.value})}
                                                placeholder="e.g. Thank you for dining with us!\nPlease come again."
                                                rows="2"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors custom-scrollbar"
                                            ></textarea>
                                        </div>

                                        <div className="p-4 glass-card border border-white/5 rounded-xl flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white mb-1 text-sm">Show Customer Info</div>
                                                <div className="text-xs text-gray-400">Print customer name, phone, and loyalty points if available.</div>
                                            </div>
                                            <ToggleSwitch 
                                                active={receiptSettings.showCustomerInfo} 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    setReceiptSettings({...receiptSettings, showCustomerInfo: !receiptSettings.showCustomerInfo});
                                                }} 
                                            />
                                        </div>
                                        
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-white/10">
                                        <button 
                                            type="submit" 
                                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] transform hover:-translate-y-0.5 duration-200"
                                        >
                                            Save Settings
                                        </button>
                                    </div>
                                </form>
                                )}
                            </div>
                        )}

                        {activeTab === 'Branches' && (
                            <div className="max-w-4xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Manage Branches</h3>
                                
                                <form id="branch-form" onSubmit={handleAddBranch} className="glass-card p-6 rounded-xl mb-8">
                                    <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                                        <Store size={18} className="text-butterscotch" /> {editingBranchId ? 'Edit Branch' : 'Add New Branch'}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Branch Name *</label>
                                            <input 
                                                type="text" 
                                                value={newBranch.name}
                                                onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                                                placeholder="e.g. Ayala Malls Branch"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Phone Number *</label>
                                            <input 
                                                type="text" 
                                                value={newBranch.phone}
                                                onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})}
                                                placeholder="e.g. 0917-123-4567"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Street Address *</label>
                                        <input 
                                            type="text" 
                                            value={newBranch.address}
                                            onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                                            placeholder="Unit / Floor / Bldg / Street"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Province *</label>
                                            <select 
                                                value={newBranch.provCode}
                                                onChange={handleProvinceChange}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none"
                                                required
                                            >
                                                <option value="" className="text-gray-900">Select Province</option>
                                                {provinces.map(p => (
                                                    <option key={p.prov_code} value={p.prov_code} className="text-gray-900">{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">City/Municipality *</label>
                                            <select 
                                                value={newBranch.cityCode}
                                                onChange={handleCityChange}
                                                disabled={!newBranch.provCode}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none disabled:opacity-50"
                                                required
                                            >
                                                <option value="" className="text-gray-900">Select City</option>
                                                {newBranch.provCode && getCityMunByProvince(newBranch.provCode).map(c => (
                                                    <option key={c.mun_code} value={c.mun_code} className="text-gray-900">{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Barangay *</label>
                                            <select 
                                                value={newBranch.brgyCode}
                                                onChange={handleBrgyChange}
                                                disabled={!newBranch.cityCode}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch transition-colors appearance-none disabled:opacity-50"
                                                required
                                            >
                                                <option value="" className="text-gray-900">Select Barangay</option>
                                                {newBranch.cityCode && getBarangayByMun(newBranch.cityCode).map(b => (
                                                    <option key={b.brgy_code || b.name} value={b.brgy_code || b.name} className="text-gray-900">{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Postal Code *</label>
                                            <input 
                                                type="text" 
                                                value={newBranch.postalCode}
                                                onChange={(e) => setNewBranch({...newBranch, postalCode: e.target.value})}
                                                placeholder="e.g. 1209"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Description</label>
                                            <input 
                                                type="text" 
                                                value={newBranch.description}
                                                onChange={(e) => setNewBranch({...newBranch, description: e.target.value})}
                                                placeholder="Brief description or notes"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                        {editingBranchId && (
                                            <button 
                                                type="button" 
                                                onClick={handleCancelEditBranch}
                                                className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-colors border border-white/10"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button 
                                            type="submit" 
                                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(251,189,5,0.2)] transform hover:-translate-y-0.5 duration-200"
                                        >
                                            {editingBranchId ? 'Update Branch' : 'Save Branch'}
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-300 mb-4 text-sm uppercase tracking-wider">Active Branches</h4>
                                    {branches.map(branch => (
                                        <div key={branch.id} className="p-6 glass-card rounded-xl border-none shadow-none flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-white text-xl mb-1 flex items-center gap-2">
                                                    {branch.name}
                                                </div>
                                                <div className="text-sm text-gray-300 mb-1 leading-relaxed">
                                                    {branch.address}, {branch.barangay}, {branch.city}, {branch.province} {branch.postalCode}
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium">
                                                    Phone: <span className="text-butterscotch">{branch.phone}</span> {branch.description ? `• ${branch.description}` : ''}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={`${window.location.protocol}//${window.location.hostname}:5173/${branch.id}/login`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 text-sm font-bold bg-blue-500/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <Monitor size={16} /> POS Link
                                                </a>
                                                <a 
                                                    href={`${window.location.protocol}//${window.location.hostname}:5173/${branch.id}/live-tables`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-butterscotch hover:text-[#e5aa00] text-sm font-bold bg-butterscotch/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    Live Dashboard
                                                </a>
                                                <button 
                                                    onClick={() => handleEditBranch(branch)}
                                                    className="text-butterscotch hover:text-white text-sm font-bold bg-butterscotch/10 px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteModal({
                                                        name: branch.name,
                                                        onConfirm: async () => {
                                                            await fetch(`http://localhost:5000/api/branches/${branch.id}`, { method: 'DELETE' });
                                                            fetchBranches();
                                                            showToast('success', 'Branch deleted');
                                                        }
                                                    })}
                                                    className="text-red-400 hover:text-red-300 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {branches.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-white/20 rounded-xl text-gray-500">
                                            No branches configured. Add one above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}



                        {activeTab === 'Tables' && (
                            <div className="max-w-4xl">
                                {!managingTablesForBranchId ? (
                                    <>
                                        <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Manage Tables by Branch</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {branches.map(branch => (
                                                <div key={branch.id} className="glass-card p-6 rounded-xl flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                            <Store size={18} className="text-butterscotch" />
                                                            {branch.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-400 mt-1">{branch.address}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            setManagingTablesForBranchId(branch.id);
                                                            fetchAreas(branch.id);
                                                        }}
                                                        className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-4 py-2 rounded-lg transition-colors shadow-lg"
                                                    >
                                                        Edit Tables
                                                    </button>
                                                </div>
                                            ))}
                                            {branches.length === 0 && (
                                                <div className="col-span-full text-center p-8 border border-dashed border-white/20 rounded-xl text-gray-500">
                                                    No branches configured. Add a branch first.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                                            <button 
                                                onClick={() => setManagingTablesForBranchId(null)}
                                                className="text-gray-400 hover:text-white transition-colors"
                                            >
                                                <ArrowLeft size={24} />
                                            </button>
                                            <h3 className="text-xl font-bold text-white">
                                                Areas for {branches.find(b => b.id === managingTablesForBranchId)?.name}
                                            </h3>
                                        </div>

                                        <form onSubmit={handleAddArea} className="glass-card p-6 rounded-xl mb-8">
                                            <h4 className="font-bold text-white mb-4">Add New Area</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Name *</label>
                                                    <input 
                                                        type="text" 
                                                        value={newArea.name}
                                                        onChange={(e) => setNewArea({...newArea, name: e.target.value})}
                                                        placeholder="e.g. Main Dining"
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Type</label>
                                                    <select 
                                                        value={newArea.type}
                                                        onChange={(e) => setNewArea({...newArea, type: e.target.value})}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                                    >
                                                        <option value="Indoor">Indoor</option>
                                                        <option value="Outdoor">Outdoor</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Area Map *</label>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => setNewArea({...newArea, mapImage: e.target.files[0]})}
                                                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-butterscotch file:text-charcoal hover:file:bg-butterscotch/90 cursor-pointer"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <button type="submit" className="bg-butterscotch text-charcoal font-bold px-6 py-2 rounded-lg transition-colors">
                                                    Save Area
                                                </button>
                                            </div>
                                        </form>

                                        <div className="space-y-4">
                                            <h4 className="font-bold text-gray-300 text-sm uppercase tracking-wider">Configured Areas</h4>
                                            {areas.map(area => (
                                                <div key={area.id} className="p-4 glass-card rounded-xl border border-white/5 flex gap-4 items-center">
                                                    {area.map_image_url ? (
                                                        <img src={`http://localhost:5000${area.map_image_url}`} alt={area.name} className="w-20 h-20 object-cover rounded-lg bg-black/30" />
                                                    ) : (
                                                        <div className="w-20 h-20 flex flex-col items-center justify-center bg-black/20 rounded-lg border border-dashed border-white/10 text-gray-500">
                                                            <ImageIcon size={24} />
                                                            <span className="text-[10px] mt-1">No Map</span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h5 className="font-bold text-white text-lg">{area.name}</h5>
                                                                <span className="text-xs bg-white/10 px-2 py-1 rounded-md text-gray-300 mt-1 inline-block">{area.type}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <button 
                                                                    onClick={() => setMappingArea(area)}
                                                                    className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                                                                >
                                                                    Map Tables
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteArea(area.id)}
                                                                    className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {areas.length === 0 && (
                                                <div className="text-center p-8 border border-dashed border-white/20 rounded-xl text-gray-500">
                                                    No areas configured for this branch.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'POS Devices' && (
                            <div className="max-w-4xl">
                                <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Manage POS Devices</h3>
                                
                                <form onSubmit={handleAddPosDevice} className="glass-card p-6 rounded-xl mb-8 flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Device Name *</label>
                                        <input 
                                            type="text" 
                                            value={newPosDevice.name}
                                            onChange={(e) => setNewPosDevice({...newPosDevice, name: e.target.value})}
                                            placeholder="e.g. Front Register 1"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600"
                                            required
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Branch Assignment *</label>
                                        <select 
                                            value={newPosDevice.branchId}
                                            onChange={(e) => setNewPosDevice({...newPosDevice, branchId: e.target.value})}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch"
                                            required
                                        >
                                            <option value="" className="text-gray-900">Select Branch</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-6 py-3 rounded-lg transition-colors shadow-lg shrink-0 h-[46px]"
                                    >
                                        Add Device
                                    </button>
                                </form>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-300 text-sm uppercase tracking-wider">Active POS Devices</h4>
                                    {posDevices.map(device => (
                                        <div key={device.id} className="p-4 glass-card rounded-xl border border-white/5 flex gap-4 items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center text-gray-400">
                                                    <Monitor size={24} />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-white text-lg">{device.name}</h5>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Store size={14} className="text-butterscotch" />
                                                        <span className="text-sm text-gray-400">{branches.find(b => b.id === device.branch_id)?.name || 'Unknown Branch'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeletePosDevice(device.id)}
                                                className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-lg transition-colors"
                                                title="Remove device"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {posDevices.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-white/20 rounded-xl text-gray-500">
                                            No POS devices configured. Add one above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Printers' && (
                            <div className="max-w-4xl">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <Printer className="text-butterscotch" size={24} />
                                            IP Network Thermal Printers
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Configure dedicated IP addresses for your <strong>Kitchen Printer</strong> and <strong>Counter Printer</strong>. Settings persist locally and stay connected automatically.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={fetchPrinters}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold"
                                        title="Refresh Status"
                                    >
                                        <RefreshCw size={14} /> Refresh
                                    </button>
                                </div>

                                {/* Add New Printer Form */}
                                <form onSubmit={handleAddPrinter} className="glass-card p-6 rounded-xl mb-8 space-y-4">
                                    <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-2">Add / Configure IP Printer</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Printer Name *</label>
                                            <input 
                                                type="text" 
                                                value={newPrinter.name}
                                                onChange={(e) => setNewPrinter({...newPrinter, name: e.target.value})}
                                                placeholder="e.g. Kitchen Line 1 or Front Counter"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 text-sm"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Printer Role / Type *</label>
                                            <select 
                                                value={newPrinter.type}
                                                onChange={(e) => setNewPrinter({...newPrinter, type: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch text-sm"
                                            >
                                                <option value="counter" className="text-gray-900">Counter Printer (Receipts & Invoices)</option>
                                                <option value="kitchen" className="text-gray-900">Kitchen Printer (Order Tickets & KOT)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Paper Width</label>
                                            <select 
                                                value={newPrinter.paper_width}
                                                onChange={(e) => setNewPrinter({...newPrinter, paper_width: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch text-sm"
                                            >
                                                <option value="58mm" className="text-gray-900">58mm (Compact thermal - Recommended)</option>
                                                <option value="80mm" className="text-gray-900">80mm (Standard wide thermal)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Printer Static IP Address *</label>
                                            <input 
                                                type="text" 
                                                value={newPrinter.ip_address}
                                                onChange={(e) => setNewPrinter({...newPrinter, ip_address: e.target.value})}
                                                placeholder="e.g. 192.168.1.200"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch placeholder-gray-600 font-mono text-sm"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Port (Standard RAW: 9100)</label>
                                            <input 
                                                type="number" 
                                                value={newPrinter.port}
                                                onChange={(e) => setNewPrinter({...newPrinter, port: parseInt(e.target.value, 10) || 9100})}
                                                placeholder="9100"
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch font-mono text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Branch Assignment</label>
                                            <select 
                                                value={newPrinter.branch_id}
                                                onChange={(e) => setNewPrinter({...newPrinter, branch_id: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-butterscotch text-sm"
                                            >
                                                <option value="" className="text-gray-900">All Branches (Global)</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
                                            <input 
                                                type="checkbox"
                                                checked={newPrinter.auto_print}
                                                onChange={(e) => setNewPrinter({...newPrinter, auto_print: e.target.checked})}
                                                className="accent-butterscotch w-4 h-4 rounded cursor-pointer"
                                            />
                                            <span>Automatically print on new order completion</span>
                                        </label>

                                        <button 
                                            type="submit" 
                                            className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal font-bold px-8 py-3 rounded-xl transition-colors shadow-lg shadow-butterscotch/20 text-sm"
                                        >
                                            Save Printer
                                        </button>
                                    </div>
                                </form>

                                {/* Active Printers List */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-300 text-sm uppercase tracking-wider">Connected Printers</h4>
                                    {printersList.map(printer => {
                                        const result = testResults[printer.id];
                                        const isTesting = testingPrinterId === printer.id;
                                        return (
                                            <div key={printer.id} className="p-5 glass-card rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${printer.type === 'kitchen' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-butterscotch/10 text-butterscotch border border-butterscotch/20'}`}>
                                                        <Printer size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h5 className="font-bold text-white text-lg">{printer.name}</h5>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${printer.type === 'kitchen' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-butterscotch/20 text-butterscotch border border-butterscotch/30'}`}>
                                                                {printer.type === 'kitchen' ? 'Kitchen (KOT)' : 'Counter (Receipt)'}
                                                            </span>
                                                            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                                {printer.paper_width}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 font-mono">
                                                            <span className="flex items-center gap-1.5 text-gray-300">
                                                                <Wifi size={13} className="text-butterscotch" />
                                                                {printer.ip_address}:{printer.port}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{branches.find(b => b.id === printer.branch_id)?.name || 'All Branches'}</span>
                                                            <span>•</span>
                                                            <span className={printer.auto_print ? "text-emerald-400" : "text-gray-500"}>
                                                                {printer.auto_print ? 'Auto-print Enabled' : 'Manual print only'}
                                                            </span>
                                                        </div>
                                                        {result && (
                                                            <div className={`mt-2 text-xs flex items-center gap-1.5 ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {result.success ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                                                                <span>{result.message}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button 
                                                        disabled={isTesting}
                                                        onClick={() => handleTestPrinterConnection(printer)}
                                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                                    >
                                                        {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                                                        Ping IP
                                                    </button>
                                                    <button 
                                                        disabled={isTesting}
                                                        onClick={() => handleTestPrint(printer)}
                                                        className="px-3.5 py-2 bg-butterscotch/10 hover:bg-butterscotch/20 text-butterscotch rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                                    >
                                                        {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                                                        Test Print
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeletePrinter(printer.id)}
                                                        className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete printer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {printersList.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-white/20 rounded-xl text-gray-500">
                                            No thermal IP printers configured yet. Add your Counter and Kitchen printers above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab !== 'Features' && activeTab !== 'Dining Options' && activeTab !== 'Payment Types' && activeTab !== 'Taxes' && activeTab !== 'Receipt' && activeTab !== 'Printers' && activeTab !== 'Branches' && activeTab !== 'Tables' && activeTab !== 'POS Devices' && (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                                <div className="w-16 h-16 rounded-full bg-charcoal-dark/50 flex items-center justify-center mb-4 border border-charcoal-light">
                                    <Settings size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{activeTab}</h3>
                                <p className="max-w-xs">This module is under construction and will be available soon.</p>
                            </div>
                        )}

                    </div>
                </div>

                {/* Delete Modal */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                        <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-4 text-red-400">
                                <div className="p-3 bg-red-500/20 rounded-full">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Delete Item</h3>
                            </div>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete <span className="text-white font-semibold">{deleteModal.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeleteModal(null)} className="px-5 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">Delete</button>
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

            {mappingArea && (
                <TableMapper 
                    area={mappingArea} 
                    onClose={() => setMappingArea(null)} 
                    showToast={showToast} 
                />
            )}
        </AdminLayout>
    );
}
