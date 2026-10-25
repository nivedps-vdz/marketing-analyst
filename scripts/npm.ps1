# Development helper: runs an npm command in frontend\ and logs output.
# Usage: powershell -File scripts\npm.ps1 <log file> <npm args...>
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$log = $args[0]
$rest = $args[1..($args.Length - 1)]
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\frontend"
& npm @rest *> $log
"EXIT=$LASTEXITCODE" | Out-File -Append -Encoding utf8 $log
