const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const shiftsRoutes = require('./routes/shifts');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu'); // Legacy, can remove later
const settingsRoutes = require('./routes/settings');
const customersRoutes = require('./routes/customers');
const employeesRoutes = require('./routes/employees');
const categoriesRoutes = require('./routes/categories');
const modifiersRoutes = require('./routes/modifiers');
const discountsRoutes = require('./routes/discounts');
const productsRoutes = require('./routes/products');
const areasRoutes = require('./routes/areas');
const branchesRoutes = require('./routes/branches');
const receiptsRoutes = require('./routes/receipts');
const tablesRoutes = require('./routes/tables');
const taxesRoutes = require('./routes/taxes');
const paymentsRoutes = require('./routes/payments');
const diningOptionsRoutes = require('./routes/dining_options');
const posDevicesRoutes = require('./routes/pos_devices');
const accessRolesRoutes = require('./routes/access_roles');
const suppliersRoutes = require('./routes/suppliers');
const purchaseOrdersRoutes = require('./routes/purchase_orders');
const transferOrdersRoutes = require('./routes/transfer_orders');
const stockAdjustmentsRoutes = require('./routes/stock_adjustments');
const inventoryCountsRoutes = require('./routes/inventory_counts');
const productionsRoutes = require('./routes/productions');
const inventoryHistoryRoutes = require('./routes/inventory_history');
const inventoryValuationRoutes = require('./routes/inventory_valuation');
const reportsRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const posPagesRoutes = require('./routes/pos_pages');
const reservationsRoutes = require('./routes/reservations');
const path = require('path');

const app = express();

const allowedOrigins = [
  'http://localhost:5173', // POS frontend port
  'http://localhost:5174', // Admin frontend port
  'http://192.168.1.50:5000',
  'https://dashboard.silingangastro.com'
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin || allowedOrigins.includes(origin)){
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes); // Legacy

app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/modifiers', modifiersRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/taxes', taxesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dining-options', diningOptionsRoutes);
app.use('/api/pos-devices', posDevicesRoutes);
app.use('/api/access-roles', accessRolesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/transfer-orders', transferOrdersRoutes);
app.use('/api/stock-adjustments', stockAdjustmentsRoutes);
app.use('/api/inventory-counts', inventoryCountsRoutes);
app.use('/api/productions', productionsRoutes);
app.use('/api/inventory-history', inventoryHistoryRoutes);
app.use('/api/inventory-valuation', inventoryValuationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pos_pages', posPagesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/printers', require('./routes/printers'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
