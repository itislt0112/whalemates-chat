import argparse
import asyncio
import base64
from contextlib import contextmanager
from datetime import datetime, timezone
from email.parser import BytesParser
from email import policy
import hashlib
import hmac
from http.cookies import SimpleCookie
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import requests
import websockets
from dotenv import load_dotenv

try:
    from .access_policy import (
        AccessDecision,
        is_chat_allowed,
        resolve_bot_access,
    )
    from .constants import (
        ASSISTANT_OFFLINE_TEXT,
        ASSISTANT_ONLINE_TEXT,
        GENERIC_BRIDGE_ERROR_TEXT,
        HELP_TEXT,
        TELEGRAM_API_BASE,
    )
    from .paths import APP_DIR, LAUNCH_AGENT_DIR, REQUESTS_FILE, RUNTIME_STATUS_FILE, SETTINGS_FILE, WEB_DIR
except ImportError:  # Allow running this file directly during local debugging.
    from access_policy import (  # type: ignore[no-redef]
        AccessDecision,
        is_chat_allowed,
        resolve_bot_access,
    )
    from constants import (  # type: ignore[no-redef]
        ASSISTANT_OFFLINE_TEXT,
        ASSISTANT_ONLINE_TEXT,
        GENERIC_BRIDGE_ERROR_TEXT,
        HELP_TEXT,
        TELEGRAM_API_BASE,
    )
    from paths import APP_DIR, LAUNCH_AGENT_DIR, REQUESTS_FILE, RUNTIME_STATUS_FILE, SETTINGS_FILE, WEB_DIR  # type: ignore[no-redef]

RUNTIME_STATUS_LOCK = threading.Lock()
MEDIA_GROUP_LOCK = threading.Lock()
MEDIA_GROUP_BUFFERS: dict[str, dict] = {}
MEDIA_GROUP_DELAY_SECONDS = 1.5
MEDIA_DIR = APP_DIR / "data" / "media" / "telegram"
CONSOLE_AUTH_FILE = APP_DIR / "data" / "console_auth.json"
CONSOLE_MESSAGE_PAGE_SIZE = 20
CONSOLE_SESSION_COOKIE = "whalemates_chat_session"
CONSOLE_CLEAR_SESSION_COOKIE = (
    f"{CONSOLE_SESSION_COOKIE}=; Path=/; SameSite=Lax; "
    "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
)
TELEGRAM_MEDIA_DIRECTIVE_RE = re.compile(
    r"^\[\[telegram:(photo|document|video|voice):([^|\]]+)(?:\|(.*))?\]\]$"
)
TELEGRAM_MEDIA_UPLOADS = {
    "photo": {
        "method": "sendPhoto",
        "field": "photo",
        "allowed_mime_prefixes": ("image/",),
        "allowed_extensions": {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"},
    },
    "document": {
        "method": "sendDocument",
        "field": "document",
        "allowed_mime_prefixes": (),
        "allowed_extensions": set(),
    },
    "video": {
        "method": "sendVideo",
        "field": "video",
        "allowed_mime_prefixes": ("video/",),
        "allowed_extensions": {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"},
    },
    "voice": {
        "method": "sendVoice",
        "field": "voice",
        "allowed_mime_prefixes": ("audio/ogg",),
        "allowed_extensions": {".ogg", ".oga"},
    },
}
SERVICES = {
    "listener": {
        "label": "whalemates-bot-listener",
        "plist": LAUNCH_AGENT_DIR / "whalemates-bot-listener.plist",
        "name": "Telegram 监听",
    },
    "console": {
        "label": "whalemates-chat-console",
        "plist": LAUNCH_AGENT_DIR / "whalemates-chat-console.plist",
        "name": "Chat Console",
    },
}


@dataclass
class Config:
    bot_token: str
    allowed_chat_ids: set[str]
    allowed_user_ids: set[str]
    allowed_channel_ids: set[str]
    allowed_user_id_list: list[str]
    allowed_channel_id_list: list[str]
    state_file: Path
    codex_path: str
    codex_cwd: Path
    codex_model: str | None
    codex_sandbox: str
    codex_timeout_seconds: int
    console_broadcast_url: str


@dataclass(frozen=True)
class BotRuntime:
    service_id: str
    bot_id: str
    label: str
    token: str
    connection_id: str
    username: str


@dataclass
class BotWorker:
    bot: BotRuntime
    stop_event: threading.Event
    thread: threading.Thread


class ModelInvocationError(RuntimeError):
    def __init__(self, message: str, reason: str = "model_invocation_failed"):
        super().__init__(message)
        self.reason = reason


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def quote_env_value(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def ensure_env_file() -> None:
    env_file = APP_DIR / ".env"
    if env_file.exists():
        return

    example_file = APP_DIR / ".env.example"
    if example_file.exists():
        lines = example_file.read_text(encoding="utf-8").splitlines()
    else:
        lines = [
            "CODEX_PATH=/Applications/Codex.app/Contents/Resources/codex",
            "CODEX_CWD=~",
            "CODEX_SANDBOX=danger-full-access",
            "CODEX_TIMEOUT_SECONDS=180",
            "CONSOLE_BROADCAST_URL=http://127.0.0.1:8765/api/broadcast",
        ]

    next_lines = []
    wrote_codex_cwd = False
    for line in lines:
        if line.startswith("CODEX_CWD="):
            next_lines.append(f"CODEX_CWD={quote_env_value(str(Path.home()))}")
            wrote_codex_cwd = True
        else:
            next_lines.append(line)
    if not wrote_codex_cwd:
        next_lines.append(f"CODEX_CWD={quote_env_value(str(Path.home()))}")

    ensure_parent_dir(env_file)
    env_file.write_text("\n".join(next_lines).rstrip() + "\n", encoding="utf-8")


def load_config() -> Config:
    ensure_env_file()
    load_dotenv(APP_DIR / ".env")

    settings = load_settings()
    bot_token = first_telegram_bot_token(settings) or os.getenv("BOT_TOKEN", "").strip()
    legacy_allowed_chat_id_list = env_id_list("ALLOWED_CHAT_IDS")
    allowed_user_id_list = (
        settings.get("allowed_user_ids")
        or env_id_list("ALLOWED_USER_IDS")
        or legacy_allowed_chat_id_list
    )
    allowed_channel_id_list = (
        settings.get("allowed_channel_ids")
        or env_id_list("ALLOWED_CHANNEL_IDS")
    )
    legacy_allowed_chat_ids = set(legacy_allowed_chat_id_list)
    allowed_user_ids = set(allowed_user_id_list)
    allowed_channel_ids = set(allowed_channel_id_list)
    allowed_chat_ids = legacy_allowed_chat_ids | allowed_user_ids | allowed_channel_ids

    codex_cwd = Path(os.getenv("CODEX_CWD", str(Path.home()))).expanduser()
    state_file = Path(os.getenv("STATE_FILE", "./data/conversations.json")).expanduser()
    if not state_file.is_absolute():
        state_file = APP_DIR / state_file

    return Config(
        bot_token=bot_token,
        allowed_chat_ids=allowed_chat_ids,
        allowed_user_ids=allowed_user_ids or legacy_allowed_chat_ids,
        allowed_channel_ids=allowed_channel_ids,
        allowed_user_id_list=allowed_user_id_list,
        allowed_channel_id_list=allowed_channel_id_list,
        state_file=state_file,
        codex_path=os.getenv(
            "CODEX_PATH",
            "/Applications/Codex.app/Contents/Resources/codex",
        ).strip(),
        codex_cwd=codex_cwd,
        codex_model=os.getenv("CODEX_MODEL", "").strip() or None,
        codex_sandbox=os.getenv("CODEX_SANDBOX", "workspace-write").strip(),
        codex_timeout_seconds=int(os.getenv("CODEX_TIMEOUT_SECONDS", "180")),
        console_broadcast_url=os.getenv(
            "CONSOLE_BROADCAST_URL",
            "http://127.0.0.1:8765/api/broadcast",
        ).strip(),
    )


def env_id_list(key: str) -> list[str]:
    return clean_id_list(os.getenv(key, "").split(","))


def clean_id_list(chat_ids: list[str]) -> list[str]:
    cleaned = []
    seen = set()
    for chat_id in chat_ids:
        value = str(chat_id).strip()
        if not value or value in seen:
            continue
        cleaned.append(value)
        seen.add(value)
    return cleaned


def safe_path_part(value: str, fallback: str = "item") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", str(value or "").strip()).strip("._")
    return cleaned[:80] or fallback


def media_chat_dir(bot: BotRuntime | None, chat_id: str) -> Path:
    bot_id = safe_path_part(bot.bot_id if bot else "default", "default")
    return MEDIA_DIR / bot_id / safe_path_part(chat_id, "chat")


def media_public_url(path: Path) -> str:
    relative = path.resolve().relative_to(MEDIA_DIR.resolve())
    return f"/api/media/telegram?path={relative.as_posix()}"


def media_outgoing_dir(bot: BotRuntime | None, chat_id: str) -> Path:
    return media_chat_dir(bot, chat_id) / "outgoing"


def format_file_size(size: int | None) -> str:
    if not size:
        return ""
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.0f} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{size} B"


def default_settings_from_env() -> dict:
    legacy_allowed_chat_id_list = env_id_list("ALLOWED_CHAT_IDS")
    return build_settings_document(
        env_id_list("ALLOWED_USER_IDS") or legacy_allowed_chat_id_list,
        env_id_list("ALLOWED_CHANNEL_IDS"),
    )


def default_model_route() -> dict:
    return {}


RUNTIME_PROFILE_LABELS = {
    "default": "Default",
    "fast": "Fast",
    "think": "Think",
    "pro": "Pro",
}

TELEGRAM_MESSAGE_DEFAULTS = {
    "service_online": "Telegram service is online.",
    "service_offline": "Telegram service is offline.",
    "service_bridge_error": GENERIC_BRIDGE_ERROR_TEXT,
    "bot_enabled": "这个Bot已经启用。",
    "bot_disabled": "这个Bot暂时没有上班",
    "user_enabled": "你已经可以和这个Bot聊天了。",
    "user_disabled": "你暂时不能和这个Bot聊天。",
    "channel_enabled": "这个频道已经可以使用这个Bot。",
    "channel_disabled": "这个频道暂时不能使用这个Bot。",
    "access_denied_user": "你还不能和这个Bot聊天, 请发送指令 {apply_command} 申请",
    "access_denied_channel": "这个频道还不能使用这个Bot，请发送指令 {apply_command} 申请",
    "access_denied_apply": "你还不能和这个Bot聊天, 请发送指令 {apply_command} 申请",
    "approval_removed_user": "您和这个Bot聊天的权限被移除了，后续可以输入指令 {apply_command} 重新申请",
    "approval_removed_channel": "这个频道使用这个Bot的权限被移除了，后续可以输入指令 {apply_command} 重新申请",
    "apply_submitted_user": "你已经成功申请和这个Bot进行沟通",
    "apply_submitted_channel": "这个频道已经成功提交使用申请",
    "already_approved_user": "你已经被允许和这个Bot聊天",
    "already_approved_channel": "这个频道已经被允许使用这个Bot",
    "already_allowed_apply": "你已经被允许和这个Bot聊天",
    "apply_success": "你已经成功申请和这个Bot进行沟通",
    "apply_approved_user": "你已经通过申请，可以和我聊天了",
    "apply_approved_channel": "这个频道已经通过申请，可以使用这个Bot了",
    "apply_rejected_user": "你的申请已被拒绝。",
    "apply_rejected_channel": "这个频道的申请已被拒绝。",
    "approval_success": "你已经通过申请，可以和我聊天了",
    "approval_removed": "您和这个Bot聊天的权限被移除了，后续可以输入指令 {apply_command} 重新申请",
    "role_upgrade_user": "你的权限已从 {from_role} 升级为 {to_role}。",
    "role_downgrade_user": "你的权限已从 {from_role} 调整为 {to_role}。",
    "assistant_online": ASSISTANT_ONLINE_TEXT,
    "assistant_offline": ASSISTANT_OFFLINE_TEXT,
    "help_text": (
        "我会把你的消息交给当前配置的模型处理。\n\n"
        "可用命令：\n"
        "{reset_command} 清空当前对话记忆\n"
        "{models_command} 选择当前对话使用的模型\n"
        "{status_command} 查看桥接服务状态\n"
        "{help_command} 查看帮助"
    ),
    "bridge_error": GENERIC_BRIDGE_ERROR_TEXT,
    "reset_success": "已清空当前对话记忆。",
    "model_menu_empty": "当前没有已启用的 Provider / Model。请先在 Console 的 Model Configuration 里配置并启用模型。",
    "model_button_prompt": "请点击下面按钮选择切换：",
    "model_unavailable": "这个模型现在不可用了，请重新发送 {models_command} 获取最新列表。",
    "model_switched": "已切换当前对话模型：{route}",
    "model_callback_expired": "这个模型选择已过期，请重新发送 {models_command}。",
    "model_button_unavailable": "这个按钮已不可用。",
    "model_callback_cancelled": "已取消。",
    "model_default_restored": "已恢复默认模型：优先使用当前 bot 默认模型，否则使用 Service 默认模型。",
    "model_default_restored_callback": "已恢复默认模型。",
    "runtime_profile_prompt": "请选择 Runtime Profile：\n{route}",
    "runtime_profile_callback_prompt": "请选择 Runtime Profile。",
    "runtime_profile_switched": "已切换当前对话模型：{route} · {profile}",
}


TELEGRAM_COMMAND_DEFAULTS = {
    "apply": "/apply",
    "help": "/help",
    "models": "/models",
    "reset": "/reset",
    "status": "/status",
}

TELEGRAM_COMMAND_DESCRIPTION_DEFAULTS = {
    "apply": "Apply for access to this bot.",
    "help": "Show available commands.",
    "models": "Choose the model for this conversation.",
    "reset": "Clear this conversation memory.",
    "status": "Show bridge service status.",
}

TELEGRAM_COMMAND_ORDER_DEFAULTS = list(TELEGRAM_COMMAND_DEFAULTS.keys())

TELEGRAM_COMMAND_LOGIC = {
    "apply": "If already allowed, replies with the approved message. Otherwise creates or updates a pending access request and replies with the apply success message.",
    "help": "Replies with the configured help text. /start also uses this flow.",
    "models": "Sends the configured model selector prompt with inline buttons for available models.",
    "reset": "Clears local conversation memory for this chat, updates the console, then replies with the reset success message.",
    "status": "Replies with current listener, bot, model, and access status.",
}

TELEGRAM_COMMAND_CAPABILITIES = {
    key: {
        "key": key,
        "command": TELEGRAM_COMMAND_DEFAULTS[key],
        "description": TELEGRAM_COMMAND_DESCRIPTION_DEFAULTS[key],
        "logic": TELEGRAM_COMMAND_LOGIC.get(key, "无"),
        "built_in": True,
    }
    for key in TELEGRAM_COMMAND_DEFAULTS
}


class SafeFormatDict(dict):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


def normalize_telegram_command(value: object, default: str) -> str:
    command = str(value or "").strip().split()[0] if str(value or "").strip() else ""
    if not command:
        command = default
    if not command.startswith("/"):
        command = f"/{command}"
    return command


def telegram_commands(settings: dict) -> dict:
    return {
        item["key"]: item["command"]
        for item in telegram_command_items(settings)
        if item.get("built_in")
    }


def telegram_command_descriptions(settings: dict) -> dict:
    return {
        item["key"]: str(item.get("description") or "").strip()
        for item in telegram_command_items(settings)
        if item.get("built_in")
    }


def normalize_custom_telegram_commands(items: object) -> list[dict]:
    if not isinstance(items, list):
        return []
    normalized = []
    seen = set(TELEGRAM_COMMAND_DEFAULTS)
    seen_commands = {command.lstrip("/") for command in TELEGRAM_COMMAND_DEFAULTS.values()}
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        command = normalize_telegram_command(item.get("command"), "")
        command_name = command.lstrip("/")
        if (
            not command_name
            or not re.fullmatch(r"[a-z0-9_]{1,32}", command_name)
            or command_name in seen_commands
        ):
            continue
        key = str(item.get("key") or f"custom_{command_name}" or f"custom_{index + 1}").strip()
        key = re.sub(r"[^a-zA-Z0-9_]+", "_", key).strip("_").lower() or f"custom_{index + 1}"
        if key in seen:
            key = f"{key}_{index + 1}"
        description = str(item.get("description") or "").strip()
        normalized.append(
            {
                "key": key,
                "command": command,
                "description": description,
            }
        )
        seen.add(key)
        seen_commands.add(command_name)
    return normalized


def normalize_telegram_command_order(order: object, custom_commands: list[dict]) -> list[str]:
    valid_keys = [*TELEGRAM_COMMAND_DEFAULTS.keys(), *[item["key"] for item in custom_commands]]
    seen = set()
    normalized = []
    if isinstance(order, list):
        for item in order:
            key = str(item or "").strip()
            if key in valid_keys and key not in seen:
                normalized.append(key)
                seen.add(key)
    for key in valid_keys:
        if key not in seen:
            normalized.append(key)
            seen.add(key)
    return normalized


def normalize_telegram_command_registry(telegram: dict) -> list[dict]:
    raw_registry = telegram.get("command_registry")
    disabled_keys = {
        str(key)
        for key in telegram.get("disabled_command_keys", [])
        if str(key) in TELEGRAM_COMMAND_CAPABILITIES
    } if isinstance(telegram.get("disabled_command_keys"), list) else set()
    items: list[dict] = []
    seen_keys: set[str] = set()
    seen_commands: set[str] = set()

    def append_item(item: dict, built_in: bool) -> None:
        key = str(item.get("key") or "").strip()
        status = str(item.get("status") or "").strip().lower()
        if status not in {"new", "active", "draft", "delete"}:
            status = ""
        if built_in:
            if key not in TELEGRAM_COMMAND_CAPABILITIES or (key in disabled_keys and status != "delete"):
                return
            capability = TELEGRAM_COMMAND_CAPABILITIES[key]
            command = normalize_telegram_command(item.get("command"), capability["command"])
            description = str(item.get("description") or capability["description"]).strip() or capability["description"]
            logic = capability["logic"]
        else:
            command = normalize_telegram_command(item.get("command"), "")
            command_name = command.lstrip("/")
            if (
                not key
                or key in TELEGRAM_COMMAND_CAPABILITIES
                or key in seen_keys
                or not command_name
                or command_name in seen_commands
            ):
                return
            description = str(item.get("description") or command).strip()[:256] or command
            logic = "无"
        command_name = command.lstrip("/")
        if not key or key in seen_keys or command_name in seen_commands:
            return
        items.append(
            {
                "key": key,
                "command": command,
                "description": description,
                "logic": logic,
                "built_in": built_in,
                **({"status": status} if status else {}),
            }
        )
        seen_keys.add(key)
        seen_commands.add(command_name)

    if isinstance(raw_registry, list):
        for item in raw_registry:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or "").strip()
            append_item(item, key in TELEGRAM_COMMAND_CAPABILITIES and bool(item.get("built_in", True)))
    else:
        commands = telegram.get("commands") if isinstance(telegram.get("commands"), dict) else {}
        descriptions = telegram.get("command_descriptions") if isinstance(telegram.get("command_descriptions"), dict) else {}
        custom_commands = normalize_custom_telegram_commands(telegram.get("custom_commands", []))
        order = normalize_telegram_command_order(telegram.get("command_order", []), custom_commands)
        legacy_by_key = {
            key: {
                "key": key,
                "command": commands.get(key) or TELEGRAM_COMMAND_DEFAULTS[key],
                "description": descriptions.get(key) or TELEGRAM_COMMAND_DESCRIPTION_DEFAULTS[key],
            }
            for key in TELEGRAM_COMMAND_DEFAULTS
        }
        legacy_by_key.update({item["key"]: item for item in custom_commands})
        for key in order:
            item = legacy_by_key.get(key)
            if item:
                append_item(item, key in TELEGRAM_COMMAND_CAPABILITIES)

    for key, capability in TELEGRAM_COMMAND_CAPABILITIES.items():
        if key not in seen_keys and key not in disabled_keys:
            append_item(capability, True)
    telegram["disabled_command_keys"] = sorted(disabled_keys)
    return items


def telegram_command_items(settings: dict) -> list[dict]:
    telegram = settings.get("services", {}).get("telegram", {})
    if not isinstance(telegram, dict):
        return list(TELEGRAM_COMMAND_CAPABILITIES.values())
    return [
        item
        for item in normalize_telegram_command_registry(dict(telegram))
        if item.get("status") != "delete"
    ]


def telegram_command_sync_snapshot(settings: dict) -> str:
    payload = [
        {
            "key": item.get("key", ""),
            "command": item.get("command", ""),
            "description": item.get("description", ""),
            "built_in": bool(item.get("built_in")),
        }
        for item in telegram_command_items(settings)
    ]
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def telegram_command_sync_signature(settings: dict) -> str:
    raw = telegram_command_sync_snapshot(settings)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def telegram_command(settings: dict, key: str) -> str:
    return telegram_commands(settings).get(key, "")


def command_matches(text: str, command: str) -> bool:
    return bool(command) and text.strip() == command


def command_enabled(commands: dict, key: str) -> bool:
    return bool(commands.get(key))


def telegram_message(settings: dict, key: str, **variables: object) -> str:
    messages = (
        settings.get("services", {})
        .get("telegram", {})
        .get("messages", {})
    )
    value = str(messages.get(key) or "").strip() if isinstance(messages, dict) else ""
    template = value or TELEGRAM_MESSAGE_DEFAULTS.get(key, "")
    format_values = SafeFormatDict(
        {
            **{f"{name}_command": command for name, command in telegram_commands(settings).items()},
            **{name: str(value) for name, value in variables.items()},
        }
    )
    try:
        return template.format_map(format_values)
    except ValueError:
        return template


def normalize_runtime_profile(profile: str | None) -> str:
    normalized = str(profile or "default").strip().lower()
    return normalized if normalized in RUNTIME_PROFILE_LABELS else "default"


def runtime_profile_label(profile: str | None) -> str:
    return RUNTIME_PROFILE_LABELS[normalize_runtime_profile(profile)]


def target_records(ids: list[str], default_role: str) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "id": target_id,
            "role": "owner" if index == 0 and default_role == "allowed_user" else "admin",
            "enabled": True,
            "added_at": now,
        }
        for index, target_id in enumerate(clean_id_list(ids))
    ]


def default_model_mode_settings(provider: str) -> dict:
    if provider == "openai":
        return {
            "codex_cli": {
                "label": "Codex CLI",
                "enabled": False,
                "model": "",
                "cli_path": os.getenv(
                    "CODEX_PATH",
                    "/Applications/Codex.app/Contents/Resources/codex",
                ).strip(),
                "working_directory": os.getenv("CODEX_CWD", str(Path.home())).strip(),
                "base_url": "",
                "selected_models": [],
                "runtime_options": {},
                "configured": False,
                "resume_enabled_on_run": False,
            },
            "api": {
                "label": "OpenAI API",
                "enabled": False,
                "model": "",
                "api_key": "",
                "base_url": "",
                "selected_models": [],
                "runtime_options": {},
                "configured": False,
                "resume_enabled_on_run": False,
            },
        }
    if provider == "claude":
        return {
            "claude_code_cli": {
                "label": "Claude Code CLI",
                "enabled": False,
                "model": "",
                "cli_path": "claude",
                "working_directory": os.getenv("CODEX_CWD", str(Path.home())).strip(),
                "base_url": "",
                "selected_models": [],
                "runtime_options": {},
                "configured": False,
                "resume_enabled_on_run": False,
            },
            "api": {
                "label": "Anthropic API",
                "enabled": False,
                "model": "",
                "api_key": "",
                "base_url": "",
                "selected_models": [],
                "runtime_options": {},
                "configured": False,
                "resume_enabled_on_run": False,
            },
        }
    if provider == "ollama":
        return {
            "api": {
                "label": "Ollama API",
                "enabled": False,
                "model": "",
                "base_url": "http://127.0.0.1:11434",
                "selected_models": [],
                "runtime_options": {
                    "think": False,
                    "num_ctx": 4096,
                    "num_predict": 512,
                },
                "configured": False,
                "resume_enabled_on_run": False,
            }
        }
    if provider == "deepseek":
        return {
            "api": {
                "label": "DeepSeek API",
                "enabled": False,
                "model": "",
                "api_key": "",
                "base_url": "https://api.deepseek.com",
                "selected_models": [],
                "runtime_options": {},
                "configured": False,
                "resume_enabled_on_run": False,
            }
        }
    raise ValueError(f"Unsupported model provider: {provider}")


def default_model_settings() -> dict:
    return {
        "openai": {
            "label": "OpenAI",
            "active_mode": "codex_cli",
            "modes": default_model_mode_settings("openai"),
        },
        "claude": {
            "label": "Claude",
            "active_mode": "claude_code_cli",
            "modes": default_model_mode_settings("claude"),
        },
        "ollama": {
            "label": "Ollama",
            "active_mode": "api",
            "modes": default_model_mode_settings("ollama"),
        },
        "deepseek": {
            "label": "DeepSeek",
            "active_mode": "api",
            "modes": default_model_mode_settings("deepseek"),
        },
    }


