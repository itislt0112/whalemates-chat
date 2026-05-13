#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="${1:-Whalemates Chat}"
APP_BUNDLE="$APP_ROOT/$APP_NAME.app"
ICON_FILE="$SCRIPT_DIR/whalemates.icns"
TMP_SCRIPT="$(mktemp)"
REQUIREMENTS_SOURCE="$APP_ROOT/dev/requirements.txt"
REQUIREMENTS_HASH=""
REQUIREMENTS_B64=""

if [[ -f "$REQUIREMENTS_SOURCE" ]]; then
  REQUIREMENTS_HASH="$(/usr/bin/shasum -a 256 "$REQUIREMENTS_SOURCE" | awk '{print $1}')"
  REQUIREMENTS_B64="$(/usr/bin/base64 <"$REQUIREMENTS_SOURCE" | tr -d '\n')"
fi

cat >"$TMP_SCRIPT" <<'APPLESCRIPT'
set appBundlePath to POSIX path of (path to me)
set installerScript to appBundlePath & "Contents/Resources/install_console.sh"
set loginUrl to "http://127.0.0.1:8765/app.html"
try
	do shell script "/bin/bash " & quoted form of installerScript
on error errorMessage
	display dialog "Console failed to start. " & errorMessage buttons {"OK"} default button "OK" with icon caution
	return
end try
do shell script "open " & quoted form of loginUrl
quit
APPLESCRIPT

rm -rf "$APP_BUNDLE"
osacompile -o "$APP_BUNDLE" "$TMP_SCRIPT"
rm -f "$TMP_SCRIPT"

cat >"$APP_BUNDLE/Contents/Resources/install_console.sh" <<INSTALLER
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="\$(cd "\$SCRIPT_DIR/../../.." && pwd)"
DEV_DIR="\$APP_ROOT/dev"
LOG_DIR="\${TMPDIR:-/tmp}/whalemates-chat-console-launcher"
VENV_DIR="\$APP_ROOT/.venv"
EMBEDDED_REQUIREMENTS_HASH="$REQUIREMENTS_HASH"
EMBEDDED_REQUIREMENTS_B64="$REQUIREMENTS_B64"
CONSOLE_SCRIPT="\$HOME/.whalemates-chat-console.sh"
LISTENER_SCRIPT="\$HOME/.whalemates-bot-listener.sh"
LAUNCH_AGENT_DIR="\$HOME/Library/LaunchAgents"
CONSOLE_PLIST="\$LAUNCH_AGENT_DIR/whalemates-chat-console.plist"
LISTENER_PLIST="\$LAUNCH_AGENT_DIR/whalemates-bot-listener.plist"
USER_DOMAIN="gui/\$(id -u)"
CONSOLE_URL="http://127.0.0.1:8765/app.html"
CONSOLE_HEALTH_URL="http://127.0.0.1:8765/api/auth/session"

quote_sed() {
  printf '%s' "\$1" | sed 's/[\/&]/\\&/g'
}

run_setup_command() {
  "\$@" >>"\$LOG_DIR/install.log" 2>>"\$LOG_DIR/install.err.log"
}

ensure_bootstrap_python() {
  local candidate
  BOOTSTRAP_PYTHON=""
  for candidate in \\
    /opt/homebrew/bin/python3 \\
    /usr/local/bin/python3 \\
    /Library/Frameworks/Python.framework/Versions/Current/bin/python3 \\
    /usr/bin/python3; do
    if [[ -x "\$candidate" ]] && "\$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      BOOTSTRAP_PYTHON="\$candidate"
      return 0
    fi
  done
  echo "Python 3.10 or newer is required. Install it with: brew install python. Or download Python for macOS from https://www.python.org/downloads/macos/. Then open Whalemates Chat again." >&2
  return 1
}

