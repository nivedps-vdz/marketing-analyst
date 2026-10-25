# Stops the python (uvicorn) and node (Next.js) processes listening on ports 8000 and 3000. Nothing else.
foreach ($port in 8000, 3000) {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -in 'python', 'node') {
            Write-Output "Stopping $($p.ProcessName) (PID $procId) on port $port"
            Stop-Process -Id $procId -Force
        } elseif ($p) {
            Write-Output "Port $port is used by $($p.ProcessName) (PID $procId); not stopping it."
        }
    }
}