def normalize_model_mode(provider: str, mode: str) -> str:
    normalized = str(mode or "").strip()
    defaults = default_model_mode_settings(provider)
    if normalized not in defaults:
        raise ValueError(f"Unsupported model mode for {provider}: {mode}")
    return normalized


def infer_legacy_active_mode(provider: str, incoming: dict) -> str:
    if provider == "openai":
        return "api" if incoming.get("model") or incoming.get("api_key") or incoming.get("base_url") else "codex_cli"
    if provider == "claude":
        return "api" if incoming.get("model") or incoming.get("api_key") or incoming.get("base_url") else "claude_code_cli"
    return "api"


def normalize_model_settings(data: dict) -> dict:
    defaults = default_model_settings()
    normalized = {}
    for provider, default in defaults.items():
        incoming = data.get(provider, {}) if isinstance(data.get(provider), dict) else {}
        item = {
            "label": str(incoming.get("label") or default["label"]).strip() or default["label"],
            "active_mode": "",
            "modes": {},
        }
        incoming_modes = incoming.get("modes", {}) if isinstance(incoming.get("modes"), dict) else {}
        default_modes = default_model_mode_settings(provider)
        legacy_flat_mode = {
            "enabled": bool(incoming.get("enabled", False)),
            "model": str(incoming.get("model") or "").strip(),
            "api_key": str(incoming.get("api_key") or "").strip(),
            "base_url": str(incoming.get("base_url") or "").strip(),
        }
        if incoming_modes:
            active_mode = normalize_model_mode(
                provider,
                str(incoming.get("active_mode") or default["active_mode"] or next(iter(default_modes))),
            )
        else:
            active_mode = infer_legacy_active_mode(provider, incoming)
        item["active_mode"] = active_mode
        for mode_key, mode_default in default_modes.items():
            mode_incoming = incoming_modes.get(mode_key, {}) if isinstance(incoming_modes.get(mode_key), dict) else {}
            if not incoming_modes and mode_key == active_mode:
                mode_incoming = {**mode_incoming, **legacy_flat_mode}
            mode = {**mode_default, **mode_incoming}
            mode["label"] = str(mode.get("label") or mode_default["label"]).strip() or mode_default["label"]
            mode["enabled"] = bool(mode.get("enabled", False))
            mode["model"] = str(mode.get("model") or "").strip()
            mode["base_url"] = str(mode.get("base_url") or mode_default.get("base_url") or "").strip()
            if "cli_path" in mode_default:
                mode["cli_path"] = str(mode.get("cli_path") or mode_default.get("cli_path") or "").strip()
            else:
                mode.pop("cli_path", None)
            if "working_directory" in mode_default:
                mode["working_directory"] = str(
                    mode.get("working_directory")
                    or mode_default.get("working_directory")
                    or ""
                ).strip()
            else:
                mode.pop("working_directory", None)
            mode["selected_models"] = clean_id_list(mode.get("selected_models", []))
            if not mode["model"] and mode["selected_models"]:
                mode["model"] = mode["selected_models"][0]
            incoming_runtime_options = mode.get("runtime_options", {})
            default_runtime_options = mode_default.get("runtime_options", {})
            if not isinstance(incoming_runtime_options, dict):
                incoming_runtime_options = {}
            if not isinstance(default_runtime_options, dict):
                default_runtime_options = {}
            mode["runtime_options"] = {
                **default_runtime_options,
                **incoming_runtime_options,
            }
            # Legacy migration: old builds persisted one-off test results.
            # New builds persist only the configuration fact and keep run
            # feedback in the current frontend session.
            legacy_connected = str(mode.get("test_status") or "").strip() == "connected"
            mode["configured"] = bool(mode.get("configured", False) or legacy_connected)
            for legacy_key in ("test_status", "test_message", "test_reason", "tested_at"):
                mode.pop(legacy_key, None)
            mode["resume_enabled_on_run"] = bool(mode.get("resume_enabled_on_run", False))
            if "api_key" in mode_default:
                mode["api_key"] = str(mode.get("api_key") or "").strip()
            else:
                mode.pop("api_key", None)
            item["modes"][mode_key] = mode
        normalized[provider] = item
    return normalized


def model_route_label(route: dict, settings: dict | None = None) -> str:
    provider_id = str(route.get("provider_id") or route.get("provider") or "").strip()
    mode_id = str(route.get("mode_id") or route.get("mode") or "").strip()
    model_id = str(route.get("model_id") or route.get("model") or "").strip()
    if settings:
        mode = settings.get("models", {}).get(provider_id, {}).get("modes", {}).get(mode_id, {})
        mode_label = str(mode.get("label") or "").strip()
    else:
        mode_label = ""
    if not mode_label:
        try:
            mode_label = default_model_mode_settings(provider_id)[mode_id]["label"]
        except Exception:
            mode_label = mode_id or provider_id or "Model"
    return f"{mode_label} ({model_id})" if model_id else mode_label


def normalize_model_route(route: dict | None, settings: dict | None = None) -> dict:
    if not isinstance(route, dict):
        return {}
    legacy_provider = str(route.get("provider") or "").strip()
    if legacy_provider == "codex_cli":
        route = {"provider_id": "openai", "mode_id": "codex_cli", "model_id": ""}
    elif not any(
        str(route.get(key) or "").strip()
        for key in ("provider_id", "provider", "mode_id", "mode", "model_id", "model")
    ):
        return {}
    provider_id = str(route.get("provider_id") or route.get("provider") or "openai").strip()
    mode_id = str(route.get("mode_id") or route.get("mode") or "").strip()
    model_id = str(route.get("model_id") or route.get("model") or "").strip()
    try:
        provider_id = normalize_model_provider(provider_id)
    except ValueError:
        provider_id = "openai"
    try:
        mode_id = normalize_model_mode(provider_id, mode_id or default_model_settings()[provider_id]["active_mode"])
    except ValueError:
        mode_id = default_model_settings()[provider_id]["active_mode"]
    normalized = {
        "provider_id": provider_id,
        "mode_id": mode_id,
        "model_id": model_id,
    }
    normalized["label"] = model_route_label(normalized, settings)
    return normalized


def build_settings_document(user_ids: list[str], channel_ids: list[str]) -> dict:
    bot_token = os.getenv("BOT_TOKEN", "").strip()
    bot_id = bot_token.split(":", 1)[0] if ":" in bot_token else ""
    bots = {}
    if bot_id:
        bots[bot_id] = {
            "label": "@example_bot",
            "enabled": True,
            "connection": {
                "bot_token": bot_token,
                "bot_id": bot_id,
                "bot_username": "",
                "mode": "polling",
            },
            "allowed": {
                "chats": target_records(user_ids, "allowed_user"),
                "channels": target_records(channel_ids, "allowed_channel"),
            },
        }
    return {
        "models": default_model_settings(),
        "admins": {"telegram": []},
        "services": {
            "telegram": {
                "label": "Telegram",
                "enabled": bool(bot_token),
                "model": default_model_route(),
                "commands": TELEGRAM_COMMAND_DEFAULTS.copy(),
                "command_descriptions": TELEGRAM_COMMAND_DESCRIPTION_DEFAULTS.copy(),
                "command_order": TELEGRAM_COMMAND_ORDER_DEFAULTS.copy(),
                "custom_commands": [],
                "disabled_command_keys": [],
                "command_registry": list(TELEGRAM_COMMAND_CAPABILITIES.values()),
                "messages": TELEGRAM_MESSAGE_DEFAULTS.copy(),
                "bots": bots,
            },
            "lark": {
                "label": "Lark",
                "enabled": False,
                "bots": {},
            },
        }
    }


def normalize_target_records(records: list, default_role: str) -> list[dict]:
    normalized = []
    seen = set()
    owner_seen = False
    target_type = "channel" if default_role == "allowed_channel" else "chat"
    for index, record in enumerate(records):
        if isinstance(record, dict):
            target_id = str(record.get("id", "")).strip()
            role = normalize_approval_role(record.get("role"), target_type)
            enabled = bool(record.get("enabled", True))
            added_at = str(record.get("added_at") or datetime.now(timezone.utc).isoformat())
        else:
            target_id = str(record).strip()
            role = "owner" if index == 0 and default_role == "allowed_user" else "admin"
            enabled = True
            added_at = datetime.now(timezone.utc).isoformat()
        if not target_id or target_id in seen:
            continue
        if target_type == "chat":
            if role == "owner":
                if owner_seen:
                    role = "admin"
                owner_seen = True
            elif role not in {"public", "admin"}:
                role = "public"
        elif role not in {"public", "admin", "owner"}:
            role = "public"
        normalized.append(
            {"id": target_id, "role": role, "enabled": enabled, "added_at": added_at}
        )
        seen.add(target_id)
    return normalized


def normalize_approval_role(role: object, target_type: str = "chat") -> str:
    value = str(role or "").strip().lower()
    value = {
        "allowed_user": "admin",
        "allowed_channel": "admin",
        "bot_admin": "admin",
        "bot_owner": "owner",
        "channel_owner": "owner",
    }.get(value, value)
    if value not in {"owner", "admin", "public"}:
        return "public"
    return value


def bot_key_from_connection(bot_key: str, connection: dict) -> str:
    bot_id = str(connection.get("bot_id") or "").strip()
    token = str(connection.get("bot_token") or "").strip()
    if bot_id:
        return bot_id
    if ":" in token:
        return token.split(":", 1)[0]
    return "" if bot_key == "default" else bot_key


def normalize_settings(data: dict) -> dict:
    if "services" not in data:
        return build_settings_document(
            data.get("allowed_user_ids", []),
            data.get("allowed_channel_ids", []),
        )

    data["models"] = normalize_model_settings(
        data.get("models", {}) if isinstance(data.get("models"), dict) else {}
    )
    services = data.setdefault("services", {})
    telegram = services.setdefault("telegram", {"label": "Telegram", "bots": {}})
    telegram.setdefault("label", "Telegram")
    telegram.setdefault("enabled", True)
    raw_messages = telegram.get("messages") if isinstance(telegram.get("messages"), dict) else {}
    telegram["messages"] = {
        key: str(raw_messages.get(key) or default)
        for key, default in TELEGRAM_MESSAGE_DEFAULTS.items()
    }
    raw_commands = telegram.get("commands") if isinstance(telegram.get("commands"), dict) else {}
    telegram["commands"] = {
        key: normalize_telegram_command(raw_commands.get(key), default)
        for key, default in TELEGRAM_COMMAND_DEFAULTS.items()
    }
    raw_command_descriptions = (
        telegram.get("command_descriptions")
        if isinstance(telegram.get("command_descriptions"), dict)
        else {}
    )
    telegram["command_descriptions"] = {
        key: str(raw_command_descriptions.get(key) or default).strip() or default
        for key, default in TELEGRAM_COMMAND_DESCRIPTION_DEFAULTS.items()
    }
    telegram["custom_commands"] = normalize_custom_telegram_commands(
        telegram.get("custom_commands", [])
    )
    telegram["command_order"] = normalize_telegram_command_order(
        telegram.get("command_order", []),
        telegram["custom_commands"],
    )
    telegram["command_registry"] = normalize_telegram_command_registry(telegram)
    telegram["commands"] = {
        item["key"]: item["command"]
        for item in telegram["command_registry"]
        if item.get("built_in")
    }
    telegram["command_descriptions"] = {
        item["key"]: item["description"]
        for item in telegram["command_registry"]
        if item.get("built_in")
    }
    telegram["custom_commands"] = [
        {
            "key": item["key"],
            "command": item["command"],
            "description": item["description"],
        }
        for item in telegram["command_registry"]
        if not item.get("built_in")
    ]
    telegram["command_order"] = [item["key"] for item in telegram["command_registry"]]
    telegram["model"] = normalize_model_route(telegram.get("model"), data)
    telegram["model_profile"] = normalize_runtime_profile(telegram.get("model_profile"))
    bots = telegram.setdefault("bots", {})
    normalized_bots = {}
    for bot_key, bot in list(bots.items()):
        if not isinstance(bot, dict):
            bot = {}
        bot.setdefault("label", "Telegram Bot")
        bot.setdefault("enabled", True)
        bot.setdefault("public", False)
        if bot.get("model_override"):
            bot["model_override"] = normalize_model_route(bot.get("model_override"), data)
        else:
            bot.pop("model_override", None)
        if bot.get("model_profile_override"):
            bot["model_profile_override"] = normalize_runtime_profile(bot.get("model_profile_override"))
        else:
            bot.pop("model_profile_override", None)
        connection = bot.setdefault("connection", {})
        connection.setdefault("bot_token", "")
        if (
            bot_key == "default"
            and not connection.get("bot_token")
            and os.getenv("BOT_TOKEN", "").strip()
        ):
            connection["bot_token"] = os.getenv("BOT_TOKEN", "").strip()
        connection.setdefault("bot_id", "")
        if not connection.get("bot_id") and ":" in str(connection.get("bot_token", "")):
            connection["bot_id"] = str(connection["bot_token"]).split(":", 1)[0]
        connection.setdefault("bot_username", "")
        connection.setdefault("mode", "polling")
        normalized_key = bot_key_from_connection(bot_key, connection)
        if not normalized_key:
            continue
        connection["bot_id"] = str(connection.get("bot_id") or normalized_key)
        allowed = bot.setdefault("allowed", {"chats": [], "channels": []})
        allowed["chats"] = normalize_target_records(
            allowed.get("chats", []),
            "allowed_user",
        )
        allowed["channels"] = normalize_target_records(
            allowed.get("channels", []),
            "allowed_channel",
        )
        if bot.get("label") == "Telegram Bot" and connection.get("bot_username"):
            bot["label"] = f"@{connection['bot_username']}"
        normalized_bots[normalized_key] = bot
    telegram["bots"] = normalized_bots
    lark = services.setdefault("lark", {"label": "Lark", "bots": {}})
    lark.setdefault("label", "Lark")
    lark.setdefault("enabled", False)
    if lark.get("model"):
        lark["model"] = normalize_model_route(lark.get("model"), data)
        lark["model_profile"] = normalize_runtime_profile(lark.get("model_profile"))
    else:
        lark.pop("model", None)
        lark.pop("model_profile", None)
    lark.setdefault("bots", {})
    admins = data.setdefault("admins", {})
    admins["telegram"] = clean_id_list(admins.get("telegram", []))
    return data


def normalize_model_provider(provider: str) -> str:
    normalized = provider.strip().lower()
    if normalized not in {"openai", "claude", "ollama", "deepseek"}:
        raise ValueError(f"Unsupported model provider: {provider}")
    return normalized


def save_model_provider_settings(payload: dict) -> dict:
    provider = normalize_model_provider(str(payload.get("provider") or ""))
    settings = load_settings()
    models = settings.setdefault("models", normalize_model_settings({}))
    provider_settings = models.setdefault(provider, default_model_settings()[provider].copy())
    provider_settings["label"] = default_model_settings()[provider]["label"]
    mode = normalize_model_mode(
        provider,
        str(payload.get("mode") or provider_settings.get("active_mode") or default_model_settings()[provider]["active_mode"]),
    )
    provider_settings["active_mode"] = mode
    modes = provider_settings.setdefault("modes", default_model_mode_settings(provider))
    mode_settings = modes.setdefault(mode, default_model_mode_settings(provider)[mode].copy())
    mode_settings["label"] = default_model_mode_settings(provider)[mode]["label"]
    for legacy_key in ("test_status", "test_message", "test_reason", "tested_at"):
        mode_settings.pop(legacy_key, None)
    if "selected_models" in payload:
        mode_settings["selected_models"] = clean_id_list(payload.get("selected_models", []))
    else:
        mode_settings["selected_models"] = clean_id_list(mode_settings.get("selected_models", []))
    selected_models = mode_settings["selected_models"]
    if "model" in payload:
        mode_settings["model"] = str(payload.get("model") or "").strip() or (selected_models[0] if selected_models else "")
    else:
        mode_settings["model"] = str(mode_settings.get("model") or "").strip() or (selected_models[0] if selected_models else "")
    if "base_url" in payload:
        mode_settings["base_url"] = str(payload.get("base_url") or "").strip()
    else:
        mode_settings["base_url"] = str(
            mode_settings.get("base_url")
            or default_model_mode_settings(provider)[mode].get("base_url")
            or ""
        ).strip()
    if "cli_path" in mode_settings:
        mode_settings["cli_path"] = str(
            payload.get("cli_path")
            if "cli_path" in payload
            else mode_settings.get("cli_path") or default_model_mode_settings(provider)[mode].get("cli_path") or ""
        ).strip()
    if "working_directory" in mode_settings:
        mode_settings["working_directory"] = str(
            payload.get("working_directory")
            if "working_directory" in payload
            else mode_settings.get("working_directory")
            or default_model_mode_settings(provider)[mode].get("working_directory")
            or ""
        ).strip()

    if "api_key" in mode_settings and "api_key" in payload:
        mode_settings["api_key"] = str(payload.get("api_key") or "").strip()

    if "runtime_options" in payload:
        incoming_runtime_options = payload.get("runtime_options", {})
        if not isinstance(incoming_runtime_options, dict):
            incoming_runtime_options = {}
        default_runtime_options = default_model_mode_settings(provider)[mode].get("runtime_options", {})
        if not isinstance(default_runtime_options, dict):
            default_runtime_options = {}
        mode_settings["runtime_options"] = {
            **default_runtime_options,
            **incoming_runtime_options,
        }
    else:
        default_runtime_options = default_model_mode_settings(provider)[mode].get("runtime_options", {})
        existing_runtime_options = mode_settings.get("runtime_options", {})
        if not isinstance(default_runtime_options, dict):
            default_runtime_options = {}
        if not isinstance(existing_runtime_options, dict):
            existing_runtime_options = {}
        mode_settings["runtime_options"] = {
            **default_runtime_options,
            **existing_runtime_options,
        }

    is_api_mode = "api_key" in mode_settings
    is_local_model_mode = provider == "ollama" and mode == "api"
    is_cli_mode = "cli_path" in mode_settings
    complete_api_mode = bool(
        mode_settings.get("base_url")
        and mode_settings.get("api_key")
        and mode_settings.get("selected_models")
    )
    complete_local_model_mode = bool(
        mode_settings.get("base_url")
        and mode_settings.get("selected_models")
    )
    complete_cli_mode = bool(
        mode_settings.get("cli_path")
        and mode_settings.get("working_directory")
    )
    changed_validation_inputs = any(
        key in payload
        for key in ("api_key", "base_url", "selected_models", "cli_path", "working_directory", "model")
    )

    if "configured" in payload:
        mode_settings["configured"] = bool(payload.get("configured", False))
    elif (is_api_mode or is_local_model_mode or is_cli_mode) and changed_validation_inputs:
        mode_settings["configured"] = False

    if is_api_mode and not mode_settings.get("api_key"):
        mode_settings["configured"] = False

    if "resume_enabled_on_run" in payload:
        mode_settings["resume_enabled_on_run"] = bool(payload["resume_enabled_on_run"])
    else:
        mode_settings["resume_enabled_on_run"] = bool(mode_settings.get("resume_enabled_on_run", False))

    if "enabled" in payload:
        mode_settings["enabled"] = bool(payload["enabled"])
    else:
        mode_settings["enabled"] = bool(mode_settings.get("enabled", False))

    if is_api_mode:
        complete_configured_mode = complete_api_mode
    elif is_local_model_mode:
        complete_configured_mode = complete_local_model_mode
    else:
        complete_configured_mode = complete_cli_mode
    if (is_api_mode or is_local_model_mode or is_cli_mode) and not (complete_configured_mode and mode_settings.get("configured")):
        mode_settings["enabled"] = False
    if (is_api_mode or is_local_model_mode or is_cli_mode) and mode_settings.get("configured"):
        mode_settings["resume_enabled_on_run"] = False

    for other_mode, other_settings in modes.items():
        if other_mode != mode:
            other_settings["enabled"] = bool(other_settings.get("enabled", False))

    save_settings(settings)
    return load_settings()


def complete_model_mode(provider: str, mode: str, mode_settings: dict) -> bool:
    if provider in {"openai", "claude", "deepseek"} and mode == "api":
        return bool(
            mode_settings.get("base_url")
            and mode_settings.get("api_key")
            and mode_settings.get("selected_models")
            and mode_settings.get("configured")
            and mode_settings.get("enabled")
        )
    if provider == "ollama" and mode == "api":
        return bool(
            mode_settings.get("base_url")
            and mode_settings.get("selected_models")
            and mode_settings.get("configured")
            and mode_settings.get("enabled")
        )
    if provider == "openai" and mode == "codex_cli":
        return bool(mode_settings.get("configured") and mode_settings.get("enabled"))
    if provider == "claude" and mode == "claude_code_cli":
        return bool(mode_settings.get("configured") and mode_settings.get("enabled"))
    return False


def runtime_profile_options_for_route(settings: dict, route: dict | None) -> list[dict]:
    if not isinstance(route, dict):
        return [{"id": "default", "label": runtime_profile_label("default")}]
    provider_id, mode_id, model_id = route_key(route)
    model_name = model_id.lower()
    profile_ids = ["default"]

    if provider_id == "ollama" and mode_id == "api":
        profile_ids.extend(["fast", "think", "pro"])
    elif provider_id == "openai" and mode_id == "api":
        profile_ids.extend(["fast", "think"])
        if re.search(r"(^|[-_])pro($|[-_])", model_name):
            profile_ids.append("pro")
    elif provider_id == "deepseek" and mode_id == "api":
        if "reasoner" in model_name or re.search(r"(^|[-_])r1($|[-_:])", model_name):
            profile_ids.append("think")

    seen: set[str] = set()
    options = []
    for profile_id in profile_ids:
        normalized = normalize_runtime_profile(profile_id)
        if normalized in seen:
            continue
        seen.add(normalized)
        options.append({"id": normalized, "label": runtime_profile_label(normalized)})
    return options


def runtime_profile_is_supported(settings: dict, route: dict | None, profile: str | None) -> bool:
    normalized = normalize_runtime_profile(profile)
    return normalized in {item["id"] for item in runtime_profile_options_for_route(settings, route)}


def normalize_route_runtime_profile(settings: dict, route: dict | None, profile: str | None) -> str:
    normalized = normalize_runtime_profile(profile)
    return normalized if runtime_profile_is_supported(settings, route, normalized) else "default"


def enabled_model_options(settings: dict) -> list[dict]:
    options: list[dict] = []
    for provider_id, provider_settings in settings.get("models", {}).items():
        provider_label = str(provider_settings.get("label") or provider_id).strip()
        for mode_id, mode_settings in provider_settings.get("modes", {}).items():
            if not complete_model_mode(provider_id, mode_id, mode_settings):
                continue
            mode_label = str(mode_settings.get("label") or mode_id).strip()
            selected_models = clean_id_list(mode_settings.get("selected_models", []))
            if provider_id in {"openai", "claude", "deepseek", "ollama"} and mode_id == "api":
                for model_id in selected_models:
                    label = f"{mode_label} ({model_id})"
                    options.append(
                        {
                            "provider_id": provider_id,
                            "provider_label": provider_label,
                            "mode_id": mode_id,
                            "mode_label": mode_label,
                            "model_id": model_id,
                            "label": label,
                            "runtime_profiles": runtime_profile_options_for_route(
                                settings,
                                {
                                    "provider_id": provider_id,
                                    "mode_id": mode_id,
                                    "model_id": model_id,
                                },
                            ),
                        }
                    )
            else:
                options.append(
                        {
                            "provider_id": provider_id,
                            "provider_label": provider_label,
                            "mode_id": mode_id,
                            "mode_label": mode_label,
                            "model_id": "",
                            "label": mode_label,
                            "runtime_profiles": runtime_profile_options_for_route(
                                settings,
                                {
                                    "provider_id": provider_id,
                                    "mode_id": mode_id,
                                    "model_id": "",
                                },
                            ),
                        }
                    )
    return options


def route_key(route: dict) -> tuple[str, str, str]:
    return (
        str(route.get("provider_id") or "").strip(),
        str(route.get("mode_id") or "").strip(),
        str(route.get("model_id") or "").strip(),
    )


def model_route_is_enabled(settings: dict, route: dict) -> bool:
    return route_key(route) in {route_key(option) for option in enabled_model_options(settings)}


def model_invocation_failure_reason(exc: Exception) -> tuple[str, str] | None:
    if isinstance(exc, ModelInvocationError):
        return exc.reason, str(exc).strip() or "Model invocation failed."
    if isinstance(exc, requests.RequestException):
        return classify_model_test_exception(exc)
    if isinstance(exc, subprocess.TimeoutExpired):
        return "timeout", "Model invocation timed out."
    if isinstance(exc, OSError):
        return "cli_not_found", str(exc).strip() or "CLI provider is not executable."
    return None


