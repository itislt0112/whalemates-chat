"""Persistence boundary for approval requests."""

from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    from .json_store import read_json_object, write_json_object
except ImportError:  # Allow running this file directly during local debugging.
    from json_store import read_json_object, write_json_object  # type: ignore[no-redef]


def normalize_requests_document(data: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(data.get("targets"), dict):
        data["targets"] = {}
    return data


def load_requests_document(path: Path) -> dict[str, Any]:
    return normalize_requests_document(read_json_object(path, {"targets": {}}))


def save_requests_document(path: Path, data: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_requests_document(data)
    write_json_object(path, normalized)
    return normalized
