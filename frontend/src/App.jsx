import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PosProvider, PosContext } from './context/PosContext';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminSettings from './components/AdminSettings';
import AdminAccountSettings from './components/AdminAccountSettings';
import AdminCustomers from './components/AdminCustomers';
import AdminEmployees from './components/AdminEmployees';
import AdminAccessRoles from './components/AdminAccessRoles';
import AdminCategories from './components/AdminCategories';
import AdminProducts from './components/AdminProducts';
import AdminModifiers from './components/AdminModifiers';
import AdminDiscounts from './components/AdminDiscounts';
import AdminSuppliers from './components/AdminSuppliers';
import AdminPurchaseOrders from './components/AdminPurchaseOrders';
import AdminTransferOrders from './components/AdminTransferOrders';
import AdminStockAdjustments from './components/AdminStockAdjustments';
import AdminInventoryCounts from './components/AdminInventoryCounts';
import AdminProductions from './components/AdminProductions';
import AdminInventoryHistory from './components/AdminInventoryHistory';
import AdminInventoryValuation from './components/AdminInventoryValuation';
import AdminSalesSummary from './components/reports/AdminSalesSummary';
import AdminSalesByItem from './components/reports/AdminSalesByItem';
import AdminSalesByCategory from './components/reports/AdminSalesByCategory';
import AdminSalesByEmployee from './components/reports/AdminSalesByEmployee';
import AdminSalesByPaymentType from './components/reports/AdminSalesByPaymentType';
import AdminReceipts from './components/reports/AdminReceipts';
import AdminSalesByModifier from './components/reports/AdminSalesByModifier';
import AdminSalesByDiscount from './components/reports/AdminSalesByDiscount';
import AdminTaxes from './components/reports/AdminTaxes';
import AdminShifts from './components/reports/AdminShifts';
import PosGrid from './components/PosGrid';
import Login from './components/Login';

function App() {
  return (
    <PosProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/pos" element={<PosGrid />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/account" element={<AdminAccountSettings />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/employees" element={<AdminEmployees />} />
          <Route path="/admin/access-roles" element={<AdminAccessRoles />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/modifiers" element={<AdminModifiers />} />
          <Route path="/admin/discounts" element={<AdminDiscounts />} />
          <Route path="/admin/suppliers" element={<AdminSuppliers />} />
          <Route path="/admin/purchase-orders" element={<AdminPurchaseOrders />} />
          <Route path="/admin/transfer-orders" element={<AdminTransferOrders />} />
          <Route path="/admin/stock-adjustments" element={<AdminStockAdjustments />} />
          <Route path="/admin/inventory-counts" element={<AdminInventoryCounts />} />
          <Route path="/admin/productions" element={<AdminProductions />} />
          <Route path="/admin/inventory-history" element={<AdminInventoryHistory />} />
          <Route path="/admin/inventory-valuation" element={<AdminInventoryValuation />} />
          <Route path="/admin/reports/sales-summary" element={<AdminSalesSummary />} />
          <Route path="/admin/reports/sales-by-item" element={<AdminSalesByItem />} />
          <Route path="/admin/reports/sales-by-category" element={<AdminSalesByCategory />} />
          <Route path="/admin/reports/sales-by-employee" element={<AdminSalesByEmployee />} />
          <Route path="/admin/reports/sales-by-payment-type" element={<AdminSalesByPaymentType />} />
          <Route path="/admin/reports/receipts" element={<AdminReceipts />} />
          <Route path="/admin/reports/sales-by-modifier" element={<AdminSalesByModifier />} />
          <Route path="/admin/reports/discounts" element={<AdminSalesByDiscount />} />
          <Route path="/admin/reports/taxes" element={<AdminTaxes />} />
          <Route path="/admin/reports/shifts" element={<AdminShifts />} />
        </Routes>
      </BrowserRouter>
    </PosProvider>
  );
}

export default App;
