#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$APP_ROOT/dist/Whalemates Chat}"
MODE="${2:---dry-run}"

if [[ "$MODE" != "--dry-run" && "$MODE" != "--apply" ]]; then
  echo "Usage: launcher/release_clean.sh [output-dir] [--dry-run|--apply]" >&2
  exit 2
fi

REQUIRED_ITEMS=(
  "dev"
  "launcher"
  "README.md"
  ".env.example"
  ".gitignore"
  "Whalemates Chat.app"
  "Whalemates Chat Updater.app"
  "Whalemates Chat Uninstaller.app"
)

EXCLUDED_ITEMS=(
  ".env"
  ".venv"
  ".DS_Store"
  "__pycache__"
  "*.pyc"
  "*.log"
  "*.pid"
  "*.dmg"
  "build"
  "dist"
  "data/*.json"
  "data/media"
  "data/launcher-logs"
)

echo "Release source: $APP_ROOT"
echo "Release output: $OUTPUT_DIR"
echo
echo "Included top-level items:"
for item in "${REQUIRED_ITEMS[@]}"; do
  if [[ -e "$APP_ROOT/$item" ]]; then
    echo "  + $item"
  else
    echo "  ! missing: $item"
  fi
done
echo
echo "Excluded local/runtime items:"
for item in "${EXCLUDED_ITEMS[@]}"; do
  echo "  - $item"
done

if [[ "$MODE" == "--dry-run" ]]; then
  echo
  echo "Dry run only. Pass --apply to create the clean release folder."
  exit 0
fi

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

for item in "${REQUIRED_ITEMS[@]}"; do
  if [[ -e "$APP_ROOT/$item" ]]; then
    cp -R "$APP_ROOT/$item" "$OUTPUT_DIR/$item"
  fi
done

mkdir -p "$OUTPUT_DIR/data"
touch "$OUTPUT_DIR/data/.gitkeep"

find "$OUTPUT_DIR" -name ".DS_Store" -delete
find "$OUTPUT_DIR" -name "__pycache__" -type d -prune -exec rm -rf {} +
find "$OUTPUT_DIR" -name "*.pyc" -delete
find "$OUTPUT_DIR" -name "*.log" -delete
find "$OUTPUT_DIR" -name "*.pid" -delete
rm -rf "$OUTPUT_DIR/.venv" "$OUTPUT_DIR/.env" "$OUTPUT_DIR/data/media" "$OUTPUT_DIR/data/launcher-logs"
rm -f "$OUTPUT_DIR"/data/*.json

if find "$OUTPUT_DIR" \( -name ".env" -o -name "*.json" -path "*/data/*" -o -path "*/data/media/*" \) | grep -q .; then
  echo "Release safety check failed: runtime data is still present." >&2
  exit 1
fi

echo
echo "Created clean release folder: $OUTPUT_DIR"