def disable_model_route(route: dict, reason: str, detail: str = "") -> bool:
    settings = load_settings()
    normalized_route = normalize_model_route(route, settings)
    provider_id, mode_id, model_id = route_key(normalized_route)
    mode_settings = (
        settings
        .setdefault("models", normalize_model_settings({}))
        .get(provider_id, {})
        .get("modes", {})
        .get(mode_id)
    )
    if not isinstance(mode_settings, dict):
        return False

    was_enabled = bool(mode_settings.get("enabled"))
    mode_settings["enabled"] = False
    mode_settings["last_runtime_failure"] = {
        "reason": reason,
        "message": detail[:500],
        "provider_id": provider_id,
        "mode_id": mode_id,
        "model_id": model_id,
        "disabled_at": utc_now_iso(),
    }
    save_settings(settings)
    print(
        "[model] disabled route "
        f"provider={provider_id} mode={mode_id} model={model_id or '-'} "
        f"reason={reason} was_enabled={was_enabled}",
        file=sys.stderr,
        flush=True,
    )
    notify_console_runtime_update()
    return True


def first_enabled_cli_route(settings: dict) -> dict | None:
    for preferred in [("openai", "codex_cli", ""), ("claude", "claude_code_cli", "")]:
        for option in enabled_model_options(settings):
            if route_key(option) == preferred:
                return option
    return None


def openai_compatible_models_test(base_url: str, api_key: str) -> dict:
    headers = {"Authorization": f"Bearer {api_key}"}
    response = requests.get(f"{base_url.rstrip('/')}/models", headers=headers, timeout=20)
    response.raise_for_status()
    payload = response.json()
    model_items = payload.get("data") or []
    models = [
        str(item.get("id") or "").strip()
        for item in model_items
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]

    runnable = next(
        (
            item
            for item in models
            if not any(
                blocked in item
                for blocked in ["embedding", "whisper", "tts", "moderation", "image", "audio"]
            )
        ),
        "",
    )
    if runnable:
        try:
            verify = requests.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={**headers, "Content-Type": "application/json"},
                json={
                    "model": runnable,
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
                timeout=20,
            )
            verify.raise_for_status()
        except requests.HTTPError as exc:
            payload = {}
            try:
                payload = exc.response.json()
            except Exception:
                payload = {}
            error = payload.get("error") or {}
            code = str(error.get("code") or "")
            message = str(error.get("message") or "")
            if code == "insufficient_quota" or "insufficient quota" in message.lower():
                return {
                    "status": "no_quota",
                    "message": "Connected, but this API key currently has no available quota.",
                    "models": models,
                }
            raise
    return {
        "status": "connected",
        "message": f"Connected. {len(models)} models available." if models else "Connected.",
        "models": models,
    }


