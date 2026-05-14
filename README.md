# Whalemates Chat

## 项目介绍 / Overview

Whalemates Chat 是一款本地运行的 AI Chat Console，用来把你的电脑、通讯软件和不同大模型连接在一起。它可以对接云端大模型、本地大模型，以及本机 CLI provider，并通过 Telegram、Lark 等通讯渠道收发消息。你可以用手机向 bot 发消息，让本机服务完成对话、模型切换、多 bot 管理、访问权限控制和多渠道消息路由。

Whalemates Chat is a local AI Chat Console that connects your computer, messaging channels, and multiple AI model providers. It can work with cloud models, local models, and local CLI providers, while routing messages through channels such as Telegram and Lark. You can message a bot from your phone, talk to different models, manage multiple bots, control access, and keep conversations running through your own local machine.

适合场景 / Good for:

- 从手机远程和本机 AI 助手对话 / Chat with a local AI assistant from your phone.
- 在云端模型、本地模型和 CLI provider 之间切换 / Switch between cloud models, local models, and CLI providers.
- 同时管理多个 bot、用户、群组和频道 / Manage multiple bots, users, groups, and channels.
- 把 Telegram、Lark 等通讯入口变成本机 AI 控制台 / Turn Telegram, Lark, and similar channels into a local AI control surface.
- 保留本机运行和本地数据边界 / Keep the runtime and private data under local control.

当前核心模型：

```text
Communication Services
  Telegram / Lark / future channels
    bot worker: @bot_a
    bot worker: @bot_b
      model routing: cloud models / local models / CLI providers
      access control: chats / channels / public policy
      conversations: local console history
```

## Marketing Copy / 宣传话术

### 中文

Whalemates Chat 是一个本地 AI 聊天控制台。它把 Telegram、Lark 等通讯软件连接到你的电脑，让你可以直接从手机调用不同的大模型，包括云端模型、本地模型和本机 CLI provider。你可以为不同 bot 配置不同模型、管理用户和群组权限、保留本地对话记录，并用一个轻量的 Console 统一管理服务状态。

它不是又一个普通聊天窗口，而是一个“手机到电脑”的 AI 控制层：人在外面也能给自己的本机 AI 助手发消息，需要时切换模型、接入多个 bot、处理多个频道。适合想把本地电脑能力、大模型能力和日常通讯工具连起来的人。

推荐一句话：

```text
Whalemates Chat lets you control your local AI workspace from Telegram or Lark, with support for cloud models, local models, multiple bots, and channel-level access control.
```

### English

Whalemates Chat is a local AI chat console that connects messaging apps like Telegram and Lark to your own computer. It lets you talk to cloud models, local models, and local CLI providers from your phone, while keeping bot configuration, access control, and conversation history managed through a local console.

It is more than a chat UI. It is a control layer between your phone and your local AI workspace: send a message from Telegram or Lark, route it to the right model, manage multiple bots and channels, and keep the runtime under your control.

Short pitch:

```text
Whalemates Chat turns Telegram and Lark into a local AI command center for cloud models, local models, multiple bots, and private channel-based workflows.
```

## 目录结构

```text
.
├── dev/
│   ├── back/                # 后端 package 和稳定运行入口
│   │   ├── app.py           # 薄入口，调用 runtime.main()
│   │   ├── runtime.py       # 当前稳定运行核心
│   │   ├── access_policy.py # public / allowed / owner 权限判断
│   │   ├── constants.py     # 文案、Telegram API base、角色能力表
│   │   ├── *_store.py       # JSON 存储边界
│   │   ├── telegram_*.py    # Telegram API 与 listener 边界
│   │   ├── approval_service.py # Requests / approval / allowed target 业务
│   │   ├── paths.py         # 项目、data、front、LaunchAgent 路径
│   │   └── README.md        # 后端拆分规划
│   ├── requirements.txt     # Python 依赖
│   ├── front/
│   │   ├── chat.html        # Console HTML 结构
│   │   ├── styles.css       # CSS 入口，import css/*
│   │   ├── css/             # 按页面区域拆分的样式，settings model/messages 已独立
│   │   └── js/              # 按职责拆分的前端逻辑，model / bot worker / Telegram access/message 配置已独立
├── launcher/                # Console 启动器脚本
├── .env.example             # 非敏感运行参数模板
└── data/
    ├── settings.json        # service、bot、token、access control 配置
    ├── conversations.json   # 本地对话历史
    └── runtime_status.json  # listener / bot worker 运行状态
```

## 安装

新电脑推荐流程：

1. 确保已安装 Python 3.10 或更新版本。
3. 解压或拷贝整个 `Whalemates Chat` 文件夹。
4. 启动 launcher / app。
5. 第一次启动 Console 时会自动创建 `.venv`，并安装 `dev/requirements.txt` 里的 Python 依赖。
6. 在 Console 的 Settings 里添加 Telegram / Lark 等通讯渠道配置，并配置 AI Provider / Model。

