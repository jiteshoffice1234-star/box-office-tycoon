$env:PATH = "C:\Program Files\Git\cmd;$env:PATH"
$env:GIT_EXEC_PATH = 'C:\Program Files\Git\mingw64\libexec\git-core'
Set-Location 'C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE'

& 'C:\Program Files\GitHub CLI\gh.exe' release create v2.0.0 `
  '.\android\app\build\outputs\apk\debug\app-debug.apk' `
  --title 'v2.0.0 - Streaming Platform Overhaul' `
  --notes 'v2.0.0 - Streaming platform overhaul with 30-year ad deals, auto-release, VYRA UI. Download the APK to install on Android.'
