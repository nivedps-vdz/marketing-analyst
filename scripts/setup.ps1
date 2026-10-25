# One-time setup: Python virtual environment, backend packages, frontend packages, demo database.
# Usage (from the project root):  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = 'Stop'
# Pick up tools installed since this terminal was opened.
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Backend: virtual environment and packages"
Push-Location "$root\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path "$root\.env")) { Copy-Item "$root\.env.example" "$root\.env" }
Write-Host "== Backend: database migrations and demo data"
& .\.venv\Scripts\python.exe -m app.demo.seed
Pop-Location

Write-Host "== Frontend: packages"
Push-Location "$root\frontend"
npm.cmd install
Pop-Location

Write-Host "Setup complete. Start the servers with scripts\dev-backend.ps1 and scripts\dev-frontend.ps1"
