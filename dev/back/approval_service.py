"""Approval requests and allowed Telegram target management."""

from __future__ import annotations

from typing import Any

import requests


def request_key(bot_id: str, target_type: str, target_id: str) -> str:
    return f"{bot_id}:{target_type}:{target_id}"


def record_target_type(record: dict) -> str:
    record_type = str(record.get("target_type") or record.get("type") or "").strip()
    chat_type = str(record.get("chat_type") or "").strip()
    if record_type == "channel" or chat_type == "channel":
        return "channel"
    return "chat"


def record_display_type(rt: Any, record: dict) -> str:
    if record_target_type(record) == "channel":
        return "channel"
    if rt.is_group_chat_type(record.get("chat_type")):
        return "group"
    return "chat"


def normalize_request_filter(target_type: str) -> str:
    value = str(target_type or "chat").strip().lower()
    if value in {"all", "chat", "group", "channel"}:
        return value
    if value in {"user", "users"}:
        return "chat"
    if value in {"groups", "supergroup", "supergroups"}:
        return "group"
    if value in {"channels"}:
        return "channel"
    return "chat"


def remove_request_target_if_exists(rt: Any, 
    bot_id: str,
    target_type: str,
    target_id: str,
) -> bool:
    data = rt.load_requests()
    key = request_key(str(bot_id), str(target_type), str(target_id))
    if key not in data.get("targets", {}):
        return False
    data["targets"].pop(key, None)
    rt.save_requests(data)
    return True


def upsert_request_target(rt: Any, 
    bot_id: str,
    target: dict,
    sender: dict | None = None,
) -> dict:
    target_id = str(target.get("id") or rt.sender_uid(sender, "")).strip()
    target_type = "channel" if target.get("type") == "channel" or target.get("chat_type") == "channel" else "chat"
    if not bot_id or not target_id:
        return {}
    data = rt.load_requests()
    key = request_key(bot_id, target_type, target_id)
    now = rt.utc_now_iso()
    existing = data["targets"].get(key, {})
    label = target_display_label(target, sender, target_id)
    record = {
        **existing,
        "bot_id": bot_id,
        "target_type": target_type,
        "id": target_id,
        "role": "public",
        "status": existing.get("status") or "pending",
        "label": label,
        "username": sender.get("username") if sender else target.get("username"),
        "name": sender.get("name") if sender else target.get("title"),
        "title": target.get("title"),
        "chat_type": target.get("chat_type"),
        "target_username": target.get("username"),
        "first_seen_at": existing.get("first_seen_at") or now,
        "last_request_at": now,
    }
    data["targets"][key] = record
    rt.save_requests(data)
    return record


def target_display_label(target: dict, sender: dict | None, fallback_id: str) -> str:
    chat_type = str(target.get("chat_type") or "").strip()
    if target.get("type") == "channel":
        username = target.get("username")
        title = target.get("title")
        if username:
            return f"Channel @{username}"
        if title:
            return f"Channel {title}"
        return f"Channel {fallback_id}"
    if chat_type in {"group", "supergroup"}:
        username = target.get("username")
        title = target.get("title")
        if username:
            return f"Group @{username}"
        if title:
            return f"Group {title}"
        return f"Group {fallback_id}"
    if sender:
        username = sender.get("username")
        name = sender.get("name")
        if username:
            return f"@{username}"
        if name:
            return str(name)
    return f"Chat {fallback_id}"


def channel_target_from_record(channel_id: str, record: dict | None = None) -> dict:
    record = record or {}
    username = str(record.get("channel_username") or record.get("target_username") or "").strip()
    label = str(record.get("label") or "").strip()
    if not username and label.startswith("Channel @"):
        username = label.removeprefix("Channel @").strip()
    return {
        "id": str(channel_id),
        "type": "channel",
        "chat_type": "channel",
        "title": record.get("title") or record.get("name"),
        "username": username or None,
    }


