# Hybrid ML-QML DDoS Defense - System Launcher (PowerShell)
$Host.UI.RawUI.WindowTitle = "Hybrid ML-QML DDoS Defense - System Launcher"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "      HYBRID ML-QML DDOS DEFENSE AND EVIDENCE PRESERVATION PLATFORM" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Detect Python
Write-Host "[*] Detecting Python environment..." -ForegroundColor Yellow
$pyCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $pyCmd = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
} elseif (Test-Path "C:\Python313\python.exe") {
    $pyCmd = "C:\Python313\python.exe"
} else {
    Write-Host "[ERROR] Python not found in PATH or standard directory!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "[OK] Using Python: $pyCmd" -ForegroundColor Green

# 2. Detect Node.js
Write-Host "[*] Detecting Node.js & NPM..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found in PATH! Please install Node.js v18+." -ForegroundColor Red
    pause
    exit 1
}
$nodeVer = & node -v
Write-Host "[OK] Using Node.js: $nodeVer" -ForegroundColor Green
Write-Host ""

# 3. Check ML Models
$modelPath = Join-Path $ScriptDir "backend\app\ml\saved_models\xgboost_v1.joblib"
if (-not (Test-Path $modelPath)) {
    Write-Host "[*] Baseline models not found. Training XGBoost & Random Forest..." -ForegroundColor Yellow
    Set-Location (Join-Path $ScriptDir "backend")
    & $pyCmd -m app.ml.train
}

# 4. Launch Backend on Port 8000
Write-Host "[*] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
$backendDir = Join-Path $ScriptDir "backend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$backendDir`" && $pyCmd -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# 5. Wait for Backend Health
Write-Host "[*] Waiting for Backend readiness..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # continue waiting
    }
}

if ($backendReady) {
    Write-Host "[OK] Backend API is ONLINE and HEALTHY." -ForegroundColor Green
} else {
    Write-Host "[WARN] Backend taking longer than expected. Continuing..." -ForegroundColor Yellow
}

# 6. Launch Frontend on Port 5173
Write-Host "[*] Starting Frontend Vite dev server on http://localhost:5173..." -ForegroundColor Cyan
$frontendDir = Join-Path $ScriptDir "frontend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$frontendDir`" && npm run dev"

Start-Sleep -Seconds 3

# 7. Open Browser
Write-Host "[*] Opening Dashboard in default web browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

# 8. Access Summary
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "                      ALL SYSTEMS OPERATIONAL AND RUNNING" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "  [+] Web Dashboard URL:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "  [+] FastAPI Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  [+] API Health Check:     http://127.0.0.1:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  DEFAULT SOC CREDENTIALS:" -ForegroundColor Yellow
Write-Host "    Role: Security Analyst  --> Username: analyst  | Password: analyst123"
Write-Host "    Role: Administrator     --> Username: admin    | Password: admin123"
Write-Host "===============================================================================" -ForegroundColor Green
