# Back Structure

`app.py` is a thin CLI entrypoint. `runtime.py` contains the current working communication listener manager, Console HTTP API, WebSocket broadcaster, settings persistence, Telegram API calls, and model provider routing.

`access_policy.py` is already split out because public / allowed / owner decisions are a stable boundary. `constants.py` keeps static values such as message copy, Telegram API base URL, and role capability tables.

Current structure:

```text
back/
├── app.py              # thin CLI entrypoint
├── runtime.py          # current integrated runtime
├── access_policy.py    # public / allowed / owner role decisions
├── constants.py        # system messages, Telegram API base, role capabilities
├── paths.py            # project, data, front, and LaunchAgent paths
└── README.md
```

Future split candidates, only when the moved code becomes real implementation instead of re-export wrappers:

```text
back/
├── settings.py         # .env, dataclasses, settings load/save
├── telegram_api.py     # Telegram Bot API calls
├── telegram_listener.py # polling loop and bot worker manager
├── model_providers.py  # cloud models, local models, and CLI provider invocation
├── conversations.py    # conversations.json persistence and deletion
├── runtime_status.py   # runtime_status.json persistence
├── console_api.py    # HTTP routes
├── services.py         # LaunchAgent service controls
└── websocket.py        # console broadcaster
```

Refactor rule: move one responsibility out of `runtime.py` at a time and keep `python -m back ...` working after each step. Do not add placeholder modules that only re-export `runtime.py`.
