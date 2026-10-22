#!/usr/bin/env bash
# Build a release APK and publish it for the web app's /download page.
#   ./scripts/publish-apk.sh                 # local/LAN build (allows http:// to your laptop)
#   ALLOW_HTTP=0 ./scripts/publish-apk.sh    # production build: HTTPS only (use with your deployed backend)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

command -v flutter >/dev/null || { echo "Flutter not found. See README (Install Flutter on Ubuntu)."; exit 1; }
M=android/app/src/main/AndroidManifest.xml
[ -f "$M" ] || { echo "No android/ folder. Run ./scripts/setup.sh first."; exit 1; }

# Release builds from 'flutter create' do NOT include the INTERNET permission (only debug does).
grep -q 'android.permission.INTERNET' "$M" || \
  sed -i 's#<application#<uses-permission android:name="android.permission.INTERNET"/>\n    <application#' "$M"

if [ "${ALLOW_HTTP:-1}" = "1" ]; then
  grep -q usesCleartextTraffic "$M" || sed -i 's/<application/<application android:usesCleartextTraffic="true"/' "$M"
  echo "Build mode: http:// allowed (local network). Use ALLOW_HTTP=0 for production."
else
  sed -i 's/ android:usesCleartextTraffic="true"//' "$M"
  echo "Build mode: HTTPS only (production)."
fi

flutter pub get
flutter build apk --release

SRC="build/app/outputs/flutter-apk/app-release.apk"
OUT="$ROOT/apps/web/downloads"
mkdir -p "$OUT"
cp "$SRC" "$OUT/notionflow.apk"

VERSION="$(grep '^version:' pubspec.yaml | awk '{print $2}')"
SHA="$(sha256sum "$OUT/notionflow.apk" | awk '{print $1}')"
SIZE="$(stat -c%s "$OUT/notionflow.apk")"
printf '{"version":"%s","sha256":"%s","sizeBytes":%s,"builtAt":"%s"}\n' \
  "$VERSION" "$SHA" "$SIZE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT/latest.json"

cat <<MSG

Published v$VERSION ($SIZE bytes) -> apps/web/downloads/notionflow.apk
Local use: open the web app at /download.

For a DEPLOYED site (Vercel) upload apps/web/downloads/notionflow.apk to a public place
(e.g. a GitHub Release) and set these environment variables on the web project:
  APK_URL=<public link to the .apk>
  APK_VERSION=$VERSION
  APK_SHA256=$SHA
  APK_SIZE_BYTES=$SIZE
MSG
