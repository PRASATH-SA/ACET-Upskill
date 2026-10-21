# Stop running DDoS Defense servers on Port 8000 and Port 5173
Write-Host "===============================================================================" -ForegroundColor Yellow
Write-Host "               STOPPING DDOS DEFENSE PLATFORM SERVICES" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Yellow
Write-Host ""

$ports = @(8000, 5173, 8545)
foreach ($port in $ports) {
    try {
        $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($pids) {
            foreach ($p in $pids) {
                Write-Host "[*] Terminating process on Port $port (PID: $p)..." -ForegroundColor Cyan
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # ignore
    }
}

Write-Host ""
Write-Host "[OK] All DDoS defense services on ports 8000, 5173, and 8545 stopped." -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Yellow
Start-Sleep -Seconds 2
