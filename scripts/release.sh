#!/bin/bash
cd "C:\Users\Dell\Desktop\ANDRIUD\NEW UNIQUE"

# Get the token from gh auth
TOKEN=$(gh auth token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "Not logged in to gh"
  exit 1
fi

REPO="jiteshoffice1234-star/box-office-tycoon"
TAG="v2.0.0"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

# Create release
echo "Creating release..."
RELEASE_ID=$(curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/releases" \
  -d "{
    \"tag_name\": \"$TAG\",
    \"name\": \"v2.0.0 - Streaming Platform Overhaul\",
    \"body\": \"## What's New in v2.0.0\n\n### Streaming Platform Overhaul\n- **30-Year Ad Deals** - advertiser contracts now last 30 years\n- **40+ Advertiser Companies** - multiple deals roll in weekly\n- **8 Pending Offers** - multiple deals simultaneously\n- **Ads Per Movie** - each deal tied to specific content\n- **Auto-Release Pipeline** - titles land on platform automatically\n- **Ad-Free Tier** - \$10/week to skip ads\n- **Free Ad Tier** - viewers watch free with ads\n\n### VYRA Design\n- Warm paper light/dark theme\n- Cinema Noir app icon\n- Self-hosted fonts\n- Reduced animations\n\n### Bug Fixes\n- Subscriber growth fixed\n- Deal duplication fixed\n- Save migration for old deals\n\nDownload the APK below to install on Android.\",
    \"draft\": false,
    \"prerelease\": false
  }" | grep -o '"id": [0-9]*' | head -1 | cut -d' ' -f2)

if [ -z "$RELEASE_ID" ]; then
  echo "Failed to create release"
  exit 1
fi

echo "Release created with ID: $RELEASE_ID"

# Upload APK
echo "Uploading APK..."
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/vnd.android.package-archive" \
  "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=app-debug.apk" \
  --data-binary "@$APK_PATH"

echo ""
echo "Release URL: https://github.com/$REPO/releases/tag/$TAG"
