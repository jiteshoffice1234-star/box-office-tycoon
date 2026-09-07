$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput 'C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE\.freebuff\preview-c1abb873-7c44-4dd4-8fe1-100b8df16fec.log' -RedirectStandardError 'C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE\.freebuff\preview-c1abb873-7c44-4dd4-8fe1-100b8df16fec.log.err' -WindowStyle Hidden -PassThru
Write-Output $p.Id
Start-Sleep -Seconds 3
$proc = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($proc) {
  Write-Output "Process alive: $($proc.Id) $($proc.Name)"
} else {
  Write-Output "Process died"
}
