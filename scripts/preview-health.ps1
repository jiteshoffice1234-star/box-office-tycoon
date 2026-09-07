$ErrorActionPreference = 'SilentlyContinue'
$vitePids = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'vite.js' } | Select-Object -ExpandProperty ProcessId
Write-Output ("vite pids: " + ($vitePids -join ','))
try {
  $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 5
  Write-Output ("HTTP " + $r.StatusCode)
} catch {
  Write-Output ("HTTP FAIL: " + $_.Exception.Message)
}
