#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEV_DIR="$APP_ROOT/dev"
LOG_DIR="${TMPDIR:-/tmp}/whalemates-chat-console-launcher"
VENV_DIR="$APP_ROOT/.venv"
EMBEDDED_REQUIREMENTS_HASH="27859e5c9bac9f0cc21d9a6e66903828715d0730b046ed570a54208e39c7b854"
EMBEDDED_REQUIREMENTS_B64="cHl0aG9uLWRvdGVudj09MS4xLjEKcmVxdWVzdHM9PTIuMzIuNQp3ZWJzb2NrZXRzPT0xNS4wLjEK"
CONSOLE_SCRIPT="$HOME/.whalemates-chat-console.sh"
LISTENER_SCRIPT="$HOME/.whalemates-bot-listener.sh"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
CONSOLE_PLIST="$LAUNCH_AGENT_DIR/whalemates-chat-console.plist"
LISTENER_PLIST="$LAUNCH_AGENT_DIR/whalemates-bot-listener.plist"
USER_DOMAIN="gui/$(id -u)"
CONSOLE_URL="http://127.0.0.1:8765/app.html"
CONSOLE_HEALTH_URL="http://127.0.0.1:8765/api/auth/session"

quote_sed() {
  printf '%s' "$1" | sed 's/[\/&]/\&/g'
}

run_setup_command() {
  "$@" >>"$LOG_DIR/install.log" 2>>"$LOG_DIR/install.err.log"
}

cleanup_previous_services() {
  launchctl bootout "$USER_DOMAIN" "$LISTENER_PLIST" >/dev/null 2>&1 || true
  launchctl bootout "$USER_DOMAIN" "$CONSOLE_PLIST" >/dev/null 2>&1 || true
  pkill -f ' -m back listen' >/dev/null 2>&1 || true
  pkill -f ' -m back chat --host 127.0.0.1 --port 8765' >/dev/null 2>&1 || true
}

ensure_bootstrap_python() {
  local candidate
  BOOTSTRAP_PYTHON=""
  for candidate in \
    /opt/homebrew/bin/python3 \
    /usr/local/bin/python3 \
    /Library/Frameworks/Python.framework/Versions/Current/bin/python3 \
    /usr/bin/python3; do
    if [[ -x "$candidate" ]] && "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      BOOTSTRAP_PYTHON="$candidate"
      return 0
    fi
  done
  echo "Python 3.10 or newer is required. Install it with: brew install python. Or download Python for macOS from https://www.python.org/downloads/macos/. Then open Whalemates Chat again." >&2
  return 1
}

write_service_scripts() {
  local requirements_hash requirements_b64 bootstrap_python
  requirements_hash="$EMBEDDED_REQUIREMENTS_HASH"
  requirements_b64="$EMBEDDED_REQUIREMENTS_B64"
  bootstrap_python="$BOOTSTRAP_PYTHON"

  cat >"$CONSOLE_SCRIPT" <<EOF
#!/bin/zsh
set -euo pipefail
LOG_DIR="${TMPDIR:-/tmp}/whalemates-chat-console-launcher"
mkdir -p "$LOG_DIR"
BOOTSTRAP_PYTHON="$bootstrap_python"
if [[ -x "$VENV_DIR/bin/python" ]] && "$VENV_DIR/bin/python" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
  :
else
  rm -rf "$VENV_DIR"
  "$bootstrap_python" -m venv "$VENV_DIR" >>"$LOG_DIR/service-install.log" 2>>"$LOG_DIR/service-install.err.log"
fi
if [[ -n "$requirements_b64" ]]; then
  printf '%s' "$requirements_b64" | /usr/bin/base64 --decode >"$LOG_DIR/requirements.txt"
  PIP_DISABLE_PIP_VERSION_CHECK=1 "$VENV_DIR/bin/python" -m pip install -r "$LOG_DIR/requirements.txt" >>"$LOG_DIR/service-install.log" 2>>"$LOG_DIR/service-install.err.log"
fi
cd "$DEV_DIR"
exec "$VENV_DIR/bin/python" -u -m back chat --host 127.0.0.1 --port 8765 --ws-port 8766
EOF

  cat >"$LISTENER_SCRIPT" <<EOF
#!/bin/zsh
set -euo pipefail
LOG_DIR="${TMPDIR:-/tmp}/whalemates-chat-console-launcher"
mkdir -p "$LOG_DIR"
BOOTSTRAP_PYTHON="$bootstrap_python"
if [[ -x "$VENV_DIR/bin/python" ]] && "$VENV_DIR/bin/python" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
  :
else
  rm -rf "$VENV_DIR"
  "$bootstrap_python" -m venv "$VENV_DIR" >>"$LOG_DIR/service-install.log" 2>>"$LOG_DIR/service-install.err.log"
fi
if [[ -n "$requirements_b64" ]]; then
  printf '%s' "$requirements_b64" | /usr/bin/base64 --decode >"$LOG_DIR/requirements.txt"
  PIP_DISABLE_PIP_VERSION_CHECK=1 "$VENV_DIR/bin/python" -m pip install -r "$LOG_DIR/requirements.txt" >>"$LOG_DIR/service-install.log" 2>>"$LOG_DIR/service-install.err.log"
fi
cd "$DEV_DIR"
exec "$VENV_DIR/bin/python" -u -m back listen
EOF

  chmod +x "$CONSOLE_SCRIPT" "$LISTENER_SCRIPT"
}

write_launch_agents() {
  mkdir -p "$LAUNCH_AGENT_DIR"

  cat >"$CONSOLE_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>whalemates-chat-console</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>$CONSOLE_SCRIPT</string>
  </array>
  <key>RunAtLoad</key>
  <false/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/tmp/whalemates-chat-console.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/whalemates-chat-console.err.log</string>
</dict>
</plist>
EOF

  cat >"$LISTENER_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>whalemates-bot-listener</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>$LISTENER_SCRIPT</string>
  </array>
  <key>RunAtLoad</key>
  <false/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/tmp/whalemates-bot-listener.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/whalemates-bot-listener.err.log</string>
</dict>
</plist>
EOF
}

start_console_service() {
  if launchctl print "$USER_DOMAIN/whalemates-chat-console" >/dev/null 2>&1; then
    launchctl bootout "$USER_DOMAIN" "$CONSOLE_PLIST" >/dev/null 2>&1 || true
  fi
  launchctl bootstrap "$USER_DOMAIN" "$CONSOLE_PLIST" >/dev/null 2>&1 || true
  launchctl kickstart -k "$USER_DOMAIN/whalemates-chat-console"
}

wait_for_console() {
  local deadline
  deadline=$((SECONDS + 18))
  while (( SECONDS < deadline )); do
    if /usr/bin/curl -fsS "$CONSOLE_HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.35
  done
  echo "Console server did not become ready. Check $LOG_DIR/install.err.log and /tmp/whalemates-chat-console.err.log" >&2
  return 1
}

mkdir -p "$LOG_DIR"
if [[ ! -d "$DEV_DIR/back" || ! -d "$DEV_DIR/front" ]]; then
  echo "Missing dev directory next to the app: $DEV_DIR" >&2
  exit 1
fi

ensure_bootstrap_python
write_service_scripts
write_launch_agents
cleanup_previous_services
start_console_service
wait_for_console
printf '%s\n' "$CONSOLE_URL"