def anthropic_models_test(base_url: str, api_key: str) -> dict:
    response = requests.get(
        f"{base_url.rstrip('/')}/models",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    model_items = payload.get("data") or []
    models = [
        str(item.get("id") or "").strip()
        for item in model_items
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    return {
        "status": "connected",
        "message": f"Connected. {len(models)} models available." if models else "Connected.",
        "models": models,
    }


def ollama_test(base_url: str) -> dict:
    response = requests.get(f"{base_url.rstrip('/')}/api/tags", timeout=20)
    response.raise_for_status()
    payload = response.json()
    model_items = payload.get("models") or []
    models = [
        str(item.get("name") or "").strip()
        for item in model_items
        if isinstance(item, dict) and str(item.get("name") or "").strip()
    ]
    return {
        "status": "connected" if models else "no_models",
        "message": f"Connected. {len(models)} local models found." if models else "No local models found.",
        "models": models,
    }


def resolve_cli_executable(cli_path: str) -> str:
    value = str(cli_path or "").strip()
    if not value:
        raise ValueError("CLI not found")
    expanded = str(Path(value).expanduser()) if "/" in value else value
    if "/" in expanded:
        path = Path(expanded)
        if not path.exists() or not path.is_file() or not os.access(path, os.X_OK):
            raise ValueError("CLI not found")
        return str(path)
    resolved = shutil.which(expanded)
    if not resolved:
        raise ValueError("CLI not found")
    return resolved


def cli_mode_test(provider: str, mode: str, cli_path: str, working_directory: str, model: str) -> dict:
    cwd = Path(str(working_directory or "").strip() or str(Path.home())).expanduser()
    if not cwd.is_absolute():
        cwd = APP_DIR / cwd
    if not cwd.exists() or not cwd.is_dir():
        raise ValueError("Invalid working directory")
    executable = resolve_cli_executable(cli_path)
    result = subprocess.run(
        [executable, "--version"],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    output = (result.stdout or result.stderr or "").strip().splitlines()
    if result.returncode != 0:
        raise ValueError("CLI not executable")
    label = "Codex CLI" if provider == "openai" and mode == "codex_cli" else "Claude Code CLI"
    version = output[0].strip() if output else "version detected"
    return {
        "status": "connected",
        "message": f"{label} detected. Version: {version}",
        "models": [],
    }


def test_model_provider_settings(payload: dict) -> dict:
    provider = normalize_model_provider(str(payload.get("provider") or ""))
    mode = normalize_model_mode(provider, str(payload.get("mode") or default_model_settings()[provider]["active_mode"]))
    if provider == "openai" and mode == "codex_cli":
        settings = load_settings()
        saved_mode = settings.get("models", {}).get(provider, {}).get("modes", {}).get(mode, {})
        default_mode = default_model_mode_settings(provider)[mode]
        return cli_mode_test(
            provider,
            mode,
            str(payload.get("cli_path") or saved_mode.get("cli_path") or default_mode.get("cli_path") or ""),
            str(payload.get("working_directory") or saved_mode.get("working_directory") or default_mode.get("working_directory") or ""),
            str(payload.get("model") if "model" in payload else saved_mode.get("model") or ""),
        )
    if provider == "claude" and mode == "claude_code_cli":
        settings = load_settings()
        saved_mode = settings.get("models", {}).get(provider, {}).get("modes", {}).get(mode, {})
        default_mode = default_model_mode_settings(provider)[mode]
        return cli_mode_test(
            provider,
            mode,
            str(payload.get("cli_path") or saved_mode.get("cli_path") or default_mode.get("cli_path") or ""),
            str(payload.get("working_directory") or saved_mode.get("working_directory") or default_mode.get("working_directory") or ""),
            str(payload.get("model") if "model" in payload else saved_mode.get("model") or ""),
        )

    settings = load_settings()
    provider_settings = settings.get("models", {}).get(provider, {})
    saved_mode = provider_settings.get("modes", {}).get(mode, {})
    base_url = str(
        payload.get("base_url")
        or saved_mode.get("base_url")
        or default_model_mode_settings(provider)[mode].get("base_url")
        or ""
    ).strip()
    api_key = str(payload.get("api_key") or saved_mode.get("api_key") or "").strip()

    if provider == "ollama":
        return ollama_test(base_url or default_model_mode_settings("ollama")["api"]["base_url"])
    if provider == "deepseek":
        if not api_key:
            raise ValueError("Missing API key")
        return openai_compatible_models_test(
            base_url or default_model_mode_settings("deepseek")["api"]["base_url"],
            api_key,
        )
    if provider == "openai":
        if not api_key:
            raise ValueError("Missing API key")
        return openai_compatible_models_test(base_url or "https://api.openai.com/v1", api_key)
    if provider == "claude":
        if not api_key:
            raise ValueError("Missing API key")
        return anthropic_models_test(base_url or "https://api.anthropic.com/v1", api_key)
    raise ValueError(f"Unsupported model provider: {provider}")


def classify_model_test_exception(exc: Exception) -> tuple[str, str]:
    if isinstance(exc, ValueError):
        message = str(exc).strip()
        if message == "Missing API key":
            return "api_key_missing", "API key is required."
        if message == "CLI not found":
            return "cli_not_found", "CLI is not installed or cannot run locally."
        if message == "Invalid working directory":
            return "working_directory_invalid", "Working Directory does not exist."
        if message == "CLI not executable":
            return "cli_not_found", "CLI exists but could not be executed."
        return "api_request_failed", message or "API request failed."

    if isinstance(exc, requests.exceptions.Timeout):
        return "base_url_unreachable", "Base URL is unreachable."

    if isinstance(exc, requests.exceptions.ConnectionError):
        return "base_url_unreachable", "Base URL is unreachable."

    if isinstance(exc, requests.exceptions.HTTPError):
        response = exc.response
        status_code = response.status_code if response is not None else 0
        if status_code in {401, 403}:
            return "api_key_invalid", "API key is invalid."
        if status_code in {500, 502, 503, 504}:
            return "api_request_failed", "API request failed."
        if status_code == 404:
            return "base_url_unreachable", "Base URL is unreachable."
        return "api_request_failed", "API request failed."

    if isinstance(exc, requests.RequestException):
        return "api_request_failed", "API request failed."

    return "api_request_failed", str(exc).strip() or "API request failed."


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            data = {}
    else:
        data = default_settings_from_env()
        save_settings(data)

    return normalize_settings(data)


def save_settings(settings: dict) -> None:
    ensure_parent_dir(SETTINGS_FILE)
    data = normalize_settings(settings)
    SETTINGS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_requests() -> dict:
    if not REQUESTS_FILE.exists():
        return {"targets": {}}
    try:
        data = json.loads(REQUESTS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"targets": {}}
    if not isinstance(data, dict):
        return {"targets": {}}
    targets = data.get("targets")
    if not isinstance(targets, dict):
        data["targets"] = {}
    return data


def save_requests(data: dict) -> None:
    ensure_parent_dir(REQUESTS_FILE)
    if not isinstance(data.get("targets"), dict):
        data["targets"] = {}
    REQUESTS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def request_key(bot_id: str, target_type: str, target_id: str) -> str:
    return f"{bot_id}:{target_type}:{target_id}"


def upsert_request_target(
    bot_id: str,
    target: dict,
    sender: dict | None = None,
) -> dict:
    target_id = str(target.get("id") or sender_uid(sender, "")).strip()
    target_type = str(target.get("type") or "chat").strip()
    if target_type not in {"chat", "channel"}:
        target_type = "chat"
    if not bot_id or not target_id:
        return {}
    data = load_requests()
    key = request_key(bot_id, target_type, target_id)
    now = utc_now_iso()
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
        "first_seen_at": existing.get("first_seen_at") or now,
        "last_request_at": now,
    }
    data["targets"][key] = record
    save_requests(data)
    return record


def target_display_label(target: dict, sender: dict | None, fallback_id: str) -> str:
    if target.get("type") == "channel":
        username = target.get("username")
        title = target.get("title")
        if username:
            return f"Channel @{username}"
        if title:
            return f"Channel {title}"
        return f"Channel {fallback_id}"
    if sender:
        username = sender.get("username")
        name = sender.get("name")
        if username:
            return f"@{username}"
        if name:
            return str(name)
    return f"Chat {fallback_id}"


def approval_record_exists(settings: dict, bot_id: str, target_type: str, target_id: str) -> bool:
    bot = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot_id, {})
    key = "channels" if target_type == "channel" else "chats"
    return any(str(record.get("id")) == str(target_id) for record in bot.get("allowed", {}).get(key, []))


def list_request_targets(
    bot_id: str,
    target_type: str = "chat",
    status: str = "pending",
    query: str = "",
    page: int = 1,
    page_size: int = 30,
) -> dict:
    settings = load_settings()
    data = load_requests()
    normalized_type = target_type if target_type in {"chat", "channel", "all"} else "chat"
    normalized_query = query.strip().lower()
    items = []
    for record in data.get("targets", {}).values():
        if str(record.get("bot_id")) != str(bot_id):
            continue
        if normalized_type != "all" and str(record.get("target_type")) != normalized_type:
            continue
        approved = approval_record_exists(
            settings,
            bot_id,
            str(record.get("target_type") or "chat"),
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
        items.append({**record, "status": "pending", "approved": False})
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


def request_counts_by_bot(settings: dict | None = None) -> dict:
    settings = settings or load_settings()
    data = load_requests()
    counts: dict[str, dict[str, int]] = {}
    for record in data.get("targets", {}).values():
        bot_id = str(record.get("bot_id") or "")
        target_type = "channel" if record.get("target_type") == "channel" else "chat"
        target_id = str(record.get("id") or "")
        if not bot_id or not target_id:
            continue
        if approval_record_exists(settings, bot_id, target_type, target_id):
            continue
        bot_counts = counts.setdefault(bot_id, {"total": 0, "chat": 0, "channel": 0})
        bot_counts["total"] += 1
        bot_counts[target_type] += 1
    return counts


def approve_request_target(bot_id: str, target_type: str, target_id: str, config: Config | None = None) -> dict:
    settings = load_settings()
    resolved_bot_id = resolve_telegram_bot_id(settings, bot_id)
    target_type = "channel" if target_type == "channel" else "chat"
    target_id = str(target_id).strip()
    if not target_id:
        raise ValueError("Missing target id")
    bot = settings["services"]["telegram"]["bots"][resolved_bot_id]
    allowed = bot.setdefault("allowed", {"chats": [], "channels": []})
    key = "channels" if target_type == "channel" else "chats"
    records = normalize_target_records(
        allowed.get(key, []),
        "allowed_channel" if target_type == "channel" else "allowed_user",
    )
    if not any(str(record.get("id")) == target_id for record in records):
        records.append(
            {
                "id": target_id,
                "role": "public",
                "enabled": True,
                "added_at": utc_now_iso(),
            }
        )
    allowed[key] = records
    save_settings(settings)
    data = load_requests()
    record = data["targets"].get(request_key(resolved_bot_id, target_type, target_id))
    if record:
        data["targets"].pop(request_key(resolved_bot_id, target_type, target_id), None)
        save_requests(data)
    if config:
        updated_settings = load_settings()
        notify_bot_targets(
            config,
            updated_settings,
            resolved_bot_id,
            [target_id],
            telegram_message(updated_settings, "approval_success"),
        )
    return load_settings()


def reject_request_target(bot_id: str, target_type: str, target_id: str) -> dict:
    resolved_bot_id = resolve_telegram_bot_id(load_settings(), bot_id)
    target_type = "channel" if target_type == "channel" else "chat"
    target_id = str(target_id).strip()
    data = load_requests()
    key = request_key(resolved_bot_id, target_type, target_id)
    record = data["targets"].get(key)
    if not record:
        raise ValueError("Unknown request target")
    data["targets"].pop(key, None)
    save_requests(data)
    return record


def save_telegram_message_settings(
    messages: dict,
    commands: dict | None = None,
    command_descriptions: dict | None = None,
    custom_commands: list | None = None,
    command_order: list | None = None,
    command_registry: list | None = None,
) -> dict:
    settings = load_settings()
    telegram = settings.setdefault("services", {}).setdefault("telegram", {})
    current = telegram.setdefault("messages", {})
    for key, default in TELEGRAM_MESSAGE_DEFAULTS.items():
        if key in messages:
            current[key] = str(messages.get(key) or default)
        else:
            current.setdefault(key, default)
    if command_registry is not None:
        previous_disabled = set(telegram.get("disabled_command_keys", [])) if isinstance(telegram.get("disabled_command_keys"), list) else set()
        submitted_builtin_keys = {
            str(item.get("key") or "")
            for item in command_registry
            if (
                isinstance(item, dict)
                and str(item.get("key") or "") in TELEGRAM_COMMAND_CAPABILITIES
                and str(item.get("status") or "").strip().lower() != "delete"
            )
        }
        telegram["disabled_command_keys"] = sorted(
            previous_disabled
            | (set(TELEGRAM_COMMAND_CAPABILITIES) - submitted_builtin_keys)
        )
        telegram["command_registry"] = command_registry
    else:
        current_commands = telegram.setdefault("commands", {})
        incoming_commands = commands if isinstance(commands, dict) else {}
        for key, default in TELEGRAM_COMMAND_DEFAULTS.items():
            if key in incoming_commands:
                current_commands[key] = normalize_telegram_command(incoming_commands.get(key), default)
            else:
                current_commands.setdefault(key, default)
        current_descriptions = telegram.setdefault("command_descriptions", {})
        incoming_descriptions = command_descriptions if isinstance(command_descriptions, dict) else {}
        for key, default in TELEGRAM_COMMAND_DESCRIPTION_DEFAULTS.items():
            if key in incoming_descriptions:
                current_descriptions[key] = str(incoming_descriptions.get(key) or default).strip() or default
            else:
                current_descriptions.setdefault(key, default)
        if custom_commands is not None:
            telegram["custom_commands"] = normalize_custom_telegram_commands(custom_commands)
        if command_order is not None:
            telegram["command_order"] = normalize_telegram_command_order(
                command_order,
                telegram.get("custom_commands", []),
            )
    telegram["command_registry"] = normalize_telegram_command_registry(telegram)
    telegram["commands"] = {
        item["key"]: item["command"]
        for item in telegram["command_registry"]
        if item.get("built_in")
    }
    telegram["command_descriptions"] = {
        item["key"]: item["description"]
        for item in telegram["command_registry"]
        if item.get("built_in")
    }
    telegram["custom_commands"] = [
        {
            "key": item["key"],
            "command": item["command"],
            "description": item["description"],
        }
        for item in telegram["command_registry"]
        if not item.get("built_in")
    ]
    telegram["command_order"] = [item["key"] for item in telegram["command_registry"]]
    save_settings(settings)
    return load_settings()


def sync_telegram_bot_commands(config: Config, settings: dict, bot_ids: list[str] | None = None) -> list[str]:
    errors = []
    commands = [
        {
            "command": item["command"].lstrip("/"),
            "description": (item.get("description") or item["command"]).strip()[:256],
        }
        for item in telegram_command_items(settings)
        if item.get("command")
    ]
    bots = settings.get("services", {}).get("telegram", {}).get("bots", {})
    target_bot_ids = set(bot_ids or bots.keys())
    for bot_key, bot_settings in bots.items():
        if bot_key not in target_bot_ids:
            continue
        try:
            telegram_api(
                config,
                "setMyCommands",
                {"commands": commands},
                bot_runtime_from_settings(bot_key, bot_settings),
            )
        except Exception as exc:  # noqa: BLE001
            error = f"{bot_settings.get('label') or bot_key}: {safe_error_text(exc)}"
            errors.append(error)
            print(f"[telegram] setMyCommands failed for {error}", file=sys.stderr, flush=True)
    return errors


def mark_telegram_commands_synced(settings: dict) -> dict:
    settings = dict(settings)
    telegram = settings.setdefault("services", {}).setdefault("telegram", {})
    registry = normalize_telegram_command_registry(telegram)
    telegram["command_registry"] = [
        {
            key: value
            for key, value in item.items()
            if key != "status"
        }
        for item in registry
        if item.get("status") != "delete"
    ]
    telegram["commands"] = {
        item["key"]: item["command"]
        for item in telegram["command_registry"]
        if item.get("built_in")
    }
    telegram["command_descriptions"] = {
        item["key"]: item["description"]
        for item in telegram["command_registry"]
        if item.get("built_in")
    }
    telegram["custom_commands"] = [
        {
            "key": item["key"],
            "command": item["command"],
            "description": item["description"],
        }
        for item in telegram["command_registry"]
        if not item.get("built_in")
    ]
    telegram["command_order"] = [item["key"] for item in telegram["command_registry"]]
    snapshot = telegram_command_sync_snapshot(settings)
    telegram["command_sync"] = {
        "signature": hashlib.sha256(snapshot.encode("utf-8")).hexdigest(),
        "snapshot": snapshot,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
    save_settings(settings)
    return load_settings()


def target_records_from_payload(records: list[str | dict], default_role: str) -> list[dict]:
    return normalize_target_records(records, default_role)


def resolve_telegram_bot_id(settings: dict, bot_id: str | None) -> str:
    bots = settings["services"]["telegram"].get("bots", {})
    requested = str(bot_id or "").strip()
    if requested:
        if requested not in bots:
            raise ValueError(f"Unknown Telegram bot: {requested}")
        return requested
    if len(bots) == 1:
        return next(iter(bots))
    raise ValueError("bot_id is required when multiple Telegram bots are configured")


def save_allowed_targets(
    user_ids: list,
    channel_ids: list,
    bot_id: str | None = None,
    config: Config | None = None,
    disabled_message_key: str | None = None,
    notify_removed: bool = True,
) -> None:
    settings = load_settings()
    bots = settings["services"]["telegram"]["bots"]
    resolved_bot_id = resolve_telegram_bot_id(settings, bot_id)
    allowed = bots[resolved_bot_id].setdefault("allowed", {})

    before_chats = target_records_from_payload(
        allowed.get("chats", []),
        "allowed_user",
    )
    before_channels = target_records_from_payload(
        allowed.get("channels", []),
        "allowed_channel",
    )
    after_chats = target_records_from_payload(user_ids, "allowed_user")
    after_channels = target_records_from_payload(channel_ids, "allowed_channel")

    before_enabled = target_enabled_ids(before_chats + before_channels)
    before_all = target_all_ids(before_chats + before_channels)
    after_enabled = target_enabled_ids(after_chats + after_channels)
    after_all = target_all_ids(after_chats + after_channels)
    before_chat_roles = {
        str(record["id"]): normalize_approval_role(record.get("role"), "chat")
        for record in before_chats
    }
    after_chat_roles = {
        str(record["id"]): normalize_approval_role(record.get("role"), "chat")
        for record in after_chats
    }

    allowed["chats"] = after_chats
    allowed["channels"] = after_channels
    save_settings(settings)

    removed_targets = sorted(before_all - after_all)
    if config:
        if removed_targets and notify_removed:
            notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                removed_targets,
                telegram_message(settings, "approval_removed"),
            )
        if removed_targets:
            remove_conversations(config, removed_targets, resolved_bot_id)
        enabled_targets = sorted(after_enabled - before_enabled)
        disabled_targets = sorted((before_enabled & after_all) - after_enabled)
        if enabled_targets:
            notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                enabled_targets,
                telegram_message(settings, "assistant_online"),
            )
        if disabled_targets:
            notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                disabled_targets,
                telegram_message(settings, disabled_message_key or "assistant_offline"),
            )
        role_changed_targets = sorted(
            before_enabled
            & after_enabled
            & set(before_chat_roles)
            & set(after_chat_roles)
        )
        for target_id in role_changed_targets:
            from_role = before_chat_roles[target_id]
            to_role = after_chat_roles[target_id]
            direction = role_change_direction(from_role, to_role)
            if not direction:
                continue
            notify_bot_targets(
                config,
                settings,
                resolved_bot_id,
                [target_id],
                telegram_message(
                    settings,
                    "role_upgrade_user" if direction == "upgrade" else "role_downgrade_user",
                    from_role=role_message_label(from_role),
                    to_role=role_message_label(to_role),
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


def role_change_direction(from_role: str, to_role: str) -> str | None:
    from_rank = ROLE_RANKS.get(normalize_approval_role(from_role), 0)
    to_rank = ROLE_RANKS.get(normalize_approval_role(to_role), 0)
    if to_rank > from_rank:
        return "upgrade"
    if to_rank < from_rank:
        return "downgrade"
    return None


def role_message_label(role: str) -> str:
    return {
        "owner": "Owner",
        "admin": "Admin",
        "public": "Public",
    }.get(normalize_approval_role(role), "Public")


def first_telegram_bot(settings: dict) -> dict:
    bots = settings["services"]["telegram"].get("bots", {})
    return next(iter(bots.values()), {})


def first_telegram_bot_token(settings: dict) -> str:
    for _, bot in telegram_enabled_bots(settings):
        token = str(bot.get("connection", {}).get("bot_token", "")).strip()
        if token:
            return token
    return ""


def telegram_bot_ids(settings: dict) -> list[str]:
    return list(settings["services"]["telegram"].get("bots", {}).keys())


def telegram_enabled_bots(settings: dict) -> list[tuple[str, dict]]:
    telegram = settings.get("services", {}).get("telegram", {})
    if not telegram.get("enabled", True):
        return []

    enabled = []
    for bot_key, bot in telegram.get("bots", {}).items():
        connection = bot.get("connection", {})
        token = str(connection.get("bot_token", "")).strip()
        if bot.get("enabled", False) and token:
            enabled.append((bot_key, bot))
    return enabled


def bot_runtime_from_settings(bot_key: str, bot: dict) -> BotRuntime:
    connection = bot.get("connection", {})
    connection_id = str(connection.get("bot_id") or bot_key).strip()
    return BotRuntime(
        service_id="telegram",
        bot_id=bot_key,
        label=str(bot.get("label") or "Telegram Bot"),
        token=str(connection.get("bot_token") or "").strip(),
        connection_id=connection_id,
        username=str(connection.get("bot_username") or "").strip(),
    )


def bot_runtime_signature(bot: BotRuntime) -> tuple[str, str, str]:
    return (bot.bot_id, bot.token, bot.connection_id)


def telegram_bot_runtime(settings: dict, bot_key: str) -> BotRuntime:
    bots = settings["services"]["telegram"]["bots"]
    return bot_runtime_from_settings(bot_key, bots[bot_key])


def telegram_bot_allowed_ids(settings: dict, bot_key: str) -> tuple[list[str], list[str]]:
    bot = settings["services"]["telegram"]["bots"].get(bot_key, {})
    allowed = bot.get("allowed", {})
    chats = [record["id"] for record in allowed.get("chats", []) if record.get("enabled", True)]
    channels = [record["id"] for record in allowed.get("channels", []) if record.get("enabled", True)]
    return chats, channels


def telegram_bot_disabled_ids(settings: dict, bot_key: str) -> tuple[list[str], list[str]]:
    bot = settings["services"]["telegram"]["bots"].get(bot_key, {})
    allowed = bot.get("allowed", {})
    chats = [record["id"] for record in allowed.get("chats", []) if not record.get("enabled", True)]
    channels = [record["id"] for record in allowed.get("channels", []) if not record.get("enabled", True)]
    return chats, channels


def telegram_allowed_ids(settings: dict) -> tuple[list[str], list[str]]:
    bot_ids = telegram_bot_ids(settings)
    if not bot_ids:
        return [], []
    return telegram_bot_allowed_ids(settings, bot_ids[0])


def telegram_owner_record(settings: dict, bot_id: str | None = None) -> dict | None:
    resolved_bot_id = resolve_telegram_bot_id(settings, bot_id)
    allowed = settings["services"]["telegram"]["bots"][resolved_bot_id].get("allowed", {})
    for record in allowed.get("chats", []):
        if record.get("role") == "owner":
            return record
    return None


def save_telegram_service(payload: dict) -> dict:
    settings = load_settings()
    telegram = settings["services"]["telegram"]

    if "enabled" in payload:
        telegram["enabled"] = bool(payload["enabled"])
    if "model" in payload:
        telegram["model"] = normalize_model_route(payload.get("model"), settings)
        telegram["model_profile"] = normalize_route_runtime_profile(
            settings,
            telegram.get("model"),
            telegram.get("model_profile"),
        )
    if "model_profile" in payload:
        telegram["model_profile"] = normalize_route_runtime_profile(
            settings,
            telegram.get("model"),
            payload.get("model_profile"),
        )

    incoming_connection = payload.get("connection")
    if isinstance(incoming_connection, dict):
        save_telegram_bot_connection(incoming_connection)
        return load_settings()

    save_settings(settings)
    return load_settings()


def save_lark_service(payload: dict) -> dict:
    settings = load_settings()
    lark = settings.setdefault("services", {}).setdefault("lark", {"label": "Lark", "bots": {}})
    lark.setdefault("label", "Lark")
    lark.setdefault("bots", {})

    if "enabled" in payload:
        lark["enabled"] = bool(payload["enabled"])
    if "model" in payload:
        lark["model"] = normalize_model_route(payload.get("model"), settings)
        lark["model_profile"] = normalize_route_runtime_profile(
            settings,
            lark.get("model"),
            lark.get("model_profile"),
        )
    if "model_profile" in payload:
        lark["model_profile"] = normalize_route_runtime_profile(
            settings,
            lark.get("model"),
            payload.get("model_profile"),
        )

    save_settings(settings)
    return load_settings()


def save_telegram_bot_connection(connection: dict, bot_key: str | None = None) -> dict:
    settings = load_settings()
    telegram = settings["services"]["telegram"]
    telegram["enabled"] = True
    bots = telegram.setdefault("bots", {})
    resolved_key = bot_key_from_connection(
        str(bot_key or connection.get("bot_id") or ""),
        connection,
    )
    if not resolved_key:
        raise ValueError("Missing Telegram bot id")
    bot = bots.setdefault(
        resolved_key,
        {
            "label": connection.get("label") or "Telegram Bot",
            "enabled": True,
            "public": False,
            "connection": {},
            "allowed": {"chats": [], "channels": []},
        },
    )
    bot["label"] = connection.get("label") or bot.get("label") or "Telegram Bot"
    bot["enabled"] = bool(bot.get("enabled", True))
    bot_connection = bot.setdefault("connection", {})
    for key in ["bot_token", "bot_id", "bot_username", "mode", "validated_at"]:
        bot_connection[key] = str(connection.get(key) or "").strip()
    bot_connection["bot_id"] = bot_connection.get("bot_id") or resolved_key
    save_settings(settings)
    return load_settings()


def update_telegram_bot(bot_id: str, payload: dict) -> dict:
    settings = load_settings()
    bots = settings["services"]["telegram"]["bots"]
    if bot_id not in bots:
        raise ValueError(f"Unknown Telegram bot: {bot_id}")

    bot = bots[bot_id]
    if "enabled" in payload:
        bot["enabled"] = bool(payload["enabled"])
    if "public" in payload:
        bot["public"] = bool(payload["public"])
    if "model_override" in payload:
        if payload.get("model_override"):
            bot["model_override"] = normalize_model_route(payload.get("model_override"), settings)
            if bot.get("model_profile_override"):
                bot["model_profile_override"] = normalize_route_runtime_profile(
                    settings,
                    bot.get("model_override"),
                    bot.get("model_profile_override"),
                )
        else:
            bot.pop("model_override", None)
            if bot.get("model_profile_override"):
                bot["model_profile_override"] = normalize_route_runtime_profile(
                    settings,
                    settings["services"]["telegram"].get("model"),
                    bot.get("model_profile_override"),
                )
    if "model_profile_override" in payload:
        if payload.get("model_profile_override"):
            route_for_profile = bot.get("model_override") or settings["services"]["telegram"].get("model")
            bot["model_profile_override"] = normalize_route_runtime_profile(
                settings,
                route_for_profile,
                payload.get("model_profile_override"),
            )
        else:
            bot.pop("model_profile_override", None)
    if "label" in payload:
        label = str(payload["label"] or "").strip()
        if label:
            bot["label"] = label

    save_settings(settings)
    return load_settings()


def update_service_bot(service_id: str, bot_id: str, payload: dict) -> dict:
    if service_id == "telegram":
        return update_telegram_bot(bot_id, payload)

    settings = load_settings()
    services = settings.setdefault("services", {})
    service = services.setdefault(service_id, {"label": service_id.title(), "bots": {}})
    bots = service.setdefault("bots", {})
    if bot_id not in bots:
        raise ValueError(f"Unknown {service.get('label') or service_id} bot: {bot_id}")

    bot = bots[bot_id]
    if "enabled" in payload:
        bot["enabled"] = bool(payload["enabled"])
    if "model_override" in payload:
        if payload.get("model_override"):
            bot["model_override"] = normalize_model_route(payload.get("model_override"), settings)
            if bot.get("model_profile_override"):
                bot["model_profile_override"] = normalize_route_runtime_profile(
                    settings,
                    bot.get("model_override"),
                    bot.get("model_profile_override"),
                )
        else:
            bot.pop("model_override", None)
            if bot.get("model_profile_override"):
                bot["model_profile_override"] = normalize_route_runtime_profile(
                    settings,
                    service.get("model"),
                    bot.get("model_profile_override"),
                )
    if "model_profile_override" in payload:
        if payload.get("model_profile_override"):
            route_for_profile = bot.get("model_override") or service.get("model")
            bot["model_profile_override"] = normalize_route_runtime_profile(
                settings,
                route_for_profile,
                payload.get("model_profile_override"),
            )
        else:
            bot.pop("model_profile_override", None)
    if "label" in payload:
        label = str(payload["label"] or "").strip()
        if label:
            bot["label"] = label

    save_settings(settings)
    return load_settings()


def remove_telegram_bot(bot_id: str, config: Config | None = None) -> dict:
    settings = load_settings()
    bots = settings["services"]["telegram"]["bots"]
    if bot_id not in bots:
        raise ValueError(f"Unknown Telegram bot: {bot_id}")
    if bots[bot_id].get("enabled", False):
        raise ValueError("Disable this bot before removing it")
    bots.pop(bot_id)
    save_settings(settings)
    remove_bot_runtime_status(bot_id)
    if config:
        remove_bot_conversations(config, bot_id)
    return load_settings()


def validate_telegram_token(token: str) -> dict:
    token = token.strip()
    if not token:
        raise ValueError("Missing Telegram bot token")

    response = requests.post(
        f"{TELEGRAM_API_BASE}/bot{token}/getMe",
        json={},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error: {data}")

    result = data.get("result") or {}
    username = str(result.get("username") or "").strip()
    bot_id = str(result.get("id") or "").strip()
    return {
        "bot_token": token,
        "bot_id": bot_id,
        "bot_username": username,
        "label": f"@{username}" if username else "Telegram Bot",
        "mode": "polling",
        "validated_at": datetime.now(timezone.utc).isoformat(),
    }


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def save_console_auth(auth: dict) -> None:
    ensure_parent_dir(CONSOLE_AUTH_FILE)
    tmp_path = CONSOLE_AUTH_FILE.with_suffix(".tmp")
    tmp_path.write_text(
        json.dumps(auth, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(CONSOLE_AUTH_FILE)
    try:
        CONSOLE_AUTH_FILE.chmod(0o600)
    except OSError:
        pass


def load_console_auth() -> dict:
    if CONSOLE_AUTH_FILE.exists():
        try:
            auth = json.loads(CONSOLE_AUTH_FILE.read_text(encoding="utf-8"))
            if isinstance(auth, dict) and auth.get("username") and auth.get("password"):
                auth.setdefault("first_login", False)
                return auth
        except (OSError, json.JSONDecodeError):
            pass

    auth = {
        "username": "twitter",
        "password": "@itislt_ai",
        "first_login": True,
        "created_at": utc_now_iso(),
    }
    save_console_auth(auth)
    return auth


def console_session_value(auth: dict | None = None, *, include_app_dir: bool = False) -> str:
    auth = auth or load_console_auth()
    parts = [str(auth.get("username", "")), str(auth.get("password", ""))]
    if include_app_dir:
        parts.insert(0, str(APP_DIR))
    secret = ":".join(parts)
    return hmac.new(
        hashlib.sha256(secret.encode("utf-8")).digest(),
        b"whalemates-console-session",
        hashlib.sha256,
    ).hexdigest()


def console_session_values(auth: dict | None = None) -> set[str]:
    auth = auth or load_console_auth()
    return {
        console_session_value(auth),
        console_session_value(auth, include_app_dir=True),
    }


def console_auth_public_state() -> dict:
    auth = load_console_auth()
    first_login = bool(auth.get("first_login", False))
    payload = {
        "username": auth.get("username", ""),
        "first_login": first_login,
        "credentials_file": str(CONSOLE_AUTH_FILE),
    }
    if first_login:
        payload["password"] = auth.get("password", "")
    return payload


def python_environment_status() -> dict:
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    ok = sys.version_info >= (3, 10)
    return {
        "id": "python",
        "label": "Python 3.10+",
        "required": True,
        "ok": ok,
        "status": f"Installed: {version}" if ok else f"Installed: {version}, but 3.10+ is required",
        "hint": "Required for the local console server and dependency installer.",
        "commands": [
            "brew install python",
            "python3 --version",
        ],
    }


def setup_environment_status() -> dict:
    python_status = python_environment_status()
    return {
        "ok": bool(python_status["ok"]),
        "checks": [
            python_status,
        ],
    }


def mark_console_auth_used(auth: dict) -> None:
    if not auth.get("first_login", False):
        return
    auth["first_login"] = False
    auth["first_login_completed_at"] = utc_now_iso()
    save_console_auth(auth)


def load_state(path: Path) -> dict:
    if not path.exists():
        return {"chats": {}, "model_sessions": {}}

    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"chats": {}}

    if not isinstance(state, dict):
        return {"chats": {}, "model_sessions": {}}

    state.setdefault("chats", {})
    state.setdefault("model_sessions", {})
    normalize_conversation_state(state)
    return state


def save_state(path: Path, state: dict) -> None:
    normalize_conversation_state(state)
    ensure_parent_dir(path)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def conversation_key(bot: BotRuntime | None, chat_id: str) -> str:
    target_id = str(chat_id).strip()
    if bot and bot.bot_id and bot.bot_id != "default":
        return f"{bot.bot_id}:{target_id}"
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


def normalize_conversation_state(state: dict) -> None:
    chats = state.get("chats")
    if not isinstance(chats, dict):
        state["chats"] = {}
        return

    normalized: dict[str, list[dict]] = {}
    for stored_key, turns in chats.items():
        if not isinstance(turns, list):
            continue
        key_text = str(stored_key)
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
    state: dict,
    chat_id: str,
    bot: BotRuntime | None = None,
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
        scoped_matches = [key for key in matches if conversation_bot_id(key, chats.get(key, [])) == bot.bot_id]
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


def model_session_bucket(bot: BotRuntime | None) -> str:
    return bot.bot_id if bot else "default"


def chat_model_session(config: Config, chat_id: str, bot: BotRuntime | None = None) -> dict:
    state = load_state(config.state_file)
    return (
        state.get("model_sessions", {})
        .get(model_session_bucket(bot), {})
        .get(str(chat_id), {})
    )


def current_chat_model_override(
    config: Config,
    chat_id: str,
    bot: BotRuntime | None = None,
) -> dict | None:
    route = chat_model_session(config, chat_id, bot).get("route")
    if not isinstance(route, dict):
        return None
    settings = load_settings()
    normalized = normalize_model_route(route, settings)
    return normalized if model_route_is_enabled(settings, normalized) else None


def current_chat_runtime_profile(
    config: Config,
    chat_id: str,
    bot: BotRuntime | None = None,
) -> str | None:
    session = chat_model_session(config, chat_id, bot)
    profile = session.get("runtime_profile")
    if not profile:
        return None
    return normalize_runtime_profile(str(profile))


def save_chat_model_session(
    config: Config,
    chat_id: str,
    bot: BotRuntime | None,
    session: dict,
) -> None:
    state = load_state(config.state_file)
    sessions = state.setdefault("model_sessions", {}).setdefault(model_session_bucket(bot), {})
    sessions[str(chat_id)] = session
    save_state(config.state_file, state)


def clear_chat_model_pending(
    config: Config,
    chat_id: str,
    bot: BotRuntime | None,
) -> None:
    state = load_state(config.state_file)
    sessions = state.setdefault("model_sessions", {}).setdefault(model_session_bucket(bot), {})
    session = sessions.get(str(chat_id), {})
    if not isinstance(session, dict):
        return
    session.pop("pending_options", None)
    session.pop("pending_route", None)
    session.pop("pending_profiles", None)
    session.pop("pending_at", None)
    session["updated_at"] = utc_now_iso()
    sessions[str(chat_id)] = session
    save_state(config.state_file, state)


def clear_chat_model_override(
    config: Config,
    chat_id: str,
    bot: BotRuntime | None,
) -> None:
    state = load_state(config.state_file)
    sessions = state.setdefault("model_sessions", {}).setdefault(model_session_bucket(bot), {})
    session = sessions.get(str(chat_id), {})
    if not isinstance(session, dict):
        session = {}
    session.pop("route", None)
    session.pop("runtime_profile", None)
    session.pop("pending_options", None)
    session.pop("pending_route", None)
    session.pop("pending_profiles", None)
    session.pop("pending_at", None)
    session["updated_at"] = utc_now_iso()
    sessions[str(chat_id)] = session
    save_state(config.state_file, state)


def load_runtime_status() -> dict:
    if not RUNTIME_STATUS_FILE.exists():
        return {"telegram": {"bots": {}}}

    try:
        status = json.loads(RUNTIME_STATUS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"telegram": {"bots": {}}}

    if not isinstance(status, dict):
        return {"telegram": {"bots": {}}}

    status.setdefault("telegram", {})
    status["telegram"].setdefault("bots", {})
    return status


def save_runtime_status(status: dict) -> None:
    ensure_parent_dir(RUNTIME_STATUS_FILE)
    tmp_path = RUNTIME_STATUS_FILE.with_suffix(".tmp")
    tmp_path.write_text(
        json.dumps(status, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp_path.replace(RUNTIME_STATUS_FILE)


def notify_console_runtime_update() -> None:
    console_broadcast_url = os.getenv(
        "CONSOLE_BROADCAST_URL",
        "http://127.0.0.1:8765/api/broadcast",
    ).strip()
    if not console_broadcast_url:
        return

    try:
        requests.post(
            console_broadcast_url,
            json={"chat_id": ""},
            timeout=1,
        )
    except Exception:
        return


def update_bot_runtime_status(
    bot: BotRuntime,
    state: str,
    message: str = "",
) -> None:
    changed = False
    with RUNTIME_STATUS_LOCK:
        status = load_runtime_status()
        bots = status.setdefault("telegram", {}).setdefault("bots", {})
        previous = bots.get(bot.bot_id, {})
        changed = (
            previous.get("state") != state
            or previous.get("message") != message
            or previous.get("label") != bot.label
            or previous.get("connection_id") != bot.connection_id
        )
        bots[bot.bot_id] = {
            "state": state,
            "label": bot.label,
            "bot_id": bot.bot_id,
            "connection_id": bot.connection_id,
            "username": bot.username,
            "message": message,
            "updated_at": utc_now_iso(),
        }
        status["updated_at"] = utc_now_iso()
        save_runtime_status(status)
    if changed:
        notify_console_runtime_update()


def remove_bot_runtime_status(bot_id: str) -> None:
    changed = False
    with RUNTIME_STATUS_LOCK:
        status = load_runtime_status()
        removed = status.setdefault("telegram", {}).setdefault("bots", {}).pop(bot_id, None)
        changed = removed is not None
        status["updated_at"] = utc_now_iso()
        save_runtime_status(status)
    if changed:
        notify_console_runtime_update()


def update_enabled_bot_runtime_statuses(
    state: str,
    message: str = "",
) -> None:
    settings = load_settings()
    for bot_key, bot_settings in telegram_enabled_bots(settings):
        bot = bot_runtime_from_settings(bot_key, bot_settings)
        update_bot_runtime_status(bot, state, message)


def classify_poll_error(exc: Exception) -> tuple[str, str]:
    if isinstance(exc, requests.exceptions.HTTPError):
        response = exc.response
        if response is not None and response.status_code == 409:
            return (
                "conflict",
                "Another polling listener is already using this bot token.",
            )
    return ("retrying", safe_error_text(exc))


def append_turn(
    config: Config,
    chat_id: str,
    role: str,
    content: str,
    sender: dict | None = None,
    target: dict | None = None,
    bot: BotRuntime | None = None,
    telegram_message_id: int | None = None,
    model: dict | None = None,
    attachments: list[dict] | None = None,
) -> None:
    state = load_state(config.state_file)
    storage_key = conversation_key(bot, chat_id)
    chat = state["chats"].setdefault(storage_key, [])
    turn = {
        "role": role,
        "content": content,
        "chat_id": str(chat_id),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if sender:
        turn["sender"] = sender
    if target:
        turn["target"] = target
    if bot:
        turn["service_id"] = bot.service_id
        turn["bot_id"] = bot.bot_id
        turn["bot_label"] = bot.label
    if telegram_message_id is not None:
        turn["telegram_message_id"] = telegram_message_id
    if model:
        turn["model"] = model
    if attachments:
        turn["attachments"] = attachments

    chat.append(turn)
    state["chats"][storage_key] = chat
    save_state(config.state_file, state)


def append_manual_bot_turn(
    config: Config,
    chat_id: str,
    content: str,
    bot: BotRuntime,
    telegram_message_ids: list[int],
    attachments: list[dict],
) -> None:
    state = load_state(config.state_file)
    storage_key = conversation_key(bot, chat_id)
    chat = state["chats"].setdefault(storage_key, [])
    turn = {
        "role": "assistant",
        "content": content,
        "chat_id": str(chat_id),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "service_id": bot.service_id,
        "bot_id": bot.bot_id,
        "bot_label": bot.label,
        "manual": True,
    }
    if telegram_message_ids:
        turn["telegram_message_ids"] = telegram_message_ids
        turn["telegram_message_id"] = telegram_message_ids[-1]
    if attachments:
        turn["attachments"] = attachments
    chat.append(turn)
    state["chats"][storage_key] = chat
    save_state(config.state_file, state)


def attach_last_turn_message_id(
    config: Config,
    chat_id: str,
    role: str,
    telegram_message_id: int | None,
    bot: BotRuntime | None = None,
) -> None:
    if telegram_message_id is None:
        return

    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id, bot)
    turns = state.get("chats", {}).get(storage_key, [])
    for turn in reversed(turns):
        if turn.get("role") == role and "telegram_message_id" not in turn:
            turn["telegram_message_id"] = telegram_message_id
            save_state(config.state_file, state)
            return


def delete_turn_media_files(turns: list[dict]) -> None:
    for turn in turns:
        attachments = turn.get("attachments") if isinstance(turn, dict) else []
        if not isinstance(attachments, list):
            continue
        for attachment in attachments:
            if not isinstance(attachment, dict) or not attachment.get("local_path"):
                continue
            try:
                path = Path(str(attachment["local_path"])).resolve()
                path.relative_to(MEDIA_DIR.resolve())
                path.unlink(missing_ok=True)
            except Exception:
                continue


def delete_attachment_media_file(attachment: dict) -> None:
    delete_turn_media_files([{"attachments": [attachment]}])


def reset_chat(config: Config, chat_id: str) -> None:
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id)
    removed_turns = state["chats"].pop(storage_key, None)
    if isinstance(removed_turns, list):
        delete_turn_media_files(removed_turns)
    save_state(config.state_file, state)


def remove_conversations(config: Config, chat_ids: list[str], bot_id: str | None = None) -> None:
    state = load_state(config.state_file)
    removed = False
    for chat_id in clean_id_list(chat_ids):
        keys = [
            key for key, turns in state.get("chats", {}).items()
            if key == chat_id or conversation_target_id(key, turns if isinstance(turns, list) else []) == chat_id
        ]
        for key in keys:
            if bot_id and conversation_bot_id(key, state.get("chats", {}).get(key, [])) != str(bot_id):
                continue
            removed_turns = state.get("chats", {}).pop(key, None)
            if removed_turns is None:
                continue
            if isinstance(removed_turns, list):
                delete_turn_media_files(removed_turns)
            removed = True
    if removed:
        save_state(config.state_file, state)


def remove_bot_conversations(config: Config, bot_id: str) -> None:
    state = load_state(config.state_file)
    chats = state.get("chats", {})
    kept = {}
    removed = False
    for chat_id, turns in chats.items():
        if (
            isinstance(turns, list)
            and any(str(turn.get("bot_id") or "") == str(bot_id) for turn in turns)
        ):
            delete_turn_media_files(turns)
            removed = True
            continue
        kept[chat_id] = turns

    if removed:
        state["chats"] = kept
        save_state(config.state_file, state)


def bot_runtime_for_turn(settings: dict, turn: dict) -> BotRuntime | None:
    bot_id = str(turn.get("bot_id") or "").strip()
    if not bot_id or bot_id == "default":
        return None
    bots = settings.get("services", {}).get("telegram", {}).get("bots", {})
    if bot_id not in bots:
        return None
    return bot_runtime_from_settings(bot_id, bots[bot_id])


def turn_telegram_message_ids(turn: dict) -> list[int]:
    values = []
    if isinstance(turn.get("telegram_message_id"), int):
        values.append(int(turn["telegram_message_id"]))
    message_ids = turn.get("telegram_message_ids")
    if isinstance(message_ids, list):
        for value in message_ids:
            try:
                message_id = int(value)
            except (TypeError, ValueError):
                continue
            if message_id not in values:
                values.append(message_id)
    return values


def delete_conversation(
    config: Config,
    chat_id: str,
    mode: str = "local",
) -> dict:
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id)
    turns = list(state.get("chats", {}).get(storage_key, []))
    telegram_chat_id = conversation_target_id(storage_key, turns)
    deleted_count = 0
    failed_count = 0

    if mode == "telegram_recorded":
        settings = load_settings()
        for turn in turns:
            for message_id in turn_telegram_message_ids(turn):
                try:
                    delete_message(
                        config,
                        telegram_chat_id,
                        int(message_id),
                        bot_runtime_for_turn(settings, turn),
                    )
                    deleted_count += 1
                except Exception as exc:  # noqa: BLE001
                    failed_count += 1
                    print(
                        f"Failed to delete Telegram message {message_id} in {telegram_chat_id}: {safe_error_text(exc)}",
                        file=sys.stderr,
                    )

    removed_turns = state.get("chats", {}).pop(storage_key, None)
    if isinstance(removed_turns, list):
        delete_turn_media_files(removed_turns)
    save_state(config.state_file, state)
    return {
        "deleted_telegram_messages": deleted_count,
        "failed_telegram_deletions": failed_count,
    }


def delete_turns(
    config: Config,
    chat_id: str,
    indexes: list[int],
    mode: str = "local",
) -> dict:
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id)
    turns = list(state.get("chats", {}).get(storage_key, []))
    telegram_chat_id = conversation_target_id(storage_key, turns)
    valid_indexes = sorted({index for index in indexes if 0 <= index < len(turns)})
    if not valid_indexes:
        return {
            "deleted_local_messages": 0,
            "deleted_telegram_messages": 0,
            "failed_telegram_deletions": 0,
        }

    deleted_count = 0
    failed_count = 0
    if mode == "telegram_recorded":
        settings = load_settings()
        for index in valid_indexes:
            turn = turns[index]
            for message_id in turn_telegram_message_ids(turn):
                try:
                    delete_message(
                        config,
                        telegram_chat_id,
                        int(message_id),
                        bot_runtime_for_turn(settings, turn),
                    )
                    deleted_count += 1
                except Exception as exc:  # noqa: BLE001
                    failed_count += 1
                    print(
                        f"Failed to delete Telegram message {message_id} in {telegram_chat_id}: {safe_error_text(exc)}",
                        file=sys.stderr,
                    )

    removed_indexes = set(valid_indexes)
    delete_turn_media_files([
        turn for index, turn in enumerate(turns) if index in removed_indexes
    ])
    remaining_turns = [
        turn for index, turn in enumerate(turns) if index not in removed_indexes
    ]
    chats = state.setdefault("chats", {})
    if remaining_turns:
        chats[storage_key] = remaining_turns
    else:
        chats.pop(storage_key, None)
    save_state(config.state_file, state)

    return {
        "deleted_local_messages": len(valid_indexes),
        "deleted_telegram_messages": deleted_count,
        "failed_telegram_deletions": failed_count,
    }


def delete_turn_attachment(
    config: Config,
    chat_id: str,
    turn_index: int,
    attachment_index: int,
    mode: str = "local",
) -> dict:
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id)
    turns = list(state.get("chats", {}).get(storage_key, []))
    telegram_chat_id = conversation_target_id(storage_key, turns)
    if turn_index < 0 or turn_index >= len(turns):
        raise ValueError("Message was not found")

    turn = turns[turn_index]
    attachments = turn.get("attachments")
    if not isinstance(attachments, list) or attachment_index < 0 or attachment_index >= len(attachments):
        raise ValueError("Attachment was not found")

    attachment = attachments[attachment_index]
    if not isinstance(attachment, dict):
        raise ValueError("Attachment was not found")

    deleted_count = 0
    if mode == "telegram_recorded":
        telegram_message_id = attachment.get("telegram_message_id")
        if not isinstance(telegram_message_id, int):
            raise RuntimeError("This image does not have a recorded Telegram message id")
        settings = load_settings()
        delete_message(
            config,
            telegram_chat_id,
            int(telegram_message_id),
            bot_runtime_for_turn(settings, turn),
        )
        deleted_count = 1

    delete_attachment_media_file(attachment)
    remaining_attachments = [
        item for index, item in enumerate(attachments) if index != attachment_index
    ]
    if remaining_attachments:
        turn["attachments"] = remaining_attachments
    else:
        turn.pop("attachments", None)

    removed_turn = False
    if not str(turn.get("content") or "").strip() and not turn.get("attachments"):
        turns.pop(turn_index)
        removed_turn = True

    chats = state.setdefault("chats", {})
    if turns:
        chats[storage_key] = turns
    else:
        chats.pop(storage_key, None)
    save_state(config.state_file, state)

    return {
        "deleted_local_attachments": 1,
        "deleted_telegram_messages": deleted_count,
        "removed_turn": removed_turn,
    }


def notify_console_update(config: Config, chat_id: str) -> None:
    try:
        requests.post(
            config.console_broadcast_url,
            json={"chat_id": chat_id},
            timeout=1,
        )
    except Exception:
        return


def telegram_api(
    config: Config,
    method: str,
    payload: dict | None = None,
    bot: BotRuntime | None = None,
) -> dict:
    token = bot.token if bot else config.bot_token
    if not token:
        raise RuntimeError("Missing Telegram bot token")
    url = f"{TELEGRAM_API_BASE}/bot{token}/{method}"
    response = requests.post(url, json=payload or {}, timeout=30)
    response.raise_for_status()
    data = response.json()

    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error: {data}")

    return data


def telegram_upload_api(
    config: Config,
    method: str,
    payload: dict,
    field_name: str,
    file_path: Path,
    bot: BotRuntime | None = None,
) -> dict:
    token = bot.token if bot else config.bot_token
    if not token:
        raise RuntimeError("Missing Telegram bot token")
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


def telegram_file_info(config: Config, file_id: str, bot: BotRuntime | None = None) -> dict:
    return telegram_api(config, "getFile", {"file_id": file_id}, bot).get("result", {})


def download_telegram_file(
    config: Config,
    file_id: str,
    destination: Path,
    bot: BotRuntime | None = None,
) -> tuple[Path, str, int]:
    file_info = telegram_file_info(config, file_id, bot)
    file_path = str(file_info.get("file_path") or "").strip()
    token = bot.token if bot else config.bot_token
    if not token or not file_path:
        raise RuntimeError("Telegram file path is not available")

    ensure_parent_dir(destination)
    url = f"{TELEGRAM_API_BASE}/file/bot{token}/{file_path}"
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    destination.write_bytes(response.content)
    content_type = response.headers.get("Content-Type") or mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
    return destination, content_type, len(response.content)


def telegram_attachment_source(message: dict) -> tuple[str, dict] | None:
    photos = message.get("photo") or []
    if photos:
        return "image", dict(photos[-1], file_name="photo.jpg")
    if message.get("voice"):
        return "voice", dict(message["voice"])
    if message.get("audio"):
        return "audio", dict(message["audio"])
    if message.get("video"):
        return "video", dict(message["video"])
    if message.get("animation"):
        return "video", dict(message["animation"])
    if message.get("video_note"):
        return "video", dict(message["video_note"])
    if message.get("document"):
        return "file", dict(message["document"])
    return None


def attachment_extension(kind: str, source: dict, telegram_path: str = "") -> str:
    file_name = str(source.get("file_name") or telegram_path or "").strip()
    suffix = Path(file_name).suffix.lower()
    if suffix:
        return suffix[:16]
    mime_type = str(source.get("mime_type") or "").strip()
    guessed = mimetypes.guess_extension(mime_type) if mime_type else ""
    if guessed:
        return guessed
    return {
        "image": ".jpg",
        "voice": ".ogg",
        "audio": ".mp3",
        "video": ".mp4",
        "file": ".bin",
    }.get(kind, ".bin")


def extract_telegram_attachment(
    config: Config,
    message: dict,
    bot: BotRuntime | None = None,
    index: int = 0,
) -> dict | None:
    source_pair = telegram_attachment_source(message)
    if not source_pair:
        return None
    kind, source = source_pair
    file_id = str(source.get("file_id") or "").strip()
    if not file_id:
        return None

    chat_id = str(message["chat"]["id"])
    created_at = datetime.fromtimestamp(int(message.get("date") or time.time()), timezone.utc)
    timestamp = created_at.strftime("%Y%m%d_%H%M%S")
    message_id = int(message.get("message_id") or 0)
    unique_id = safe_path_part(str(source.get("file_unique_id") or file_id)[-24:], "file")
    file_info = {}
    local_path = None
    public_url = None
    download_error = ""

    try:
        file_info = telegram_file_info(config, file_id, bot)
        extension = attachment_extension(kind, source, str(file_info.get("file_path") or ""))
        file_name = f"{timestamp}_{message_id}_{kind}_{index}_{unique_id}{extension}"
        destination = media_chat_dir(bot, chat_id) / file_name
        local_path, detected_mime, detected_size = download_telegram_file(config, file_id, destination, bot)
        source.setdefault("mime_type", detected_mime)
        source.setdefault("file_size", detected_size)
        public_url = media_public_url(local_path)
    except Exception as exc:  # noqa: BLE001
        download_error = safe_error_text(exc, bot)

    attachment = {
        "kind": kind,
        "caption": str(message.get("caption") or "").strip(),
        "mime_type": str(source.get("mime_type") or "").strip(),
        "file_name": str(source.get("file_name") or "").strip(),
        "file_size": int(source.get("file_size") or 0),
        "duration": int(source.get("duration") or 0),
        "width": int(source.get("width") or 0),
        "height": int(source.get("height") or 0),
        "telegram_message_id": message_id,
        "telegram_file_id": file_id,
        "telegram_file_unique_id": str(source.get("file_unique_id") or "").strip(),
        "media_group_id": str(message.get("media_group_id") or "").strip(),
        "group_index": index,
        "download_error": download_error,
    }
    if local_path:
        attachment["local_path"] = str(local_path)
    if public_url:
        attachment["public_url"] = public_url
    if not attachment["file_name"]:
        attachment["file_name"] = Path(str(local_path or file_info.get("file_path") or f"{kind}")).name
    return attachment


def message_has_attachment(message: dict) -> bool:
    return telegram_attachment_source(message) is not None


def attachment_label(attachment: dict) -> str:
    kind = attachment.get("kind") or "file"
    labels = {
        "image": "image",
        "voice": "voice message",
        "audio": "audio",
        "video": "video",
        "file": "file",
    }
    name = attachment.get("file_name") or labels.get(kind, "file")
    details = [
        labels.get(kind, "file"),
        str(name),
        format_file_size(int(attachment.get("file_size") or 0)),
        f"{attachment.get('duration')}s" if attachment.get("duration") else "",
    ]
    return " · ".join(part for part in details if part)


def attachment_summary_text(attachments: list[dict], caption: str = "") -> str:
    if not attachments:
        return caption.strip()
    counts: dict[str, int] = {}
    for attachment in attachments:
        counts[attachment.get("kind") or "file"] = counts.get(attachment.get("kind") or "file", 0) + 1
    count_text = ", ".join(f"{count} {kind}{'' if count == 1 else 's'}" for kind, count in counts.items())
    lines = [f"User sent attachments: {count_text}."]
    if caption.strip():
        lines.append(f"Caption: {caption.strip()}")
    for index, attachment in enumerate(attachments, start=1):
        local_path = attachment.get("local_path")
        path_text = f" Local path: {local_path}" if local_path else ""
        error_text = f" Download error: {attachment.get('download_error')}" if attachment.get("download_error") else ""
        lines.append(f"{index}. {attachment_label(attachment)}.{path_text}{error_text}")
    return "\n".join(lines)


def safe_error_text(exc: Exception, bot: BotRuntime | None = None) -> str:
    text = str(exc)
    tokens = [bot.token if bot else "", *configured_telegram_tokens()]
    for token in tokens:
        if token:
            text = text.replace(token, "<redacted-token>")
    return text


def media_file_from_query(path_value: str) -> Path | None:
    if not path_value:
        return None
    try:
        candidate = (MEDIA_DIR / Path(unquote(path_value))).resolve()
        candidate.relative_to(MEDIA_DIR.resolve())
    except Exception:
        return None
    return candidate if candidate.exists() and candidate.is_file() else None


def configured_telegram_tokens() -> list[str]:
    try:
        settings = load_settings()
    except Exception:
        return []
    tokens = []
    for bot in settings.get("services", {}).get("telegram", {}).get("bots", {}).values():
        token = str(bot.get("connection", {}).get("bot_token") or "").strip()
        if token:
            tokens.append(token)
    return tokens


def send_message(
    config: Config,
    chat_id: str,
    text: str,
    bot: BotRuntime | None = None,
    reply_markup: dict | None = None,
) -> dict:
    print(
        f"[telegram] sendMessage chat_id={chat_id} chars={len(text)}",
        flush=True,
    )
    payload = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return telegram_api(
        config,
        "sendMessage",
        payload,
        bot,
    )


MEDIA_SENDERS = {
    "photo": ("sendPhoto", "photo"),
    "document": ("sendDocument", "document"),
    "video": ("sendVideo", "video"),
    "voice": ("sendVoice", "voice"),
}


def validate_media_file_path(media_type: str, file_path: Path) -> Path:
    resolved_path = file_path.expanduser()
    if media_type not in TELEGRAM_MEDIA_UPLOADS:
        raise ValueError(f"Unsupported Telegram media type: {media_type}")
    if not resolved_path.is_absolute():
        raise ValueError("Telegram media path must be absolute")
    if not resolved_path.exists():
        raise FileNotFoundError(f"Telegram media file does not exist: {resolved_path}")
    if not resolved_path.is_file():
        raise ValueError(f"Telegram media path is not a file: {resolved_path}")

    media_config = TELEGRAM_MEDIA_UPLOADS[media_type]
    allowed_extensions = media_config["allowed_extensions"]
    allowed_mime_prefixes = media_config["allowed_mime_prefixes"]
    mime_type = mimetypes.guess_type(resolved_path.name)[0] or ""
    if allowed_extensions or allowed_mime_prefixes:
        extension_ok = resolved_path.suffix.lower() in allowed_extensions
        mime_ok = any(mime_type.startswith(prefix) for prefix in allowed_mime_prefixes)
        if not extension_ok and not mime_ok:
            raise ValueError(
                f"Telegram {media_type} file type is not supported: {resolved_path.name}"
            )

    return resolved_path


def send_media_file(
    config: Config,
    chat_id: str,
    media_type: str,
    file_path: Path,
    caption: str = "",
    bot: BotRuntime | None = None,
) -> dict:
    method, field_name = MEDIA_SENDERS[media_type]
    resolved_path = validate_media_file_path(media_type, file_path)
    payload = {"chat_id": chat_id}
    if caption:
        payload["caption"] = caption[:1024]
    print(
        f"[telegram] {method} chat_id={chat_id} file={resolved_path.name} caption_chars={len(caption)}",
        flush=True,
    )
    return telegram_upload_api(config, method, payload, field_name, resolved_path, bot)


def outgoing_attachment_from_file(
    file_path: Path,
    kind: str,
    caption: str = "",
) -> dict:
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return {
        "kind": kind,
        "caption": caption.strip(),
        "mime_type": mime_type,
        "file_name": file_path.name,
        "file_size": file_path.stat().st_size if file_path.exists() else 0,
        "local_path": str(file_path),
        "public_url": media_public_url(file_path),
    }


def detect_manual_media_type(requested_type: str, file_path: Path) -> tuple[str, str]:
    mime_type = mimetypes.guess_type(file_path.name)[0] or ""
    if requested_type == "image_video":
        if mime_type.startswith("image/"):
            return "photo", "image"
        if mime_type.startswith("video/"):
            return "video", "video"
        raise ValueError(f"Unsupported image/video file: {file_path.name}")
    if requested_type == "file":
        return "document", "file"
    raise ValueError(f"Unsupported upload type: {requested_type}")


def send_manual_conversation_message(
    config: Config,
    chat_id: str,
    bot_id: str,
    text: str,
    uploads: list[tuple[Path, str]],
) -> dict:
    settings = load_settings()
    bot_settings = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot_id)
    if not isinstance(bot_settings, dict):
        raise ValueError("Bot is not configured")
    bot = bot_runtime_from_settings(bot_id, bot_settings)
    if not bot.token:
        raise ValueError("Bot token is missing")
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id, bot)
    turns = state.get("chats", {}).get(storage_key)
    if storage_key not in state.get("chats", {}) or not isinstance(turns, list):
        raise ValueError("Conversation is not available locally")
    telegram_chat_id = conversation_target_id(storage_key, turns)
    if not text.strip() and not uploads:
        raise ValueError("Message text or file is required")

    sent_ids: list[int] = []
    attachments: list[dict] = []
    if text.strip():
        sent = send_message(config, telegram_chat_id, text.strip(), bot)
        message_id = sent.get("result", {}).get("message_id")
        if message_id is not None:
            sent_ids.append(int(message_id))

    for file_path, requested_type in uploads:
        media_type, attachment_kind = detect_manual_media_type(requested_type, file_path)
        sent = send_media_file(config, telegram_chat_id, media_type, file_path, "", bot)
        message_id = sent.get("result", {}).get("message_id")
        if message_id is not None:
            sent_ids.append(int(message_id))
        attachments.append(outgoing_attachment_from_file(file_path, attachment_kind))

    append_manual_bot_turn(config, telegram_chat_id, text.strip(), bot, sent_ids, attachments)
    notify_console_update(config, storage_key)
    return {
        "sent_telegram_messages": len(sent_ids),
        "attachments": len(attachments),
    }


