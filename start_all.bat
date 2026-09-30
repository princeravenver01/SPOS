@echo off
echo =========================================
echo             STARTING SPOS PILOT
echo =========================================

echo Starting API Backend (Port 5000)...
start "SPOS API" cmd /k "cd /d %~dp0backend && npm start"

echo Starting Admin Frontend (Port 5174)...
start "SPOS Admin" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Starting POS Frontend (Port 5173)...
start "SPOS POS" cmd /k "cd /d %~dp0pos_frontend && npm run dev"

echo.
echo Systems are launching in separate windows!
echo - Admin Dashboard: http://localhost:5174/admin
echo - POS Terminal:    http://localhost:5173
echo - API:             http://localhost:5000
echo.
echo For tablets, replace localhost with this PC's IPv4 address.
echo.
pause
