import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [cashier, setCashier] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for saved session
        const savedCashier = localStorage.getItem('pos_cashier');
        if (savedCashier) {
            try {
                setCashier(JSON.parse(savedCashier));
            } catch (e) {
                console.error('Failed to parse saved cashier session');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (user) => {
        setCashier(user);
        localStorage.setItem('pos_cashier', JSON.stringify(user));
    };

    const logout = () => {
        setCashier(null);
        localStorage.removeItem('pos_cashier');
    };

    return (
        <AuthContext.Provider value={{ cashier, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
