from pathlib import Path


BACK_DIR = Path(__file__).resolve().parent
DEV_DIR = BACK_DIR.parent
APP_DIR = DEV_DIR.parent
WEB_DIR = DEV_DIR / "front"
SETTINGS_FILE = APP_DIR / "data" / "settings.json"
REQUESTS_FILE = APP_DIR / "data" / "requests.json"
RUNTIME_STATUS_FILE = APP_DIR / "data" / "runtime_status.json"
LAUNCH_AGENT_DIR = Path.home() / "Library" / "LaunchAgents"
