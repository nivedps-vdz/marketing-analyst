# Captures screenshots of key pages with headless Microsoft Edge for visual checks.
# Usage (servers running): powershell -ExecutionPolicy Bypass -File scripts\screenshot.ps1 [-Width 1440] [-Height 2400]
param([int]$Width = 1440, [int]$Height = 2400, [string]$Out = "")
$root = Split-Path -Parent $PSScriptRoot
if (-not $Out) { $Out = Join-Path $root 'docs\screenshots' }
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Output 'Microsoft Edge not found'; exit 1 }
$pages = [ordered]@{
    'dashboard'             = '/dashboard'
    'client-overview'       = '/clients/1'
    'client-campaigns'      = '/clients/3?tab=campaigns'
    'client-ads'            = '/clients/3?tab=ads&sort=roas&rt=purchase'
    'client-ad-detail'      = '/clients/1?tab=ads&ad=1'
    'client-recommendations'= '/clients/1?tab=recommendations'
    'client-expired'        = '/clients/5'
    'creative-intelligence' = '/creative-intelligence'
}
$profileDir = Join-Path $env:TEMP 'vestadz-edge-shot'
foreach ($name in $pages.Keys) {
    $file = Join-Path $Out "$name-$Width.png"
    & $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$profileDir" `
        --window-size="$Width,$Height" --virtual-time-budget=15000 --screenshot="$file" "http://localhost:3000$($pages[$name])" 2>$null | Out-Null
    Write-Output ("{0} {1}" -f $(if (Test-Path $file) { 'saved' } else { 'FAILED' }), $file)
}
