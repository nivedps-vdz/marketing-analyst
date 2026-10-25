# Starts the Next.js frontend on http://localhost:3000. The backend must be running (dev-backend.ps1).
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\frontend"
# npm.cmd works even when the PowerShell execution policy blocks npm.ps1.
npm.cmd run dev
