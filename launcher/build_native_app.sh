#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="${1:-Whalemates Chat}"
APP_BUNDLE="$APP_ROOT/$APP_NAME.app"
BOOTSTRAP_NAME="$APP_NAME Bootstrap"
BOOTSTRAP_BUNDLE="$APP_ROOT/$BOOTSTRAP_NAME.app"
SWIFT_SOURCE="$SCRIPT_DIR/native/WhalematesNativeApp.swift"
ICON_FILE="$SCRIPT_DIR/whalemates.icns"
BUNDLE_ID="lab.whalemates.chat"

if [[ "$APP_NAME" == *"Native"* ]]; then
  BUNDLE_ID="lab.whalemates.chat.native"
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "swiftc is required. Install Xcode Command Line Tools first." >&2
  exit 1
fi

"$SCRIPT_DIR/build_app.sh" "$BOOTSTRAP_NAME" >/dev/null

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"

swiftc \
  "$SWIFT_SOURCE" \
  -framework Cocoa \
  -framework WebKit \
  -o "$APP_BUNDLE/Contents/MacOS/WhalematesChatNative"

cat >"$APP_BUNDLE/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>WhalematesChatNative</string>
  <key>CFBundleIconFile</key>
  <string>whalemates</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

cp "$BOOTSTRAP_BUNDLE/Contents/Resources/install_console.sh" "$APP_BUNDLE/Contents/Resources/install_console.sh"
chmod +x "$APP_BUNDLE/Contents/Resources/install_console.sh"

if [[ -f "$ICON_FILE" ]]; then
  cp "$ICON_FILE" "$APP_BUNDLE/Contents/Resources/whalemates.icns"
fi

rm -rf "$BOOTSTRAP_BUNDLE"
touch "$APP_BUNDLE"

echo "Created $APP_BUNDLE"
