@echo off
echo =========================================
echo    STARTING SPOS TERMINAL SYSTEM
echo =========================================

echo Starting POS Backend (Port 5001)...
start "POS Backend" cmd /k "cd pos_backend && node server.js"

echo Starting POS Frontend (Port 5174)...
start "POS Frontend" cmd /k "cd pos_frontend && npm run dev"

echo.
echo POS System is launching! 
echo Once Vite finishes loading, open your browser to the local network URL shown in the Vite console (usually http://localhost:5174)
echo.
pause