def chat_target_from_record(chat_id: str, record: dict | None = None) -> dict:
    record = record or {}
    chat_type = str(record.get("chat_type") or "private").strip() or "private"
    username = str(record.get("target_username") or record.get("username") or "").strip()
    return {
        "id": str(chat_id),
        "type": "chat",
        "chat_type": chat_type,
        "title": record.get("title") or record.get("name"),
        "username": username or None,
    }


def approval_record_exists(rt, settings: dict, bot_id: str, target_type: str, target_id: str) -> bool:
    bot = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot_id, {})
    key = "channels" if target_type == "channel" else "chats"
    return any(str(record.get("id")) == str(target_id) for record in bot.get("allowed", {}).get(key, []))


def list_request_targets(rt: Any, 
    bot_id: str,
    target_type: str = "chat",
    status: str = "pending",
    query: str = "",
    page: int = 1,
    page_size: int = 30,
) -> dict:
    settings = rt.load_settings()
    data = rt.load_requests()
    normalized_type = normalize_request_filter(target_type)
    normalized_query = query.strip().lower()
    items = []
    for record in data.get("targets", {}).values():
        if str(record.get("bot_id")) != str(bot_id):
            continue
        record_type = record_target_type(record)
        display_type = record_display_type(rt, record)
        if normalized_type != "all" and display_type != normalized_type:
            continue
        approved = approval_record_exists(rt, 
            settings,
            bot_id,
            record_type,
            str(record.get("id") or ""),
        )
        if approved:
            continue
        haystack = " ".join(
            str(record.get(key) or "")
            for key in ["id", "label", "username", "name", "title"]
        ).lower()
        if normalized_query and normalized_query not in haystack:
            continue
        items.append({**record, "target_type": display_type, "status": "pending", "approved": False})
    items.sort(key=lambda item: str(item.get("last_request_at") or item.get("last_seen_at") or ""), reverse=True)
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    start = (page - 1) * page_size
    paged = items[start:start + page_size]
    return {
        "items": paged,
        "page": page,
        "page_size": page_size,
        "total": len(items),
        "has_more": start + page_size < len(items),
    }


def request_counts_by_bot(rt: Any, settings: dict | None = None) -> dict:
    settings = settings or rt.load_settings()
    data = rt.load_requests()
    counts: dict[str, dict[str, int]] = {}
    for record in data.get("targets", {}).values():
        bot_id = str(record.get("bot_id") or "")
        target_type = record_target_type(record)
        display_type = record_display_type(rt, record)
        target_id = str(record.get("id") or "")
        if not bot_id or not target_id:
            continue
        if approval_record_exists(rt, settings, bot_id, target_type, target_id):
            continue
        bot_counts = counts.setdefault(bot_id, {"total": 0, "chat": 0, "group": 0, "channel": 0})
        bot_counts["total"] += 1
        bot_counts[display_type] += 1
    return counts


def approve_request_target(rt: Any, bot_id: str, target_type: str, target_id: str, config: Any | None = None) -> dict:
    settings = rt.load_settings()
    resolved_bot_id = rt.resolve_telegram_bot_id(settings, bot_id)
    target_type = "channel" if str(target_type or "").strip() == "channel" else "chat"
    target_id = str(target_id).strip()
    if not target_id:
        raise ValueError("Missing target id")
    bot = settings["services"]["telegram"]["bots"][resolved_bot_id]
    allowed = bot.setdefault("allowed", {"chats": [], "channels": []})
    key = "channels" if target_type == "channel" else "chats"
    default_role = "allowed_channel" if target_type == "channel" else "allowed_user"
    records = rt.normalize_target_records(allowed.get(key, []), default_role)
    data = rt.load_requests()
    record = data["targets"].get(request_key(resolved_bot_id, target_type, target_id))
    if not any(str(record.get("id")) == target_id for record in records):
        request_metadata = {
            field: record.get(field)
            for field in ("chat_type", "title", "username", "target_username")
            if isinstance(record, dict) and record.get(field)
        }
        records.append(
            {
                "id": target_id,
                "role": "admin" if target_type == "channel" else "public",
                "enabled": True,
                "added_at": rt.utc_now_iso(),
                **request_metadata,
            }
        )
    allowed[key] = records
    rt.save_settings(settings)
    if record:
        data["targets"].pop(request_key(resolved_bot_id, target_type, target_id), None)
        rt.save_requests(data)
    if config:
        updated_settings = rt.load_settings()
        message_text_value = rt.telegram_message(updated_settings, "approval_success")
        rt.notify_bot_targets(
            config,
            updated_settings,
            resolved_bot_id,
            [target_id],
            message_text_value,
        )
    return rt.load_settings()