通常不需要手动创建 `.venv`。如果你想手动安装或排查依赖，也可以运行：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r dev/requirements.txt
```

`.env` 现在主要保存 Console 运行参数，以及本地 provider 的可选默认路径。首次启动 Console 时如果 `.env` 不存在，会自动从 `.env.example` 创建，并把默认工作目录设置为当前用户 home。Telegram / Lark token、bot enabled 状态、allowlist、public access、AI Provider / Model 等配置优先通过 Console 写入 `data/settings.json`。

如需手动提前创建本机环境配置，也可以运行：

```bash
cp .env.example .env
```

`data/settings.json`、`data/conversations.json`、`data/runtime_status.json` 是本机私有运行态文件。分发给其他用户时保留 `data/.gitkeep` 即可，不要携带真实 token 或聊天历史。

## 生成干净发布目录

发布前可以先运行清理脚本检查发布边界：

```bash
launcher/release_clean.sh
launcher/release_clean.sh ./dist/Whalemates\ Chat --apply
```

生成的发布目录会包含源码、launcher、README、`.env.example` 和 app bundles；会排除 `.env`、`.venv`、`data/*.json`、`data/media`、日志、缓存、DMG/build 输出等本机运行数据。

## 启动 Console

```bash
cd dev
python3 -m back chat --host 127.0.0.1 --port 8765 --ws-port 8766
```

打开：

```text
http://127.0.0.1:8765/chat.html
```

Console 使用 WebSocket 实时更新消息和运行状态：

```text
ws://127.0.0.1:8766/ws
```

## 卸载

分发包内包含 `Whalemates Chat Uninstaller.app`。

双击后有两个选项：

- `Services Only`：停止本地 Console / Listener，移除 LaunchAgent、`~/.whalemates-*` helper scripts、临时日志和 `.venv`，但保留当前 `Whalemates Chat` 文件夹和本地 `data/`。
- `Full Uninstall`：先执行 `Services Only`，然后把整个 `Whalemates Chat` 文件夹移动到废纸篓。

如果只想升级版本，通常不需要卸载；直接保留旧 `data/` 并覆盖代码即可。

## 升级

分发包内包含 `Whalemates Chat Updater.app`。

推荐升级流程：

1. 下载并打开新版 `Whalemates Chat.dmg`。
2. 双击新版包里的 `Whalemates Chat Updater.app`。
3. Updater 会优先寻找 `/Applications/Whalemates Chat`；如果找不到，会让你选择旧版 `Whalemates Chat` 文件夹。
4. 确认后，它会停止旧服务、备份旧数据，然后覆盖新版代码。
5. 升级完成后会自动打开新版 `Whalemates Chat.app`。

升级时会保留：

- `data/`
- `.env`
- `.venv`

升级前会备份到：

```text
~/Whalemates Chat Backups/Whalemates Chat YYYYMMDD-HHMMSS
```

## 配置 Telegram

在 Console 里打开 Settings。

`Configuration -> Service Configuration` 用来配置 Telegram service：

- 启动或停止 Telegram Server。
- 添加 Telegram bot token。
- 开启或关闭 bot worker。
- 删除 disabled bot。
- 查看 bot worker 状态，例如 `listening`、`disabled`、`conflict`、`retrying`。

`Services -> Telegram` 用来配置 bot 的访问权限：

- 选择一个 bot。
- 管理 User、Group、Channel allowlist。
- 添加后的 group / channel 默认是 disabled，需要确认启用。
- enabled target 会收到 `Your personal assistant is online.`。
- disabled target 会收到 `Your personal assistant is offline.`。
- enabled target 不能删除，需要先 disable。
- owner 可以被 disable，但不能删除。
- 点击 `owner` / `allowed user` 标签可以切换身份，一个 bot 只能有一个 owner。
- 群里只有 Telegram creator / administrator 可以用 `/apply @bot` 提交申请；批准后只处理明确 `@bot` 的群消息，未 mention 的群消息不会记录、下载附件或调用模型。

Public access 默认关闭。开启后，任何能给该 bot 发消息的人都可以访问这个 bot，除了明确 disabled 的用户或 channel。开启前 Console 会弹出安全确认。

## 访问策略

访问策略集中在后端 policy 中，当前能力如下：

```text
public          -> message
allowed user    -> message, codex
allowed channel -> message, codex
owner           -> message, codex, admin
```

非 allowed 且 public 关闭时，Telegram listener 会拒绝处理消息。public 开启时，未被 disabled 的用户可以进入基础访问路径。后续如果要限制不同角色可执行的功能，可以继续扩展这层 policy。

## 对话历史

Console 左侧按 `Service -> Bot -> User/Group/Channel` 过滤 conversations。

对话历史保存在：

```text
data/conversations.json
```

删除对话时 Console 会提供三个选择：

- 暂不删除。
- 只删除本地 Console 历史。
- 尝试删除本地和 Telegram 双方历史。

Telegram 侧历史删除依赖消息本身的 `telegram_message_id`。旧历史如果没有保存 message id，只能删除本地记录。

## 后台服务

当前建议保持 Console 常驻，需要时在 Console 中启动或停止 Telegram Server。

LaunchAgent 文件：

```text
$HOME/Library/LaunchAgents/whalemates-chat-console.plist
$HOME/Library/LaunchAgents/whalemates-bot-listener.plist
```

重启 Console：

```bash
launchctl kickstart -k gui/$(id -u)/whalemates-chat-console
```

重启 Telegram listener：

```bash
launchctl kickstart -k gui/$(id -u)/whalemates-bot-listener
```

停止 Telegram listener：

```bash
launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/whalemates-bot-listener.plist"
```

日志位置：

```text
/tmp/whalemates-chat-console.log
/tmp/whalemates-chat-console.err.log
/tmp/whalemates-bot-listener.log
/tmp/whalemates-bot-listener.err.log
```

## CLI 命令

监听 Telegram：

```bash
cd dev
python3 -m back listen
```

处理当前队列后退出，适合调试：

```bash
cd dev
python3 -m back listen --once
```

列出给 bot 发过消息的 chat：

```bash
cd dev
python3 -m back list-chats
```

Telegram 内支持：

```text
/help
/reset
/status
```

## 配置文件说明

`data/settings.json` 是主配置文件。典型结构：

```json
{
  "services": {
    "telegram": {
      "enabled": true,
      "model": {},
      "bots": {
        "1234567890": {
          "label": "@example_bot",
          "enabled": true,
          "public": false,
          "connection": {
            "bot_token": "...",
            "bot_id": "1234567890",
            "bot_username": "example_bot",
            "mode": "polling"
          },
          "allowed": {
            "chats": [
              {
                "id": "123456789",
                "role": "owner",
                "enabled": true,
                "added_at": "..."
              }
            ],
            "channels": []
          }
        }
      }
    },
    "lark": {
      "enabled": false,
      "bots": {}
    }
  }
}
```

注意：v1 暂时把 Telegram bot token 存在 `data/settings.json`。这个文件不要提交到公开仓库。

## 分发给新电脑

分发包应包含源码、launcher 和 app，但不应包含本机私有运行数据。

建议保留：

```text
dev/
launcher/
Whalemates.app
.env.example
data/.gitkeep
README.md
```

不要带给别人：

```text
.env
.venv/
data/settings.json
data/conversations.json
data/runtime_status.json
data/launcher-logs/
```

新电脑推荐直接启动 launcher / app。启动 Console 前，launcher 会检查 `.venv`，如果缺失会自动创建并安装依赖；如果 `dev/requirements.txt` 变化，也会重新安装依赖。

根目录 app 说明：

```text
Whalemates.app # 启动 Console server，并打开 AI Chat Console 登录页
```

## 本地登录入口

`dev/front/app.html` 是 AI Chat Console 登录页，由 Console server 作为静态页面提供。

```text
http://127.0.0.1:8765/app.html
```

登录账号暂时 hard code 在 `dev/front/app.html`：

```text
username: twitter
password: @itislt_ai
```

启动 app：

```bash
./launcher/launch_app.sh
```

也可以直接双击根目录的 `Whalemates.app`。登录成功后会跳转到：

```text
http://127.0.0.1:8765/chat.html
```

## API 摘要

Console 本地 API：

```text
GET  /api/conversations
POST /api/conversations/delete
POST /api/broadcast
POST /api/services/telegram/listener
POST /api/settings/services/telegram
POST /api/settings/services/telegram/bot
POST /api/settings/services/telegram/bot/remove
POST /api/settings/services/telegram/validate-token
POST /api/settings/allowed-targets
```

WebSocket 事件：

```json
{
  "type": "conversation.updated",
  "chat_id": "123456789",
  "payload": {
    "chats": [],
    "messages": {}
  }
}
```

## 边界

通讯渠道连接的是本机运行的 Whalemates Chat 服务。它可以把消息路由给不同云端模型、本地模型或本机 CLI provider；对应 provider 的工作目录和权限由本机配置决定。

`CODEX_SANDBOX=danger-full-access` 会让 Telegram 侧 Codex 更接近全局助手。这个能力更大，也更需要谨慎；涉及删除、发布、付款、密钥或大范围改动时，建议回到 Codex 桌面确认。
