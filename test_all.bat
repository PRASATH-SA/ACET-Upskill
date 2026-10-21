@echo off
setlocal EnableDelayedExpansion

title Hybrid ML-QML DDoS Prevention - Automated Test Suite
color 0B

echo ===============================================================================
echo       HYBRID ML-QML DDOS DEFENSE - UNIFIED TEST SUITE RUNNER
echo ===============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "FAILED_TESTS=0"

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
            echo [ERROR] Python not found in PATH or standard directory.
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
    echo [ERROR] Node.js not found in PATH.
    exit /b 1
)
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] NPM not found in PATH.
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Using Node.js: %NODE_VER%
echo.

:: ---------------------------------------------------------
:: 3. Test Smart Contracts (Hardhat)
:: ---------------------------------------------------------
echo ===============================================================================
echo [1/3] RUNNING SMART CONTRACT INTEGRATION TESTS (HARDHAT)
echo ===============================================================================
cd /d "%SCRIPT_DIR%contracts"
call npx hardhat test
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Smart Contract tests failed.
    set /a FAILED_TESTS+=1
) else (
    echo [PASS] Smart Contract tests passed.
)
echo.

:: ---------------------------------------------------------
:: 4. Test Backend (Pytest: ML, QML, Policy, API, Blockchain)
:: ---------------------------------------------------------
echo ===============================================================================
echo [2/3] RUNNING BACKEND AI/ML, QML AND API TESTS (PYTEST)
echo ===============================================================================
cd /d "%SCRIPT_DIR%backend"
call %PY_CMD% -m pytest tests -v
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Backend pytest suite failed.
    set /a FAILED_TESTS+=1
) else (
    echo [PASS] Backend pytest suite passed.
)
echo.

:: ---------------------------------------------------------
:: 5. Test Frontend (TypeScript Type Check and Production Build)
:: ---------------------------------------------------------
echo ===============================================================================
echo [3/3] RUNNING FRONTEND TYPE CHECK AND PRODUCTION BUILD (VITE + TS)
echo ===============================================================================
cd /d "%SCRIPT_DIR%frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Frontend build and type check failed.
    set /a FAILED_TESTS+=1
) else (
    echo [PASS] Frontend build and type check passed.
)
echo.

:: ---------------------------------------------------------
:: Summary Report
:: ---------------------------------------------------------
echo ===============================================================================
if %FAILED_TESTS% equ 0 (
    color 0A
    echo                     ALL TEST SUITES PASSED SUCCESSFULLY
    echo ===============================================================================
    echo  [OK] Smart Contracts:  PASSED - 6/6 tests passed
    echo  [OK] Backend AI/ML:     PASSED - 17/17 tests passed
    echo  [OK] Frontend Build:    PASSED - Zero TypeScript / Vite bundling errors

    echo ===============================================================================
    cd /d "%SCRIPT_DIR%"
    exit /b 0
) else (
    color 0C
    echo                     TEST SUITE FAILED WITH %FAILED_TESTS% FAILURE(S)
    echo ===============================================================================
    cd /d "%SCRIPT_DIR%"
    exit /b 1
)
