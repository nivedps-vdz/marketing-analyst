# Starts backend (127.0.0.1:8000) and frontend (localhost:3000) as hidden background processes, logging to logs\.
# Stops any python/node process already listening on those ports first.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1 [-Prod]
#   -Prod  serve the production build (run `npm.cmd run build` in frontend\ first) instead of the dev server.
# Stop them again with scripts\stop-all.ps1.
param([switch]$Prod)
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null

& (Join-Path $PSScriptRoot 'stop-all.ps1')

# Launch through cmd.exe without -Redirect* so the servers do not inherit this console's handles
# (otherwise the calling terminal waits until the servers exit).
$py = "$root\backend\.venv\Scripts\python.exe"
# "/s /c "...": cmd removes only the outermost quotes, so quoted paths inside survive.
Start-Process -FilePath cmd.exe -WindowStyle Hidden -WorkingDirectory "$root\backend" -ArgumentList (
    "/s /c `"`"$py`" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > `"$logs\backend.log`" 2>&1`""
)
$npmScript = if ($Prod) { 'start' } else { 'dev' }
Start-Process -FilePath cmd.exe -WindowStyle Hidden -WorkingDirectory "$root\frontend" -ArgumentList (
    "/s /c `"npm.cmd run $npmScript > `"$logs\frontend.log`" 2>&1`""
)

foreach ($url in 'http://127.0.0.1:8000/api/health', 'http://127.0.0.1:3000/api/health') {
    $up = $false
    for ($i = 0; $i -lt 90 -and -not $up; $i++) {
        try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3 | Out-Null; $up = $true } catch { Start-Sleep -Seconds 1 }
    }
    Write-Output ("{0} {1}" -f $(if ($up) { 'UP  ' } else { 'DOWN' }), $url)
}
Write-Output 'Open http://localhost:3000/dashboard  (logs in logs\backend.log and logs\frontend.log)'
