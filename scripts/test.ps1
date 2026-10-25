# Runs backend (pytest) and frontend (vitest) tests.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\test.ps1 [-BackendOnly] [-FrontendOnly]
param([switch]$BackendOnly, [switch]$FrontendOnly)
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = Split-Path -Parent $PSScriptRoot
$failed = $false

if (-not $FrontendOnly) {
    Write-Host "== Backend tests (pytest)"
    Push-Location "$root\backend"
    & .\.venv\Scripts\python.exe -m pytest -p no:cacheprovider
    if ($LASTEXITCODE -ne 0) { $failed = $true }
    Pop-Location
}

if (-not $BackendOnly) {
    Write-Host "== Frontend tests (vitest)"
    Push-Location "$root\frontend"
    npm.cmd run test --silent
    if ($LASTEXITCODE -ne 0) { $failed = $true }
    Pop-Location
}

if ($failed) { Write-Host "TESTS FAILED"; exit 1 } else { Write-Host "ALL TESTS PASSED" }
