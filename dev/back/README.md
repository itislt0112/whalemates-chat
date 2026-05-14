# Back Structure

`app.py` is a thin CLI entrypoint. `runtime.py` is now the orchestration layer for CLI startup, Console HTTP API, WebSocket broadcaster, remaining conversation/model flows, and compatibility wrappers around the split modules.

`access_policy.py` is split out because public / allowed / owner decisions are a stable boundary. `constants.py` keeps static values such as message copy, Telegram API base URL, and role capability tables. Store modules own JSON persistence, Telegram modules own Bot API/listener behavior, and `approval_service.py` owns requests plus allowed target mutations.

Current structure:

```text
back/
├── app.py              # thin CLI entrypoint
├── runtime.py          # current integrated runtime
├── access_policy.py    # public / allowed / owner role decisions
├── constants.py        # system messages, Telegram API base, role capabilities
├── json_store.py       # shared JSON read/write helpers
├── settings_store.py   # settings.json persistence boundary
├── request_store.py    # requests.json persistence boundary
├── conversation_store.py # conversations.json keys, normalization, load/save
├── runtime_status_store.py # runtime_status.json persistence boundary
├── telegram_client.py # Telegram Bot API HTTP/upload/file helpers
├── telegram_listener.py # polling loop, update routing, group/channel gates
├── approval_service.py # apply/approve/reject/remove and allowed target updates
├── paths.py            # project, data, front, and LaunchAgent paths
└── README.md
```

Future split candidates, only when the moved code becomes real implementation instead of re-export wrappers:

```text
back/
├── model_providers.py  # cloud models, local models, and CLI provider invocation
├── console_api.py    # HTTP routes
├── services.py         # LaunchAgent service controls
└── websocket.py        # console broadcaster
```

Refactor rule: move one responsibility out of `runtime.py` at a time and keep `python -m back ...` working after each step. Do not add placeholder modules that only re-export `runtime.py`.
