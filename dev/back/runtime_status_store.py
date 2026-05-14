"""runtime_status.json persistence."""

from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    from .json_store import read_json_object, write_json_object
except ImportError:  # Allow running this file directly during local debugging.
    from json_store import read_json_object, write_json_object  # type: ignore[no-redef]


def normalize_runtime_status_document(status: dict[str, Any]) -> dict[str, Any]:
    status.setdefault("telegram", {})
    status["telegram"].setdefault("bots", {})
    return status


def load_runtime_status_document(path: Path) -> dict[str, Any]:
    return normalize_runtime_status_document(read_json_object(path, {"telegram": {"bots": {}}}))


def save_runtime_status_document(path: Path, status: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_runtime_status_document(status)
    write_json_object(path, normalized, atomic=True)
    return normalized
