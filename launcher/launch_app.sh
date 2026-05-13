#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$APP_DIR/data/launcher-logs"
LOGIN_URL="http://127.0.0.1:8765/app.html"

mkdir -p "$LOG_DIR"

if ! /usr/bin/python3 "$SCRIPT_DIR/whalemates_chat_launcher.py" >>"$LOG_DIR/launcher.log" 2>>"$LOG_DIR/launcher.err.log"; then
  ERROR_TEXT="$(tail -20 "$LOG_DIR/launcher.err.log" 2>/dev/null | sed 's/"/\\"/g' | tail -1)"
  osascript -e "display dialog \"Console failed to start. ${ERROR_TEXT}\" buttons {\"OK\"} default button \"OK\" with icon caution" >/dev/null 2>&1 || true
  exit 1
fi

open "$LOGIN_URL"