def parse_telegram_media_directive(line: str) -> tuple[str, Path, str] | None:
    match = TELEGRAM_MEDIA_DIRECTIVE_RE.match(line.strip())
    if not match:
        return None
    media_type, path_text, caption = match.groups()
    path_text = path_text.strip()
    if not path_text:
        return None
    return media_type, Path(path_text), (caption or "").strip()


def send_answer(
    config: Config,
    chat_id: str,
    answer: str,
    bot: BotRuntime | None = None,
) -> dict | None:
    text_lines = []
    last_sent = None
    for line in answer.splitlines():
        directive = parse_telegram_media_directive(line)
        if not directive:
            text_lines.append(line)
            continue
        if text_lines and "\n".join(text_lines).strip():
            last_sent = send_message(config, chat_id, "\n".join(text_lines).strip(), bot)
        text_lines = []
        media_type, file_path, caption = directive
        try:
            last_sent = send_media_file(config, chat_id, media_type, file_path, caption, bot)
        except Exception as exc:  # noqa: BLE001
            error_text = f"附件发送失败：{file_path.name or file_path}。{safe_error_text(exc, bot)}"
            print(
                f"[telegram] media send failed chat_id={chat_id}: {safe_error_text(exc, bot)}",
                file=sys.stderr,
                flush=True,
            )
            last_sent = send_message(config, chat_id, error_text, bot)

    remaining_text = "\n".join(text_lines).strip()
    if remaining_text:
        last_sent = send_message(config, chat_id, remaining_text, bot)
    return last_sent


