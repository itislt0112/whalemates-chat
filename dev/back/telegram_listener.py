"""Telegram polling listener and update handling."""

from __future__ import annotations

import sys
import threading
import time
from typing import Any


def media_group_key(message: dict, bot: Any | None = None) -> str:
    return ":".join(
        [
            str(bot.bot_id if bot else "default"),
            str(message["chat"]["id"]),
            str(message.get("media_group_id") or ""),
        ]
    )


def flush_media_group(rt: Any, key: str) -> None:
    with rt.MEDIA_GROUP_LOCK:
        group = rt.MEDIA_GROUP_BUFFERS.pop(key, None)
    if not group:
        return
    messages = sorted(group["messages"], key=lambda item: int(item.get("message_id") or 0))
    try:
        rt.process_user_message(
            group["config"],
            messages[0],
            group["sender"],
            group["target"],
            group["bot"],
            messages,
            group.get("should_reply", True),
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[telegram] media group failed key={key}: {rt.safe_error_text(exc, group.get('bot'))}", file=sys.stderr, flush=True)


def buffer_media_group(
    rt: Any,
    config: Any,
    message: dict,
    sender: dict,
    target: dict,
    bot: Any | None = None,
    should_reply: bool = True,
) -> None:
    key = media_group_key(message, bot)
    with rt.MEDIA_GROUP_LOCK:
        group = rt.MEDIA_GROUP_BUFFERS.get(key)
        if group and group.get("timer"):
            group["timer"].cancel()
        group = group or {
            "config": config,
            "messages": [],
            "sender": sender,
            "target": target,
            "bot": bot,
            "should_reply": should_reply,
        }
        group["should_reply"] = bool(group.get("should_reply") or should_reply)
        group["messages"].append(message)
        timer = threading.Timer(rt.MEDIA_GROUP_DELAY_SECONDS, flush_media_group, args=(rt, key))
        timer.daemon = True
        group["timer"] = timer
        rt.MEDIA_GROUP_BUFFERS[key] = group
        timer.start()


def chat_member_status(member: dict | None) -> str:
    if not isinstance(member, dict):
        return ""
    return str(member.get("status") or "").strip().lower()


def current_bot_chat_status(
    rt: Any,
    config: Any,
    bot: Any,
    chat_id: str,
    fallback_member: dict | None = None,
) -> str:
    try:
        member = rt.telegram_api(
            config,
            "getChatMember",
            {"chat_id": chat_id, "user_id": bot.bot_id},
            bot,
        ).get("result", {})
        return rt.target_status_from_chat_member(member)
    except Exception as exc:  # noqa: BLE001
        print(
            f"[telegram:{bot.bot_id}] getChatMember self failed chat={chat_id}: {rt.safe_error_text(exc, bot)}",
            file=sys.stderr,
            flush=True,
        )
        return rt.target_status_from_chat_member(fallback_member)


def sender_is_group_admin(rt: Any, config: Any, bot: Any, chat_id: str, sender: dict) -> bool:
    sender_id = str(sender.get("id") or "").strip()
    if not sender_id:
        return False
    try:
        member = rt.telegram_api(
            config,
            "getChatMember",
            {"chat_id": chat_id, "user_id": sender_id},
            bot,
        ).get("result", {})
    except Exception as exc:  # noqa: BLE001
        print(
            f"[telegram:{bot.bot_id}] getChatMember sender failed chat={chat_id} user={sender_id}: {rt.safe_error_text(exc, bot)}",
            file=sys.stderr,
            flush=True,
        )
        return False
    return str(member.get("status") or "").strip() in {"creator", "administrator"}


def handle_my_chat_member(
    rt: Any,
    config: Any,
    update: dict,
    bot: Any,
) -> None:
    chat = update.get("chat") or {}
    chat_type = str(chat.get("type") or "").strip()
    if chat_type not in {"group", "supergroup", "channel"}:
        return

    chat_id = str(chat.get("id") or "").strip()
    if not chat_id:
        return

    new_member = update.get("new_chat_member")
    event_status = rt.target_status_from_chat_member(new_member)
    status = current_bot_chat_status(rt, config, bot, chat_id, new_member)
    rt.upsert_discovered_target(bot.bot_id, chat, status, enabled_default=False)
    rt.notify_console_update(config, chat_id)
    rt.notify_console_settings_update(config)
    print(
        f"[telegram:{bot.bot_id}] target status updated chat={chat_id} type={chat_type} status={status} event_status={event_status}",
        flush=True,
    )


def handle_message(
    rt: Any,
    config: Any,
    message: dict,
    bot: Any | None = None,
) -> None:
    chat_id = str(message["chat"]["id"])
    text = rt.message_text(message)
    sender = rt.sender_from_message(message, chat_id)
    target = rt.target_from_message(message)
    is_channel = target.get("chat_type") == "channel"
    is_group = rt.is_group_chat_type(target.get("chat_type"))

    print(
        f"[telegram] incoming chat_id={chat_id} text={text!r}",
        flush=True,
    )

    settings = rt.load_settings()
    commands = rt.telegram_commands(settings)
    bot_settings = settings.get("services", {}).get("telegram", {}).get("bots", {}).get(bot.bot_id if bot else "", {})

    if bot and not bot_settings.get("enabled", True):
        if is_channel or is_group:
            return
        rt.send_message(config, chat_id, rt.telegram_message(settings, "bot_disabled"), bot)
        return

    if is_group and bot:
        enable_matches = rt.command_matches_for_bot(text, "/enable", bot, require_bot_mention=True)
        disable_matches = rt.command_matches_for_bot(text, "/disable", bot, require_bot_mention=True)
        if enable_matches or disable_matches:
            if not rt.sender_is_bot_owner_or_admin(settings, bot.bot_id, sender):
                return
            enabled = bool(enable_matches)
            rt.set_group_target_enabled(bot.bot_id, chat_id, enabled, target)
            rt.notify_console_update(config, chat_id)
            rt.notify_console_settings_update(config)
            rt.send_message(
                config,
                chat_id,
                f"{bot.label} is now {'enabled' if enabled else 'disabled'} in this group.",
                bot,
            )
            return

    if is_group and bot:
        apply_matches = rt.command_enabled(commands, "apply") and rt.command_matches_for_bot(
            text,
            commands.get("apply", ""),
            bot,
            require_bot_mention=True,
        )
        if apply_matches:
            allowed = rt.is_chat_allowed(config, chat_id, bot)
            if allowed:
                rt.send_message(
                    config,
                    chat_id,
                    rt.telegram_message(settings, "already_allowed_apply"),
                    bot,
                )
                return
            if not sender_is_group_admin(rt, config, bot, chat_id, sender):
                rt.send_message(config, chat_id, "只有群管理员可以为这个群申请使用 Bot。", bot)
                return
            rt.upsert_request_target(bot.bot_id, target, sender)
            rt.send_message(
                config,
                chat_id,
                rt.telegram_message(settings, "apply_success"),
                bot,
            )
            rt.notify_console_update(config, chat_id)
            rt.notify_console_settings_update(config)
            return

    allowed = rt.is_chat_allowed(config, chat_id, bot)

    apply_matches = (
        not is_channel
        and not is_group
        and rt.command_enabled(commands, "apply")
        and rt.command_matches_for_bot(
            text,
            commands.get("apply", ""),
            bot,
            require_bot_mention=False,
        )
    )
    if apply_matches:
        if allowed:
            rt.send_message(
                config,
                chat_id,
                rt.telegram_message(settings, "already_allowed_apply"),
                bot,
            )
            return
        if bot:
            rt.upsert_request_target(bot.bot_id, target, sender)
        rt.send_message(
            config,
            chat_id,
            rt.telegram_message(settings, "apply_success"),
            bot,
        )
        rt.notify_console_update(config, chat_id)
        rt.notify_console_settings_update(config)
        return

    if is_group:
        if not allowed:
            return

        should_reply = rt.message_mentions_bot(message, bot)
        if not should_reply:
            return
        if rt.message_has_attachment(message) and message.get("media_group_id"):
            buffer_media_group(rt, config, message, sender, target, bot, should_reply=should_reply)
            return

        rt.process_user_message(config, message, sender, target, bot, should_reply=should_reply)
        return

    if is_channel:
        if not allowed:
            return
        should_reply = rt.message_mentions_bot(message, bot)
        if rt.message_has_attachment(message) and message.get("media_group_id"):
            buffer_media_group(rt, config, message, sender, target, bot, should_reply=should_reply)
            return
        rt.process_user_message(config, message, sender, target, bot, should_reply=should_reply)
        return

    if not allowed:
        rt.send_message(config, chat_id, rt.telegram_message(settings, "access_denied_apply"), bot)
        return

    if rt.command_enabled(commands, "help") and (text == "/start" or rt.command_matches(text, commands.get("help", ""))):
        rt.send_message(config, chat_id, rt.telegram_message(settings, "help_text"), bot)
        return

    if rt.command_enabled(commands, "models") and rt.command_matches(text, commands.get("models", "")):
        rt.send_message(
            config,
            chat_id,
            rt.format_models_button_menu(config, chat_id, bot),
            bot,
            rt.models_menu_reply_markup(config, chat_id, bot),
        )
        return

    if rt.command_enabled(commands, "reset") and rt.command_matches(text, commands.get("reset", "")):
        rt.reset_chat(config, chat_id)
        rt.notify_console_update(config, chat_id)
        rt.send_message(config, chat_id, rt.telegram_message(settings, "reset_success"), bot)
        return

    if rt.command_enabled(commands, "status") and rt.command_matches(text, commands.get("status", "")):
        rt.send_message(config, chat_id, rt.format_bridge_status(config, chat_id, bot), bot)
        return

    if rt.message_has_attachment(message) and message.get("media_group_id"):
        buffer_media_group(rt, config, message, sender, target, bot)
        return

    rt.process_user_message(config, message, sender, target, bot)


def poll_bot(
    rt: Any,
    config: Any,
    bot: Any,
    once: bool = False,
    stop_event: threading.Event | None = None,
) -> int:
    offset = None
    backoff_seconds = 2
    print(
        f"Telegram listener running for {bot.label} ({bot.bot_id}).",
        flush=True,
    )
    rt.update_bot_runtime_status(bot, "running", "Polling Telegram updates.")

    while True:
        if stop_event and stop_event.is_set():
            print(f"[telegram:{bot.bot_id}] listener stopped.", flush=True)
            rt.update_bot_runtime_status(bot, "stopped", "Worker stopped.")
            return 0

        payload = {
            "timeout": 25,
            "allowed_updates": [
                "message",
                "channel_post",
                "edited_channel_post",
                "callback_query",
                "my_chat_member",
            ],
        }
        if offset is not None:
            payload["offset"] = offset

        try:
            updates = rt.telegram_api(config, "getUpdates", payload, bot).get("result", [])
            backoff_seconds = 2
        except Exception as exc:  # noqa: BLE001
            runtime_state, runtime_message = rt.classify_poll_error(exc)
            rt.update_bot_runtime_status(bot, runtime_state, runtime_message)
            print(
                f"[telegram:{bot.bot_id}] getUpdates failed: "
                f"{rt.safe_error_text(exc, bot)}. reconnecting in {backoff_seconds}s",
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

        rt.update_bot_runtime_status(bot, "running", "Polling Telegram updates.")
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
                    rt.handle_model_callback(config, callback_query, bot)
                except Exception as exc:  # noqa: BLE001
                    print(
                        f"[telegram:{bot.bot_id}] handle_callback failed: {exc}",
                        file=sys.stderr,
                        flush=True,
                    )
                    if once:
                        raise
                continue

            my_chat_member = update.get("my_chat_member")
            if my_chat_member:
                try:
                    handle_my_chat_member(rt, config, my_chat_member, bot)
                except Exception as exc:  # noqa: BLE001
                    print(
                        f"[telegram:{bot.bot_id}] handle_my_chat_member failed: {exc}",
                        file=sys.stderr,
                        flush=True,
                    )
                    if once:
                        raise
                continue

            message = (
                update.get("message")
                or update.get("channel_post")
                or update.get("edited_channel_post")
            )
            if not message:
                continue

            try:
                handle_message(rt, config, message, bot)
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


def listen(rt: Any, config: Any, once: bool = False) -> int:
    settings = rt.load_settings()
    bots = [
        rt.bot_runtime_from_settings(bot_key, bot_settings)
        for bot_key, bot_settings in rt.telegram_enabled_bots(settings)
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
            poll_bot(rt, config, bot, once)
        return 0

    workers: dict[str, Any] = {}

    def start_worker(bot: Any) -> None:
        stop_event = threading.Event()
        thread = threading.Thread(
            target=poll_bot,
            args=(rt, config, bot, False, stop_event),
            name=f"telegram-listener-{bot.bot_id}",
            daemon=True,
        )
        workers[bot.bot_id] = rt.BotWorker(bot=bot, stop_event=stop_event, thread=thread)
        thread.start()
        print(f"[telegram-manager] started {bot.label} ({bot.bot_id})", flush=True)

    def stop_worker(bot_id: str) -> None:
        worker = workers.pop(bot_id, None)
        if not worker:
            return
        worker.stop_event.set()
        worker.thread.join(timeout=35)
        rt.update_bot_runtime_status(worker.bot, "stopped", "Worker stopped.")
        print(f"[telegram-manager] stopped {worker.bot.label} ({bot_id})", flush=True)

    def reconcile() -> None:
        latest_settings = rt.load_settings()
        latest_bots = {
            bot_key: rt.bot_runtime_from_settings(bot_key, bot_settings)
            for bot_key, bot_settings in rt.telegram_enabled_bots(latest_settings)
        }
        for bot_id in list(workers):
            latest = latest_bots.get(bot_id)
            current = workers[bot_id].bot
            if not latest or rt.bot_runtime_signature(latest) != rt.bot_runtime_signature(current):
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
