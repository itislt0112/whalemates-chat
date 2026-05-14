"""Access policy for public, allowed, and owner roles."""

from dataclasses import dataclass
from typing import Any

try:
    from .constants import ACCESS_CAPABILITIES
except ImportError:  # Allow running this file directly during local debugging.
    from constants import ACCESS_CAPABILITIES  # type: ignore[no-redef]


@dataclass(frozen=True)
class AccessDecision:
    allowed: bool
    role: str
    capabilities: set[str]
    reason: str = ""


def access_capabilities_for_role(role: str) -> set[str]:
    legacy_map = {
        "allowed_user": "admin",
        "allowed_channel": "admin",
        "bot_admin": "admin",
        "bot_owner": "owner",
        "channel_owner": "admin",
        "member": "member",
    }
    normalized = legacy_map.get(str(role or "public"), str(role or "public"))
    return set(ACCESS_CAPABILITIES.get(normalized, set()))


def telegram_bot_is_public(settings: dict, bot_key: str) -> bool:
    bot = settings["services"]["telegram"]["bots"].get(bot_key, {})
    return bool(bot.get("public", False))


def telegram_bot_target_records(settings: dict, bot_key: str) -> list[dict]:
    bot = settings["services"]["telegram"]["bots"].get(bot_key, {})
    allowed = bot.get("allowed", {})
    return list(allowed.get("chats", [])) + list(allowed.get("channels", []))


def resolve_bot_access(
    settings: dict,
    bot_key: str,
    chat_id: str,
    action: str = "message",
) -> AccessDecision:
    target_id = str(chat_id)
    for record in telegram_bot_target_records(settings, bot_key):
        if str(record.get("id")) != target_id:
            continue

        role = str(record.get("role") or "public")
        role = {
            "allowed_user": "admin",
            "allowed_channel": "admin",
            "bot_admin": "admin",
            "bot_owner": "owner",
            "channel_owner": "admin",
            "member": "member",
        }.get(role, role)
        if not record.get("enabled", True):
            return AccessDecision(
                allowed=False,
                role=role,
                capabilities=set(),
                reason="target_disabled",
            )

        capabilities = access_capabilities_for_role(role)
        return AccessDecision(
            allowed=action in capabilities,
            role=role,
            capabilities=capabilities,
            reason="" if action in capabilities else "action_not_allowed",
        )

    return AccessDecision(
        allowed=False,
        role="public",
        capabilities=set(),
        reason="target_not_allowed",
    )


def is_chat_allowed(config: Any, chat_id: str, bot: Any | None = None) -> bool:
    try:
        from .runtime import load_settings, resolve_telegram_bot_id
    except ImportError:  # Allow running this file directly during local debugging.
        from runtime import load_settings, resolve_telegram_bot_id  # type: ignore[no-redef]

    settings = load_settings()
    bot_id = bot.bot_id if bot else resolve_telegram_bot_id(settings, None)
    return resolve_bot_access(settings, bot_id, chat_id, "message").allowed
