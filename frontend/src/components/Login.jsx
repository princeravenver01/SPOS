import React, { useState, useContext } from 'react';
import { PosContext } from '../context/PosContext';

export default function Login() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const { setUser } = useContext(PosContext);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            const data = await res.json();
            
            if (data.success) {
                setUser(data.user);
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError("Network Error");
        }
    };

    const handleNumberClick = (num) => {
        setPin(prev => prev + num);
    };

    const handleClear = () => {
        setPin('');
    };

    return (
        <div className="flex h-screen bg-charcoal text-white items-center justify-center p-4">
            <div className="bg-white/5 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-sm backdrop-blur-md border border-white/10">
                <h1 className="text-2xl sm:text-3xl font-bold text-center mb-5 text-butterscotch">Silingan POS</h1>
                <div className="mb-5">
                    <input 
                        type="password" 
                        value={pin}
                        readOnly
                        className="w-full text-center text-3xl sm:text-4xl p-2.5 sm:p-3 bg-white/10 rounded-xl outline-none tracking-widest text-butterscotch font-mono border border-white/10"
                        placeholder="----"
                    />
                </div>
                {error && <p className="text-red-400 text-xs sm:text-sm text-center mb-4">{error}</p>}
                
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button 
                            key={num} 
                            onClick={() => handleNumberClick(num.toString())}
                            className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-md transition-all active:scale-95 font-semibold"
                        >
                            {num}
                        </button>
                    ))}
                    <button 
                        onClick={handleClear}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-2xl h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 flex items-center justify-center text-base sm:text-lg mx-auto font-bold transition-all active:scale-95"
                    >
                        CLR
                    </button>
                    <button 
                        onClick={() => handleNumberClick('0')}
                        className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 flex items-center justify-center text-2xl sm:text-3xl mx-auto transition-all active:scale-95 font-semibold"
                    >
                        0
                    </button>
                    <button 
                        onClick={handleLogin}
                        className="bg-butterscotch hover:bg-butterscotch/90 text-charcoal rounded-2xl h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 flex items-center justify-center text-base sm:text-lg mx-auto font-black shadow-lg shadow-butterscotch/20 transition-all active:scale-95"
                    >
                        GO
                    </button>
                </div>
            </div>
        </div>
    );
}
