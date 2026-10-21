#!/usr/bin/env bash
# Run from the repo root: ./scripts/setup.sh
set -euo pipefail
echo "== Node deps (server + web) =="
npm install
[ -f server/.env ] || { cp server/.env.example server/.env; echo "Created server/.env (fill it in)"; }
[ -f apps/web/.env.local ] || { cp apps/web/.env.example apps/web/.env.local; echo "Created apps/web/.env.local"; }
if command -v flutter >/dev/null; then
  echo "== Flutter =="
  cd apps/mobile
  [ -d android ] || flutter create --org com.notionflow --project-name notionflow_mobile --platforms android .
  # allow http:// to your laptop during local dev (remove for production builds)
  M=android/app/src/main/AndroidManifest.xml
  grep -q usesCleartextTraffic "$M" || sed -i 's/<application/<application android:usesCleartextTraffic="true"/' "$M"
  flutter pub get
else
  echo "Flutter not found. See README: 'Install Flutter on Ubuntu'."
fi
echo "Done. Next: edit server/.env, then see README."
