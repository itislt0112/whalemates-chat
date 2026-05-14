TELEGRAM_API_BASE = "https://api.telegram.org"

HELP_TEXT = (
    "我会把你的消息交给当前配置的模型处理。\n\n"
    "可用命令：\n"
    "/reset 清空当前对话记忆\n"
    "/models 选择当前对话使用的模型\n"
    "/status 查看桥接服务状态\n"
    "/help 查看帮助"
)

GENERIC_BRIDGE_ERROR_TEXT = (
    "桥接服务刚才处理失败了。\n"
    "如果是临时断连，我会自动重试；你也可以稍后再发一次。"
)

ASSISTANT_ONLINE_TEXT = "Your personal assistant is online."
ASSISTANT_OFFLINE_TEXT = "Your personal assistant is offline."

ACCESS_CAPABILITIES = {
    "public": {"message"},
    "admin": {"message", "codex"},
    "member": {"message", "codex"},
    "owner": {"message", "codex", "admin"},
    # Legacy role names kept readable during migration and old conversation history.
    "allowed_user": {"message", "codex"},
    "allowed_channel": {"message", "codex"},
}
