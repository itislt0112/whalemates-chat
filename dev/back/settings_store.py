"""Persistence boundary for settings.json."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

try:
    from .json_store import write_json_object
except ImportError:  # Allow running this file directly during local debugging.
    from json_store import write_json_object  # type: ignore[no-redef]


SettingsFactory = Callable[[], dict[str, Any]]
SettingsNormalizer = Callable[[dict[str, Any]], dict[str, Any]]


def load_settings_document(
    path: Path,
    default_factory: SettingsFactory,
    normalizer: SettingsNormalizer,
) -> dict[str, Any]:
    if not path.exists():
        data = default_factory()
        save_settings_document(path, data, normalizer)
        return normalizer(data)

    try:
        import json

        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    return normalizer(data)


def save_settings_document(
    path: Path,
    settings: dict[str, Any],
    normalizer: SettingsNormalizer,
) -> dict[str, Any]:
    data = normalizer(settings)
    write_json_object(path, data)
    return data
