@echo off
setlocal EnableDelayedExpansion

title Hybrid ML-QML DDoS Defense - System Launcher
color 0B

echo ===============================================================================
echo       HYBRID ML-QML DDOS DEFENSE AND EVIDENCE PRESERVATION PLATFORM
echo ===============================================================================
echo.

set "SCRIPT_DIR=%~dp0"

:: ---------------------------------------------------------
:: 1. Detect Python Executable
:: ---------------------------------------------------------
echo [*] Detecting Python environment...
where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=py"
) else (
    where python >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=python"
    ) else (
        if exist "C:\Python313\python.exe" (
            set "PY_CMD=C:\Python313\python.exe"
        ) else (
            echo [ERROR] Python not found in PATH or standard installation.
            pause
            exit /b 1
        )
    )
)
echo [OK] Using Python: %PY_CMD%

:: ---------------------------------------------------------
:: 2. Detect Node.js and NPM
:: ---------------------------------------------------------
echo [*] Detecting Node.js and NPM...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found in PATH. Please install Node.js v18+.
    pause
    exit /b 1
)
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] NPM not found in PATH.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Using Node.js: %NODE_VER%
echo.

:: ---------------------------------------------------------
:: 3. Verify ML Models Exist (Train if missing)
:: ---------------------------------------------------------
if not exist "%SCRIPT_DIR%backend\app\ml\saved_models\xgboost_v1.joblib" (
    echo [*] Baseline ML models not found. Training XGBoost and Random Forest...
    cd /d "%SCRIPT_DIR%backend"
    call %PY_CMD% -m app.ml.train
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] ML model training failed.
        pause
        exit /b 1
    )
)

:: ---------------------------------------------------------
:: 4. Launch FastAPI Backend (Port 8000)
:: ---------------------------------------------------------
echo [*] Launching FastAPI Backend server on http://127.0.0.1:8000...
cd /d "%SCRIPT_DIR%backend"
start "DDoS Defense Backend [Port 8000]" cmd /k "%PY_CMD% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait for Backend to respond
echo [*] Waiting for Backend API readiness...
set /a ATTEMPTS=0
:WAIT_BACKEND
timeout /t 2 /nobreak >nul
set /a ATTEMPTS+=1
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if !ATTEMPTS! lss 15 (
        goto WAIT_BACKEND
    ) else (
        echo [WARN] Backend took longer than expected to start. Continuing...
    )
) else (
    echo [OK] Backend API is ONLINE and HEALTHY.
)

:: ---------------------------------------------------------
:: 5. Launch Frontend Dashboard (Port 5173)
:: ---------------------------------------------------------
echo [*] Launching Frontend Cyber Dashboard on http://localhost:5173...
cd /d "%SCRIPT_DIR%frontend"
start "DDoS Defense Frontend [Port 5173]" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

:: ---------------------------------------------------------
:: 6. Open Browser
:: ---------------------------------------------------------
echo [*] Opening Dashboard in browser...
start http://localhost:5173

:: ---------------------------------------------------------
:: 7. Information & Access Summary
:: ---------------------------------------------------------
color 0A
echo.
echo ===============================================================================
echo                      ALL SYSTEMS OPERATIONAL AND RUNNING
echo ===============================================================================
echo.
echo  [+] Web Dashboard URL:    http://localhost:5173
echo  [+] FastAPI Swagger Docs: http://127.0.0.1:8000/docs
echo  [+] API Health Check:     http://127.0.0.1:8000/health
echo  [+] WebSocket Feed:       ws://127.0.0.1:8000/api/ws/telemetry
echo.
echo  -----------------------------------------------------------------------------
echo  DEFAULT SOC CREDENTIALS:
echo  -----------------------------------------------------------------------------
echo    Role: Security Analyst  --^>  Username: analyst  ^|  Password: analyst123
echo    Role: Administrator     --^>  Username: admin    ^|  Password: admin123
echo  -----------------------------------------------------------------------------
echo.
echo  To run the complete automated test suite anytime, execute: test_all.bat
echo  To stop all running servers, execute:                     stop_all.bat
echo.
echo ===============================================================================
echo Press [T] to run tests now, [S] to stop all services, or [Q] to quit this window.
echo ===============================================================================

:MENU_LOOP
choice /C TSQ /N /M "> Select action [T / S / Q]: "
if %ERRORLEVEL% equ 1 (
    echo.
    echo [*] Running full test suite...
    call "%SCRIPT_DIR%test_all.bat"
    echo.
    goto MENU_LOOP
)
if %ERRORLEVEL% equ 2 (
    echo.
    echo [*] Stopping all services...
    call "%SCRIPT_DIR%stop_all.bat"
    exit /b 0
)
if %ERRORLEVEL% equ 3 (
    echo [*] Leaving servers running in background. Goodbye!
    exit /b 0
)
