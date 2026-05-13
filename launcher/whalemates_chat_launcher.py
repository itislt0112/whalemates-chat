from __future__ import annotations

import os
import hashlib
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
DEV_DIR = APP_DIR / "dev"
DATA_DIR = APP_DIR / "data"
LOG_DIR = DATA_DIR / "launcher-logs"
VENV_DIR = APP_DIR / ".venv"
REQUIREMENTS_FILE = DEV_DIR / "requirements.txt"
REQUIREMENTS_STAMP_FILE = VENV_DIR / ".requirements.sha256"

CONSOLE_HOST = "127.0.0.1"
CONSOLE_PORT = 8765
CONSOLE_WS_PORT = 8766
CONSOLE_URL = f"http://{CONSOLE_HOST}:{CONSOLE_PORT}/chat.html"
APP_LOGIN_URL = f"http://{CONSOLE_HOST}:{CONSOLE_PORT}/app.html"
CONSOLE_HEALTH_URL = f"http://{CONSOLE_HOST}:{CONSOLE_PORT}/api/auth/session"


class ConsoleLaunchError(RuntimeError):
    pass


def python_executable() -> Path | str:
    venv_python = VENV_DIR / "bin" / "python"
    if venv_python.exists():
        return venv_python
    return shutil.which("python3") or sys.executable or "python3"


def bootstrap_python_executable() -> str:
    return shutil.which("python3") or sys.executable or "python3"


def requirements_hash() -> str:
    if not REQUIREMENTS_FILE.exists():
        return ""
    return hashlib.sha256(REQUIREMENTS_FILE.read_bytes()).hexdigest()


def run_setup_command(command: list[str], cwd: Path) -> None:
    result = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        details = (result.stderr or result.stdout or "").strip()
        raise ConsoleLaunchError(details or f"Command failed: {' '.join(command)}")


def ensure_python_environment() -> None:
    venv_python = VENV_DIR / "bin" / "python"
    venv_pip = VENV_DIR / "bin" / "pip"
    if not venv_python.exists():
        run_setup_command([bootstrap_python_executable(), "-m", "venv", str(VENV_DIR)], APP_DIR)

    expected_hash = requirements_hash()
    installed_hash = ""
    if REQUIREMENTS_STAMP_FILE.exists():
        installed_hash = REQUIREMENTS_STAMP_FILE.read_text(encoding="utf-8").strip()
    if REQUIREMENTS_FILE.exists() and expected_hash != installed_hash:
        run_setup_command([str(venv_pip), "install", "-r", str(REQUIREMENTS_FILE)], APP_DIR)
        REQUIREMENTS_STAMP_FILE.write_text(expected_hash + "\n", encoding="utf-8")


def console_is_running(timeout: float = 0.8) -> bool:
    try:
        request = urllib.request.Request(CONSOLE_HEALTH_URL, method="GET")
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return 200 <= response.status < 500
    except (OSError, urllib.error.URLError, TimeoutError):
        return False


def wait_for_console(timeout_seconds: float = 16.0) -> bool:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if console_is_running(timeout=0.8):
            return True
        time.sleep(0.35)
    return False


def start_console() -> dict[str, object]:
    if console_is_running():
        return {
            "started": False,
            "already_running": True,
            "console_url": CONSOLE_URL,
        }

    if not DEV_DIR.exists():
        raise ConsoleLaunchError(f"Missing dev directory: {DEV_DIR}")

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ensure_python_environment()
    stdout_path = LOG_DIR / "console.log"
    stderr_path = LOG_DIR / "console.err.log"

    command = [
        str(python_executable()),
        "-m",
        "back",
        "chat",
        "--host",
        CONSOLE_HOST,
        "--port",
        str(CONSOLE_PORT),
        "--ws-port",
        str(CONSOLE_WS_PORT),
    ]
    env = os.environ.copy()
    env.setdefault("PYTHONUNBUFFERED", "1")

    with stdout_path.open("ab") as stdout, stderr_path.open("ab") as stderr:
        process = subprocess.Popen(
            command,
            cwd=DEV_DIR,
            env=env,
            stdout=stdout,
            stderr=stderr,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )

    if not wait_for_console():
        raise ConsoleLaunchError(
            "Console server did not become ready. "
            f"Check logs: {stderr_path}"
        )

    return {
        "started": True,
        "already_running": False,
        "pid": process.pid,
        "console_url": CONSOLE_URL,
    }


def main() -> int:
    try:
        result = start_console()
    except ConsoleLaunchError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(result.get("console_url") or CONSOLE_URL)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
