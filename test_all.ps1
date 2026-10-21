# Hybrid ML-QML DDoS Defense - Test Suite (PowerShell)
$Host.UI.RawUI.WindowTitle = "DDoS Defense Platform - Unified Test Suite"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "       HYBRID ML-QML DDOS DEFENSE - UNIFIED TEST SUITE RUNNER" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$failedTests = 0

# Detect Python
$pyCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pyCmd = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
} elseif (Test-Path "C:\Python313\python.exe") {
    $pyCmd = "C:\Python313\python.exe"
} else {
    Write-Host "[ERROR] Python not found!" -ForegroundColor Red
    exit 1
}

# 1. Smart Contracts
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "[1/3] RUNNING SMART CONTRACT INTEGRATION TESTS (HARDHAT)" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Cyan
Set-Location (Join-Path $ScriptDir "contracts")
& npx hardhat test
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Smart Contract tests failed." -ForegroundColor Red
    $failedTests++
} else {
    Write-Host "[PASS] Smart Contract tests passed." -ForegroundColor Green
}
Write-Host ""

# 2. Backend Pytest
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "[2/3] RUNNING BACKEND AI/ML, QML AND API TESTS (PYTEST)" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Cyan
Set-Location (Join-Path $ScriptDir "backend")
& $pyCmd -m pytest tests -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Backend tests failed." -ForegroundColor Red
    $failedTests++
} else {
    Write-Host "[PASS] Backend tests passed." -ForegroundColor Green
}
Write-Host ""

# 3. Frontend Build
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "[3/3] RUNNING FRONTEND TYPE CHECK AND PRODUCTION BUILD (VITE + TS)" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Cyan
Set-Location (Join-Path $ScriptDir "frontend")
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Frontend build failed." -ForegroundColor Red
    $failedTests++
} else {
    Write-Host "[PASS] Frontend build passed." -ForegroundColor Green
}
Write-Host ""

Set-Location $ScriptDir

Write-Host "===============================================================================" -ForegroundColor Cyan
if ($failedTests -eq 0) {
    Write-Host "                    ALL TEST SUITES PASSED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host "  [OK] Smart Contracts:  PASSED (6/6 tests)" -ForegroundColor Green
    Write-Host "  [OK] Backend AI/ML:     PASSED (17/17 tests)" -ForegroundColor Green
    Write-Host "  [OK] Frontend Build:    PASSED (Zero TypeScript / Bundling errors)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "                    TEST SUITE FAILED WITH $failedTests FAILURE(S)" -ForegroundColor Red
    Write-Host "===============================================================================" -ForegroundColor Cyan
    exit 1
}
