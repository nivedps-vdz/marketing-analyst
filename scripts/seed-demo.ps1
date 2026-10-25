# Applies migrations and regenerates synthetic demo data ending yesterday (Asia/Kolkata).
# Re-run whenever you want the demo dates to catch up with today. Only demo clients are replaced.
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\backend"
& .\.venv\Scripts\python.exe -m app.demo.seed @args
