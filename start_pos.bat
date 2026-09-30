@echo off
echo =========================================
echo    STARTING SPOS TERMINAL SYSTEM
echo =========================================

echo Starting API Backend (Port 5000)...
start "SPOS API" cmd /k "cd /d %~dp0backend && npm start"

echo Starting POS Frontend (Port 5173)...
start "SPOS POS" cmd /k "cd /d %~dp0pos_frontend && npm run dev"

echo.
echo POS System is launching! 
echo Once Vite finishes loading, open http://localhost:5173
echo For tablets, replace localhost with this PC's IPv4 address.
echo.
pause