def edit_message_text(
    config: Config,
    chat_id: str,
    message_id: int,
    text: str,
    bot: BotRuntime | None = None,
    reply_markup: dict | None = None,
) -> dict:
    payload = {"chat_id": chat_id, "message_id": message_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return telegram_api(
        config,
        "editMessageText",
        payload,
        bot,
    )


def answer_callback_query(
    config: Config,
    callback_query_id: str,
    text: str = "",
    bot: BotRuntime | None = None,
) -> dict:
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    return telegram_api(config, "answerCallbackQuery", payload, bot)


def delete_message(
    config: Config,
    chat_id: str,
    message_id: int,
    bot: BotRuntime | None = None,
) -> dict:
    print(
        f"[telegram] deleteMessage chat_id={chat_id} message_id={message_id}",
        flush=True,
    )
    return telegram_api(
        config,
        "deleteMessage",
        {"chat_id": chat_id, "message_id": message_id},
        bot,
    )


def telegram_user_avatar(
    config: Config,
    user_id: str,
    bot_id: str | None = None,
) -> tuple[bytes, str] | None:
    normalized_user_id = str(user_id or "").strip()
    if not normalized_user_id or not normalized_user_id.lstrip("-").isdigit():
        return None

    settings = load_settings()
    requested_bot_id = None if not bot_id or bot_id == "default" else str(bot_id).strip()
    try:
        resolved_bot_id = resolve_telegram_bot_id(settings, requested_bot_id)
    except ValueError:
        return None

    bot = telegram_bot_runtime(settings, resolved_bot_id)
    try:
        photos = telegram_api(
            config,
            "getUserProfilePhotos",
            {"user_id": int(normalized_user_id), "limit": 1},
            bot,
        )
        photo_sets = (photos.get("result") or {}).get("photos") or []
        if not photo_sets or not photo_sets[0]:
            return None

        best_photo = max(
            photo_sets[0],
            key=lambda photo: (
                int(photo.get("width") or 0) * int(photo.get("height") or 0),
                int(photo.get("file_size") or 0),
            ),
        )
        file_id = str(best_photo.get("file_id") or "").strip()
        if not file_id:
            return None

        file_info = telegram_api(config, "getFile", {"file_id": file_id}, bot)
        file_path = str((file_info.get("result") or {}).get("file_path") or "").strip()
        if not file_path:
            return None

        response = requests.get(
            f"{TELEGRAM_API_BASE}/file/bot{bot.token}/{file_path.lstrip('/')}",
            timeout=30,
        )
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
        if content_type == "application/octet-stream":
            guessed_type, _ = mimetypes.guess_type(file_path)
            content_type = guessed_type or content_type
        return response.content, content_type or "image/jpeg"
    except Exception as exc:  # noqa: BLE001
        print(
            f"Failed to fetch Telegram avatar for user {normalized_user_id}: {safe_error_text(exc, bot)}",
            file=sys.stderr,
        )
        return None


def edit_message(
    config: Config,
    chat_id: str,
    message_id: int,
    text: str,
    bot: BotRuntime | None = None,
) -> dict:
    print(
        f"[telegram] editMessageText chat_id={chat_id} message_id={message_id} chars={len(text)}",
        flush=True,
    )
    return telegram_api(
        config,
        "editMessageText",
        {"chat_id": chat_id, "message_id": message_id, "text": text},
        bot,
    )


def send_chat_action(
    config: Config,
    chat_id: str,
    action: str = "typing",
    bot: BotRuntime | None = None,
) -> None:
    print(
        f"[telegram] sendChatAction chat_id={chat_id} action={action}",
        flush=True,
    )
    telegram_api(
        config,
        "sendChatAction",
        {"chat_id": chat_id, "action": action},
        bot,
    )


@contextmanager
def chat_action_heartbeat(
    config: Config,
    chat_id: str,
    action: str = "typing",
    interval_seconds: float = 4.0,
    bot: BotRuntime | None = None,
):
    send_chat_action(config, chat_id, action, bot)
    stop_event = threading.Event()

    def worker() -> None:
        while not stop_event.wait(interval_seconds):
            try:
                send_chat_action(config, chat_id, action, bot)
            except Exception as exc:  # noqa: BLE001
                print(f"sendChatAction failed for {chat_id}: {exc}", file=sys.stderr)
                return

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    try:
        yield
    finally:
        stop_event.set()
        thread.join(timeout=1)


def notify_allowed_chats(config: Config, text: str) -> None:
    settings = load_settings()
    for bot_key, bot_settings in telegram_enabled_bots(settings):
        bot = bot_runtime_from_settings(bot_key, bot_settings)
        user_ids, channel_ids = telegram_bot_allowed_ids(settings, bot_key)
        chat_ids = clean_id_list(user_ids + channel_ids)
        for chat_id in chat_ids:
            try:
                send_message(config, chat_id, text, bot)
            except Exception as exc:  # noqa: BLE001
                print(f"Failed to notify chat {chat_id}: {exc}", file=sys.stderr)


def notify_allowed_chats_async(config: Config, text: str) -> None:
    threading.Thread(
        target=lambda: notify_allowed_chats(config, text),
        name="telegram-allowed-chat-notifier",
        daemon=True,
    ).start()


def notify_bot_allowed_chats(
    config: Config,
    settings: dict,
    bot_id: str,
    text: str,
) -> None:
    bot_settings = settings["services"]["telegram"]["bots"].get(bot_id)
    if not bot_settings:
        return

    bot = bot_runtime_from_settings(bot_id, bot_settings)
    user_ids, channel_ids = telegram_bot_allowed_ids(settings, bot_id)
    chat_ids = clean_id_list(user_ids + channel_ids)
    for chat_id in chat_ids:
        try:
            send_message(config, chat_id, text, bot)
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to notify chat {chat_id}: {safe_error_text(exc, bot)}", file=sys.stderr)


def notify_bot_targets(
    config: Config,
    settings: dict,
    bot_id: str,
    chat_ids: list[str],
    text: str,
) -> None:
    bot_settings = settings["services"]["telegram"]["bots"].get(bot_id)
    if not bot_settings:
        return

    bot = bot_runtime_from_settings(bot_id, bot_settings)
    for chat_id in clean_id_list(chat_ids):
        try:
            send_message(config, chat_id, text, bot)
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to notify chat {chat_id}: {safe_error_text(exc, bot)}", file=sys.stderr)


def format_chat(chat: dict) -> str:
    name = chat.get("title") or " ".join(
        part for part in [chat.get("first_name"), chat.get("last_name")] if part
    )
    username = f"@{chat['username']}" if chat.get("username") else "-"
    return (
        f"id={chat.get('id')} type={chat.get('type')} "
        f"name={name or '-'} username={username}"
    )


def sender_from_message(message: dict, chat_id: str) -> dict:
    sender = message.get("from") or message.get("sender_chat") or {}
    username = sender.get("username")
    first_name = sender.get("first_name")
    last_name = sender.get("last_name")
    title = sender.get("title")
    full_name = " ".join(part for part in [first_name, last_name] if part)
    sender_id = str(sender.get("id") or chat_id)

    if username:
        label = f"@{username} (UID: {sender_id})"
    elif full_name:
        label = f"{full_name} (UID: {sender_id})"
    elif title:
        label = f"{title} (UID: {sender_id})"
    else:
        label = f"Unknown (UID: {sender_id})"

    return {
        "id": sender_id,
        "username": username,
        "name": full_name or title,
        "label": label,
    }


def target_from_message(message: dict) -> dict:
    chat = message.get("chat") or {}
    chat_id = str(chat.get("id") or "")
    chat_type = chat.get("type") or "private"
    target_type = "channel" if chat_type == "channel" else "chat"

    return {
        "id": chat_id,
        "type": target_type,
        "chat_type": chat_type,
        "title": chat.get("title"),
        "username": chat.get("username"),
    }


def display_name_from_sender(sender: dict | None, fallback_id: str) -> str:
    if not sender:
        return f"Unknown (UID: {fallback_id})"

    sender_id = sender.get("id") or fallback_id
    username = sender.get("username")
    name = sender.get("name")

    if username:
        return f"@{username} (UID: {sender_id})"
    if name:
        return f"{name} (UID: {sender_id})"
    return f"Unknown (UID: {sender_id})"


def user_status_for_chat(config: Config, chat_id: str, bot_id: str | None = None) -> str:
    settings = load_settings()
    requested_bot_id = None if bot_id == "default" else bot_id
    try:
        resolved_bot_id = resolve_telegram_bot_id(settings, requested_bot_id)
    except ValueError:
        resolved_bot_id = ""
        for candidate_bot_id in telegram_bot_ids(settings):
            candidate_users, candidate_channels = telegram_bot_allowed_ids(
                settings,
                candidate_bot_id,
            )
            if chat_id in set(candidate_users + candidate_channels):
                resolved_bot_id = candidate_bot_id
                break
        if not resolved_bot_id:
            bot_ids = telegram_bot_ids(settings)
            resolved_bot_id = bot_ids[0] if bot_ids else ""
    if not resolved_bot_id:
        return "public"
    decision = resolve_bot_access(settings, resolved_bot_id, chat_id, "message")
    if decision.role == "owner":
        return "owner"
    if decision.allowed and decision.role == "admin":
        return "allowed"
    return decision.role if decision.role == "public" else "public"


def sender_uid(sender: dict | None, fallback_id: str) -> str:
    if not sender:
        return fallback_id
    return str(sender.get("id") or fallback_id)


def target_label_from_turns(
    chat_id: str,
    turns: list[dict],
    sender: dict | None,
) -> str:
    sender_username = sender.get("username") if sender else ""
    sender_name = sender.get("name") if sender else ""

    for turn in turns:
        target = turn.get("target")
        if not isinstance(target, dict):
            continue

        target_id = target.get("id") or chat_id
        target_username = target.get("username")
        target_title = target.get("title")
        if target.get("type") == "channel":
            target_name = (
                f"@{target_username}"
                if target_username
                else target_title or target_id
            )
            return f"Channel in {target_name}"

        target_name = (
            f"@{target_username}"
            if target_username
            else sender_name or target_title or target_id
        )
        return f"Chat with {target_name}"

    if sender_username:
        return f"Chat with @{sender_username}"
    if sender_name:
        return f"Chat with {sender_name}"
    return f"Chat with {chat_id}"


def list_chats(config: Config) -> int:
    settings = load_settings()
    bot = telegram_bot_runtime(settings, resolve_telegram_bot_id(settings, None))
    updates = telegram_api(config, "getUpdates", bot=bot).get("result", [])
    seen_chat_ids = set()

    for update in updates:
        message = update.get("message") or update.get("channel_post")
        if not message:
            continue

        chat = message.get("chat", {})
        chat_id = chat.get("id")
        if chat_id in seen_chat_ids:
            continue

        seen_chat_ids.add(chat_id)
        print(format_chat(chat))

    if not seen_chat_ids:
        print("No chats found yet. Send /start to your bot in Telegram, then run again.")

    return 0


def build_chat_summary(config: Config, chat_id: str, turns: list[dict]) -> dict:
    last_turn = turns[-1] if turns else {}
    bot_id = conversation_bot_id(chat_id, turns)
    target_id = conversation_target_id(chat_id, turns)
    sender = None
    for turn in turns:
        if turn.get("role") == "user" and turn.get("sender"):
            sender = turn["sender"]
            break

    return {
        "id": chat_id,
        "target_id": target_id,
        "title": display_name_from_sender(sender, target_id),
        "user_status": user_status_for_chat(config, target_id, bot_id),
        "uid": sender_uid(sender, target_id),
        "target_label": target_label_from_turns(target_id, turns, sender),
        "turn_count": len(turns),
        "last_role": last_turn.get("role"),
        "last_message": str(last_turn.get("content", ""))[:160],
        "updated_at": last_turn.get("created_at"),
        "service_id": last_turn.get("service_id") or "telegram",
        "bot_id": bot_id,
        "bot_label": last_turn.get("bot_label") or "Telegram Bot",
    }


def console_message_slice(turns: list[dict], limit: int = CONSOLE_MESSAGE_PAGE_SIZE) -> tuple[list[dict], dict]:
    total = len(turns)
    safe_limit = max(1, int(limit or CONSOLE_MESSAGE_PAGE_SIZE))
    start = max(0, total - safe_limit)
    visible = turns[start:]
    return visible, {
        "total": total,
        "start": start,
        "loaded": len(visible),
        "has_more": start > 0,
    }


def conversation_message_page(
    config: Config,
    chat_id: str,
    before_index: int | None = None,
    limit: int = CONSOLE_MESSAGE_PAGE_SIZE,
) -> dict:
    state = load_state(config.state_file)
    turns = list(state.get("chats", {}).get(chat_id, []))
    if not turns:
        return {
            "chat_id": chat_id,
            "messages": [],
            "page": {
                "total": 0,
                "start": 0,
                "loaded": 0,
                "has_more": False,
            },
        }

    total = len(turns)
    safe_limit = max(1, min(100, int(limit or CONSOLE_MESSAGE_PAGE_SIZE)))
    end = total if before_index is None else max(0, min(total, int(before_index)))
    start = max(0, end - safe_limit)
    visible = turns[start:end]
    return {
        "chat_id": chat_id,
        "messages": visible,
        "page": {
            "total": total,
            "start": start,
            "loaded": len(visible),
            "has_more": start > 0,
        },
    }


def state_for_console(config: Config) -> dict:
    settings = load_settings()
    allowed_user_ids, allowed_channel_ids = telegram_allowed_ids(settings)
    state = load_state(config.state_file)
    chats = state.get("chats", {})
    summaries = [
        build_chat_summary(config, chat_id, turns)
        for chat_id, turns in chats.items()
        if isinstance(turns, list)
    ]
    summaries.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    console_messages = {}
    message_pages = {}
    for chat_id, turns in chats.items():
        if not isinstance(turns, list):
            continue
        visible, page = console_message_slice(turns)
        console_messages[chat_id] = visible
        message_pages[chat_id] = page
    console_settings = json.loads(json.dumps(settings))
    for provider_settings in console_settings.get("models", {}).values():
        for mode_settings in provider_settings.get("modes", {}).values():
            if "api_key" in mode_settings:
                mode_settings["api_key_saved"] = bool(mode_settings.get("api_key"))
                mode_settings["api_key_configured"] = bool(
                    mode_settings.get("base_url")
                    and mode_settings.get("api_key")
                    and mode_settings.get("selected_models")
                    and mode_settings.get("configured")
                )
                mode_settings["api_key"] = ""

    return {
        "chats": summaries,
        "messages": console_messages,
        "message_pages": message_pages,
        "services": {
            key: service_status(service)
            for key, service in SERVICES.items()
        },
        "settings": {
            **console_settings,
            "allowed_targets": clean_id_list(allowed_user_ids + allowed_channel_ids),
            "allowed_user_ids": allowed_user_ids,
            "allowed_channel_ids": allowed_channel_ids,
            "enabled_model_options": enabled_model_options(settings),
            "telegram_request_counts": request_counts_by_bot(settings),
        },
        "runtime": load_runtime_status(),
        "state_file": str(config.state_file),
    }


def build_codex_prompt(
    config: Config,
    chat_id: str,
    user_text: str,
    can_operate_locally: bool = True,
    bot: BotRuntime | None = None,
) -> str:
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id, bot)
    history = state["chats"].get(storage_key, [])[-8:]
    transcript = "\n".join(
        f"{turn.get('role')}: {turn_text_for_model(turn, can_operate_locally)}" for turn in history
    )
    local_rule = (
        "当前发送者具备本地 admin 权限；如果用户明确要求处理本地文件、项目或命令，可以执行。"
        if can_operate_locally
        else "当前发送者不具备本地 admin 权限；不能读取、修改或执行本地文件/命令，只能提供文字建议。"
    )
    media_rule = (
        "如果需要把本机已生成或已存在的媒体发回 Telegram，请在回复中单独一行输出："
        "[[telegram:photo:/abs/path.png|说明]]、"
        "[[telegram:document:/abs/path.ext|说明]] 或 "
        "[[telegram:voice:/abs/path.ogg|说明]]。"
        "路径必须是本机绝对路径；这行会被桥接器作为上传指令处理，其余文字照常发送。"
        if can_operate_locally
        else ""
    )

    return (
        "你是通过 Telegram 连接到本机的 Codex。"
        "请优先使用中文，回复要简洁、可靠、可执行。"
        "这个程序只是 Telegram chat 与 Codex CLI 的桥接器。"
        "不要把自己描述成某个工作目录里的助手。"
        f"{local_rule}"
        f"{media_rule}"
        "如果用户指定文件夹、项目名或绝对路径，就围绕该目标处理。"
        "如果你已经生成了需要发给用户的本地媒体文件，可以在回复中单独一行使用："
        "[[telegram:photo:/绝对路径/图片.png|可选说明]]、"
        "[[telegram:document:/绝对路径/文件.ext|可选说明]]、"
        "[[telegram:voice:/绝对路径/语音.ogg|可选说明]]。"
        "桥接器会发送对应附件；其他文字仍会正常发送。"
        "如果请求涉及破坏性操作、账号密钥、付款、外部发布或大范围改动，"
        "先说明风险并要求用户回到 Codex 桌面确认。\n\n"
        f"CLI 启动目录：{config.codex_cwd}\n\n"
        f"最近对话：\n{transcript or '(无)'}\n\n"
        f"用户新消息：\n{user_text}"
    )


def api_system_prompt(can_operate_locally: bool = False) -> str:
    if can_operate_locally:
        return "如果用户明确要求处理本地文件、项目或命令，可以执行；否则直接回答用户问题。"
    return "只能提供文字回复；不能声称已经读取、修改或执行本地文件/命令。"


def turn_text_for_model(turn: dict, can_operate_locally: bool = True) -> str:
    content = str(turn.get("content") or "").strip()
    attachments = turn.get("attachments") if isinstance(turn.get("attachments"), list) else []
    if not attachments:
        return content

    safe_attachments = []
    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue
        item = dict(attachment)
        if not can_operate_locally:
            item.pop("local_path", None)
        safe_attachments.append(item)
    return attachment_summary_text(safe_attachments, content)


def attachment_data_url(attachment: dict) -> str | None:
    if attachment.get("kind") != "image" or not attachment.get("local_path"):
        return None
    path = Path(str(attachment["local_path"]))
    if not path.exists() or not path.is_file() or path.stat().st_size > 20 * 1024 * 1024:
        return None
    mime_type = str(attachment.get("mime_type") or mimetypes.guess_type(path.name)[0] or "image/jpeg")
    payload = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{payload}"


def openai_responses_turn_content(turn: dict, can_operate_locally: bool = True) -> str | list[dict]:
    text = turn_text_for_model(turn, can_operate_locally)
    attachments = turn.get("attachments") if isinstance(turn.get("attachments"), list) else []
    image_parts = []
    for attachment in attachments:
        if not isinstance(attachment, dict):
            continue
        data_url = attachment_data_url(attachment)
        if data_url:
            image_parts.append({"type": "input_image", "image_url": data_url})
    if not image_parts:
        return text
    parts = [{"type": "input_text", "text": text or "User sent image attachments."}]
    parts.extend(image_parts)
    return parts


def conversation_messages(
    config: Config,
    chat_id: str,
    user_text: str,
    *,
    openai_responses: bool = False,
    can_operate_locally: bool = True,
    bot: BotRuntime | None = None,
) -> list[dict]:
    state = load_state(config.state_file)
    storage_key = resolve_conversation_storage_key(state, chat_id, bot)
    history = state["chats"].get(storage_key, [])[-8:]
    messages = []
    for turn in history:
        role = turn.get("role")
        if role not in {"user", "assistant"}:
            continue
        content = (
            openai_responses_turn_content(turn, can_operate_locally)
            if openai_responses and role == "user"
            else turn_text_for_model(turn, can_operate_locally)
        )
        if not content:
            continue
        messages.append({"role": role, "content": content})
    last_content = messages[-1].get("content") if messages else None
    last_text = (
        "\n".join(part.get("text", "") for part in last_content if isinstance(part, dict) and part.get("type") == "input_text")
        if isinstance(last_content, list)
        else last_content
    )
    if not messages or messages[-1].get("role") != "user" or last_text != user_text:
        messages.append({"role": "user", "content": user_text})
    return messages


LOCAL_OPERATION_PATTERNS = [
    r"/Users/|~/|\./|\.\./",
    r"文件|目录|项目|代码|脚本|日志|报错|终端|命令|运行|执行|安装|依赖|修复|修改|删除|创建|查看.*(文件|日志|目录|项目)|运行.*测试|跑.*测试|测.*接口",
    r"\b(run|execute|pytest|npm|pnpm|yarn|pip|brew|git|ls|cat|tail|grep|rg|open)\b",
]


def is_local_operation_request(text: str) -> bool:
    value = text.strip()
    if not value:
        return False
    return any(re.search(pattern, value, re.IGNORECASE) for pattern in LOCAL_OPERATION_PATTERNS)


def sender_is_admin(settings: dict, sender: dict) -> bool:
    sender_id = str(sender.get("id") or "").strip()
    return bool(sender_id and sender_id in set(settings.get("admins", {}).get("telegram", [])))


def route_display(route: dict) -> str:
    return str(route.get("label") or model_route_label(route)).strip() or "Model"


def model_turn_metadata(route: dict, profile: str, source: str) -> dict:
    profile_label = runtime_profile_label(profile)
    route_label = route_display(route)
    return {
        "provider_id": route.get("provider_id") or route.get("provider"),
        "mode_id": route.get("mode_id") or route.get("mode"),
        "model_id": route.get("model_id") or route.get("model"),
        "route_label": route_label,
        "profile": normalize_runtime_profile(profile),
        "profile_label": profile_label,
        "source": source,
        "label": f"{route_label} · {profile_label}",
    }


def model_option_to_route(option: dict) -> dict:
    return normalize_model_route(
        {
            "provider_id": option.get("provider_id"),
            "mode_id": option.get("mode_id"),
            "model_id": option.get("model_id"),
            "label": option.get("label"),
        },
        load_settings(),
    )


def models_menu_reply_markup(config: Config, chat_id: str, bot: BotRuntime | None) -> dict | None:
    settings = load_settings()
    options = enabled_model_options(settings)
    if not options:
        return None

    session_route = current_chat_model_override(config, chat_id, bot)
    fallback_route, _source = resolve_message_route(settings, bot, {}, "", None)
    current_key = route_key(session_route) if session_route else None
    fallback_key = route_key(fallback_route) if fallback_route else None

    session = chat_model_session(config, chat_id, bot)
    session["pending_options"] = [model_option_to_route(option) for option in options]
    session["pending_at"] = utc_now_iso()
    session["updated_at"] = utc_now_iso()
    save_chat_model_session(config, chat_id, bot, session)

    rows = []
    option_buttons = []
    for index, option in enumerate(options, start=1):
        route = model_option_to_route(option)
        label = route_display(route)
        if current_key and route_key(route) == current_key:
            label = f"✓ {label}"
        elif not current_key and fallback_key and route_key(route) == fallback_key:
            label = f"{label} (default)"
        option_buttons.append((label, f"models:{index}"))

    for label, callback_data in option_buttons:
        rows.append([{"text": label, "callback_data": callback_data}])

    rows.append(
        [
            {"text": "Default", "callback_data": "models:default"},
            {"text": "Cancel", "callback_data": "models:cancel"},
        ]
    )
    return {"inline_keyboard": rows}


def runtime_profile_reply_markup(
    settings: dict,
    route: dict,
    current_profile: str | None = None,
) -> dict:
    current = normalize_route_runtime_profile(settings, route, current_profile)
    rows = []
    for profile in runtime_profile_options_for_route(settings, route):
        label = profile["label"]
        if profile["id"] == current:
            label = f"✓ {label}"
        rows.append([{"text": label, "callback_data": f"models:profile:{profile['id']}"}])
    rows.append([{"text": "Cancel", "callback_data": "models:cancel"}])
    return {"inline_keyboard": rows}


def format_models_button_menu(config: Config, chat_id: str, bot: BotRuntime | None) -> str:
    settings = load_settings()
    if not enabled_model_options(settings):
        return telegram_message(settings, "model_menu_empty")
    return telegram_message(settings, "model_button_prompt")


def handle_model_callback(
    config: Config,
    callback_query: dict,
    bot: BotRuntime | None,
) -> None:
    callback_id = str(callback_query.get("id") or "")
    data = str(callback_query.get("data") or "")
    message = callback_query.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = str(chat.get("id") or "")
    message_id = message.get("message_id")

    if not data.startswith("models:") or not chat_id:
        if callback_id:
            answer_callback_query(config, callback_id, telegram_message(load_settings(), "model_button_unavailable"), bot)
        return

    action = data.split(":", 1)[1]
    if action == "cancel":
        clear_chat_model_pending(config, chat_id, bot)
        if callback_id:
            answer_callback_query(config, callback_id, telegram_message(load_settings(), "model_callback_cancelled"), bot)
        if message_id:
            edit_message_text(config, chat_id, int(message_id), telegram_message(load_settings(), "model_callback_cancelled"), bot)
        return

    if action.startswith("profile:"):
        profile = normalize_runtime_profile(action.split(":", 1)[1])
        session = chat_model_session(config, chat_id, bot)
        pending_route = session.get("pending_route")
        if not isinstance(pending_route, dict):
            if callback_id:
                answer_callback_query(config, callback_id, telegram_message(load_settings(), "model_callback_expired"), bot)
            return
        settings = load_settings()
        route = normalize_model_route(pending_route, settings)
        if not model_route_is_enabled(settings, route):
            clear_chat_model_pending(config, chat_id, bot)
            if callback_id:
                answer_callback_query(config, callback_id, telegram_message(settings, "model_unavailable"), bot)
            return
        session["route"] = route
        session["runtime_profile"] = normalize_route_runtime_profile(settings, route, profile)
        session.pop("pending_options", None)
        session.pop("pending_route", None)
        session.pop("pending_profiles", None)
        session.pop("pending_at", None)
        session["updated_at"] = utc_now_iso()
        save_chat_model_session(config, chat_id, bot, session)
        text = telegram_message(
            settings,
            "runtime_profile_switched",
            route=route_display(route),
            profile=runtime_profile_label(session["runtime_profile"]),
        )
        if callback_id:
            answer_callback_query(config, callback_id, telegram_message(settings, "model_switched", route=route_display(route)), bot)
        if message_id:
            edit_message_text(config, chat_id, int(message_id), text, bot)
        else:
            send_message(config, chat_id, text, bot)
        return

    if action == "default":
        clear_chat_model_override(config, chat_id, bot)
        settings = load_settings()
        text = telegram_message(settings, "model_default_restored")
        if callback_id:
            answer_callback_query(config, callback_id, telegram_message(settings, "model_default_restored_callback"), bot)
        if message_id:
            edit_message_text(config, chat_id, int(message_id), text, bot)
        else:
            send_message(config, chat_id, text, bot)
        return

    if not action.isdigit():
        if callback_id:
            answer_callback_query(config, callback_id, telegram_message(load_settings(), "model_button_unavailable"), bot)
        return

    session = chat_model_session(config, chat_id, bot)
    pending = session.get("pending_options")
    if not isinstance(pending, list):
        reply = telegram_message(load_settings(), "model_callback_expired")
        if callback_id:
            answer_callback_query(config, callback_id, reply, bot)
        return
    choice = int(action)
    if choice < 1 or choice > len(pending):
        reply = telegram_message(load_settings(), "model_callback_expired")
        if callback_id:
            answer_callback_query(config, callback_id, reply, bot)
        return
    settings = load_settings()
    route = normalize_model_route(pending[choice - 1], settings)
    if not model_route_is_enabled(settings, route):
        clear_chat_model_pending(config, chat_id, bot)
        reply = telegram_message(settings, "model_unavailable")
        if callback_id:
            answer_callback_query(config, callback_id, reply, bot)
        if message_id:
            edit_message_text(config, chat_id, int(message_id), reply, bot)
        return

    profiles = runtime_profile_options_for_route(settings, route)
    if len(profiles) > 1:
        session["pending_route"] = route
        session["pending_profiles"] = profiles
        session["pending_at"] = utc_now_iso()
        session["updated_at"] = utc_now_iso()
        save_chat_model_session(config, chat_id, bot, session)
        text = telegram_message(settings, "runtime_profile_prompt", route=route_display(route))
        if callback_id:
            answer_callback_query(config, callback_id, telegram_message(settings, "runtime_profile_callback_prompt"), bot)
        if message_id:
            edit_message_text(
                config,
                chat_id,
                int(message_id),
                text,
                bot,
                runtime_profile_reply_markup(settings, route, current_chat_runtime_profile(config, chat_id, bot)),
            )
        return

    session["route"] = route
    session["runtime_profile"] = "default"
    session.pop("pending_options", None)
    session.pop("pending_route", None)
    session.pop("pending_profiles", None)
    session.pop("pending_at", None)
    session["updated_at"] = utc_now_iso()
    save_chat_model_session(config, chat_id, bot, session)
    reply = telegram_message(settings, "model_switched", route=route_display(route))
    if callback_id:
        answer_callback_query(config, callback_id, reply, bot)
    if message_id:
        edit_message_text(config, chat_id, int(message_id), reply, bot)
    else:
        send_message(config, chat_id, reply, bot)


def resolve_message_route(
    settings: dict,
    bot: BotRuntime | None,
    sender: dict,
    text: str,
    session_route: dict | None = None,
) -> tuple[dict | None, str]:
    telegram = settings.get("services", {}).get("telegram", {})
    bot_settings = telegram.get("bots", {}).get(bot.bot_id if bot else "", {})
    service_route = normalize_model_route(telegram.get("model"), settings)
    override_route = normalize_model_route(bot_settings.get("model_override"), settings) if bot_settings.get("model_override") else None

    route = None
    source = "none"
    if session_route and model_route_is_enabled(settings, session_route):
        route = session_route
        source = "chat_session"
    elif override_route and model_route_is_enabled(settings, override_route):
        route = override_route
        source = "bot_override"
    elif model_route_is_enabled(settings, service_route):
        route = service_route
        source = "service_default"

    if is_local_operation_request(text):
        if not sender_is_admin(settings, sender):
            return {"error": "local_operation_requires_admin"}, "blocked"
        cli_route = first_enabled_cli_route(settings)
        if cli_route:
            return cli_route, "admin_cli"
        return {"error": "local_operation_requires_cli"}, "blocked"

    return route, source


def resolve_runtime_profile(
    settings: dict,
    bot: BotRuntime | None,
    route: dict | None,
    session_profile: str | None = None,
) -> tuple[str, str]:
    telegram = settings.get("services", {}).get("telegram", {})
    bot_settings = telegram.get("bots", {}).get(bot.bot_id if bot else "", {})
    candidates = [
        (session_profile, "chat_session"),
        (bot_settings.get("model_profile_override"), "bot_override"),
        (telegram.get("model_profile"), "service_default"),
    ]
    for profile, source in candidates:
        if not profile:
            continue
        normalized = normalize_runtime_profile(str(profile))
        if runtime_profile_is_supported(settings, route, normalized):
            return normalized, source
    return "default", "default"


def openai_responses_payload_text(payload: dict) -> str:
    output_text = str(payload.get("output_text") or "").strip()
    if output_text:
        return output_text
    parts: list[str] = []
    for item in payload.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if not isinstance(content, dict):
                continue
            text = content.get("text") or content.get("output_text")
            if text:
                parts.append(str(text))
    return "\n".join(part for part in parts if part).strip()


def profile_openai_responses_options(profile: str) -> dict:
    normalized = normalize_runtime_profile(profile)
    if normalized == "fast":
        return {"reasoning": {"effort": "low"}, "text": {"verbosity": "low"}}
    if normalized == "think":
        return {"reasoning": {"effort": "high"}, "text": {"verbosity": "medium"}}
    if normalized == "pro":
        return {"reasoning": {"effort": "high"}, "text": {"verbosity": "high"}}
    return {}


def profile_ollama_options(mode: dict, profile: str) -> tuple[bool, dict]:
    runtime_options = mode.get("runtime_options", {})
    if not isinstance(runtime_options, dict):
        runtime_options = {}
    think = bool(runtime_options.get("think", False))
    options = {
        "num_ctx": int(runtime_options.get("num_ctx") or 4096),
        "num_predict": int(runtime_options.get("num_predict") or 512),
    }
    normalized = normalize_runtime_profile(profile)
    if normalized == "fast":
        think = False
        options.update({"num_ctx": 2048, "num_predict": 256})
    elif normalized == "think":
        think = True
        options.update({"num_ctx": 4096, "num_predict": 768})
    elif normalized == "pro":
        think = True
        options.update({"num_ctx": 8192, "num_predict": 1024})
    return think, options


