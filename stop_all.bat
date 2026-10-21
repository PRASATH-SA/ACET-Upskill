@echo off
setlocal EnableDelayedExpansion

title Stopping DDoS Prevention Services
color 0E

echo ===============================================================================
echo                STOPPING DDOS DEFENSE PLATFORM SERVICES
echo ===============================================================================
echo.

echo [*] Terminating processes on Port 8000 (Backend Uvicorn)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo [+] Killing process PID %%a
    taskkill /F /PID %%a >nul 2>nul
)

echo [*] Terminating processes on Port 5173 (Frontend Vite)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [+] Killing process PID %%a
    taskkill /F /PID %%a >nul 2>nul
)

echo [*] Terminating any orphan hardhat node on Port 8545...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8545" ^| findstr "LISTENING"') do (
    echo [+] Killing process PID %%a
    taskkill /F /PID %%a >nul 2>nul
)

color 0A
echo.
echo ===============================================================================
echo [OK] All DDoS defense services have been stopped successfully.
echo ===============================================================================
timeout /t 3 >nul
