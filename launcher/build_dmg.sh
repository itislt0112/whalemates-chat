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
    <radialGradient id="glow" cx="50%" cy="44%" r="45%">
      <stop offset="0%" stop-color="#20c6ff" stop-opacity="0.34"/>
      <stop offset="58%" stop-color="#116b95" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#122033" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.30"/>
    </filter>
  </defs>
  <rect width="623" height="464" fill="#142033"/>
  <ellipse cx="312" cy="212" rx="220" ry="76" fill="url(#glow)"/>
  <g filter="url(#softShadow)">
    <rect x="232" y="116" width="159" height="82" rx="4" fill="#d5ad67"/>
    <path d="M232 116 L311 96 L391 116 L312 136 Z" fill="#efcf86"/>
    <path d="M232 116 L206 123 L286 144 L312 136 Z" fill="#d6ad68"/>
    <path d="M391 116 L417 123 L338 144 L312 136 Z" fill="#c89f5e"/>
    <path d="M286 144 L312 136 L338 144 L338 196 L312 207 L286 196 Z" fill="#c99c58"/>
    <path d="M232 116 L286 144 L286 196 L232 178 Z" fill="#d6ad68"/>
    <path d="M391 116 L338 144 L338 196 L391 178 Z" fill="#b98b4e"/>
  </g>
  <g>
EOF

if [[ -n "$LOGO_DATA" ]]; then
  cat >>"$BACKGROUND_SVG" <<EOF
    <image href="data:image/png;base64,$LOGO_DATA" x="261" y="39" width="102" height="102"/>
EOF
else
  cat >>"$BACKGROUND_SVG" <<'EOF'
    <circle cx="312" cy="88" r="52" fill="#ffd65a"/>
    <circle cx="292" cy="80" r="7" fill="#172033"/>
    <circle cx="332" cy="80" r="7" fill="#172033"/>
    <path d="M292 104 Q312 122 334 104" fill="none" stroke="#a23a27" stroke-width="8" stroke-linecap="round"/>
EOF
fi

cat >>"$BACKGROUND_SVG" <<'EOF'
  </g>
  <g fill="#e9fbff" opacity="0.94">
    <circle cx="178" cy="202" r="7"/><circle cx="201" cy="194" r="11"/><circle cx="238" cy="208" r="9"/>
    <circle cx="386" cy="199" r="7"/><circle cx="397" cy="210" r="5"/><circle cx="371" cy="54" r="6"/>
    <circle cx="409" cy="64" r="6"/><circle cx="411" cy="92" r="7"/>
  </g>
  <g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M270 346 H357"/>
    <path d="M340 330 L358 346 L340 362"/>
  </g>
  <text x="311.5" y="451" text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
        font-size="21" fill="#ffffff" opacity="0.96">Drag Whalemates Chat to your Applications</text>
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