def telegram_leave_chat_or_already_left(rt: Any, 
    config: Any,
    bot: Any,
    target_id: str,
) -> None:
    try:
        rt.telegram_api(config, "leaveChat", {"chat_id": target_id}, bot)
    except requests.HTTPError as exc:
        response = exc.response
        message = ""
        if response is not None:
            try:
                message = str(response.json().get("description") or "")
            except ValueError:
                message = str(response.text or "")
        lower_message = message.lower()
        if (
            "bot is not a member" in lower_message
            or "chat not found" in lower_message
            or "member list is inaccessible" in lower_message
        ):
            return
        raise
    except RuntimeError as exc:
        lower_message = str(exc).lower()
        if "bot is not a member" in lower_message or "chat not found" in lower_message:
            return
        raise


def remove_allowed_target(rt: Any, 
    bot_id: str,
    target_type: str,
    target_id: str,
    config: Any,
) -> dict:
    settings = rt.load_settings()
    resolved_bot_id = rt.resolve_telegram_bot_id(settings, bot_id)
    target_type = "channel" if str(target_type or "").strip() == "channel" else "chat"
    target_id = str(target_id or "").strip()
    if not target_id:
        raise ValueError("Missing target id")

    bot_settings = settings["services"]["telegram"]["bots"][resolved_bot_id]
    allowed = bot_settings.setdefault("allowed", {"chats": [], "channels": []})
    key = "channels" if target_type == "channel" else "chats"
    default_role = "allowed_channel" if target_type == "channel" else "allowed_user"
    records = rt.normalize_target_records(allowed.get(key, []), default_role)
    record = next((item for item in records if str(item.get("id")) == target_id), None)
    is_group = target_type == "chat" and record and rt.is_group_chat_type(record.get("chat_type"))

    if target_type == "channel" or is_group:
        bot_runtime = rt.bot_runtime_from_settings(resolved_bot_id, bot_settings)
        telegram_leave_chat_or_already_left(rt, config, bot_runtime, target_id)

    allowed[key] = [item for item in records if str(item.get("id")) != target_id]
    statuses = rt.normalize_channel_status_records(bot_settings.get("group_channel_statuses"))
    statuses.pop(target_id, None)
    bot_settings["group_channel_statuses"] = statuses
    remove_request_target_if_exists(rt, resolved_bot_id, target_type, target_id)
    rt.save_settings(settings)
    rt.remove_conversations(config, [target_id], resolved_bot_id)
    rt.notify_console_update(config, target_id)
    rt.notify_console_settings_update(config)
    return rt.load_settings()


def ensure_local_target_conversation(rt: Any, 
    config: Any,
    settings: dict,
    bot_id: str,
    target_id: str,
) -> None:
    bot_settings = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot_id)
    if not isinstance(bot_settings, dict):
        return
    bot = rt.bot_runtime_from_settings(bot_id, bot_settings)
    storage_key = rt.conversation_key(bot, target_id)
    state = rt.load_state(config.state_file)
    if storage_key in state.get("chats", {}):
        return
    state.setdefault("chats", {})[storage_key] = []
    rt.save_state(config.state_file, state)
    rt.notify_console_update(config, storage_key)


