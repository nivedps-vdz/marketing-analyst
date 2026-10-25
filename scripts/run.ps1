# Helper used during development: runs a command in backend\ with the venv Python and logs output.
# Usage: powershell -File scripts\run.ps1 -Log <file> -- <python args...>
param(
    [Parameter(Mandatory = $true)][string]$Log,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$PyArgs
)
$root = Split-Path -Parent $PSScriptRoot
Push-Location "$root\backend"
try {
    & .\.venv\Scripts\python.exe @PyArgs *> $Log
    "EXIT=$LASTEXITCODE" | Out-File -Append -Encoding utf8 $Log
} finally {
    Pop-Location
}
