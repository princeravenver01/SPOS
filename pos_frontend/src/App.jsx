import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PosTerminal from './components/PosTerminal';
import CashierLogin from './components/CashierLogin';
import { AuthProvider, useAuth } from './context/AuthContext';

import LiveTablesView from './components/LiveTablesView';

function RequireAuth({ children }) {
    const { cashier, isLoading } = useAuth();
    
    if (isLoading) {
        return <div className="flex h-screen glass-bg items-center justify-center text-white">Loading...</div>;
    }
    
    if (!cashier) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
}

function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<CashierLogin />} />
            <Route path="/:branchId/login" element={<CashierLogin />} />
            <Route path="/" element={<RequireAuth><PosTerminal /></RequireAuth>} />
            <Route path="/:branchId/live-tables" element={<RequireAuth><LiveTablesView /></RequireAuth>} />
          </Routes>
        </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
