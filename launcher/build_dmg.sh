#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-$HOME/Desktop/Whalemates Chat}"
DMG_PATH="${2:-$HOME/Desktop/Whalemates Chat.dmg}"
VOLUME_NAME="Whalemates Chat"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/whalemates-dmg.XXXXXX")"
DMG_ROOT="$WORK_DIR/root"
RW_DMG="$WORK_DIR/Whalemates Chat.rw.dmg"
BACKGROUND_DIR="$DMG_ROOT/.background"
BACKGROUND_SVG="$WORK_DIR/background.svg"
BACKGROUND_PNG="$BACKGROUND_DIR/background.png"

cleanup() {
  hdiutil detach "/Volumes/$VOLUME_NAME" >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source folder not found: $SOURCE_DIR" >&2
  exit 1
fi

rm -f "$DMG_PATH"
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
    <linearGradient id="hero" x1="82" y1="40" x2="540" y2="294" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7ddcff"/>
      <stop offset="48%" stop-color="#8c6cff"/>
      <stop offset="100%" stop-color="#ffd66b"/>
    </linearGradient>
    <linearGradient id="wave" x1="0" y1="198" x2="623" y2="198" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f4f0ff"/>
      <stop offset="58%" stop-color="#eef8ff"/>
      <stop offset="100%" stop-color="#fff5dc"/>
    </linearGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#6d5ce7" flood-opacity="0.20"/>
    </filter>
    <filter id="smallShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="7" stdDeviation="9" flood-color="#2d265a" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="623" height="464" fill="#fbf9ff"/>
  <path d="M0 0 H623 V244 C525 283 451 221 352 249 C235 282 164 252 0 294 Z" fill="url(#wave)"/>
  <circle cx="74" cy="72" r="52" fill="#b8edff" opacity="0.36"/>
  <circle cx="551" cy="85" r="66" fill="#ffeaa3" opacity="0.34"/>
  <circle cx="493" cy="204" r="30" fill="#d9ceff" opacity="0.5"/>
  <g filter="url(#softShadow)">
    <rect x="166" y="41" width="291" height="172" rx="34" fill="#ffffff" opacity="0.92"/>
    <path d="M198 78 C212 52 247 47 275 62 C302 31 355 38 373 73 C405 76 431 99 431 131 C431 171 395 194 350 184 C321 207 269 204 244 182 C204 184 178 163 178 130 C178 108 186 91 198 78 Z" fill="url(#hero)" opacity="0.94"/>
EOF

if [[ -n "$LOGO_DATA" ]]; then
  cat >>"$BACKGROUND_SVG" <<EOF
    <image href="data:image/png;base64,$LOGO_DATA" x="252" y="71" width="118" height="118"/>
EOF
else
  cat >>"$BACKGROUND_SVG" <<'EOF'
    <circle cx="312" cy="128" r="52" fill="#ffffff"/>
    <circle cx="292" cy="120" r="7" fill="#342869"/>
    <circle cx="332" cy="120" r="7" fill="#342869"/>
    <path d="M292 144 Q312 162 334 144" fill="none" stroke="#6b54ee" stroke-width="8" stroke-linecap="round"/>
EOF
fi

cat >>"$BACKGROUND_SVG" <<'EOF'
    <circle cx="236" cy="95" r="7" fill="#ffffff" opacity="0.72"/>
    <circle cx="401" cy="109" r="10" fill="#ffffff" opacity="0.62"/>
    <circle cx="386" cy="158" r="6" fill="#ffffff" opacity="0.76"/>
  </g>
  <text x="311.5" y="248" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
        font-size="30" font-weight="800" fill="#4f38e8">Whalemates Chat</text>
  <text x="311.5" y="278" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Helvetica, Arial, sans-serif"
        font-size="15" font-weight="650" fill="#6f6791">Local AI chat console for your channels and models</text>
  <rect x="65" y="304" width="493" height="113" rx="28" fill="#ffffff" opacity="0.92" filter="url(#smallShadow)"/>
  <g fill="none" stroke="#6b54ee" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M272 360 H351"/>
    <path d="M334 342 L354 360 L334 378"/>
  </g>
  <text x="311.5" y="444" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
        font-size="20" font-weight="650" fill="#342869">Drag the Whalemates Chat folder to Applications</text>
</svg>
EOF

sips -s format png "$BACKGROUND_SVG" --out "$BACKGROUND_PNG" >/dev/null
xattr -cr "$DMG_ROOT" 2>/dev/null || true

hdiutil create -volname "$VOLUME_NAME" -srcfolder "$DMG_ROOT" -ov -format UDRW "$RW_DMG" >/dev/null
MOUNT_OUTPUT="$(hdiutil attach "$RW_DMG" -readwrite -noverify -noautoopen)"
MOUNT_POINT="$(printf '%s\n' "$MOUNT_OUTPUT" | awk -F'\t' '/\/Volumes\// {print $NF; exit}')"

/usr/bin/SetFile -a V "$MOUNT_POINT/.background" 2>/dev/null || true

osascript <<EOF
tell application "Finder"
  tell disk "$VOLUME_NAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set bounds of container window to {120, 120, 743, 584}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 72
    set background picture of viewOptions to POSIX file "$MOUNT_POINT/.background/background.png"
    set position of item "Whalemates Chat" of container window to {165, 348}
    set position of item "Applications" of container window to {462, 348}
    update without registering applications
    close
  end tell
end tell
EOF

sync
sleep 1
hdiutil detach "$MOUNT_POINT" >/dev/null
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG_PATH" >/dev/null
echo "Created $DMG_PATH"
