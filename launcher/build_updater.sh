#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="${1:-Whalemates Chat Updater}"
APP_BUNDLE="$APP_ROOT/$APP_NAME.app"
ICON_FILE="$SCRIPT_DIR/whalemates.icns"
TMP_SCRIPT="$(mktemp)"

cat >"$TMP_SCRIPT" <<'APPLESCRIPT'
set appBundlePath to POSIX path of (path to me)
set updaterScript to appBundlePath & "Contents/Resources/update_console.sh"
set currentFolder to do shell script "cd " & quoted form of appBundlePath & "/../../.. && pwd"
set defaultTarget to "/Applications/Whalemates Chat"

if currentFolder is defaultTarget then
	display dialog "This updater must be run from a new Whalemates Chat package, not from the currently installed folder." buttons {"OK"} default button "OK" with icon caution
	return
end if

set targetPath to ""
try
	do shell script "test -d " & quoted form of defaultTarget
	set targetPath to defaultTarget
on error
	try
		set selectedFolder to choose folder with prompt "Choose the existing Whalemates Chat folder to update."
		set targetPath to POSIX path of selectedFolder
		if targetPath ends with "/" then set targetPath to text 1 thru -2 of targetPath
	on error
		return
	end try
end try

set confirmText to "Update Whalemates Chat at:\n" & targetPath & "\n\nYour data, .env, and existing .venv will be preserved. A backup will be created before files are replaced."
display dialog confirmText buttons {"Cancel", "Update"} default button "Update" cancel button "Cancel" with icon note

try
	set resultText to do shell script "/bin/bash " & quoted form of updaterScript & " " & quoted form of targetPath
on error errorMessage
	display dialog "Whalemates Chat update failed. " & errorMessage buttons {"OK"} default button "OK" with icon caution
	return
end try

display dialog resultText buttons {"OK"} default button "OK" with icon note
quit
APPLESCRIPT

rm -rf "$APP_BUNDLE"
osacompile -o "$APP_BUNDLE" "$TMP_SCRIPT"
rm -f "$TMP_SCRIPT"

cat >"$APP_BUNDLE/Contents/Resources/update_console.sh" <<'UPDATER'
#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
USER_DOMAIN="gui/$(id -u)"
BACKUP_ROOT="$HOME/Whalemates Chat Backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/Whalemates Chat $TIMESTAMP"
CONSOLE_PLIST="$HOME/Library/LaunchAgents/whalemates-chat-console.plist"
LISTENER_PLIST="$HOME/Library/LaunchAgents/whalemates-bot-listener.plist"

if [[ -z "$TARGET_DIR" || ! -d "$TARGET_DIR" ]]; then
  echo "Existing Whalemates Chat folder was not found." >&2
  exit 1
fi

SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

if [[ "$SOURCE_DIR" == "$TARGET_DIR" ]]; then
  echo "Updater must be run from the new package, not the installed folder." >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR/dev" || ! -d "$SOURCE_DIR/launcher" || ! -d "$SOURCE_DIR/Whalemates Chat.app" ]]; then
  echo "New package is incomplete: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -d "$TARGET_DIR/dev" && ! -d "$TARGET_DIR/Whalemates Chat.app" ]]; then
  echo "Selected folder does not look like a Whalemates Chat install: $TARGET_DIR" >&2
  exit 1
fi

stop_launch_agent() {
  local label="$1"
  local plist="$2"
  if launchctl print "$USER_DOMAIN/$label" >/dev/null 2>&1; then
    launchctl bootout "$USER_DOMAIN" "$plist" >/dev/null 2>&1 || true
  fi
}

stop_launch_agent "whalemates-chat-console" "$CONSOLE_PLIST"
stop_launch_agent "whalemates-bot-listener" "$LISTENER_PLIST"

mkdir -p "$BACKUP_DIR"
for item in data .env .venv; do
  if [[ -e "$TARGET_DIR/$item" ]]; then
    cp -R "$TARGET_DIR/$item" "$BACKUP_DIR/$item"
  fi
done

TMP_PRESERVE="$(mktemp -d "${TMPDIR:-/tmp}/whalemates-preserve.XXXXXX")"
for item in data .env .venv; do
  if [[ -e "$TARGET_DIR/$item" ]]; then
    mv "$TARGET_DIR/$item" "$TMP_PRESERVE/$item"
  fi
done

for item in \
  "Whalemates Chat.app" \
  "Whalemates Chat Uninstaller.app" \
  "Whalemates Chat Updater.app" \
  dev \
  launcher \
  README.md \
  .env.example \
  .gitignore; do
  rm -rf "$TARGET_DIR/$item"
  if [[ -e "$SOURCE_DIR/$item" ]]; then
    cp -R "$SOURCE_DIR/$item" "$TARGET_DIR/$item"
  fi
done

for item in data .env .venv; do
  if [[ -e "$TMP_PRESERVE/$item" ]]; then
    rm -rf "$TARGET_DIR/$item"
    mv "$TMP_PRESERVE/$item" "$TARGET_DIR/$item"
  fi
done
rm -rf "$TMP_PRESERVE"

mkdir -p "$TARGET_DIR/data"
touch "$TARGET_DIR/data/.gitkeep"
xattr -cr "$TARGET_DIR" 2>/dev/null || true

open "$TARGET_DIR/Whalemates Chat.app"

cat <<EOF
Whalemates Chat was updated.

Updated folder:
$TARGET_DIR

Backup:
$BACKUP_DIR
EOF
UPDATER
chmod +x "$APP_BUNDLE/Contents/Resources/update_console.sh"

if [[ -f "$ICON_FILE" ]]; then
  cp "$ICON_FILE" "$APP_BUNDLE/Contents/Resources/whalemates.icns"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile whalemates" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null || true
  touch "$APP_BUNDLE"
fi

echo "Created $APP_BUNDLE"
