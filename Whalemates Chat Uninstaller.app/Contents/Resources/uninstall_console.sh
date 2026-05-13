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
