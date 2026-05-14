"""Telegram Bot API client helpers."""

from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

import requests

try:
    from .constants import TELEGRAM_API_BASE
except ImportError:  # Allow running this file directly during local debugging.
    from constants import TELEGRAM_API_BASE  # type: ignore[no-redef]


def bot_token(config: Any, bot: Any | None = None) -> str:
    token = getattr(bot, "token", "") if bot else getattr(config, "bot_token", "")
    token = str(token or "").strip()
    if not token:
        raise RuntimeError("Missing Telegram bot token")
    return token


def telegram_api(
    config: Any,
    method: str,
    payload: dict | None = None,
    bot: Any | None = None,
) -> dict:
    token = bot_token(config, bot)
    url = f"{TELEGRAM_API_BASE}/bot{token}/{method}"
    response = requests.post(url, json=payload or {}, timeout=30)
    response.raise_for_status()
    data = response.json()

    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error: {data}")

    return data


def telegram_upload_api(
    config: Any,
    method: str,
    payload: dict,
    field_name: str,
    file_path: Path,
    bot: Any | None = None,
) -> dict:
    token = bot_token(config, bot)
    if not file_path.exists() or not file_path.is_file():
        raise FileNotFoundError(f"Telegram media file does not exist: {file_path}")

    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    url = f"{TELEGRAM_API_BASE}/bot{token}/{method}"
    with file_path.open("rb") as file_obj:
        files = {field_name: (file_path.name, file_obj, content_type)}
        response = requests.post(url, data=payload, files=files, timeout=120)
    response.raise_for_status()
    data = response.json()

    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error: {data}")

    return data


def telegram_file_info(config: Any, file_id: str, bot: Any | None = None) -> dict:
    return telegram_api(config, "getFile", {"file_id": file_id}, bot).get("result", {})


def download_telegram_file(
    config: Any,
    file_id: str,
    destination: Path,
    bot: Any | None = None,
) -> tuple[Path, str, int]:
    file_info = telegram_file_info(config, file_id, bot)
    file_path = str(file_info.get("file_path") or "").strip()
    token = bot_token(config, bot)
    if not file_path:
        raise RuntimeError("Telegram file path is not available")

    destination.parent.mkdir(parents=True, exist_ok=True)
    url = f"{TELEGRAM_API_BASE}/file/bot{token}/{file_path}"
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    destination.write_bytes(response.content)
    content_type = response.headers.get("Content-Type") or mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
    return destination, content_type, len(response.content)
