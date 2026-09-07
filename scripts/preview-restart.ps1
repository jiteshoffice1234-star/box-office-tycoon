$ErrorActionPreference = 'SilentlyContinue'

# 1. Kill every leftover vite process (dev or preview) so we start clean
$viteProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'vite' }
foreach ($vp in $viteProcs) {
  Stop-Process -Id $vp.ProcessId -Force
}
Write-Output ("Killed " + $viteProcs.Count + " vite process(es)")

# Also kill orphaned npm run dev wrappers
$npmProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'npm-cli.js.. run dev' }
foreach ($np in $npmProcs) {
  Stop-Process -Id $np.ProcessId -Force
}
Write-Output ("Killed " + $npmProcs.Count + " npm wrapper(s)")

Start-Sleep -Seconds 2

# 2. Start ONE clean detached dev server
$log = 'C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE\.freebuff\preview-c1abb873-7c44-4dd4-8fe1-100b8df16fec.log'
$logErr = "$log.err"
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE' -RedirectStandardOutput $log -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
Write-Output ("Started pid " + $p.Id)

Start-Sleep -Seconds 4
$alive = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($alive) { Write-Output ("ALIVE: " + $alive.Id + " " + $alive.Name) } else { Write-Output "DEAD" }