def reject_request_target(rt: Any, 
    bot_id: str,
    target_type: str,
    target_id: str,
    config: Any | None = None,
) -> dict:
    settings = rt.load_settings()
    resolved_bot_id = rt.resolve_telegram_bot_id(settings, bot_id)
    target_type = "chat"
    target_id = str(target_id).strip()
    data = rt.load_requests()
    key = request_key(resolved_bot_id, target_type, target_id)
    record = data["targets"].get(key)
    if not record:
        raise ValueError("Unknown request target")
    data["targets"].pop(key, None)
    rt.save_requests(data)
    if config:
        rt.notify_bot_targets(
            config,
            settings,
            resolved_bot_id,
            [target_id],
            rt.telegram_message(settings, "apply_rejected_user"),
        )
    return record


def target_records_from_payload(rt: Any, records: list[str | dict], default_role: str) -> list[dict]:
    return rt.normalize_target_records(records, default_role)


def upsert_discovered_target(rt: Any, 
    bot_id: str | None,
    chat: dict,
    status: object,
    enabled_default: bool = False,
) -> dict:
    settings = rt.load_settings()
    resolved_bot_id = rt.resolve_telegram_bot_id(settings, bot_id)
    target = rt.target_from_chat(chat)
    target_id = str(target.get("id") or "").strip()
    if not target_id:
        return settings

    normalized_status = rt.normalize_channel_runtime_status(status)
    bot = settings["services"]["telegram"]["bots"][resolved_bot_id]
    allowed = bot.setdefault("allowed", {"chats": [], "channels": []})
    key = "channels" if target.get("type") == "channel" else "chats"
    default_role = "allowed_channel" if key == "channels" else "allowed_user"
    records = rt.normalize_target_records(allowed.get(key, []), default_role)
    existing = next((record for record in records if str(record.get("id")) == target_id), None)
    if normalized_status == "left" and not existing:
        # A left event after a manual local Remove must not recreate the target.
        return settings
    metadata = {
        field: target.get(field)
        for field in ("chat_type", "title", "username")
        if target.get(field)
    }

    if existing:
        existing.update(metadata)
        if normalized_status == "left" or (key == "channels" and normalized_status != "admin"):
            existing["enabled"] = False
    else:
        role = "member" if key == "channels" else "public"
        records.append(
            {
                "id": target_id,
                "role": role,
                "enabled": False if normalized_status == "left" else bool(enabled_default),
                "added_at": rt.utc_now_iso(),
                **metadata,
            }
        )

    allowed[key] = records
    statuses = rt.normalize_channel_status_records(
        bot.get("group_channel_statuses") or bot.get("channel_statuses")
    )
    statuses[target_id] = {
        "status": normalized_status,
        "updated_at": rt.utc_now_iso(),
        **{
            field: target.get(field)
            for field in ("chat_type", "title", "username")
            if target.get(field)
        },
    }
    bot["group_channel_statuses"] = statuses
    remove_request_target_if_exists(rt, resolved_bot_id, target.get("type") or "chat", target_id)
    rt.save_settings(settings)
    return rt.load_settings()


