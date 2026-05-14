"""Small JSON persistence helpers for local runtime files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def read_json_object(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return dict(fallback)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return dict(fallback)
    return data if isinstance(data, dict) else dict(fallback)


def write_json_object(path: Path, data: dict[str, Any], *, atomic: bool = False) -> None:
    ensure_parent_dir(path)
    payload = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if not atomic:
        path.write_text(payload, encoding="utf-8")
        return
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(payload, encoding="utf-8")
    tmp_path.replace(path)