def ask_codex(
    config: Config,
    chat_id: str,
    user_text: str,
    bot: BotRuntime | None = None,
    can_operate_locally: bool = True,
    model: dict | None = None,
) -> str:
    output_file = config.state_file.parent / f"codex_reply_{chat_id}.txt"
    ensure_parent_dir(output_file)

    cmd = [
        config.codex_path,
        "exec",
        "--cd",
        str(config.codex_cwd),
        "--sandbox",
        config.codex_sandbox,
        "--skip-git-repo-check",
        "--output-last-message",
        str(output_file),
        build_codex_prompt(config, chat_id, user_text, can_operate_locally, bot),
    ]
    if config.codex_model:
        cmd[2:2] = ["--model", config.codex_model]

    print(
        f"[codex] start chat_id={chat_id} timeout={config.codex_timeout_seconds}s",
        flush=True,
    )

    try:
        result = subprocess.run(
            cmd,
            cwd=config.codex_cwd,
            capture_output=True,
            text=True,
            timeout=config.codex_timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise ModelInvocationError(
            "Codex 这次处理超时了。可以把问题拆小一点，或提高 CODEX_TIMEOUT_SECONDS。",
            "timeout",
        )
    except OSError as exc:
        raise ModelInvocationError(f"Codex CLI 执行失败：{exc}", "cli_not_found") from exc

    answer = ""
    if output_file.exists():
        answer = output_file.read_text(encoding="utf-8").strip()
        output_file.unlink(missing_ok=True)

    if result.returncode != 0 and not answer:
        details = (result.stderr or result.stdout or "").strip()
        print(
            f"[codex] failed chat_id={chat_id} returncode={result.returncode}",
            file=sys.stderr,
            flush=True,
        )
        raise ModelInvocationError(
            f"Codex 执行失败：\n{details[-1500:] or '没有返回错误详情'}",
            "cli_failed",
        )

    answer = answer or (result.stdout or "").strip()
    answer = answer or "Codex 收到了，但这次没有生成可发送的文本回复。"

    print(
        f"[codex] done chat_id={chat_id} returncode={result.returncode} chars={len(answer)}",
        flush=True,
    )

    append_turn(config, chat_id, "assistant", answer, bot=bot, model=model)
    notify_console_update(config, chat_id)
    return answer


def ask_openai_compatible(
    config: Config,
    chat_id: str,
    user_text: str,
    route: dict,
    mode: dict,
    profile: str = "default",
    bot: BotRuntime | None = None,
) -> str:
    base_url = str(mode.get("base_url") or "").rstrip("/")
    api_key = str(mode.get("api_key") or "").strip()
    model = str(route.get("model_id") or mode.get("model") or "").strip()
    if not base_url or not api_key or not model:
        return "当前模型配置不完整，请去 Service Configuration 重新选择可用模型。"
    provider_id = str(route.get("provider_id") or "")
    if provider_id == "openai":
        payload = {
            "model": model,
            "instructions": api_system_prompt(False),
            "input": conversation_messages(
                config,
                chat_id,
                user_text,
                openai_responses=True,
                can_operate_locally=False,
                bot=bot,
            ),
            **profile_openai_responses_options(profile),
        }
        response = requests.post(
            f"{base_url}/responses",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        return openai_responses_payload_text(response.json()) or "模型收到了，但没有生成可发送的文本回复。"

    response = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": api_system_prompt(False)},
                *conversation_messages(config, chat_id, user_text, can_operate_locally=False, bot=bot),
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    return str(payload.get("choices", [{}])[0].get("message", {}).get("content") or "").strip() or "模型收到了，但没有生成可发送的文本回复。"


def ask_anthropic_api(
    config: Config,
    chat_id: str,
    user_text: str,
    route: dict,
    mode: dict,
    bot: BotRuntime | None = None,
) -> str:
    base_url = str(mode.get("base_url") or "https://api.anthropic.com/v1").rstrip("/")
    api_key = str(mode.get("api_key") or "").strip()
    model = str(route.get("model_id") or mode.get("model") or "").strip()
    if not base_url or not api_key or not model:
        return "当前 Anthropic 模型配置不完整，请去 Service Configuration 重新选择可用模型。"
    response = requests.post(
        f"{base_url}/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": 1024,
            "system": api_system_prompt(False),
            "messages": conversation_messages(config, chat_id, user_text, can_operate_locally=False, bot=bot),
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    parts = payload.get("content") or []
    text_parts = [str(part.get("text") or "") for part in parts if isinstance(part, dict) and part.get("type") == "text"]
    return "\n".join(part for part in text_parts if part).strip() or "模型收到了，但没有生成可发送的文本回复。"


def ask_ollama_api(
    config: Config,
    chat_id: str,
    user_text: str,
    route: dict,
    mode: dict,
    profile: str = "default",
    bot: BotRuntime | None = None,
) -> str:
    base_url = str(mode.get("base_url") or "http://127.0.0.1:11434").rstrip("/")
    model = str(route.get("model_id") or mode.get("model") or "").strip()
    if not base_url or not model:
        return "当前 Ollama 模型配置不完整，请去 Service Configuration 重新选择可用模型。"
    messages = [
        {"role": "system", "content": api_system_prompt(False)},
        *conversation_messages(config, chat_id, user_text, can_operate_locally=False, bot=bot),
    ]
    think, options = profile_ollama_options(mode, profile)
    started_at = time.perf_counter()
    response = requests.post(
        f"{base_url}/api/chat",
        json={
            "model": model,
            "messages": messages,
            "stream": False,
            "think": bool(think),
            "options": options,
        },
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    print(
        f"[ollama] done chat_id={chat_id} model={model} elapsed={time.perf_counter() - started_at:.2f}s",
        flush=True,
    )
    return str(payload.get("message", {}).get("content") or "").strip() or "Ollama 收到了，但没有生成可发送的文本回复。"


def ask_model(
    config: Config,
    chat_id: str,
    user_text: str,
    sender: dict,
    bot: BotRuntime | None = None,
    routing_text: str | None = None,
) -> str:
    settings = load_settings()
    session_route = current_chat_model_override(config, chat_id, bot)
    session_profile = current_chat_runtime_profile(config, chat_id, bot) if session_route else None
    route, source = resolve_message_route(settings, bot, sender, routing_text if routing_text is not None else user_text, session_route)
    can_operate_locally = sender_is_admin(settings, sender)
    if not route:
        return "当前 Telegram Service 没有可用模型。请在 Model Configuration 启用 provider，并在 Service Configuration 选择 Provider (Model)。"
    if route.get("error") == "local_operation_requires_admin":
        return "这个请求涉及本地文件或命令操作，需要本地 admin 权限。"
    if route.get("error") == "local_operation_requires_cli":
        return "这个请求需要本地 CLI provider。请先启用 Codex CLI 或 Claude Code CLI。"

    provider_id = str(route.get("provider_id") or "")
    mode_id = str(route.get("mode_id") or "")
    profile, profile_source = resolve_runtime_profile(settings, bot, route, session_profile)
    mode = settings.get("models", {}).get(provider_id, {}).get("modes", {}).get(mode_id, {})
    print(
        f"[model] route chat_id={chat_id} source={source} provider={provider_id} mode={mode_id} model={route.get('model_id') or '-'} profile={profile} profile_source={profile_source}",
        flush=True,
    )
    turn_model = model_turn_metadata(route, profile, source)
    try:
        if provider_id == "openai" and mode_id == "codex_cli":
            return ask_codex(config, chat_id, user_text, bot, can_operate_locally, turn_model)
        if provider_id == "claude" and mode_id == "claude_code_cli":
            return ask_claude_code_cli(config, chat_id, user_text, mode, bot, can_operate_locally, turn_model)
        if provider_id in {"openai", "deepseek"} and mode_id == "api":
            answer = ask_openai_compatible(config, chat_id, user_text, route, mode, profile, bot)
        elif provider_id == "claude" and mode_id == "api":
            answer = ask_anthropic_api(config, chat_id, user_text, route, mode, bot)
        elif provider_id == "ollama" and mode_id == "api":
            answer = ask_ollama_api(config, chat_id, user_text, route, mode, profile, bot)
        else:
            return f"暂不支持这个模型路由：{route_display(route)}"
    except Exception as exc:  # noqa: BLE001
        failure = model_invocation_failure_reason(exc)
        if not failure:
            raise
        reason, detail = failure
        disabled = disable_model_route(route, reason, detail)
        print(
            f"[model] invocation failed chat_id={chat_id} provider={provider_id} "
            f"mode={mode_id} model={route.get('model_id') or '-'} reason={reason}: {safe_error_text(exc, bot)}",
            file=sys.stderr,
            flush=True,
        )
        answer = (
            f"当前模型 {route_display(route)} 调用失败"
            f"{'，已自动 disabled' if disabled else ''}。请到 Model Configuration 检查后再启用。"
        )
        append_turn(config, chat_id, "assistant", answer, bot=bot, model=turn_model)
        notify_console_update(config, chat_id)
        return answer

    append_turn(config, chat_id, "assistant", answer, bot=bot, model=turn_model)
    notify_console_update(config, chat_id)
    return answer


def ask_claude_code_cli(
    config: Config,
    chat_id: str,
    user_text: str,
    mode: dict,
    bot: BotRuntime | None = None,
    can_operate_locally: bool = True,
    model: dict | None = None,
) -> str:
    cli_path = str(mode.get("cli_path") or "claude").strip()
    working_directory = Path(str(mode.get("working_directory") or config.codex_cwd)).expanduser()
    prompt = build_codex_prompt(config, chat_id, user_text, can_operate_locally, bot)
    try:
        result = subprocess.run(
            [cli_path, "-p", prompt],
            cwd=working_directory,
            capture_output=True,
            text=True,
            timeout=config.codex_timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise ModelInvocationError("Claude Code 这次处理超时了。可以把问题拆小一点再试。", "timeout")
    except OSError as exc:
        raise ModelInvocationError(f"Claude Code CLI 执行失败：{exc}", "cli_not_found") from exc
    answer = (result.stdout or "").strip()
    if result.returncode != 0 and not answer:
        details = (result.stderr or "").strip()
        raise ModelInvocationError(
            f"Claude Code CLI 执行失败：\n{details[-1500:] or '没有返回错误详情'}",
            "cli_failed",
        )
    answer = answer or "Claude Code 收到了，但这次没有生成可发送的文本回复。"
    append_turn(config, chat_id, "assistant", answer, bot=bot, model=model)
    notify_console_update(config, chat_id)
    return answer


def process_user_message(
    config: Config,
    message: dict,
    sender: dict,
    target: dict,
    bot: BotRuntime | None = None,
    grouped_messages: list[dict] | None = None,
) -> None:
    messages_to_process = grouped_messages or [message]
    chat_id = str(message["chat"]["id"])
    caption = "\n".join(
        str(item.get("caption") or "").strip()
        for item in messages_to_process
        if str(item.get("caption") or "").strip()
    ).strip()
    text = (message.get("text") or caption).strip()
    attachments = []
    for index, item in enumerate(messages_to_process, start=1):
        attachment = extract_telegram_attachment(config, item, bot, index)
        if attachment:
            attachments.append(attachment)

    user_text = attachment_summary_text(attachments, text) if attachments else text
    display_text = text if attachments else (text or "[非文本消息]")
    append_turn(
        config,
        chat_id,
        "user",
        display_text,
        sender,
        target,
        bot,
        message.get("message_id"),
        attachments=attachments,
    )
    notify_console_update(config, chat_id)

    try:
        with chat_action_heartbeat(config, chat_id, bot=bot):
            answer = ask_model(
                config,
                chat_id,
                user_text,
                sender,
                bot,
                routing_text=text or ("attachment message" if attachments else user_text),
            )
        sent = send_answer(config, chat_id, answer, bot)
        attach_last_turn_message_id(
            config,
            chat_id,
            "assistant",
            sent.get("result", {}).get("message_id") if sent else None,
            bot,
        )
    except Exception as exc:  # noqa: BLE001
        print(
            f"[telegram] reply failed chat_id={chat_id}: {safe_error_text(exc, bot)}",
            file=sys.stderr,
            flush=True,
        )
        bridge_error = telegram_message(load_settings(), "bridge_error")
        append_turn(config, chat_id, "assistant", bridge_error, bot=bot)
        notify_console_update(config, chat_id)
        try:
            send_message(config, chat_id, bridge_error, bot)
        except Exception as send_exc:  # noqa: BLE001
            print(
                f"[telegram] fallback reply failed chat_id={chat_id}: {safe_error_text(send_exc, bot)}",
                file=sys.stderr,
                flush=True,
            )
        raise


def media_group_key(message: dict, bot: BotRuntime | None = None) -> str:
    return ":".join(
        [
            str(bot.bot_id if bot else "default"),
            str(message["chat"]["id"]),
            str(message.get("media_group_id") or ""),
        ]
    )


def flush_media_group(key: str) -> None:
    with MEDIA_GROUP_LOCK:
        group = MEDIA_GROUP_BUFFERS.pop(key, None)
    if not group:
        return
    messages = sorted(group["messages"], key=lambda item: int(item.get("message_id") or 0))
    try:
        process_user_message(
            group["config"],
            messages[0],
            group["sender"],
            group["target"],
            group["bot"],
            messages,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[telegram] media group failed key={key}: {safe_error_text(exc, group.get('bot'))}", file=sys.stderr, flush=True)


def buffer_media_group(
    config: Config,
    message: dict,
    sender: dict,
    target: dict,
    bot: BotRuntime | None = None,
) -> None:
    key = media_group_key(message, bot)
    with MEDIA_GROUP_LOCK:
        group = MEDIA_GROUP_BUFFERS.get(key)
        if group and group.get("timer"):
            group["timer"].cancel()
        group = group or {
            "config": config,
            "messages": [],
            "sender": sender,
            "target": target,
            "bot": bot,
        }
        group["messages"].append(message)
        timer = threading.Timer(MEDIA_GROUP_DELAY_SECONDS, flush_media_group, args=(key,))
        timer.daemon = True
        group["timer"] = timer
        MEDIA_GROUP_BUFFERS[key] = group
        timer.start()


def handle_message(
    config: Config,
    message: dict,
    bot: BotRuntime | None = None,
) -> None:
    chat_id = str(message["chat"]["id"])
    text = (message.get("text") or "").strip()
    sender = sender_from_message(message, chat_id)
    target = target_from_message(message)

    print(
        f"[telegram] incoming chat_id={chat_id} text={text!r}",
        flush=True,
    )

    settings = load_settings()
    commands = telegram_commands(settings)
    bot_settings = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot.bot_id if bot else "", {})

    if bot and not bot_settings.get("enabled", True):
        send_message(config, chat_id, telegram_message(settings, "bot_disabled"), bot)
        return

    allowed = is_chat_allowed(config, chat_id, bot)

    if command_enabled(commands, "apply") and command_matches(text, commands.get("apply", "")):
        if allowed:
            send_message(config, chat_id, telegram_message(settings, "already_allowed_apply"), bot)
            return
        if bot:
            upsert_request_target(bot.bot_id, target, sender)
        send_message(config, chat_id, telegram_message(settings, "apply_success"), bot)
        notify_console_update(config, chat_id)
        return

    if not allowed:
        send_message(config, chat_id, telegram_message(settings, "access_denied_apply"), bot)
        return

    if command_enabled(commands, "help") and (text == "/start" or command_matches(text, commands.get("help", ""))):
        send_message(config, chat_id, telegram_message(settings, "help_text"), bot)
        return

    if command_enabled(commands, "models") and command_matches(text, commands.get("models", "")):
        send_message(
            config,
            chat_id,
            format_models_button_menu(config, chat_id, bot),
            bot,
            models_menu_reply_markup(config, chat_id, bot),
        )
        return

    if command_enabled(commands, "reset") and command_matches(text, commands.get("reset", "")):
        reset_chat(config, chat_id)
        notify_console_update(config, chat_id)
        send_message(config, chat_id, telegram_message(settings, "reset_success"), bot)
        return

    if command_enabled(commands, "status") and command_matches(text, commands.get("status", "")):
        send_message(config, chat_id, format_bridge_status(config, chat_id, bot), bot)
        return

    if message_has_attachment(message) and message.get("media_group_id"):
        buffer_media_group(config, message, sender, target, bot)
        return

    process_user_message(config, message, sender, target, bot)


def poll_bot(
    config: Config,
    bot: BotRuntime,
    once: bool = False,
    stop_event: threading.Event | None = None,
) -> int:
    offset = None
    backoff_seconds = 2
    print(
        f"Telegram listener running for {bot.label} ({bot.bot_id}).",
        flush=True,
    )
    update_bot_runtime_status(bot, "running", "Polling Telegram updates.")

    while True:
        if stop_event and stop_event.is_set():
            print(f"[telegram:{bot.bot_id}] listener stopped.", flush=True)
            update_bot_runtime_status(bot, "stopped", "Worker stopped.")
            return 0

        payload = {"timeout": 25}
        if offset is not None:
            payload["offset"] = offset

        try:
            updates = telegram_api(config, "getUpdates", payload, bot).get("result", [])
            backoff_seconds = 2
        except Exception as exc:  # noqa: BLE001
            runtime_state, runtime_message = classify_poll_error(exc)
            update_bot_runtime_status(bot, runtime_state, runtime_message)
            print(
                f"[telegram:{bot.bot_id}] getUpdates failed: "
                f"{safe_error_text(exc, bot)}. reconnecting in {backoff_seconds}s",
                file=sys.stderr,
                flush=True,
            )
            if once:
                raise
            if stop_event and stop_event.wait(backoff_seconds):
                return 0
            if not stop_event:
                time.sleep(backoff_seconds)
            backoff_seconds = min(backoff_seconds * 2, 30)
            continue

        update_bot_runtime_status(bot, "running", "Polling Telegram updates.")
        if updates:
            print(
                f"[telegram:{bot.bot_id}] polled updates={len(updates)}",
                flush=True,
            )
        for update in updates:
            offset = update["update_id"] + 1
            callback_query = update.get("callback_query")
            if callback_query:
                try:
                    handle_model_callback(config, callback_query, bot)
                except Exception as exc:  # noqa: BLE001
                    print(
                        f"[telegram:{bot.bot_id}] handle_callback failed: {exc}",
                        file=sys.stderr,
                        flush=True,
                    )
                    if once:
                        raise
                continue

            message = update.get("message") or update.get("channel_post")
            if not message:
                continue

            try:
                handle_message(config, message, bot)
            except Exception as exc:  # noqa: BLE001
                print(
                    f"[telegram:{bot.bot_id}] handle_message failed: {exc}",
                    file=sys.stderr,
                    flush=True,
                )
                if once:
                    raise

        if once:
            return 0


def listen(config: Config, once: bool = False) -> int:
    settings = load_settings()
    bots = [
        bot_runtime_from_settings(bot_key, bot_settings)
        for bot_key, bot_settings in telegram_enabled_bots(settings)
    ]
    print(
        "Telegram listener manager is running for "
        f"{len(bots)} bot{'s' if len(bots) != 1 else ''}.",
        flush=True,
    )

    if once:
        if not bots:
            return 0
        for bot in bots:
            poll_bot(config, bot, once)
        return 0

    workers: dict[str, BotWorker] = {}

    def start_worker(bot: BotRuntime) -> None:
        stop_event = threading.Event()
        thread = threading.Thread(
            target=poll_bot,
            args=(config, bot, False, stop_event),
            name=f"telegram-listener-{bot.bot_id}",
            daemon=True,
        )
        workers[bot.bot_id] = BotWorker(bot=bot, stop_event=stop_event, thread=thread)
        thread.start()
        print(f"[telegram-manager] started {bot.label} ({bot.bot_id})", flush=True)

    def stop_worker(bot_id: str) -> None:
        worker = workers.pop(bot_id, None)
        if not worker:
            return
        worker.stop_event.set()
        worker.thread.join(timeout=35)
        update_bot_runtime_status(worker.bot, "stopped", "Worker stopped.")
        print(f"[telegram-manager] stopped {worker.bot.label} ({bot_id})", flush=True)

    def reconcile() -> None:
        latest_settings = load_settings()
        latest_bots = {
            bot_key: bot_runtime_from_settings(bot_key, bot_settings)
            for bot_key, bot_settings in telegram_enabled_bots(latest_settings)
        }
        for bot_id in list(workers):
            latest = latest_bots.get(bot_id)
            current = workers[bot_id].bot
            if not latest or bot_runtime_signature(latest) != bot_runtime_signature(current):
                stop_worker(bot_id)

        for bot_id, bot in latest_bots.items():
            if bot_id not in workers:
                start_worker(bot)

    reconcile()

    while True:
        time.sleep(2)
        reconcile()
        for bot_id in list(workers):
            worker = workers[bot_id]
            if not worker.thread.is_alive():
                stop_worker(bot_id)


class ChatConsoleHandler(BaseHTTPRequestHandler):
    config: Config
    broadcaster: "WebSocketBroadcaster"
    static_content_types = {
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".html": "text/html; charset=utf-8",
    }

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_json(
        self,
        payload: dict,
        status: HTTPStatus = HTTPStatus.OK,
        headers: dict[str, str] | None = None,
    ) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def console_session_valid(self) -> bool:
        cookie_header = self.headers.get("Cookie", "")
        if not cookie_header:
            return False
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        value = cookie.get(CONSOLE_SESSION_COOKIE)
        return bool(
            value
            and any(
                hmac.compare_digest(value.value, session_value)
                for session_value in console_session_values()
            )
        )

    def send_login_redirect(self) -> None:
        self.send_response(HTTPStatus.FOUND.value)
        self.send_header("Location", "/app.html")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def send_unauthorized(self) -> None:
        self.send_json({"error": "Unauthorized"}, HTTPStatus.UNAUTHORIZED)

    def static_file_for_path(self, request_path: str) -> tuple[Path, str] | None:
        if request_path.startswith("/api/"):
            return None
        if request_path == "/":
            request_path = "/chat.html"
        relative_path = unquote(request_path).lstrip("/")
        if not relative_path or relative_path.startswith("."):
            return None

        path = (WEB_DIR / relative_path).resolve()
        try:
            path.relative_to(WEB_DIR.resolve())
        except ValueError:
            return None

        content_type = self.static_content_types.get(path.suffix, "application/octet-stream")
        return path, content_type

    def send_file(self, path: Path, content_type: str) -> None:
        if not path.exists() or not path.is_file():
            self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return
        body = path.read_bytes()
        self.send_response(HTTPStatus.OK.value)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_multipart_form(self) -> dict:
        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(content_length)
        message = BytesParser(policy=policy.default).parsebytes(
            f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8") + body
        )
        form: dict[str, list[dict]] = {}
        for part in message.iter_parts():
            name = part.get_param("name", header="content-disposition")
            if not name:
                continue
            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b""
            form.setdefault(str(name), []).append(
                {
                    "filename": filename or "",
                    "value": payload.decode(part.get_content_charset() or "utf-8", errors="replace"),
                    "file": io.BytesIO(payload),
                }
            )
        return form

    def handle_send_conversation(self) -> None:
        form = self.read_multipart_form()
        chat_id = str((form.get("chat_id") or [{"value": ""}])[0].get("value") or "").strip()
        bot_id = str((form.get("bot_id") or [{"value": ""}])[0].get("value") or "").strip()
        text = str((form.get("text") or [{"value": ""}])[0].get("value") or "")
        file_fields = form.get("files") or []
        type_values = [str(item.get("value") or "") for item in form.get("file_types", [])]

        settings = load_settings()
        bot_settings = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot_id)
        bot = bot_runtime_from_settings(bot_id, bot_settings) if isinstance(bot_settings, dict) else None
        saved_uploads: list[tuple[Path, str]] = []
        try:
            for index, field in enumerate(file_fields):
                if not field.get("filename"):
                    continue
                requested_type = str(type_values[index] if index < len(type_values) else "file").strip() or "file"
                original_name = safe_path_part(Path(str(field["filename"])).name, f"upload_{index}")
                destination = media_outgoing_dir(bot, chat_id) / f"{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}_{original_name}"
                ensure_parent_dir(destination)
                with destination.open("wb") as output:
                    shutil.copyfileobj(field["file"], output)
                saved_uploads.append((destination, requested_type))

            result = send_manual_conversation_message(
                self.config,
                chat_id,
                bot_id,
                text,
                saved_uploads,
            )
        except Exception as exc:  # noqa: BLE001
            for path, _ in saved_uploads:
                path.unlink(missing_ok=True)
            self.send_json({"error": safe_error_text(exc, bot)}, HTTPStatus.BAD_REQUEST)
            return

        payload = state_for_console(self.config)
        self.broadcaster.broadcast_json(
            {
                "type": "conversation.updated",
                "chat_id": chat_id,
                "payload": payload,
            }
        )
        self.send_json({"ok": True, "payload": payload, **result})

    def do_HEAD(self) -> None:
        path = urlparse(self.path).path
        if path in {"/", "/chat.html"} and not self.console_session_valid():
            self.send_login_redirect()
            return
        if path.startswith("/api/") and not self.console_session_valid():
            self.send_unauthorized()
            return
        static_file = self.static_file_for_path("/chat.html" if path == "/" else path)
        if static_file:
            file_path, content_type = static_file
            if not file_path.exists():
                self.send_response(HTTPStatus.NOT_FOUND.value)
                self.end_headers()
                return
            self.send_response(HTTPStatus.OK.value)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return

        if path == "/api/conversations":
            self.send_response(HTTPStatus.OK.value)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return

        if path == "/api/avatars/telegram":
            self.send_response(HTTPStatus.OK.value)
            self.send_header("Cache-Control", "public, max-age=300")
            self.end_headers()
            return

        if path == "/api/media/telegram":
            self.send_response(HTTPStatus.OK.value)
            self.send_header("Cache-Control", "private, max-age=300")
            self.end_headers()
            return

        self.send_response(HTTPStatus.NOT_FOUND.value)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/auth/session":
            self.send_json({
                "ok": True,
                "authenticated": self.console_session_valid(),
                "auth": console_auth_public_state(),
            })
            return

        if path == "/api/setup/status":
            self.send_json(setup_environment_status())
            return

        if path in {"/", "/chat.html"} and not self.console_session_valid():
            self.send_login_redirect()
            return

        static_file = self.static_file_for_path("/chat.html" if path == "/" else path)
        if static_file:
            file_path, content_type = static_file
            self.send_file(file_path, content_type)
            return

        if path.startswith("/api/") and not self.console_session_valid():
            self.send_unauthorized()
            return

        if path == "/api/conversations":
            self.send_json(state_for_console(self.config))
            return

        if path == "/api/conversations/messages":
            query = parse_qs(parsed.query)
            chat_id = str(query.get("chat_id", [""])[0]).strip()
            if not chat_id:
                self.send_json({"error": "Missing chat_id"}, HTTPStatus.BAD_REQUEST)
                return
            try:
                before_index_value = query.get("before_index", [None])[0]
                before_index = None if before_index_value in {None, ""} else int(before_index_value)
                limit = int(query.get("limit", [str(CONSOLE_MESSAGE_PAGE_SIZE)])[0])
            except (TypeError, ValueError):
                self.send_json({"error": "before_index and limit must be integers"}, HTTPStatus.BAD_REQUEST)
                return
            self.send_json({"ok": True, **conversation_message_page(self.config, chat_id, before_index, limit)})
            return

        if path == "/api/avatars/telegram":
            query = parse_qs(parsed.query)
            user_id = str(query.get("user_id", [""])[0]).strip()
            bot_id = str(query.get("bot_id", [""])[0]).strip() or None
            if not user_id:
                self.send_json({"error": "Missing user_id"}, HTTPStatus.BAD_REQUEST)
                return

            avatar = telegram_user_avatar(self.config, user_id, bot_id)
            if not avatar:
                self.send_json({"error": "Avatar not found"}, HTTPStatus.NOT_FOUND)
                return

            body, content_type = avatar
            self.send_response(HTTPStatus.OK.value)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "public, max-age=300")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/media/telegram":
            query = parse_qs(parsed.query)
            media_path = media_file_from_query(str(query.get("path", [""])[0]).strip())
            if not media_path:
                self.send_json({"error": "Media not found"}, HTTPStatus.NOT_FOUND)
                return
            self.send_file(media_path, mimetypes.guess_type(media_path.name)[0] or "application/octet-stream")
            return

        if path == "/api/settings/telegram/requests":
            query = parse_qs(parsed.query)
            bot_id = str(query.get("bot_id", [""])[0]).strip()
            if not bot_id:
                self.send_json({"error": "Missing bot_id"}, HTTPStatus.BAD_REQUEST)
                return
            result = list_request_targets(
                bot_id,
                str(query.get("type", ["chat"])[0]).strip(),
                str(query.get("status", ["pending"])[0]).strip(),
                str(query.get("q", [""])[0]).strip(),
                int(str(query.get("page", ["1"])[0]) or "1"),
                int(str(query.get("page_size", ["30"])[0]) or "30"),
            )
            self.send_json({"ok": True, **result})
            return

        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path not in {
            "/api/auth/login",
            "/api/broadcast",
            "/api/conversations/delete",
            "/api/conversations/send",
            "/api/console/shutdown",
            "/api/messages/attachment/delete",
            "/api/messages/delete",
            "/api/settings/allowed-targets",
            "/api/settings/messages",
            "/api/settings/messages/refresh",
            "/api/settings/messages/sync",
            "/api/settings/telegram/requests/approve",
            "/api/settings/telegram/requests/reject",
            "/api/settings/models",
            "/api/settings/models/test",
            "/api/services/telegram/listener",
            "/api/settings/services/telegram",
            "/api/settings/services/lark",
            "/api/settings/services/telegram/bot",
            "/api/settings/services/lark/bot",
            "/api/settings/services/telegram/bot/remove",
            "/api/settings/services/telegram/validate-token",
        }:
            self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        if path != "/api/auth/login" and not self.console_session_valid():
            self.send_unauthorized()
            return

        if path == "/api/conversations/send":
            self.handle_send_conversation()
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"

        try:
            body = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON"}, HTTPStatus.BAD_REQUEST)
            return

        if path == "/api/auth/login":
            username = str(body.get("username") or "").strip()
            password = str(body.get("password") or "")
            auth = load_console_auth()
            if (
                not hmac.compare_digest(username, str(auth.get("username") or ""))
                or not hmac.compare_digest(password, str(auth.get("password") or ""))
            ):
                self.send_json(
                    {"ok": False, "error": "Username or password is incorrect."},
                    HTTPStatus.UNAUTHORIZED,
                )
                return
            session_value = console_session_value(auth)
            mark_console_auth_used(auth)
            self.send_json(
                {"ok": True},
                headers={
                    "Set-Cookie": (
                        f"{CONSOLE_SESSION_COOKIE}={session_value}; "
                        "Path=/; SameSite=Lax"
                    )
                },
            )
            return

        if path == "/api/conversations/delete":
            chat_id = str(body.get("chat_id") or "").strip()
            mode = str(body.get("mode") or "local").strip()
            if not chat_id:
                self.send_json({"error": "Missing chat_id"}, HTTPStatus.BAD_REQUEST)
                return
            if mode not in {"local", "telegram_recorded"}:
                self.send_json(
                    {"error": "mode must be local or telegram_recorded"},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            result = delete_conversation(self.config, chat_id, mode)
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload, **result})
            return

        if path == "/api/messages/delete":
            chat_id = str(body.get("chat_id") or "").strip()
            mode = str(body.get("mode") or "local").strip()
            indexes = body.get("indexes")
            if not chat_id:
                self.send_json({"error": "Missing chat_id"}, HTTPStatus.BAD_REQUEST)
                return
            if mode not in {"local", "telegram_recorded"}:
                self.send_json(
                    {"error": "mode must be local or telegram_recorded"},
                    HTTPStatus.BAD_REQUEST,
                )
                return
            if not isinstance(indexes, list):
                self.send_json({"error": "indexes must be a list"}, HTTPStatus.BAD_REQUEST)
                return
            try:
                normalized_indexes = [int(index) for index in indexes]
            except (TypeError, ValueError):
                self.send_json(
                    {"error": "indexes must contain integers"},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            result = delete_turns(self.config, chat_id, normalized_indexes, mode)
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": chat_id,
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload, **result})
            return

        if path == "/api/messages/attachment/delete":
            chat_id = str(body.get("chat_id") or "").strip()
            mode = str(body.get("mode") or "local").strip()
            if not chat_id:
                self.send_json({"error": "Missing chat_id"}, HTTPStatus.BAD_REQUEST)
                return
            if mode not in {"local", "telegram_recorded"}:
                self.send_json(
                    {"error": "mode must be local or telegram_recorded"},
                    HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                turn_index = int(body.get("turn_index"))
                attachment_index = int(body.get("attachment_index"))
            except (TypeError, ValueError):
                self.send_json(
                    {"error": "turn_index and attachment_index must be integers"},
                    HTTPStatus.BAD_REQUEST,
                )
                return
            try:
                result = delete_turn_attachment(
                    self.config,
                    chat_id,
                    turn_index,
                    attachment_index,
                    mode,
                )
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.NOT_FOUND)
                return
            except RuntimeError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.CONFLICT)
                return
            except Exception as exc:  # noqa: BLE001
                self.send_json({"error": safe_error_text(exc)}, HTTPStatus.BAD_GATEWAY)
                return

            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": chat_id,
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload, **result})
            return

        if path == "/api/settings/telegram/requests/approve":
            bot_id = str(body.get("bot_id") or "").strip()
            target_type = str(body.get("target_type") or body.get("type") or "chat").strip()
            target_id = str(body.get("target_id") or body.get("id") or "").strip()
            try:
                approve_request_target(bot_id, target_type, target_id, self.config)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/telegram/requests/reject":
            bot_id = str(body.get("bot_id") or "").strip()
            target_type = str(body.get("target_type") or body.get("type") or "chat").strip()
            target_id = str(body.get("target_id") or body.get("id") or "").strip()
            try:
                reject_request_target(bot_id, target_type, target_id)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/messages":
            service_id = str(body.get("service_id") or "telegram").strip()
            if service_id != "telegram":
                self.send_json({"error": "Only telegram is supported for now"}, HTTPStatus.BAD_REQUEST)
                return
            messages = body.get("messages")
            if not isinstance(messages, dict):
                self.send_json({"error": "messages must be an object"}, HTTPStatus.BAD_REQUEST)
                return
            commands = body.get("commands")
            if commands is not None and not isinstance(commands, dict):
                self.send_json({"error": "commands must be an object"}, HTTPStatus.BAD_REQUEST)
                return
            command_descriptions = body.get("command_descriptions")
            if command_descriptions is not None and not isinstance(command_descriptions, dict):
                self.send_json({"error": "command_descriptions must be an object"}, HTTPStatus.BAD_REQUEST)
                return
            custom_commands = body.get("custom_commands")
            if custom_commands is not None and not isinstance(custom_commands, list):
                self.send_json({"error": "custom_commands must be a list"}, HTTPStatus.BAD_REQUEST)
                return
            command_order = body.get("command_order")
            if command_order is not None and not isinstance(command_order, list):
                self.send_json({"error": "command_order must be a list"}, HTTPStatus.BAD_REQUEST)
                return
            command_registry = body.get("command_registry")
            if command_registry is not None and not isinstance(command_registry, list):
                self.send_json({"error": "command_registry must be a list"}, HTTPStatus.BAD_REQUEST)
                return
            save_telegram_message_settings(
                messages,
                commands,
                command_descriptions,
                custom_commands,
                command_order,
                command_registry,
            )
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/messages/refresh":
            service_id = str(body.get("service_id") or "telegram").strip()
            if service_id != "telegram":
                self.send_json({"error": "Only telegram is supported for now"}, HTTPStatus.BAD_REQUEST)
                return
            settings = normalize_settings(load_settings())
            save_settings(settings)
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/messages/sync":
            service_id = str(body.get("service_id") or "telegram").strip()
            if service_id != "telegram":
                self.send_json({"error": "Only telegram is supported for now"}, HTTPStatus.BAD_REQUEST)
                return
            settings = load_settings()
            command_sync_errors = sync_telegram_bot_commands(self.config, settings)
            payload = None
            if not command_sync_errors:
                settings = mark_telegram_commands_synced(settings)
                self.config = load_config()
                ChatConsoleHandler.config = self.config
                payload = state_for_console(self.config)
                self.broadcaster.broadcast_json(
                    {
                        "type": "conversation.updated",
                        "chat_id": "",
                        "payload": payload,
                    }
                )
            self.send_json({"ok": True, "command_sync_errors": command_sync_errors, "payload": payload})
            return

        if path == "/api/settings/allowed-targets":
            if "allowed_chats" in body or "allowed_channels" in body:
                service_id = str(body.get("service_id") or "telegram")
                bot_id = str(body.get("bot_id") or "").strip()
                if service_id != "telegram":
                    self.send_json(
                        {"error": "Only telegram is supported for now"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                user_ids = body.get("allowed_chats", [])
                channel_ids = body.get("allowed_channels", [])
                disabled_message_key = str(body.get("disabled_message_key") or "").strip() or None
                notify_removed = body.get("notify_removed", True)
                if not isinstance(user_ids, list) or not isinstance(channel_ids, list):
                    self.send_json(
                        {"error": "allowed_chats and allowed_channels must be lists"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                try:
                    save_allowed_targets(
                        user_ids,
                        channel_ids,
                        bot_id,
                        self.config,
                        disabled_message_key=disabled_message_key,
                        notify_removed=bool(notify_removed),
                    )
                except ValueError as exc:
                    self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                    return
            elif "allowed_user_ids" in body or "allowed_channel_ids" in body:
                user_ids = body.get("allowed_user_ids", [])
                channel_ids = body.get("allowed_channel_ids", [])
                if not isinstance(user_ids, list) or not isinstance(channel_ids, list):
                    self.send_json(
                        {"error": "allowed_user_ids and allowed_channel_ids must be lists"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                save_allowed_targets(
                    [str(target) for target in user_ids],
                    [str(target) for target in channel_ids],
                    None,
                    self.config,
                )
            else:
                targets = body.get("allowed_targets")
                if not isinstance(targets, list):
                    self.send_json(
                        {"error": "allowed_targets must be a list"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                save_allowed_targets([str(target) for target in targets], [], None, self.config)

            self.config = load_config()
            ChatConsoleHandler.config = self.config
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/models":
            try:
                save_model_provider_settings(body)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/models/test":
            try:
                result = test_model_provider_settings(body)
            except (ValueError, requests.RequestException) as exc:
                reason, message = classify_model_test_exception(exc)
                if str(body.get("provider") or "").strip().lower() == "ollama" and reason == "base_url_unreachable":
                    message = "Ollama is not reachable. Make sure Ollama is installed and running."
                self.send_json({"error": message, "reason": reason}, HTTPStatus.BAD_REQUEST)
                return
            self.send_json({"ok": True, **result})
            return

        if path == "/api/services/telegram/listener":
            action = str(body.get("action") or "").strip()
            try:
                if action == "start":
                    start_telegram_listener_service(self.config)
                elif action == "stop":
                    stop_telegram_listener_service(self.config)
                else:
                    self.send_json(
                        {"error": "action must be start or stop"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
            except Exception as exc:  # noqa: BLE001
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/console/shutdown":
            try:
                stop_telegram_listener_service(self.config)
            except Exception as exc:  # noqa: BLE001
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json(
                {"ok": True, "payload": payload},
                headers={"Set-Cookie": CONSOLE_CLEAR_SESSION_COOKIE},
            )

            def shutdown_server() -> None:
                time.sleep(0.2)
                self.server.shutdown()

            threading.Thread(target=shutdown_server, daemon=True).start()
            return

        if path == "/api/settings/services/telegram/bot":
            bot_id = str(body.get("bot_id") or "").strip()
            if not bot_id:
                self.send_json({"error": "Missing bot_id"}, HTTPStatus.BAD_REQUEST)
                return
            try:
                before_settings = load_settings()
                before_bot = before_settings["services"]["telegram"]["bots"].get(bot_id)
                before_enabled = bool(before_bot and before_bot.get("enabled", False))
                requested_enabled = body.get("enabled") if "enabled" in body else None
                update_telegram_bot(bot_id, body)
                after_settings = load_settings()
                after_bot = after_settings["services"]["telegram"]["bots"].get(bot_id)
                after_enabled = bool(after_bot and after_bot.get("enabled", False))
                if requested_enabled is not None and before_enabled != after_enabled:
                    notify_bot_allowed_chats(
                        self.config,
                        after_settings if after_enabled else before_settings,
                        bot_id,
                        telegram_message(after_settings, "assistant_online")
                        if after_enabled
                        else telegram_message(before_settings, "assistant_offline"),
                    )
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/services/lark/bot":
            bot_id = str(body.get("bot_id") or "").strip()
            if not bot_id:
                self.send_json({"error": "Missing bot_id"}, HTTPStatus.BAD_REQUEST)
                return
            try:
                update_service_bot("lark", bot_id, body)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/services/telegram/bot/remove":
            bot_id = str(body.get("bot_id") or "").strip()
            if not bot_id:
                self.send_json({"error": "Missing bot_id"}, HTTPStatus.BAD_REQUEST)
                return
            try:
                remove_telegram_bot(bot_id, self.config)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json({"ok": True, "payload": payload})
            return

        if path == "/api/settings/services/telegram/validate-token":
            token = str(body.get("bot_token") or "").strip()
            try:
                connection = validate_telegram_token(token)
            except Exception as exc:  # noqa: BLE001
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            settings = save_telegram_bot_connection(
                connection,
                str(body.get("bot_key") or "").strip() or None,
            )
            new_bot_id = bot_key_from_connection(str(body.get("bot_key") or "").strip(), connection)
            command_sync_errors = sync_telegram_bot_commands(self.config, settings, [new_bot_id])
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json(
                {
                    "ok": True,
                    "connection": connection,
                    "payload": payload,
                    "command_sync_errors": command_sync_errors,
                }
            )
            return

        if path == "/api/settings/services/telegram":
            settings = save_telegram_service(body)
            command_sync_errors = []
            if isinstance(body.get("connection"), dict):
                new_bot_id = bot_key_from_connection("", body["connection"])
                command_sync_errors = sync_telegram_bot_commands(self.config, settings, [new_bot_id])
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json(
                {
                    "ok": True,
                    "payload": payload,
                    "settings": settings,
                    "command_sync_errors": command_sync_errors,
                }
            )
            return

        if path == "/api/settings/services/lark":
            settings = save_lark_service(body)
            self.config = load_config()
            ChatConsoleHandler.config = self.config
            payload = state_for_console(self.config)
            self.broadcaster.broadcast_json(
                {
                    "type": "conversation.updated",
                    "chat_id": "",
                    "payload": payload,
                }
            )
            self.send_json(
                {
                    "ok": True,
                    "payload": payload,
                    "settings": settings,
                }
            )
            return

        chat_id = str(body.get("chat_id", ""))
        self.broadcaster.broadcast_json(
            {
                "type": "conversation.updated",
                "chat_id": chat_id,
                "payload": state_for_console(self.config),
            }
        )
        self.send_json({"ok": True})


class WebSocketBroadcaster:
    def __init__(self) -> None:
        self.clients: set = set()
        self.loop: asyncio.AbstractEventLoop | None = None

    async def handler(self, websocket) -> None:
        self.clients.add(websocket)
        await websocket.send(
            json.dumps(
                {"type": "connection.ready", "payload": {"message": "connected"}},
                ensure_ascii=False,
            )
        )

        try:
            async for raw_message in websocket:
                await self.handle_client_message(websocket, raw_message)
        finally:
            self.clients.discard(websocket)

    async def handle_client_message(self, websocket, raw_message: str) -> None:
        try:
            message = json.loads(raw_message)
        except json.JSONDecodeError:
            await websocket.send(
                json.dumps(
                    {"type": "error", "error": "Invalid JSON"},
                    ensure_ascii=False,
                )
            )
            return

        if message.get("type") == "message.send":
            await websocket.send(
                json.dumps(
                    {
                        "type": "message.send.ack",
                        "status": "reserved",
                        "message": "Web UI sending is reserved for a future version.",
                    },
                    ensure_ascii=False,
                )
            )

    async def broadcast(self, payload: dict) -> None:
        if not self.clients:
            return

        message = json.dumps(payload, ensure_ascii=False)
        clients = list(self.clients)
        results = await asyncio.gather(
            *(client.send(message) for client in clients),
            return_exceptions=True,
        )

        for client, result in zip(clients, results, strict=False):
            if isinstance(result, Exception):
                self.clients.discard(client)

    def broadcast_json(self, payload: dict) -> None:
        if not self.loop or self.loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(self.broadcast(payload), self.loop)

    async def serve(self, host: str, port: int) -> None:
        self.loop = asyncio.get_running_loop()
        async with websockets.serve(self.handler, host, port):
            await asyncio.Future()

    def start(self, host: str, port: int) -> threading.Thread:
        thread = threading.Thread(
            target=lambda: asyncio.run(self.serve(host, port)),
            daemon=True,
        )
        thread.start()
        return thread


def serve_console(config: Config, host: str, port: int, ws_port: int) -> int:
    broadcaster = WebSocketBroadcaster()
    broadcaster.start(host, ws_port)
    ChatConsoleHandler.config = config
    ChatConsoleHandler.broadcaster = broadcaster
    server = ThreadingHTTPServer((host, port), ChatConsoleHandler)
    print(f"Chat console running at http://{host}:{port}")
    print(f"WebSocket running at ws://{host}:{ws_port}/ws")
    server.serve_forever()
    return 0


def launchctl_domain() -> str:
    return f"gui/{os.getuid()}"


def run_launchctl(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["launchctl", *args],
        capture_output=True,
        text=True,
        check=False,
    )


def service_status(service: dict) -> dict:
    result = run_launchctl(["print", f"{launchctl_domain()}/{service['label']}"])
    if result.returncode != 0:
        return {
            "name": service["name"],
            "label": service["label"],
            "state": "stopped",
            "pid": None,
        }

    state = "unknown"
    pid = None
    for line in result.stdout.splitlines():
        stripped = line.strip()
        if stripped.startswith("state = "):
            state = stripped.removeprefix("state = ").strip()
        elif stripped.startswith("pid = "):
            pid = stripped.removeprefix("pid = ").strip()

    return {
        "name": service["name"],
        "label": service["label"],
        "state": state,
        "pid": pid,
    }


def format_services_status() -> str:
    lines = []
    for service in SERVICES.values():
        status = service_status(service)
        pid = f", pid={status['pid']}" if status["pid"] else ""
        lines.append(f"{status['name']}: {status['state']}{pid}")
    return "\n".join(lines)


def telegram_listener_is_running(settings: dict) -> bool:
    enabled_bot_ids = {bot_id for bot_id, _ in telegram_enabled_bots(settings)}
    if not enabled_bot_ids:
        return False
    runtime_bots = load_runtime_status().get("telegram", {}).get("bots", {})
    return any(
        runtime_bots.get(bot_id, {}).get("state") == "running"
        for bot_id in enabled_bot_ids
    )


def format_bridge_status(
    config: Config,
    chat_id: str | None = None,
    bot: BotRuntime | None = None,
) -> str:
    settings = load_settings()
    service_is_on = telegram_listener_is_running(settings)
    service_text = "开启" if service_is_on else "关闭"

    bot_text = "-"
    model_text = "-"
    access_text = "-"
    try:
        bot_id = bot.bot_id if bot else resolve_telegram_bot_id(settings, None)
        bot_settings = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot_id, {})
        bot_text = "启用" if bot_settings.get("enabled", False) else "禁用"
        if service_is_on:
            route, _source = resolve_message_route(settings, bot, {}, "")
            model_text = route_display(route) if route and not route.get("error") else "-"
        if chat_id:
            decision = resolve_bot_access(settings, bot_id, chat_id, "message")
            access_text = "开通" if decision.allowed else "未开通"
    except Exception:
        access_text = "未开通" if chat_id else "-"

    return (
        "你好，向您汇报当前服务状态 ↓\n\n"
        f"桥接服务状态 (Listening) : {service_text}\n"
        "\n"
        f"当前bot的状态: {bot_text}\n"
        f"当前bot配置的模型是: {model_text}\n"
        "\n"
        f"您的沟通权限: {access_text}"
    )


def start_service(service: dict) -> None:
    status = service_status(service)
    if status["state"] == "stopped":
        result = run_launchctl(
            ["bootstrap", launchctl_domain(), str(service["plist"])]
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Failed to bootstrap {service['name']}: "
                f"{result.stderr.strip() or result.stdout.strip()}"
            )

    result = run_launchctl(["kickstart", "-k", f"{launchctl_domain()}/{service['label']}"])
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to kickstart {service['name']}: "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )


def stop_service(service: dict) -> None:
    if service_status(service)["state"] == "stopped":
        return

    result = run_launchctl(["bootout", launchctl_domain(), str(service["plist"])])
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to stop {service['name']}: "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )


def start_telegram_listener_service(config: Config) -> None:
    start_service(SERVICES["listener"])
    update_enabled_bot_runtime_statuses(
        "pending",
        "Telegram listener is starting.",
    )
    notify_allowed_chats_async(config, telegram_message(load_settings(), "assistant_online"))


def stop_telegram_listener_service(config: Config) -> None:
    stop_service(SERVICES["listener"])
    update_enabled_bot_runtime_statuses(
        "stopped",
        "Telegram listener is stopped.",
    )
    notify_allowed_chats_async(config, telegram_message(load_settings(), "assistant_offline"))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Telegram to Codex bridge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    listen_parser = subparsers.add_parser("listen", help="Listen for Telegram messages")
    listen_parser.add_argument(
        "--once",
        action="store_true",
        help="Process current updates once and exit",
    )
    subparsers.add_parser("list-chats", help="List chats that have messaged the bot")

    chat_parser = subparsers.add_parser("chat", help="Open the local chat console")
    chat_parser.add_argument("--host", default="127.0.0.1", help="HTTP host")
    chat_parser.add_argument("--port", default=8765, type=int, help="HTTP port")
    chat_parser.add_argument("--ws-port", default=8766, type=int, help="WebSocket port")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        config = load_config()

        if args.command == "listen":
            return listen(config, args.once)
        if args.command == "list-chats":
            return list_chats(config)
        if args.command == "chat":
            return serve_console(config, args.host, args.port, args.ws_port)
    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
