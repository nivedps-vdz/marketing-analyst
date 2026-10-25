# Reports which development tools are available on this machine.
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
foreach ($c in 'node', 'npm', 'git', 'python') {
    $cmd = Get-Command $c -ErrorAction SilentlyContinue
    if ($cmd) {
        $v = & $c --version 2>&1
        Write-Output "$c | $($cmd.Source) | $v"
    } else {
        Write-Output "$c | MISSING"
    }
}