write_service_scripts() {
  local requirements_hash requirements_b64 bootstrap_python
  requirements_hash="\$EMBEDDED_REQUIREMENTS_HASH"
  requirements_b64="\$EMBEDDED_REQUIREMENTS_B64"
  bootstrap_python="\$BOOTSTRAP_PYTHON"

  cat >"\$CONSOLE_SCRIPT" <<EOF
#!/bin/zsh
set -euo pipefail
LOG_DIR="\${TMPDIR:-/tmp}/whalemates-chat-console-launcher"
mkdir -p "\$LOG_DIR"
BOOTSTRAP_PYTHON="\$bootstrap_python"
if [[ -x "\$VENV_DIR/bin/python" ]] && "\$VENV_DIR/bin/python" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
  :
else
  rm -rf "\$VENV_DIR"
  "\$bootstrap_python" -m venv "\$VENV_DIR" >>"\$LOG_DIR/service-install.log" 2>>"\$LOG_DIR/service-install.err.log"
fi
if [[ -n "\$requirements_b64" ]]; then
  printf '%s' "\$requirements_b64" | /usr/bin/base64 --decode >"\$LOG_DIR/requirements.txt"
  PIP_DISABLE_PIP_VERSION_CHECK=1 "\$VENV_DIR/bin/python" -m pip install -r "\$LOG_DIR/requirements.txt" >>"\$LOG_DIR/service-install.log" 2>>"\$LOG_DIR/service-install.err.log"
fi
cd "\$DEV_DIR"
exec "\$VENV_DIR/bin/python" -u -m back chat --host 127.0.0.1 --port 8765 --ws-port 8766
EOF

  cat >"\$LISTENER_SCRIPT" <<EOF
#!/bin/zsh
set -euo pipefail
LOG_DIR="\${TMPDIR:-/tmp}/whalemates-chat-console-launcher"
mkdir -p "\$LOG_DIR"
BOOTSTRAP_PYTHON="\$bootstrap_python"
if [[ -x "\$VENV_DIR/bin/python" ]] && "\$VENV_DIR/bin/python" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
  :
else
  rm -rf "\$VENV_DIR"
  "\$bootstrap_python" -m venv "\$VENV_DIR" >>"\$LOG_DIR/service-install.log" 2>>"\$LOG_DIR/service-install.err.log"
fi
if [[ -n "\$requirements_b64" ]]; then
  printf '%s' "\$requirements_b64" | /usr/bin/base64 --decode >"\$LOG_DIR/requirements.txt"
  PIP_DISABLE_PIP_VERSION_CHECK=1 "\$VENV_DIR/bin/python" -m pip install -r "\$LOG_DIR/requirements.txt" >>"\$LOG_DIR/service-install.log" 2>>"\$LOG_DIR/service-install.err.log"
fi
cd "\$DEV_DIR"
exec "\$VENV_DIR/bin/python" -u -m back listen
EOF

  chmod +x "\$CONSOLE_SCRIPT" "\$LISTENER_SCRIPT"
}

write_launch_agents() {
  mkdir -p "\$LAUNCH_AGENT_DIR"

  cat >"\$CONSOLE_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>whalemates-chat-console</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>\$CONSOLE_SCRIPT</string>
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

  cat >"\$LISTENER_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>whalemates-bot-listener</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>\$LISTENER_SCRIPT</string>
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
  if launchctl print "\$USER_DOMAIN/whalemates-chat-console" >/dev/null 2>&1; then
    launchctl bootout "\$USER_DOMAIN" "\$CONSOLE_PLIST" >/dev/null 2>&1 || true
  fi
  launchctl bootstrap "\$USER_DOMAIN" "\$CONSOLE_PLIST" >/dev/null 2>&1 || true
  launchctl kickstart -k "\$USER_DOMAIN/whalemates-chat-console"
}

wait_for_console() {
  local deadline
  deadline=\$((SECONDS + 18))
  while (( SECONDS < deadline )); do
    if /usr/bin/curl -fsS "\$CONSOLE_HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.35
  done
  echo "Console server did not become ready. Check \$LOG_DIR/install.err.log and /tmp/whalemates-chat-console.err.log" >&2
  return 1
}

mkdir -p "\$LOG_DIR"
if [[ ! -d "\$DEV_DIR/back" || ! -d "\$DEV_DIR/front" ]]; then
  echo "Missing dev directory next to the app: \$DEV_DIR" >&2
  exit 1
fi

ensure_bootstrap_python
write_service_scripts
write_launch_agents
start_console_service
wait_for_console
printf '%s\n' "\$CONSOLE_URL"
INSTALLER
chmod +x "$APP_BUNDLE/Contents/Resources/install_console.sh"

if [[ -f "$ICON_FILE" ]]; then
  cp "$ICON_FILE" "$APP_BUNDLE/Contents/Resources/whalemates.icns"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile whalemates" "$APP_BUNDLE/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Delete :CFBundleIconName" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null || true
  touch "$APP_BUNDLE"
fi

echo "Created $APP_BUNDLE"
