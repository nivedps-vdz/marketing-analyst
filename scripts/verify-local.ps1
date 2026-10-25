# Checks that both servers respond and every page route returns HTTP 200 through the Next.js proxy.
# Usage (with both servers running): powershell -ExecutionPolicy Bypass -File scripts\verify-local.ps1
$routes = @('/dashboard', '/clients', '/clients/1', '/campaigns', '/ads', '/creative-intelligence', '/competitors', '/reports', '/automations', '/settings')
$api = @('/api/health', '/api/meta', '/api/overview/summary', '/api/overview/clients', '/api/clients/1/ads', '/api/clients/999/summary')
$ok = $true
foreach ($r in $routes + $api) {
    try {
        $res = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3000$r" -TimeoutSec 30
        $code = $res.StatusCode
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
    }
    $expected = if ($r -eq '/api/clients/999/summary') { 404 } else { 200 }
    $flag = if ($code -eq $expected) { 'OK  ' } else { $ok = $false; 'FAIL' }
    Write-Output "$flag $code $r"
}
if ($ok) { Write-Output 'ALL ROUTES OK' } else { Write-Output 'SOME ROUTES FAILED'; exit 1 }
