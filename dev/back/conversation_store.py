"""conversations.json persistence and conversation key helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    from .json_store import read_json_object, write_json_object
except ImportError:  # Allow running this file directly during local debugging.
    from json_store import read_json_object, write_json_object  # type: ignore[no-redef]


def conversation_key(bot: Any | None, chat_id: str) -> str:
    target_id = str(chat_id).strip()
    bot_id = str(getattr(bot, "bot_id", "") or "").strip()
    if bot_id and bot_id != "default":
        return f"{bot_id}:{target_id}"
    return target_id


def split_conversation_key(key: str) -> tuple[str | None, str]:
    value = str(key or "").strip()
    if ":" not in value:
        return None, value
    bot_id, target_id = value.split(":", 1)
    if bot_id and target_id:
        return bot_id, target_id
    return None, value


def conversation_target_id(key: str, turns: list[dict] | None = None) -> str:
    _, target_id = split_conversation_key(key)
    if target_id:
        return target_id
    for turn in turns or []:
        for source_key in ("target", "sender"):
            source = turn.get(source_key)
            if isinstance(source, dict) and source.get("id"):
                return str(source["id"])
        if turn.get("chat_id"):
            return str(turn["chat_id"])
    return str(key)


def conversation_bot_id(key: str, turns: list[dict] | None = None) -> str:
    scoped_bot_id, _ = split_conversation_key(key)
    if scoped_bot_id:
        return scoped_bot_id
    for turn in reversed(turns or []):
        bot_id = str(turn.get("bot_id") or "").strip()
        if bot_id and bot_id != "default":
            return bot_id
    return "default"


def normalize_conversation_state(state: dict[str, Any]) -> None:
    chats = state.get("chats")
    if not isinstance(chats, dict):
        state["chats"] = {}
        return

    normalized: dict[str, list[dict]] = {}
    for stored_key, turns in chats.items():
        if not isinstance(turns, list):
            continue
        key_text = str(stored_key)
        if not turns:
            normalized.setdefault(key_text, [])
            continue
        scoped_bot_id, scoped_target_id = split_conversation_key(key_text)
        legacy_target_id = scoped_target_id if scoped_bot_id else key_text

        for turn in turns:
            if not isinstance(turn, dict):
                continue
            target_id = str(
                turn.get("chat_id")
                or (turn.get("target") or {}).get("id")
                or (turn.get("sender") or {}).get("id")
                or legacy_target_id
            )
            turn.setdefault("chat_id", target_id)
            bot_id = str(turn.get("bot_id") or scoped_bot_id or "").strip()
            next_key = f"{bot_id}:{target_id}" if bot_id and bot_id != "default" else target_id
            normalized.setdefault(next_key, []).append(turn)

    for turns in normalized.values():
        turns.sort(key=lambda turn: str(turn.get("created_at") or ""))
    state["chats"] = normalized


def resolve_conversation_storage_key(
    state: dict[str, Any],
    chat_id: str,
    bot: Any | None = None,
) -> str:
    requested = str(chat_id).strip()
    chats = state.get("chats", {})
    if requested in chats:
        return requested
    if bot:
        scoped = conversation_key(bot, requested)
        if scoped in chats:
            return scoped
    matches = [
        key for key, turns in chats.items()
        if conversation_target_id(key, turns if isinstance(turns, list) else []) == requested
    ]
    if bot:
        bot_id = str(getattr(bot, "bot_id", "") or "").strip()
        scoped_matches = [key for key in matches if conversation_bot_id(key, chats.get(key, [])) == bot_id]
        if scoped_matches:
            return sorted(
                scoped_matches,
                key=lambda key: str((chats.get(key) or [{}])[-1].get("created_at") or ""),
                reverse=True,
            )[0]
    if matches:
        return sorted(
            matches,
            key=lambda key: str((chats.get(key) or [{}])[-1].get("created_at") or ""),
            reverse=True,
        )[0]
    return conversation_key(bot, requested)


def load_state(path: Path) -> dict[str, Any]:
    state = read_json_object(path, {"chats": {}, "model_sessions": {}})
    state.setdefault("chats", {})
    state.setdefault("model_sessions", {})
    normalize_conversation_state(state)
    return state


def save_state(path: Path, state: dict[str, Any]) -> None:
    normalize_conversation_state(state)
    write_json_object(path, state)
