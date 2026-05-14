#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-$HOME/Desktop/Whalemates Chat}"
DMG_PATH="${2:-$HOME/Desktop/Whalemates Chat.dmg}"
VOLUME_NAME="$(basename "$DMG_PATH" .dmg)"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/whalemates-dmg.XXXXXX")"
DMG_ROOT="$WORK_DIR/root"
RW_DMG="$WORK_DIR/Whalemates Chat.rw.dmg"
BACKGROUND_DIR="$DMG_ROOT/.background"
BACKGROUND_SVG="$WORK_DIR/background.svg"
BACKGROUND_PNG="$BACKGROUND_DIR/background.png"

cleanup() {
  while IFS= read -r mounted_volume; do
    hdiutil detach "$mounted_volume" >/dev/null 2>&1 || true
  done < <(find /Volumes -maxdepth 1 -name "$VOLUME_NAME*" -print 2>/dev/null || true)
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source folder not found: $SOURCE_DIR" >&2
  exit 1
fi

rm -f "$DMG_PATH"
while IFS= read -r mounted_volume; do
  hdiutil detach "$mounted_volume" >/dev/null 2>&1 || true
done < <(find /Volumes -maxdepth 1 -name "$VOLUME_NAME*" -print 2>/dev/null || true)
mkdir -p "$BACKGROUND_DIR"
cp -R "$SOURCE_DIR" "$DMG_ROOT/Whalemates Chat"
ln -s /Applications "$DMG_ROOT/Applications"

LOGO_FILE="$SOURCE_DIR/dev/front/img/whalemates-whale-logo.png"
LOGO_DATA=""
if [[ -f "$LOGO_FILE" ]]; then
  LOGO_DATA="$(/usr/bin/base64 <"$LOGO_FILE" | tr -d '\n')"
fi

cat >"$BACKGROUND_SVG" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="623" height="464" viewBox="0 0 623 464">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="623" y2="464" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fff8df"/>
      <stop offset="45%" stop-color="#f7f2ff"/>
      <stop offset="100%" stop-color="#eefdff"/>
    </linearGradient>
    <linearGradient id="brandPanel" x1="65" y1="62" x2="292" y2="388" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#faf7ff"/>
      <stop offset="100%" stop-color="#ecfbff"/>
    </linearGradient>
    <linearGradient id="logoPlate" x1="105" y1="76" x2="248" y2="238" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fff4c7"/>
      <stop offset="42%" stop-color="#f7efff"/>
      <stop offset="100%" stop-color="#d7f7ff"/>
    </linearGradient>
    <linearGradient id="installPanel" x1="328" y1="94" x2="552" y2="377" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#fffaf0"/>
    </linearGradient>
    <filter id="panelShadow" x="-18%" y="-18%" width="136%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#3b2a84" flood-opacity="0.16"/>
    </filter>
    <filter id="logoShadow" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#4a34b8" flood-opacity="0.18"/>
    </filter>
    <clipPath id="logoClip">
      <rect x="94" y="78" width="166" height="166" rx="42"/>
    </clipPath>
  </defs>
  <rect width="623" height="464" fill="url(#page)"/>
  <circle cx="40" cy="58" r="108" fill="#ffffff" opacity="0.55"/>
  <circle cx="590" cy="74" r="104" fill="#ffe78a" opacity="0.30"/>
  <circle cx="536" cy="396" r="110" fill="#a8efff" opacity="0.22"/>
  <path d="M0 352 C88 310 181 328 260 350 C352 376 448 371 623 314 V464 H0 Z" fill="#ffffff" opacity="0.48"/>

  <g filter="url(#panelShadow)">
    <rect x="54" y="54" width="246" height="348" rx="34" fill="url(#brandPanel)" opacity="0.96"/>
    <path d="M54 317 C105 291 151 301 194 324 C237 347 271 333 300 302 V402 H54 Z" fill="#6f54f6" opacity="0.07"/>
    <circle cx="95" cy="98" r="38" fill="#9de7ff" opacity="0.28"/>
    <circle cx="260" cy="112" r="28" fill="#ffe27b" opacity="0.35"/>
    <circle cx="250" cy="352" r="32" fill="#8e78ff" opacity="0.10"/>
    <rect x="82" y="66" width="190" height="190" rx="48" fill="url(#logoPlate)" opacity="0.96"/>
    <rect x="82" y="66" width="190" height="190" rx="48" fill="none" stroke="#ffffff" stroke-width="12" opacity="0.95"/>
EOF

if [[ -n "$LOGO_DATA" ]]; then
  cat >>"$BACKGROUND_SVG" <<EOF
    <image href="data:image/png;base64,$LOGO_DATA" x="76" y="60" width="202" height="202" clip-path="url(#logoClip)" filter="url(#logoShadow)"/>
    <rect x="94" y="78" width="166" height="166" rx="42" fill="none" stroke="#ffffff" stroke-width="10"/>
EOF
else
  cat >>"$BACKGROUND_SVG" <<'EOF'
    <circle cx="177" cy="178" r="68" fill="#ffffff"/>
    <circle cx="153" cy="168" r="8" fill="#342869"/>
    <circle cx="201" cy="168" r="8" fill="#342869"/>
    <path d="M153 198 Q177 218 203 198" fill="none" stroke="#6b54ee" stroke-width="9" stroke-linecap="round"/>
EOF
fi

cat >>"$BACKGROUND_SVG" <<'EOF'
    <text x="177" y="303" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
          font-size="27" font-weight="850" fill="#4f38e8">Whalemates</text>
    <text x="177" y="330" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif"
          font-size="16" font-weight="750" fill="#30245f">Chat Console</text>
    <rect x="86" y="351" width="182" height="30" rx="15" fill="#f2edff"/>
    <text x="177" y="371" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif"
          font-size="11" font-weight="700" fill="#6b54ee">Local AI for channels and models</text>
  </g>

  <g filter="url(#panelShadow)">
    <rect x="328" y="54" width="241" height="348" rx="34" fill="url(#installPanel)" opacity="0.96"/>
    <text x="448.5" y="105" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
          font-size="23" font-weight="850" fill="#35246f">Install</text>
    <text x="448.5" y="129" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif"
          font-size="12" font-weight="650" fill="#746b91">Drag the folder into Applications</text>
    <rect x="346" y="173" width="205" height="150" rx="26" fill="#f6f0ff" opacity="0.88"/>
    <path d="M421 248 H476" fill="none" stroke="#6b54ee" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M461 231 L479 248 L461 265" fill="none" stroke="#6b54ee" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="360" y="337" width="177" height="45" rx="18" fill="#ffffff"/>
    <text x="448.5" y="365" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif"
          font-size="13" font-weight="750" fill="#4d39d8">Install or upgrade with this DMG</text>
  </g>

  <text x="311.5" y="438" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
        font-size="16" font-weight="750" fill="#342869">First install: drag folder. Upgrade: open Updater inside the folder.</text>
</svg>
EOF

sips -s format png "$BACKGROUND_SVG" --out "$BACKGROUND_PNG" >/dev/null
xattr -cr "$DMG_ROOT" 2>/dev/null || true

hdiutil create -volname "$VOLUME_NAME" -srcfolder "$DMG_ROOT" -ov -format UDRW "$RW_DMG" >/dev/null
MOUNT_OUTPUT="$(hdiutil attach "$RW_DMG" -readwrite -noverify -noautoopen)"
MOUNT_POINT="$(printf '%s\n' "$MOUNT_OUTPUT" | awk -F'\t' '/\/Volumes\// {print $NF; exit}')"
MOUNT_NAME="$(basename "$MOUNT_POINT")"

/usr/bin/SetFile -a V "$MOUNT_POINT/.background" 2>/dev/null || true

osascript <<EOF
tell application "Finder"
  tell disk "$MOUNT_NAME"
    open
    delay 0.5
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set bounds of container window to {120, 120, 743, 584}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 72
    set background picture of viewOptions to POSIX file "$MOUNT_POINT/.background/background.png"
    set position of item "Whalemates Chat" of container window to {382, 248}
    set position of item "Applications" of container window to {515, 248}
    update without registering applications
    delay 1
    close
  end tell
end tell
EOF

sync
sleep 2
hdiutil detach "$MOUNT_POINT" >/dev/null
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH" >/dev/null
echo "Created $DMG_PATH"
