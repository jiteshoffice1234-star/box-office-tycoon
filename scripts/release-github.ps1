$ErrorActionPreference = 'Stop'
$repo = "jiteshoffice1234-star/box-office-tycoon"
$tag = "v2.0.0"
$apkPath = "C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE\android\app\build\outputs\apk\debug\app-debug.apk"

# Get token from gh
$token = & 'C:\Program Files\GitHub CLI\gh.exe' auth token 2>$null
if (-not $token) { Write-Error "Not logged in"; exit 1 }

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

# Create release
$releaseBody = @{
    tag_name = $tag
    name = "v2.0.0 - Streaming Platform Overhaul"
    body = "## What's New in v2.0.0`n`n### Streaming Platform Overhaul`n- 30-Year Ad Deals (was 26 weeks)`n- 40+ Advertiser Companies`n- 8 Pending Offers rolling in weekly`n- Each deal tied to specific movie`n- Auto-Release Pipeline`n- Ad-Free Tier (skip ads for $10/wk)`n- Free Ad Tier (viewers watch free with ads)`n`n### VYRA Design`n- Warm paper light/dark theme`n- Cinema Noir app icon`n- Self-hosted fonts`n- Reduced animations`n`n### Bug Fixes`n- Subscriber growth fixed`n- Deal duplication fixed`n- Save migration for old deals`n`nDownload the APK below to install on Android."
    draft = $false
    prerelease = $false
} | ConvertTo-Json

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases" -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
Write-Host "Release created: $($release.html_url)"

# Upload APK
$uploadUrl = $release.upload_url -replace '\{.*', "?name=app-debug.apk"
$apkBytes = [System.IO.File]::ReadAllBytes($apkPath)
$upload = Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers -Body $apkBytes -ContentType "application/vnd.android.package-archive"
Write-Host "APK uploaded: $($upload.browser_download_url)"
Write-Host ""
Write-Host "Download: https://github.com/$repo/releases/tag/$tag"
