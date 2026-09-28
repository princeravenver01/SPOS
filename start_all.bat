@echo off
echo =========================================
echo    STARTING SPOS SYSTEM (CUSTOM PORTS)
echo =========================================

echo Starting Admin Backend (Port 5000)...
start "Admin Backend" cmd /k "cd backend && node server.js"

echo Starting Admin Frontend (Port 5174)...
start "Admin Frontend" cmd /k "cd frontend && npm run dev"

echo Starting POS Backend (Port 5001)...
start "POS Backend" cmd /k "cd pos_backend && node server.js"

echo Starting POS Frontend (Port 5173)...
start "POS Frontend" cmd /k "cd pos_frontend && npm run dev"

echo.
echo Systems are launching in separate windows!
echo - Admin Dashboard (frontend): http://localhost:5174
echo - POS Terminal (pos_frontend): http://localhost:5173
echo.
pause
