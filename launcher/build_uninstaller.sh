#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="${1:-Whalemates Chat Uninstaller}"
APP_BUNDLE="$APP_ROOT/$APP_NAME.app"
ICON_FILE="$SCRIPT_DIR/whalemates.icns"
TMP_SCRIPT="$(mktemp)"

cat >"$TMP_SCRIPT" <<'APPLESCRIPT'
set appBundlePath to POSIX path of (path to me)
set uninstallScript to appBundlePath & "Contents/Resources/uninstall_console.sh"

set uninstallChoice to button returned of (display dialog "Uninstall Whalemates Chat?\n\nServices Only stops the local server and removes LaunchAgents, helper scripts, and the virtual environment while keeping this folder and your local data.\n\nFull Uninstall also moves this Whalemates Chat folder to Trash." buttons {"Cancel", "Services Only", "Full Uninstall"} default button "Services Only" cancel button "Cancel" with icon caution)

if uninstallChoice is "Full Uninstall" then
	set uninstallMode to "full"
else
	set uninstallMode to "services"
end if

try
	do shell script "/bin/bash " & quoted form of uninstallScript & " " & quoted form of uninstallMode
on error errorMessage
	display dialog "Whalemates Chat uninstall failed. " & errorMessage buttons {"OK"} default button "OK" with icon caution
	return
end try

if uninstallMode is "full" then
	display dialog "Whalemates Chat services were removed. The app folder will move to Trash in a moment." buttons {"OK"} default button "OK" with icon note
else
	display dialog "Whalemates Chat services were removed. Your folder and local data were kept." buttons {"OK"} default button "OK" with icon note
end if

quit
APPLESCRIPT

rm -rf "$APP_BUNDLE"
osacompile -o "$APP_BUNDLE" "$TMP_SCRIPT"
rm -f "$TMP_SCRIPT"

cat >"$APP_BUNDLE/Contents/Resources/uninstall_console.sh" <<'UNINSTALLER'
#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-services}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
USER_DOMAIN="gui/$(id -u)"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
CONSOLE_PLIST="$LAUNCH_AGENT_DIR/whalemates-chat-console.plist"
LISTENER_PLIST="$LAUNCH_AGENT_DIR/whalemates-bot-listener.plist"
CONSOLE_SCRIPT="$HOME/.whalemates-chat-console.sh"
LISTENER_SCRIPT="$HOME/.whalemates-bot-listener.sh"
TMP_LOG_DIR="${TMPDIR:-/tmp}/whalemates-chat-console-launcher"

stop_launch_agent() {
  local label="$1"
  local plist="$2"
  if launchctl print "$USER_DOMAIN/$label" >/dev/null 2>&1; then
    launchctl bootout "$USER_DOMAIN" "$plist" >/dev/null 2>&1 || true
  fi
}

stop_launch_agent "whalemates-chat-console" "$CONSOLE_PLIST"
stop_launch_agent "whalemates-bot-listener" "$LISTENER_PLIST"

rm -f "$CONSOLE_PLIST" "$LISTENER_PLIST"
rm -f "$CONSOLE_SCRIPT" "$LISTENER_SCRIPT"
rm -rf "$TMP_LOG_DIR"
rm -f /tmp/whalemates-chat-console.log /tmp/whalemates-chat-console.err.log
rm -f /tmp/whalemates-bot-listener.log /tmp/whalemates-bot-listener.err.log

if [[ "$MODE" == "services" ]]; then
  rm -rf "$APP_ROOT/.venv"
  exit 0
fi

if [[ "$MODE" != "full" ]]; then
  echo "Unknown uninstall mode: $MODE" >&2
  exit 1
fi

FINALIZER="$(mktemp "${TMPDIR:-/tmp}/whalemates-uninstall.XXXXXX.sh")"
cat >"$FINALIZER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
sleep 1
APP_ROOT="$APP_ROOT"
TRASH_DIR="\$HOME/.Trash"
mkdir -p "\$TRASH_DIR"
BASENAME="\$(basename "\$APP_ROOT")"
TARGET="\$TRASH_DIR/\$BASENAME"
if [[ -e "\$TARGET" ]]; then
  TARGET="\$TRASH_DIR/\$BASENAME \$(date +%Y%m%d-%H%M%S)"
fi
mv "\$APP_ROOT" "\$TARGET"
EOF
chmod +x "$FINALIZER"
nohup /bin/bash "$FINALIZER" >/dev/null 2>&1 &
UNINSTALLER
chmod +x "$APP_BUNDLE/Contents/Resources/uninstall_console.sh"

if [[ -f "$ICON_FILE" ]]; then
  cp "$ICON_FILE" "$APP_BUNDLE/Contents/Resources/whalemates.icns"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile whalemates" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null || true
  touch "$APP_BUNDLE"
fi

echo "Created $APP_BUNDLE"