def save_allowed_targets(rt: Any, 
    user_ids: list,
    channel_ids: list,
    bot_id: str | None = None,
    config: Any | None = None,
    disabled_message_key: str | None = None,
    notify_removed: bool = True,
) -> None:
    settings = rt.load_settings()
    bots = settings["services"]["telegram"]["bots"]
    resolved_bot_id = rt.resolve_telegram_bot_id(settings, bot_id)
    allowed = bots[resolved_bot_id].setdefault("allowed", {})

    before_chats = target_records_from_payload(rt, 
        allowed.get("chats", []),
        "allowed_user",
    )
    before_channels = target_records_from_payload(rt, 
        allowed.get("channels", []),
        "allowed_channel",
    )
    after_chats = target_records_from_payload(rt, user_ids, "allowed_user")
    after_channels = target_records_from_payload(rt, channel_ids, "allowed_channel")

    before_enabled = target_enabled_ids(before_chats + before_channels)
    before_all = target_all_ids(before_chats + before_channels)
    after_enabled = target_enabled_ids(after_chats + after_channels)
    after_all = target_all_ids(after_chats + after_channels)
    before_chat_roles = {
        str(record["id"]): rt.normalize_approval_role(record.get("role"), "chat")
        for record in before_chats
    }
    after_chat_roles = {
        str(record["id"]): rt.normalize_approval_role(record.get("role"), "chat")
        for record in after_chats
    }
    after_private_chat_ids = {
        str(record["id"])
        for record in after_chats
        if not rt.is_group_chat_type(record.get("chat_type"))
    }

    allowed["chats"] = after_chats
    allowed["channels"] = after_channels
    rt.save_settings(settings)

    removed_targets = sorted(before_all - after_all)
    if config:
        if removed_targets and notify_removed:
            rt.notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                removed_targets,
                rt.telegram_message(settings, "approval_removed"),
            )
        if removed_targets:
            rt.remove_conversations(config, removed_targets, resolved_bot_id)
        enabled_targets = sorted(after_enabled - before_enabled)
        disabled_targets = sorted((before_enabled & after_all) - after_enabled)
        private_enabled_targets = sorted(set(enabled_targets) & after_private_chat_ids)
        private_disabled_targets = sorted(set(disabled_targets) & after_private_chat_ids)
        if private_enabled_targets:
            rt.notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                private_enabled_targets,
                rt.telegram_message(settings, "assistant_online"),
            )
        if private_disabled_targets:
            rt.notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                private_disabled_targets,
                rt.telegram_message(settings, disabled_message_key or "assistant_offline"),
            )
        group_channel_enabled_targets = sorted(
            set(enabled_targets)
            & (
                {str(record["id"]) for record in after_channels}
                | {
                    str(record["id"])
                    for record in after_chats
                    if rt.is_group_chat_type(record.get("chat_type"))
                }
            )
        )
        for target_id in group_channel_enabled_targets:
            ensure_local_target_conversation(rt, config, settings, resolved_bot_id, target_id)
        role_changed_targets = sorted(
            before_enabled
            & after_enabled
            & set(before_chat_roles)
            & set(after_chat_roles)
        )
        for target_id in role_changed_targets:
            from_role = before_chat_roles[target_id]
            to_role = after_chat_roles[target_id]
            direction = role_change_direction(rt, from_role, to_role)
            if not direction:
                continue
            rt.notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                [target_id],
                rt.telegram_message(
                    settings,
                    "role_upgrade_user" if direction == "upgrade" else "role_downgrade_user",
                    from_role=role_message_label(rt, from_role),
                    to_role=role_message_label(rt, to_role),
                ),
            )


def target_enabled_ids(records: list[dict]) -> set[str]:
    return {str(record["id"]) for record in records if record.get("enabled", True)}


def target_all_ids(records: list[dict]) -> set[str]:
    return {str(record["id"]) for record in records}


ROLE_RANKS = {
    "public": 0,
    "admin": 1,
    "owner": 2,
}


def role_change_direction(rt: Any, from_role: str, to_role: str) -> str | None:
    from_rank = ROLE_RANKS.get(rt.normalize_approval_role(from_role), 0)
    to_rank = ROLE_RANKS.get(rt.normalize_approval_role(to_role), 0)
    if to_rank > from_rank:
        return "upgrade"
    if to_rank < from_rank:
        return "downgrade"
    return None


def role_message_label(rt: Any, role: str) -> str:
    return {
        "owner": "Owner",
        "admin": "Admin",
        "public": "Public",
    }.get(rt.normalize_approval_role(role), "Public")
