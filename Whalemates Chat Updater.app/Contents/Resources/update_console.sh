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
