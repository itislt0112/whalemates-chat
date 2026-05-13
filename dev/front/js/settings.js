const TELEGRAM_COMMAND_FALLBACKS = {
  apply: "/apply",
  help: "/help",
  models: "/models",
  reset: "/reset",
  status: "/status",
};

const TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS = {
  apply: "Apply for access to this bot.",
  help: "Show available commands.",
  models: "Choose the model for this conversation.",
  reset: "Clear this conversation memory.",
  status: "Show bridge service status.",
};

const TELEGRAM_COMMAND_LOGIC = {
  apply: "If already allowed, replies with the approved message. Otherwise creates or updates a pending access request and replies with the apply success message.",
  help: "Replies with the configured help text. /start also uses this flow.",
  models: "Sends the configured model selector prompt with inline buttons for available models.",
  reset: "Clears local conversation memory for this chat, updates the console, then replies with the reset success message.",
  status: "Replies with current listener, bot, model, and access status.",
};

const TELEGRAM_MESSAGE_FALLBACKS = {
  service_online: "Telegram service is online.",
  service_offline: "Telegram service is offline.",
  service_bridge_error: "桥接服务刚才处理失败了。\n如果是临时断连，我会自动重试；你也可以稍后再发一次。",
  bot_enabled: "这个Bot已经启用。",
  bot_disabled: "这个Bot暂时没有上班",
  user_enabled: "你已经可以和这个Bot聊天了。",
  user_disabled: "你暂时不能和这个Bot聊天。",
  channel_enabled: "这个频道已经可以使用这个Bot。",
  channel_disabled: "这个频道暂时不能使用这个Bot。",
  access_denied_user: "你还不能和这个Bot聊天, 请发送指令 {apply_command} 申请",
  access_denied_channel: "这个频道还不能使用这个Bot，请发送指令 {apply_command} 申请",
  access_denied_apply: "你还不能和这个Bot聊天, 请发送指令 {apply_command} 申请",
  approval_removed_user: "您和这个Bot聊天的权限被移除了，后续可以输入指令 {apply_command} 重新申请",
  approval_removed_channel: "这个频道使用这个Bot的权限被移除了，后续可以输入指令 {apply_command} 重新申请",
  apply_submitted_user: "你已经成功申请和这个Bot进行沟通",
  apply_submitted_channel: "这个频道已经成功提交使用申请",
  already_approved_user: "你已经被允许和这个Bot聊天",
  already_approved_channel: "这个频道已经被允许使用这个Bot",
  already_allowed_apply: "你已经被允许和这个Bot聊天",
  apply_success: "你已经成功申请和这个Bot进行沟通",
  apply_approved_user: "你已经通过申请，可以和我聊天了",
  apply_approved_channel: "这个频道已经通过申请，可以使用这个Bot了",
  apply_rejected_user: "你的申请已被拒绝。",
  apply_rejected_channel: "这个频道的申请已被拒绝。",
  approval_success: "你已经通过申请，可以和我聊天了",
  approval_removed: "您和这个Bot聊天的权限被移除了，后续可以输入指令 {apply_command} 重新申请",
  role_upgrade_user: "你的权限已从 {from_role} 升级为 {to_role}。",
  role_downgrade_user: "你的权限已从 {from_role} 调整为 {to_role}。",
  assistant_online: "Your personal assistant is online.",
  assistant_offline: "Your personal assistant is offline.",
  bridge_error: "桥接服务刚才处理失败了。\n如果是临时断连，我会自动重试；你也可以稍后再发一次。",
  help_text: "我会把你的消息交给当前配置的模型处理。\n\n可用命令：\n{reset_command} 清空当前对话记忆\n{models_command} 选择当前对话使用的模型\n{status_command} 查看桥接服务状态\n{help_command} 查看帮助",
  reset_success: "已清空当前对话记忆。",
  model_menu_empty: "当前没有已启用的 Provider / Model。请先在 Console 的 Model Configuration 里配置并启用模型。",
  model_button_prompt: "请点击下面按钮选择切换：",
  model_unavailable: "这个模型现在不可用了，请重新发送 {models_command} 获取最新列表。",
  model_switched: "已切换当前对话模型：{route}",
  model_callback_expired: "这个模型选择已过期，请重新发送 {models_command}。",
  model_button_unavailable: "这个按钮已不可用。",
  model_callback_cancelled: "已取消。",
  model_default_restored: "已恢复默认模型：优先使用当前 bot 默认模型，否则使用 Service 默认模型。",
  model_default_restored_callback: "已恢复默认模型。",
  runtime_profile_prompt: "请选择 Runtime Profile：\n{route}",
  runtime_profile_callback_prompt: "请选择 Runtime Profile。",
  runtime_profile_switched: "已切换当前对话模型：{route} · {profile}",
};

const TELEGRAM_COMMAND_REPLY_TEMPLATES = {
  apply: [
    { key: "apply_success", label: "Apply submitted", rows: 2 },
    { key: "already_allowed_apply", label: "Already approved", rows: 2 },
    { key: "access_denied_apply", label: "Access denied", rows: 2 },
  ],
  help: [
    { key: "help_text", label: "Reply template", rows: 6 },
  ],
  reset: [
    { key: "reset_success", label: "Success reply", rows: 2 },
  ],
  models: [
    { key: "model_menu_empty", label: "Empty model list", rows: 3 },
    { key: "model_button_prompt", label: "Button prompt", rows: 2 },
    { key: "model_unavailable", label: "Model unavailable", rows: 2 },
    { key: "model_switched", label: "Model switched", rows: 2 },
    { key: "model_callback_expired", label: "Selection expired", rows: 2 },
    { key: "model_button_unavailable", label: "Button unavailable", rows: 2 },
    { key: "model_callback_cancelled", label: "Callback cancelled", rows: 2 },
    { key: "model_default_restored", label: "Default restored", rows: 2 },
    { key: "model_default_restored_callback", label: "Default restored popup", rows: 2 },
    { key: "runtime_profile_prompt", label: "Runtime profile prompt", rows: 2 },
    { key: "runtime_profile_callback_prompt", label: "Runtime profile popup", rows: 2 },
    { key: "runtime_profile_switched", label: "Runtime profile switched", rows: 2 },
  ],
};

const TELEGRAM_MESSAGE_TEMPLATE_GROUPS = [
  {
    id: "status",
    title: "Status & Availability",
    items: [
      { key: "assistant_online", title: "Service Online", subtitle: "Sent when the Telegram service becomes available.", tags: ["Service"], rows: 2 },
      { key: "assistant_offline", title: "Service Offline", subtitle: "Sent when the Telegram service becomes unavailable.", tags: ["Service"], rows: 2 },
      { key: "bridge_error", title: "Service Bridge Error", subtitle: "Sent when message delivery or processing fails.", tags: ["Service"], rows: 3 },
      { key: "bot_enabled", title: "Bot Enabled", subtitle: "Sent when a bot is enabled.", tags: ["Bot"], rows: 2 },
      { key: "bot_disabled", title: "Bot Disabled", subtitle: "Sent when a bot is disabled or outside active hours.", tags: ["Bot"], rows: 2 },
      { key: "user_enabled", title: "User Enabled", subtitle: "Sent when a user is allowed to chat with the bot.", tags: ["User"], rows: 2 },
      { key: "user_disabled", title: "User Disabled", subtitle: "Sent when a user is disabled for this bot.", tags: ["User"], rows: 2 },
      { key: "channel_enabled", title: "Channel Enabled", subtitle: "Sent when a channel is allowed to use the bot.", tags: ["Channel"], rows: 2 },
      { key: "channel_disabled", title: "Channel Disabled", subtitle: "Sent when a channel is disabled for this bot.", tags: ["Channel"], rows: 2 },
    ],
  },
  {
    id: "access",
    title: "Access Control",
    items: [
      { key: "access_denied_channel", title: "Access Denied - Channel", subtitle: "Sent when a channel uses the bot before approval.", tags: ["Channel"], rows: 2, placeholders: ["{apply_command}"] },
      { key: "approval_removed", title: "Approval Removed - User", subtitle: "Sent when user access is revoked.", tags: ["User"], rows: 2, placeholders: ["{apply_command}"] },
      { key: "approval_removed_channel", title: "Approval Removed - Channel", subtitle: "Sent when channel access is revoked.", tags: ["Channel"], rows: 2, placeholders: ["{apply_command}"] },
      { key: "apply_submitted_channel", title: "Apply Submitted - Channel", subtitle: "Sent after a channel submits an access request.", tags: ["Channel"], rows: 2 },
      { key: "already_approved_channel", title: "Already Approved - Channel", subtitle: "Sent when an approved channel applies again.", tags: ["Channel"], rows: 2 },
      { key: "approval_success", title: "Apply Approved - User", subtitle: "Sent when an owner approves a user request.", tags: ["User"], rows: 2 },
      { key: "apply_approved_channel", title: "Apply Approved - Channel", subtitle: "Sent when an owner approves a channel request.", tags: ["Channel"], rows: 2 },
      { key: "apply_rejected_user", title: "Apply Rejected - User", subtitle: "Sent when an owner rejects a user request.", tags: ["User"], rows: 2 },
      { key: "apply_rejected_channel", title: "Apply Rejected - Channel", subtitle: "Sent when an owner rejects a channel request.", tags: ["Channel"], rows: 2 },
    ],
  },
  {
    id: "role",
    title: "Role Changes",
    items: [
      { key: "role_upgrade_user", title: "Role Upgrade - User", subtitle: "Sent when a user is upgraded to admin or owner.", tags: ["User"], rows: 2, placeholders: ["{from_role}", "{to_role}"] },
      { key: "role_downgrade_user", title: "Role Downgrade - User", subtitle: "Sent when a user is downgraded to admin or public.", tags: ["User"], rows: 2, placeholders: ["{from_role}", "{to_role}"] },
    ],
  },
];

function messageServiceLabel(serviceId = activeMessageServiceId) {
  return serviceId === "lark" ? "Lark" : "Telegram";
}

function messageSettingsViewMatch(view = activeSettingsView) {
  return String(view || "").match(/^messages-(telegram|lark)-(command-flows|status|access|role)$/);
}

function normalizeMessageSettingsView(view = activeSettingsView) {
  if (view === "messages" || view === "messages-telegram" || view === "messages-telegram-commands") {
    return "messages-telegram-command-flows";
  }
  if (view === "messages-lark" || view === "messages-lark-commands") {
    return "messages-lark-command-flows";
  }
  if (view === "messages-telegram-messages") return "messages-telegram-status";
  if (view === "messages-lark-messages") return "messages-lark-status";
  return messageSettingsViewMatch(view) ? view : view;
}

function syncMessageSettingsChrome() {
  const normalizedView = normalizeMessageSettingsView(activeSettingsView);
  if (normalizedView !== activeSettingsView) {
    activeSettingsView = normalizedView;
  }

  const match = messageSettingsViewMatch(activeSettingsView);
  if (!match) {
    if (settingsTitle) settingsTitle.textContent = "Settings";
    return;
  }

  activeMessageServiceId = match[1];
  activeMessageSettingsTab = match[2];
  if (settingsTitle) {
    settingsTitle.textContent = `${messageServiceLabel(activeMessageServiceId)} Message Settings`;
  }

  settingsTabs.forEach((tab) => {
    if (!tab.dataset.messageNav) return;
    tab.dataset.settingsView = `messages-${activeMessageServiceId}-${tab.dataset.messageNav}`;
  });
}

function renderSettings() {
  syncMessageSettingsChrome();
  settingsTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.settingsView === activeSettingsView);
  });
  renderSettingsView();
}

function firstTelegramBotEntry() {
  const entries = Object.entries(state.settings?.services?.telegram?.bots || {});
  return entries[0] || ["", null];
}

function emptyTelegramBot() {
  return {
    label: "Telegram Bot",
    enabled: false,
    connection: {},
    allowed: { chats: [], channels: [] },
  };
}

function telegramService() {
  return state.settings?.services?.telegram || {
    label: "Telegram",
    enabled: false,
    model: { provider: "codex_cli", label: "Codex CLI" },
    bots: {},
  };
}

function telegramConnection() {
  return (firstTelegramBotEntry()[1] || emptyTelegramBot()).connection || {};
}

function telegramBots() {
  return state.settings?.services?.telegram?.bots || {};
}

function telegramWorkerStatus(botId) {
  return state.runtime?.telegram?.bots?.[botId] || {};
}

function modelProviderDisplayName(provider) {
  return {
    openai: "Open AI",
    claude: "Anthronic",
    ollama: "Ollama",
    deepseek: "DeepSeek",
  }[provider] || provider;
}

function providerDefaultBaseUrl(provider, mode = activeModelMode) {
  if (mode && mode.includes("cli")) return "";
  return {
    openai: "https://api.openai.com/v1",
    claude: "https://api.anthropic.com/v1",
    ollama: "http://127.0.0.1:11434",
    deepseek: "https://api.deepseek.com",
  }[provider] || "";
}

function modelProviders() {
  return state.settings?.models || {
    openai: {
      label: "OpenAI",
      active_mode: "codex_cli",
      modes: {
        codex_cli: { label: "Codex CLI", enabled: false, model: "", base_url: "", configured: false },
        api: { label: "OpenAI API", enabled: false, model: "", api_key: "", api_key_configured: false, configured: false, base_url: "" },
      },
    },
    claude: {
      label: "Claude",
      active_mode: "claude_code_cli",
      modes: {
        claude_code_cli: { label: "Claude Code CLI", enabled: false, model: "", base_url: "", configured: false },
        api: { label: "Anthropic API", enabled: false, model: "", api_key: "", api_key_configured: false, configured: false, base_url: "" },
      },
    },
    ollama: {
      label: "Ollama",
      active_mode: "api",
      modes: {
        api: {
          label: "Ollama API",
          enabled: false,
          model: "",
          configured: false,
          base_url: "http://127.0.0.1:11434",
        },
      },
    },
    deepseek: {
      label: "DeepSeek",
      active_mode: "api",
      modes: {
        api: {
          label: "DeepSeek API",
          enabled: false,
          model: "",
          api_key: "",
          api_key_configured: false,
          configured: false,
          base_url: "https://api.deepseek.com",
        },
      },
    },
  };
}

function enabledModelOptions() {
  return state.settings?.enabled_model_options || [];
}

function modelRouteValue(route = {}) {
  return [
    route.provider_id || route.provider || "",
    route.mode_id || route.mode || "",
    route.model_id || route.model || "",
  ].join("::");
}

function modelRouteFromValue(value = "") {
  const [providerId = "", modeId = "", modelId = ""] = String(value).split("::");
  const option = enabledModelOptions().find((item) => modelRouteValue(item) === value);
  return {
    provider_id: providerId,
    mode_id: modeId,
    model_id: modelId,
    label: option?.label || modelId || modeId || providerId || "Model",
  };
}

function modelRouteLabel(route = null, fallback = "No model selected") {
  if (!route) return fallback;
  const value = modelRouteValue(route);
  const option = enabledModelOptions().find((item) => modelRouteValue(item) === value);
  return route.label || option?.label || route.model_id || route.mode_id || fallback;
}

function modelRouteIsEnabled(route = null) {
  if (!route) return false;
  const value = modelRouteValue(route);
  return enabledModelOptions().some((item) => modelRouteValue(item) === value);
}

function runtimeProfileOptionsForRoute(route = null) {
  const value = modelRouteValue(route || {});
  const option = enabledModelOptions().find((item) => modelRouteValue(item) === value);
  return option?.runtime_profiles?.length
    ? option.runtime_profiles
    : [{ id: "default", label: "Default" }];
}

function normalizeRuntimeProfile(profile = "default", route = null) {
  const value = String(profile || "default").toLowerCase();
  const options = runtimeProfileOptionsForRoute(route);
  return options.some((item) => item.id === value) ? value : "default";
}

function runtimeProfileLabel(profile = "default", route = null) {
  const normalized = normalizeRuntimeProfile(profile, route);
  return runtimeProfileOptionsForRoute(route).find((item) => item.id === normalized)?.label || "Default";
}

function groupedEnabledModelOptions() {
  const options = enabledModelOptions();
  return options.reduce((acc, option) => {
    const key = option.provider_label || option.provider_id || "Provider";
    acc[key] = acc[key] || [];
    acc[key].push(option);
    return acc;
  }, {});
}

function modelRouteSearchText(option) {
  return [
    option.provider_label,
    option.provider_id,
    option.mode_label,
    option.mode_id,
    option.model_id,
    option.label,
  ].filter(Boolean).join(" ").toLowerCase();
}

function renderRuntimeProfileDropdown(
  route,
  selectedProfile,
  id,
  {
    includeInherit = false,
    kind = "service",
    serviceId = "telegram",
    botId = "",
  } = {},
) {
  const routeProfileOptions = runtimeProfileOptionsForRoute(route);
  const activeProfile = normalizeRuntimeProfile(selectedProfile, route);
  const triggerLabel = includeInherit && !selectedProfile
    ? "Inherit service profile"
    : runtimeProfileLabel(activeProfile, route);
  const open = activeModelRouteDropdown === id;
  return `
    <div class="model-route-dropdown runtime-profile-dropdown ${open ? "open" : ""}" data-runtime-profile-dropdown="${id}">
      <button
        class="model-route-trigger"
        type="button"
        data-runtime-profile-trigger="${id}"
        aria-haspopup="listbox"
        aria-expanded="${open}"
      >
        <span class="model-route-trigger-text">${triggerLabel}</span>
        <span class="model-route-caret" aria-hidden="true"></span>
      </button>
      <div class="model-route-menu runtime-profile-menu" role="listbox" ${open ? "" : "hidden"}>
        ${
          includeInherit
            ? `
              <button
                class="model-route-option ${!selectedProfile ? "active" : ""}"
                type="button"
                role="option"
                aria-selected="${!selectedProfile}"
                data-runtime-profile-option
                data-runtime-profile-kind="${kind}"
                data-runtime-profile-service="${serviceId}"
                data-runtime-profile-bot="${botId}"
                data-runtime-profile-value=""
              >
                <span>Inherit service profile</span>
              </button>
            `
            : ""
        }
        ${routeProfileOptions.map((profile) => `
          <button
            class="model-route-option ${selectedProfile && profile.id === activeProfile ? "active" : (!includeInherit && profile.id === activeProfile ? "active" : "")}"
            type="button"
            role="option"
            aria-selected="${profile.id === activeProfile}"
            data-runtime-profile-option
            data-runtime-profile-kind="${kind}"
            data-runtime-profile-service="${serviceId}"
            data-runtime-profile-bot="${botId}"
            data-runtime-profile-value="${profile.id}"
          >
            <span>${profile.label}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderModelRouteDropdown(
  route,
  id,
  {
    fallbackLabel = "Select Provider (Model)",
    includeInherit = false,
    kind = "service",
    serviceId = "telegram",
    botId = "",
  } = {},
) {
  const options = enabledModelOptions();
  const currentValue = modelRouteValue(route || {});
  if (!options.length && !includeInherit) {
    return `
      <div class="model-route-dropdown no-options" data-model-route-dropdown="${id}">
        <button class="model-route-trigger" type="button" disabled>
          <span class="model-route-trigger-text">No Enabled Provider</span>
          <span class="model-route-caret" aria-hidden="true"></span>
        </button>
      </div>
    `;
  }
  const searchValue = modelRouteFilters[id] || "";
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) return true;
    return modelRouteSearchText(option).includes(normalizedSearch);
  });
  const grouped = filteredOptions.reduce((acc, option) => {
    const key = option.provider_label || option.provider_id || "Provider";
    acc[key] = acc[key] || [];
    acc[key].push(option);
    return acc;
  }, {});
  const inheritMatches = includeInherit && (
    !normalizedSearch
    || "inherit service model".includes(normalizedSearch)
  );
  const triggerLabel = includeInherit && !route
    ? "Inherit service model"
    : modelRouteLabel(route, fallbackLabel);
  const open = activeModelRouteDropdown === id;
  return `
    <div class="model-route-dropdown ${open ? "open" : ""}" data-model-route-dropdown="${id}">
      <button
        class="model-route-trigger"
        type="button"
        data-model-route-trigger="${id}"
        aria-haspopup="listbox"
        aria-expanded="${open}"
      >
        <span class="model-route-trigger-text">${triggerLabel}</span>
        <span class="model-route-caret" aria-hidden="true"></span>
      </button>
      <div class="model-route-menu" role="listbox" ${open ? "" : "hidden"}>
        <input
          class="model-route-search"
          type="search"
          placeholder="Search provider or model"
          value="${searchValue}"
          data-model-route-search="${id}"
        />
        ${
          inheritMatches
            ? `
              <button
                class="model-route-option ${!route ? "active" : ""}"
                type="button"
                role="option"
                aria-selected="${!route}"
                data-model-route-option
                data-model-route-owner="${id}"
                data-model-route-kind="${kind}"
                data-model-route-service="${serviceId}"
                data-model-route-bot="${botId}"
                data-model-route-value=""
              >
                <span>Inherit service model</span>
              </button>
            `
            : ""
        }
        ${
          filteredOptions.length
            ? Object.entries(grouped)
              .map(([providerLabel, groupOptions]) => `
                <div class="model-route-group">
                  <div class="model-route-group-label">${providerLabel}</div>
                  ${groupOptions
                    .map((option) => {
                      const value = modelRouteValue(option);
                      const active = value === currentValue;
                      return `
                        <button
                          class="model-route-option ${active ? "active" : ""}"
                          type="button"
                          role="option"
                          aria-selected="${active}"
                          data-model-route-option
                          data-model-route-owner="${id}"
                          data-model-route-kind="${kind}"
                          data-model-route-service="${serviceId}"
                          data-model-route-bot="${botId}"
                          data-model-route-value="${value}"
                        >
                          <span>${option.label}</span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              `)
              .join("")
            : (
              inheritMatches
                ? ""
                : '<div class="model-route-empty">No provider or model matches your search.</div>'
            )
        }
      </div>
    </div>
  `;
}

function bindModelRouteDropdowns(scope = document) {
  scope.querySelectorAll("[data-model-route-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = trigger.dataset.modelRouteTrigger || "";
      activeModelRouteDropdown = activeModelRouteDropdown === id ? "" : id;
      renderServiceConfiguration();
      if (!telegramBotWorkersModal.hidden) {
        renderTelegramBotWorkersManageModal();
      }
      if (!telegramBotDetailModal.hidden) {
        renderTelegramBotDetailModal();
      }
      if (!larkServiceModal.hidden) {
        renderLarkServiceManageModal();
      }
      if (!larkBotWorkersModal.hidden) {
        renderLarkBotWorkersManageModal();
      }
      if (!larkBotDetailModal.hidden) {
        renderLarkBotDetailModal(activeServiceBotId);
      }
      if (activeModelRouteDropdown) {
        requestAnimationFrame(() => {
          document.querySelector(`[data-model-route-search="${activeModelRouteDropdown}"]`)?.focus();
        });
      }
    });
  });

  scope.querySelectorAll("[data-model-route-search]").forEach((search) => {
    search.addEventListener("click", (event) => event.stopPropagation());
    search.addEventListener("input", () => {
      const id = search.dataset.modelRouteSearch || "";
      modelRouteFilters[id] = search.value;
      renderServiceConfiguration();
      if (!telegramBotWorkersModal.hidden) {
        renderTelegramBotWorkersManageModal();
      }
      if (!telegramBotDetailModal.hidden) {
        renderTelegramBotDetailModal();
      }
      if (!larkServiceModal.hidden) {
        renderLarkServiceManageModal();
      }
      if (!larkBotWorkersModal.hidden) {
        renderLarkBotWorkersManageModal();
      }
      if (!larkBotDetailModal.hidden) {
        renderLarkBotDetailModal(activeServiceBotId);
      }
      requestAnimationFrame(() => {
        const nextSearch = document.querySelector(`[data-model-route-search="${id}"]`);
        nextSearch?.focus();
        nextSearch?.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      });
    });
  });

  scope.querySelectorAll("[data-model-route-option]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      const value = option.dataset.modelRouteValue || "";
      const kind = option.dataset.modelRouteKind || "service";
      const serviceId = option.dataset.modelRouteService || "telegram";
      const botId = option.dataset.modelRouteBot || "";
      activeModelRouteDropdown = "";
      modelRouteFilters[option.dataset.modelRouteOwner || ""] = "";
      if (kind === "bot") {
        updateServiceBot(serviceId, botId, { model_override: value ? modelRouteFromValue(value) : null });
        return;
      }
      const route = modelRouteFromValue(value);
      if (!route.provider_id || !route.mode_id) return;
      updateServiceConfig(serviceId, { model: route });
    });
  });

  scope.querySelectorAll("[data-runtime-profile-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = trigger.dataset.runtimeProfileTrigger || "";
      activeModelRouteDropdown = activeModelRouteDropdown === id ? "" : id;
      renderServiceConfiguration();
      if (!telegramBotWorkersModal.hidden) {
        renderTelegramBotWorkersManageModal();
      }
      if (!telegramBotDetailModal.hidden) {
        renderTelegramBotDetailModal();
      }
      if (!larkServiceModal.hidden) {
        renderLarkServiceManageModal();
      }
      if (!larkBotWorkersModal.hidden) {
        renderLarkBotWorkersManageModal();
      }
      if (!larkBotDetailModal.hidden) {
        renderLarkBotDetailModal(activeServiceBotId);
      }
    });
  });

  scope.querySelectorAll("[data-runtime-profile-option]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      const value = option.dataset.runtimeProfileValue || "";
      const kind = option.dataset.runtimeProfileKind || "service";
      const serviceId = option.dataset.runtimeProfileService || "telegram";
      const botId = option.dataset.runtimeProfileBot || "";
      activeModelRouteDropdown = "";
      if (kind === "bot") {
        updateServiceBot(serviceId, botId, { model_profile_override: value || null });
        return;
      }
      updateServiceConfig(serviceId, { model_profile: value || "default" });
    });
  });
}

function activeModelConfig() {
  const providers = modelProviders();
  if (!providers[activeModelProvider]) {
    activeModelProvider = "openai";
  }
  return providers[activeModelProvider] || providers.openai;
}

function modelModeEntries(provider, config) {
  const defaults = modelProviders()[provider]?.modes || {};
  return Object.entries(config?.modes || defaults);
}

function syncActiveModelMode() {
  const config = activeModelConfig();
  const modes = modelModeEntries(activeModelProvider, config);
  const preferred = config?.active_mode || modes[0]?.[0] || "";
  if (!modes.some(([mode]) => mode === activeModelMode)) {
    activeModelMode = preferred;
  }
}

function activeModelModeConfig() {
  syncActiveModelMode();
  const config = activeModelConfig();
  return config?.modes?.[activeModelMode] || modelModeEntries(activeModelProvider, config)[0]?.[1] || {};
}

function modelModeDraftKey(provider = activeModelProvider, mode = activeModelMode) {
  return `${provider}:${mode}`;
}

function createModelTestDraft(modeConfig = activeModelModeConfig(), overrides = {}) {
  const savedApiKey = hasSavedApiKey(modeConfig);
  const selectedModels = modeConfig.selected_models?.length
    ? [...modeConfig.selected_models]
    : modeConfig.model
      ? [modeConfig.model]
      : [];
  return {
    baseUrl: modeConfig.base_url || providerDefaultBaseUrl(activeModelProvider, activeModelMode),
    cliPath: modeConfig.cli_path || "",
    workingDirectory: modeConfig.working_directory || "",
    locked: savedApiKey,
    apiKey: "",
    displayApiKey: savedApiKey ? "••••••••••••••••" : "",
    result: "",
    status: "",
    reason: "",
    models: [],
    loadedThisSession: false,
    selectedModels,
    ...overrides,
  };
}

function activeModelTestDraft() {
  const stored = modelTestDrafts[modelModeDraftKey()];
  if (stored) return stored;
  return createModelTestDraft();
}

const MODEL_GROUPS = [
  { key: "recommended", label: "Recommended" },
  { key: "gpt", label: "GPT Models" },
  { key: "reasoning", label: "Reasoning" },
  { key: "claude", label: "Claude" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "image", label: "Image" },
  { key: "audio", label: "Audio / Speech" },
  { key: "embedding", label: "Embedding" },
  { key: "other", label: "Other" },
];

function classifyModelGroup(modelName) {
  const value = String(modelName || "").toLowerCase();
  if (
    /^gpt-5($|-)/.test(value)
    || /^gpt-4\.1($|-)/.test(value)
    || /^gpt-4o($|-)/.test(value)
    || value === "chat-latest"
    || /claude.*sonnet/.test(value)
    || value === "deepseek-chat"
  ) {
    return "recommended";
  }
  if (value.includes("embedding") || value.includes("embed") || value.includes("ada")) return "embedding";
  if (
    value.includes("whisper")
    || value.startsWith("tts")
    || value.includes("audio")
    || value.includes("speech")
    || value.includes("transcribe")
  ) {
    return "audio";
  }
  if (
    value.includes("dall-e")
    || value.includes("image")
    || value.includes("vision")
  ) {
    return "image";
  }
  if (value.startsWith("gpt-")) return "gpt";
  if (/^o\d/.test(value) || value.includes("reasoning")) return "reasoning";
  if (value.includes("claude")) return "claude";
  if (value.includes("deepseek")) return "deepseek";
  return "other";
}

function modelCommonPriority(modelName) {
  const value = String(modelName || "").toLowerCase();
  const priorities = [
    /^gpt-5($|-)/,
    /^gpt-4\.1($|-)/,
    /^gpt-4o($|-)/,
    /^chat-latest$/,
    /claude.*sonnet/,
    /^deepseek-chat$/,
  ];
  const index = priorities.findIndex((pattern) => pattern.test(value));
  return index === -1 ? priorities.length : index;
}

function modelDateScore(modelName) {
  const value = String(modelName || "");
  const compactDates = [...value.matchAll(/20\d{6}/g)].map((match) => Number(match[0]));
  const dashedDates = [...value.matchAll(/20\d{2}[-_.]?\d{2}[-_.]?\d{2}/g)]
    .map((match) => Number(match[0].replace(/\D/g, "")));
  return Math.max(0, ...compactDates, ...dashedDates);
}

function modelVersionScore(modelName) {
  const value = String(modelName || "").toLowerCase();
  const match = value.match(/(?:gpt-|claude-|deepseek-|^o)(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

function compareModelNames(a, b) {
  const commonDelta = modelCommonPriority(a) - modelCommonPriority(b);
  if (commonDelta) return commonDelta;

  const latestDelta = Number(String(b).toLowerCase().includes("latest"))
    - Number(String(a).toLowerCase().includes("latest"));
  if (latestDelta) return latestDelta;

  const dateDelta = modelDateScore(b) - modelDateScore(a);
  if (dateDelta) return dateDelta;

  const versionDelta = modelVersionScore(b) - modelVersionScore(a);
  if (versionDelta) return versionDelta;

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortModelOptions(models) {
  const unique = [...new Set(models || [])];
  return unique.sort((a, b) => {
    const groupDelta = MODEL_GROUPS.findIndex((group) => group.key === classifyModelGroup(a))
      - MODEL_GROUPS.findIndex((group) => group.key === classifyModelGroup(b));
    return groupDelta || compareModelNames(a, b);
  });
}

function modelOptionsForDraft(draft) {
  const available = [...new Set(draft.models || [])];
  return sortModelOptions(available);
}

function groupedModelOptions(options, draft) {
  const selectedSet = new Set(draft.selectedModels || []);
  const groups = [];
  const selectedItems = sortModelOptions(options.filter((item) => selectedSet.has(item)));
  if (selectedItems.length) {
    groups.push({ key: "selected", label: "Selected", items: selectedItems });
  }
  for (const group of MODEL_GROUPS) {
    const items = options.filter((item) => !selectedSet.has(item) && classifyModelGroup(item) === group.key);
    if (items.length) {
      groups.push({ ...group, items });
    }
  }
  return groups;
}

function renderModelOptionGroups(groups, draft) {
  if (!groups.length) return '<div class="target-item">No models match your search.</div>';
  return groups
    .map((group) => `
      <div class="model-select-group">
        <div class="model-select-group-label">${group.label}</div>
        ${group.items
          .map((modelName) => {
            const checked = draft.selectedModels?.includes(modelName);
            return `
              <label class="model-select-item ${checked ? "active" : ""}">
                <input class="model-select-checkbox" data-model-choice="${modelName}" type="checkbox" ${checked ? "checked" : ""} />
                <span>${modelName}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    `)
    .join("");
}

function modelToolbarSummary(draft) {
  const count = draft.selectedModels?.length || 0;
  const availableCount = draft.models?.length || 0;
  return `${count} models selected (${availableCount} avail.)`;
}

function selectedModelPreview(draft) {
  return [...new Set(draft.selectedModels || [])];
}

function invalidSelectedModels(draft) {
  if (!draft?.loadedThisSession) return [];
  const available = new Set(draft.models || []);
  if (!available.size) return [...new Set(draft.selectedModels || [])];
  return [...new Set((draft.selectedModels || []).filter((item) => !available.has(item)))];
}

function renderConnectionNote(message, status = "") {
  if (!message) return "";
  if (status === "testing") {
    return `
      <div class="settings-field-note testing">
        <span>Testing and loading ...</span>
      </div>
    `;
  }
  const noQuota = status === "no_quota";
  const noModels = status === "no_models";
  const error = status === "error";
  const connected = status === "connected" || (!noQuota && !noModels && !error && message.startsWith("Connected"));
  return `
    <div class="settings-field-note ${connected ? "connected" : ""} ${noQuota || noModels ? "warning" : ""} ${error ? "error" : ""}">
      ${connected ? '<span class="settings-note-dot connected" aria-hidden="true"></span>' : ""}
      ${noQuota || noModels ? '<span class="settings-note-dot warning" aria-hidden="true"></span>' : ""}
      ${error ? '<span class="settings-note-dot error" aria-hidden="true"></span>' : ""}
      <span>${message}</span>
      ${
        noQuota
          ? '<span class="settings-field-note-extra">This key connected successfully, but it cannot be used until quota or billing is available.</span>'
          : ""
      }
    </div>
  `;
}

function renderOllamaSetupHelp(draft) {
  if (!draft?.result || draft.status === "testing") return "";
  if (draft.status === "error") {
    return `
      <div class="ollama-help-card">
        <div>
          <strong>Ollama is not reachable.</strong>
          <span>Install Ollama, open it once, then run detection again. If it is already installed, check whether the Base URL is correct.</span>
        </div>
        <div class="ollama-help-actions">
          <a class="target-action secondary" href="https://ollama.com/download" target="_blank" rel="noreferrer">Install Ollama</a>
        </div>
      </div>
    `;
  }
  if (draft.status === "no_models") {
    return `
      <div class="ollama-help-card warning">
        <div>
          <strong>No local models found.</strong>
          <span>Browse models and install them locally, then run detection again.</span>
        </div>
        <div class="ollama-help-actions">
          <a class="target-action ollama-primary-link" href="https://ollama.com/library" target="_blank" rel="noreferrer">Browse models</a>
        </div>
      </div>
    `;
  }
  return "";
}

function renderLoadHint(modeConfig, draft, editing) {
  if (!editing) return "";
  if (!isLoadableModelMode(modeConfig)) return "";
  if (isApiModelMode(modeConfig) && !hasSavedApiKey(modeConfig)) return "";
  if (draft?.status === "testing") return "";
  if (draft?.result) return "";
  if (draft?.loadedThisSession) return "";
  return `
    <div class="settings-field-note testing">
      <span>Click the Load button to ${isLocalModelMode(modeConfig) ? "check Ollama and load local models" : "reload models"}.</span>
    </div>
  `;
}

function runMissingRequirementsMessage(values, modeConfig) {
  const missing = [];
  if (!String(values.baseUrl || "").trim()) missing.push("Base URL");
  if (isApiModelMode(modeConfig) && !hasSavedApiKey(modeConfig)) missing.push("API key");
  if (!(values.selectedModels || []).length) missing.push("at least one model");
  if (!missing.length) return "Still draft. Complete the required fields before running.";
  if (missing.length === 1) return `Still draft. Add ${missing[0]} before running.`;
  if (missing.length === 2) return `Still draft. Add ${missing[0]} and ${missing[1]} before running.`;
  return `Still draft. Add ${missing[0]}, ${missing[1]}, and ${missing[2]} before running.`;
}

function classifyRunFailureMessage(errorOrMessage = "") {
  const reason = typeof errorOrMessage === "object" && errorOrMessage !== null
    ? String(errorOrMessage.reason || "").trim()
    : "";
  if (reason === "base_url_unreachable") {
    if (activeModelProvider === "ollama") {
      return "Still draft. Ollama is not reachable. Make sure Ollama is installed and running.";
    }
    return "Still draft. Base URL is unreachable.";
  }
  if (reason === "api_key_invalid") {
    return "Still draft. API key is invalid.";
  }
  if (reason === "api_key_missing") {
    return "Still draft. Add API key before running.";
  }
  if (reason === "api_request_failed") {
    return "Still draft. API request failed.";
  }
  if (reason === "cli_not_found") {
    return `Still draft. ${activeModelProvider === "claude" ? "Claude Code CLI" : "Codex CLI"} is not installed or cannot run locally.`;
  }
  if (reason === "model_missing") {
    return "Still draft. Add a model name before running.";
  }

  const message = String(
    typeof errorOrMessage === "object" && errorOrMessage !== null
      ? errorOrMessage.message || ""
      : errorOrMessage || "",
  ).trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("name or service not known")
    || lower.includes("nodename nor servname provided")
    || lower.includes("failed to establish a new connection")
    || lower.includes("max retries exceeded")
    || lower.includes("connection refused")
    || lower.includes("timed out")
    || lower.includes("timeout")
  ) {
    return "Still draft. Base URL is unreachable.";
  }

  if (
    lower.includes("401")
    || lower.includes("403")
    || lower.includes("unauthorized")
    || lower.includes("forbidden")
    || lower.includes("invalid api key")
    || lower.includes("authentication")
    || lower.includes("incorrect api key")
  ) {
    return "Still draft. API key is invalid.";
  }

  if (
    lower.includes("500")
    || lower.includes("502")
    || lower.includes("503")
    || lower.includes("504")
    || lower.includes("server error")
    || lower.includes("bad gateway")
    || lower.includes("service unavailable")
  ) {
    return "Still draft. API request failed.";
  }

  if (lower.includes("missing api key")) {
    return "Still draft. Add API key before running.";
  }

  return `Still draft. API request failed${message ? `: ${message}` : "."}`;
}

function modelRunReason(modeConfig, draft, editing = false) {
  if (!isLoadableModelMode(modeConfig) && !isCliModelMode(modeConfig)) return "";
  const nextDraft = draft || {};
  if (editing && nextDraft.loadedThisSession && nextDraft.reason) {
    return String(nextDraft.reason || "").trim();
  }
  const runResult = lastModelRunResults[modelModeDraftKey(activeModelProvider, activeModelMode)] || {};
  return String(runResult.reason || "").trim();
}

function fieldErrorState(modeConfig, draft, editing = false) {
  const selectedModels = editing ? draft?.selectedModels || [] : modeConfig?.selected_models || [];
  const invalidSelected = invalidSelectedModels(draft);
  const reason = modelRunReason(modeConfig, draft, editing);
  const state = {
    baseUrl: false,
    apiKey: false,
    models: false,
  };

  if (editing) {
    const baseUrl = String(draft?.baseUrl || "").trim();
    const hasApiKey = Boolean(String(draft?.apiKey || "").trim() || draft?.displayApiKey || hasSavedApiKey(modeConfig));
    if (isCliModelMode(modeConfig)) {
      state.models = false;
    } else {
      if (!baseUrl) state.baseUrl = true;
      if (isApiModelMode(modeConfig) && !hasApiKey) state.apiKey = true;
      if (!selectedModels.length) state.models = true;
    }
  }

  if (reason === "base_url_unreachable") state.baseUrl = true;
  if (reason === "cli_not_found") state.baseUrl = true;
  if (!isCliModelMode(modeConfig) && reason === "model_missing") state.models = true;
  if (
    isApiModelMode(modeConfig)
    && (reason === "api_key_invalid" || reason === "api_key_missing" || reason === "api_request_failed" || reason === "no_quota")
  ) {
    state.apiKey = true;
  }
  if (isLocalModelMode(modeConfig) && reason === "api_request_failed") {
    state.baseUrl = true;
  }
  if (reason === "selected_models_unavailable" || invalidSelected.length) {
    state.models = true;
  }

  return state;
}

function isModelModeConfigured(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  if (isTerminalCliMode(modeConfig, provider, mode)) {
    return Boolean(modeConfig?.configured);
  }
  if ("api_key_configured" in modeConfig || "api_key" in modeConfig) {
    return Boolean(modeConfig?.base_url && modeConfig?.api_key_configured && modeConfig?.selected_models?.length);
  }
  if (isLocalModelMode(modeConfig, provider, mode)) {
    return Boolean(modeConfig?.base_url && modeConfig?.selected_models?.length && modeConfig?.configured);
  }
  return Boolean(modeConfig?.model || modeConfig?.selected_models?.length);
}

function isApiModelMode(modeConfig) {
  return "api_key_configured" in modeConfig || "api_key" in modeConfig;
}

function isLocalModelMode(_modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return provider === "ollama" && mode === "api";
}

function isCliModelMode(_modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return (provider === "openai" && mode === "codex_cli") || (provider === "claude" && mode === "claude_code_cli");
}

function isTerminalCliMode(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return isCliModelMode(modeConfig, provider, mode);
}

function isLoadableModelMode(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return isApiModelMode(modeConfig) || isLocalModelMode(modeConfig, provider, mode);
}

function hasSavedApiKey(modeConfig) {
  return Boolean(modeConfig?.api_key_saved || modeConfig?.api_key_configured);
}

function isModelModeDraft(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  if (isTerminalCliMode(modeConfig, provider, mode)) {
    return !isModelModeConfigured(modeConfig, provider, mode);
  }
  if (!isLoadableModelMode(modeConfig, provider, mode)) return false;
  return Boolean(
    modeConfig?.base_url
    || (isApiModelMode(modeConfig) && hasSavedApiKey(modeConfig))
    || modeConfig?.selected_models?.length
    || modeConfig?.configured
  ) && !isModelModeConfigured(modeConfig, provider, mode);
}

function modelDraftIssues(modeConfig, draft, editing = false) {
  if (isCliModelMode(modeConfig)) {
    return [];
  }
  if (!isLoadableModelMode(modeConfig)) return [];
  const issues = [];
  const baseUrl = String(editing ? draft?.baseUrl || "" : modeConfig?.base_url || "").trim();
  const hasApiKey = editing
    ? Boolean(String(draft?.apiKey || "").trim() || draft?.displayApiKey || hasSavedApiKey(modeConfig))
    : hasSavedApiKey(modeConfig);
  const selectedModels = editing ? draft?.selectedModels || [] : modeConfig?.selected_models || [];

  if (!baseUrl) issues.push("missing Base URL");
  if (isApiModelMode(modeConfig) && !hasApiKey) issues.push("missing API key");
  if (!selectedModels.length) issues.push("no model selected");
  return issues;
}

function renderModelDraftBanner(modeConfig, draft, editing, status) {
  if (!editing) return "";
  if (!isLoadableModelMode(modeConfig) && !isCliModelMode(modeConfig)) return "";
  const issues = modelDraftIssues(modeConfig, draft, editing);
  if (!issues.length || status.key === "configured") return "";
  const issueText = issues.join(" · ");
  const bannerKey = modelModeDraftKey(activeModelProvider, activeModelMode);
  if (dismissedModelDraftBanners[bannerKey] === issueText) return "";
  const title = status.key === "draft" ? "Draft" : "Configuring";
  return `
    <div class="model-draft-banner ${status.key}">
      <strong>${title}</strong>
      <span>${issueText}</span>
      <button class="model-banner-dismiss" data-model-draft-dismiss="${activeModelMode}" type="button" aria-label="Dismiss message">×</button>
    </div>
  `;
}

function renderModelRunBanner(modeConfig, editing) {
  if (editing || isCliModelMode(modeConfig) || !isLoadableModelMode(modeConfig)) return "";
  const runResult = lastModelRunResults[modelModeDraftKey(activeModelProvider, activeModelMode)] || {};
  if (runResult.dismissed) return "";
  const message = String(runResult.message || "").trim();
  const reason = String(runResult.reason || "").trim();
  if (!message || !reason) return "";
  return `
    <div class="model-run-banner" data-model-run-banner>
      <span>${message} (<button class="settings-label-link subtle model-run-edit-link" data-model-run-edit="${activeModelMode}" type="button">Edit</button>)</span>
      <button class="model-run-dismiss" data-model-run-dismiss="${activeModelMode}" type="button" aria-label="Dismiss error">×</button>
    </div>
  `;
}

function renderSelectedModelsPanel(selectedModelItems, invalidSelected, editing) {
  return `
    <div class="model-selected-panel ${editing ? "" : "compact"}">
      <div class="model-selected-panel-head">
        <span class="model-selected-panel-title">Selected Models</span>
        <div class="model-selected-panel-actions">
          ${
            editing && invalidSelected.length
              ? '<button class="settings-label-link subtle model-selected-remove-old" id="modelSelectedRemoveOld" type="button">Remove old models</button>'
              : ""
          }
          ${
            selectedModelItems.length > 4
              ? `<button class="settings-label-link subtle model-selected-toggle" id="modelSelectedToggle" type="button">${modelSelectedListExpanded ? "Collapse" : "View all"}</button>`
              : ""
          }
        </div>
      </div>
      ${
        selectedModelItems.length
          ? `
            <div class="model-selected-chip-list ${modelSelectedListExpanded ? "expanded" : ""}">
              ${selectedModelItems
                .map((modelName) => {
                  const invalid = invalidSelected.includes(modelName);
                  return `
                    <span class="model-selected-chip ${invalid ? "invalid" : ""}" ${invalid ? 'title="This model is not available in the latest loaded list."' : ""}>
                      <span>${modelName}</span>
                      ${invalid ? '<span class="model-selected-chip-status">unavailable</span>' : ""}
                    </span>
                  `;
                })
                .join("")}
            </div>
          `
          : `<div class="model-selected-empty">${editing ? "0 model is selected" : "No model is selected yet..."}</div>`
      }
    </div>
  `;
}

function modelModeStatus(modeConfig, mode, editing) {
  const configured = isModelModeConfigured(modeConfig, activeModelProvider, mode);
  if (isLoadableModelMode(modeConfig, activeModelProvider, mode) || isCliModelMode(modeConfig, activeModelProvider, mode)) {
    if (editing) {
      return { key: "configuring", label: "Configuring", tone: "warning" };
    }
    if (configured) {
      return { key: "configured", label: "Configured", tone: "success" };
    }
    return { key: "draft", label: "Draft", tone: "warning" };
  }
  return configured
    ? { key: "configured", label: "Configured", tone: "success" }
    : { key: "draft", label: "Draft", tone: "warning" };
}

function isModelProviderConfigured(config) {
  return modelModeEntries(activeModelProvider, config).some(([mode, modeConfig]) =>
    isModelModeConfigured(modeConfig, activeModelProvider, mode),
  );
}

function renderOllamaConfiguration(providerEntries) {
  activeModelMode = "api";
  const activeConfig = activeModelConfig();
  const modeConfig = activeConfig?.modes?.api || {};
  const editing = editingModelMode === "api";
  const expanded = expandedModelMode === "api" || editing;
  const configured = isModelModeConfigured(modeConfig, "ollama", "api");
  const draft = isModelModeDraft(modeConfig, "ollama", "api");
  const status = modelModeStatus(modeConfig, "api", editing);
  const testDraft = activeModelTestDraft();
  const defaultBaseUrl = providerDefaultBaseUrl("ollama", "api");
  const currentBaseUrlValue = editing ? testDraft.baseUrl || "" : modeConfig.base_url || "";
  const selectedModelItems = selectedModelPreview(testDraft);
  const invalidSelected = invalidSelectedModels(testDraft);
  const trimmedModelSearch = modelPickerSearch.trim().toLowerCase();
  const allModelOptions = modelOptionsForDraft(testDraft);
  const modelOptions = allModelOptions.filter((item) =>
    !trimmedModelSearch || item.toLowerCase().includes(trimmedModelSearch),
  );
  const modelOptionGroups = groupedModelOptions(modelOptions, testDraft);
  const allVisibleSelected =
    modelOptions.length > 0 && modelOptions.every((item) => testDraft.selectedModels?.includes(item));
  const modelPickerBulkLabel = allVisibleSelected ? "Unselect all" : "Select all";
  const fieldErrors = fieldErrorState(modeConfig, testDraft, editing);

  settingsPlaceholder.innerHTML = `
    <h3>Model Configuration</h3>
    <p class="settings-subcopy model-configuration-subcopy">Configure AI provider connection and save settings locally.</p>
    <div class="service-scope">
      <div class="service-switcher">
        <div class="service-tabs model-provider-tabs" aria-label="Model provider tabs">
          ${providerEntries
            .map(([provider]) => `
              <button class="service-tab ${provider === activeModelProvider ? "active" : ""}" data-model-provider="${provider}" type="button">
                <span class="service-tab-main">${modelProviderDisplayName(provider)}</span>
              </button>
            `)
            .join("")}
        </div>
      </div>
      <section class="service-card model-config-card">
        <div class="model-mode-drawers" aria-label="Ollama local runtime">
          <section class="model-mode-drawer ${expanded ? "active" : ""}">
            <div class="model-mode-drawer-head">
              <button class="model-mode-drawer-toggle" data-model-mode-toggle="api" type="button" aria-expanded="${expanded}">
                <span class="model-mode-drawer-title-row">
                  <span class="model-mode-drawer-title">${modeConfig.label || "Ollama API"}</span>
                  <span class="target-label ${status.tone}">${status.label}</span>
                </span>
              </button>
              <div class="model-mode-drawer-actions">
                ${
                  configured
                    ? `
                      <button class="target-toggle model-mode-enable ${modeConfig.enabled ? "enabled" : ""}" data-model-mode-enable="api" type="button" aria-pressed="${modeConfig.enabled ? "true" : "false"}" aria-label="${modeConfig.enabled ? "Disable" : "Enable"} Ollama">
                        <span class="target-toggle-track" aria-hidden="true">
                          <span class="target-toggle-thumb"></span>
                        </span>
                      </button>
                    `
                    : ""
                }
                ${!editing ? '<button class="target-action secondary" data-model-mode-run="api" type="button">Run</button>' : ""}
                ${!editing ? '<button class="target-action secondary model-mode-edit-pill" data-model-mode-edit="api" type="button">Edit</button>' : ""}
                <button class="model-mode-caret-button" data-model-mode-toggle="api" type="button" aria-expanded="${expanded}" aria-label="${expanded ? "Collapse" : "Expand"} Ollama API">
                  <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                </button>
              </div>
            </div>
            ${
              expanded
                ? `
            <div class="model-mode-drawer-body">
              <form class="model-config-form" id="modelConfigForm">
                ${
                  editing
                    ? `
                      <button class="ollama-detect-button" id="modelLoadButton" type="button">
                        Run and detect Ollama locally
                      </button>
                    `
                    : ""
                }
                ${renderModelRunBanner(modeConfig, editing)}
                <div class="settings-field ${fieldErrors.baseUrl ? "has-error" : ""}">
                  <label class="settings-label" for="modelBaseUrlInput">Base URL</label>
                  ${
                    editing
                      ? `
                        ${testDraft.status === "no_models" ? renderConnectionNote("Base URL connected.", "connected") : testDraft.status === "error" ? "" : renderConnectionNote(testDraft.result, testDraft.status)}
                        ${testDraft.status !== "no_models" ? renderOllamaSetupHelp(testDraft) : ""}
                        <div class="settings-input-with-action">
                          <input class="settings-input" id="modelBaseUrlInput" name="baseUrl" autocomplete="off" placeholder="${defaultBaseUrl}" value="${currentBaseUrlValue}" />
                          <button class="settings-input-action compact light-action ${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "text-action" : "icon-only"}" id="modelBaseUrlAction" type="button" aria-label="${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "Restore default Base URL" : "Clear Base URL"}">
                            ${
                              !currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl
                                ? "Default"
                                : `
                                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M6 6L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path d="M14 6L6 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                  </svg>
                                `
                            }
                          </button>
                        </div>
                      `
                      : currentBaseUrlValue
                        ? `<div class="settings-empty-block filled">${currentBaseUrlValue}</div>`
                        : '<div class="settings-empty-block">No Base URL is added ...</div>'
                  }
                </div>
                <div class="settings-field ${fieldErrors.models ? "has-error" : ""}">
                  <div class="settings-label-row">
                    <label class="settings-label">Models</label>
                  </div>
                  ${editing && testDraft.status === "no_models" ? renderOllamaSetupHelp(testDraft) : ""}
                  <div class="model-picker">
                    ${renderSelectedModelsPanel(selectedModelItems, invalidSelected, editing)}
                    ${
                      editing && testDraft.loadedThisSession && testDraft.models?.length
                        ? `
                          <button class="model-picker-trigger ${modelPickerOpen ? "open" : ""}" id="modelPickerTrigger" type="button" aria-expanded="${modelPickerOpen ? "true" : "false"}">
                            <span class="model-picker-summary">Select models ...</span>
                            <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                          </button>
                          ${
                            modelPickerOpen
                              ? `
                                <div class="model-picker-menu">
                                  <input class="home-bot-search model-picker-search" id="modelPickerSearch" autocomplete="off" placeholder="Search model by name" />
                                  <div class="model-picker-toolbar">
                                    <span class="model-picker-toolbar-summary">${modelToolbarSummary(testDraft)}</span>
                                    <button class="settings-label-link subtle model-picker-bulk-action" id="modelPickerBulkAction" type="button">${modelPickerBulkLabel}</button>
                                  </div>
                                  <div class="model-select-list">
                                    ${
                                      modelOptions.length
                                        ? renderModelOptionGroups(modelOptionGroups, testDraft)
                                        : '<div class="target-item">No models match your search.</div>'
                                    }
                                  </div>
                                </div>
                              `
                              : ""
                          }
                        `
                        : ""
                    }
                  </div>
                </div>
                ${
                  editing
                    ? `
                      <div class="settings-actions model-config-actions">
                        <span class="settings-feedback" id="modelConfigFeedback"></span>
                        <div class="model-config-action-buttons">
                          ${(configured || draft) ? '<button class="target-action secondary" id="modelConfigCancel" type="button">Cancel</button>' : ""}
                          <button class="target-action" id="modelConfigSave" type="submit">Save</button>
                        </div>
                      </div>
                    `
                    : '<span class="settings-feedback sr-only" id="modelConfigFeedback"></span>'
                }
              </form>
            </div>
                `
                : ""
            }
          </section>
        </div>
      </section>
    </div>
  `;

  bindModelProviderTabs();

  settingsPlaceholder.querySelectorAll("[data-model-mode-toggle]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeModelMode = "api";
      expandedModelMode = expandedModelMode === "api" ? "" : "api";
      editingModelMode = "";
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      activeModelMode = "api";
      expandedModelMode = "api";
      const enterEdit = (nextModeConfig = modeConfig) => {
        modelTestDrafts[modelModeDraftKey("ollama", "api")] = createModelTestDraft(nextModeConfig, {
          status: "",
          result: "",
          reason: "",
          loadedThisSession: false,
        });
        editingModelMode = "api";
        expandedModelMode = "api";
        modelPickerOpen = false;
        modelPickerSearch = "";
        modelSelectedListExpanded = false;
        renderSettings();
      };

      if (configured) {
        openRoleChoice({
          title: "Edit configured model?",
          copy: "Ollama API will move back to Draft and be disabled before editing. You can run it again after updating the settings.",
          confirmLabel: "Continue to edit",
          cancelLabel: "Don't edit",
          defaultAction: "cancel",
          danger: true,
          onConfirm: async () => {
            closeRoleChoice();
            await saveModelConfiguration("ollama", "api", {
              model: modeConfig.model || (modeConfig.selected_models || [])[0] || "",
              baseUrl: modeConfig.base_url || defaultBaseUrl,
              apiKey: "",
              includeApiKey: false,
              selectedModels: [...(modeConfig.selected_models || [])],
              configured: false,
              enabled: false,
              resumeEnabledOnRun: false,
            });
            enterEdit(activeModelConfig()?.modes?.api || modeConfig);
          },
        });
        return;
      }

      enterEdit();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModelMode = "api";
      expandedModelMode = "api";
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = createModelTestDraft(modeConfig);
      editingModelMode = "api";
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = modelModeDraftKey("ollama", "api");
      lastModelRunResults[key] = {
        ...(lastModelRunResults[key] || {}),
        dismissed: true,
      };
      renderSettings();
    });
  });

  bindOllamaRunAndEnable(modeConfig);

  const form = settingsPlaceholder.querySelector("#modelConfigForm");
  if (!form) return;

  const saveButton = settingsPlaceholder.querySelector("#modelConfigSave");
  const cancelButton = settingsPlaceholder.querySelector("#modelConfigCancel");
  const baseUrlInput = settingsPlaceholder.querySelector("#modelBaseUrlInput");
  const baseUrlActionButton = settingsPlaceholder.querySelector("#modelBaseUrlAction");
  const modelLoadButton = settingsPlaceholder.querySelector("#modelLoadButton");
  const modelPickerTrigger = settingsPlaceholder.querySelector("#modelPickerTrigger");
  const modelPickerSearchInput = settingsPlaceholder.querySelector("#modelPickerSearch");
  const modelPickerBulkAction = settingsPlaceholder.querySelector("#modelPickerBulkAction");
  const feedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
  const setFeedback = (message = "", tone = "") => {
    if (!feedback) return;
    feedback.textContent = message;
    if (tone) feedback.dataset.tone = tone;
    else delete feedback.dataset.tone;
  };
  const collectValues = () => ({
    model: (activeModelTestDraft().selectedModels || [])[0] || "",
    apiKey: "",
    includeApiKey: false,
    baseUrl: String(new FormData(form).get("baseUrl") || "").trim(),
    selectedModels: [...(activeModelTestDraft().selectedModels || [])],
  });

  if (baseUrlActionButton && baseUrlInput) {
    baseUrlActionButton.addEventListener("click", () => {
      const currentValue = baseUrlInput.value.trim();
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        baseUrl: currentValue === defaultBaseUrl ? "" : defaultBaseUrl,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      renderSettings();
    });
  }

  if (baseUrlInput) {
    baseUrlInput.addEventListener("input", () => {
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        baseUrl: baseUrlInput.value,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
    });
  }

  if (modelLoadButton) {
    modelLoadButton.addEventListener("click", async () => {
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        result: "Testing and loading ...",
        status: "testing",
      };
      renderSettings();
      try {
        const result = await testModelConfiguration("ollama", "api", collectValues());
        const currentDraft = activeModelTestDraft();
        const models = result.models || [];
        modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
          ...currentDraft,
          result: result.message || "Connected.",
          status: result.status || "connected",
          models,
          loadedThisSession: result.status === "connected" || result.status === "no_models",
        };
        modelPickerOpen = Boolean(models.length);
        modelPickerSearch = "";
        modelSelectedListExpanded = false;
        renderSettings();
      } catch (error) {
        modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
          ...activeModelTestDraft(),
          result: error.message,
          status: "error",
          reason: error.reason || "api_request_failed",
          loadedThisSession: false,
        };
        renderSettings();
      }
    });
  }

  if (modelPickerSearchInput) {
    modelPickerSearchInput.value = modelPickerSearch;
    modelPickerSearchInput.addEventListener("input", () => {
      modelPickerSearch = modelPickerSearchInput.value;
      renderSettings();
    });
  }

  if (modelPickerTrigger) {
    modelPickerTrigger.addEventListener("click", () => {
      modelPickerOpen = !modelPickerOpen;
      if (!modelPickerOpen) modelPickerSearch = "";
      renderSettings();
    });
  }

  const modelSelectedToggle = settingsPlaceholder.querySelector("#modelSelectedToggle");
  if (modelSelectedToggle) {
    modelSelectedToggle.addEventListener("click", () => {
      modelSelectedListExpanded = !modelSelectedListExpanded;
      renderSettings();
    });
  }

  const modelSelectedRemoveOld = settingsPlaceholder.querySelector("#modelSelectedRemoveOld");
  if (modelSelectedRemoveOld) {
    modelSelectedRemoveOld.addEventListener("click", () => {
      const draft = activeModelTestDraft();
      const invalid = new Set(invalidSelectedModels(draft));
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...draft,
        selectedModels: (draft.selectedModels || []).filter((item) => !invalid.has(item)),
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      renderSettings();
    });
  }

  settingsPlaceholder.querySelectorAll("[data-model-choice]").forEach((input) => {
    input.addEventListener("change", () => {
      const currentSelected = new Set(activeModelTestDraft().selectedModels || []);
      if (input.checked) currentSelected.add(input.dataset.modelChoice);
      else currentSelected.delete(input.dataset.modelChoice);
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        selectedModels: [...currentSelected],
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      renderSettings();
    });
  });

  if (modelPickerBulkAction) {
    modelPickerBulkAction.addEventListener("click", () => {
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        selectedModels: allVisibleSelected ? [] : [...modelOptions],
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      renderSettings();
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      delete modelTestDrafts[modelModeDraftKey("ollama", "api")];
      editingModelMode = "";
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = collectValues();
    setFeedback("Saving...");
    if (saveButton) saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    try {
      await saveModelConfiguration("ollama", "api", {
        ...values,
        configured: false,
        enabled: false,
      });
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      delete modelTestDrafts[modelModeDraftKey("ollama", "api")];
      editingModelMode = "";
      setFeedback("Saved.", "success");
      renderSettings();
    } catch (error) {
      setFeedback(`Save failed: ${error.message}`, "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  });
}

function cliInstallUrl(provider) {
  return provider === "claude" ? "https://claude.ai/code" : "https://codex.com";
}

function renderCliHelp(draft) {
  if (!draft?.result || draft.status === "testing") return "";
  const reason = String(draft.reason || "").trim();
  if (reason !== "cli_not_found") return "";
  const label = activeModelProvider === "claude" ? "Claude Code CLI" : "Codex CLI";
  const action = activeModelProvider === "claude" ? "Install Claude Code" : "Install Codex";
  const guidance = activeModelProvider === "claude"
    ? "Install Claude Code or make sure the claude command can run locally, then run detection again."
    : "Install Codex or make sure Codex CLI can run locally, then run detection again.";
  return `
    <div class="ollama-help-card">
      <div>
        <strong>${label} is not reachable.</strong>
        <span>${guidance}</span>
      </div>
      <div class="ollama-help-actions">
        <a class="target-action secondary" href="${cliInstallUrl(activeModelProvider)}" target="_blank" rel="noreferrer">${action}</a>
      </div>
    </div>
  `;
}

function renderCliStatusCard(draft) {
  if (!draft?.result || draft.status === "testing") return "";
  const label = activeModelProvider === "claude" ? "Claude Code CLI" : "Codex CLI";
  if (draft.status === "connected") {
    const version = String(draft.result || "").match(/Version:\s*(.+)$/)?.[1] || "";
    return `
      <div class="cli-status-card success">
        <strong>${label} detected.</strong>
        ${version ? `<span>Version: ${version}</span>` : ""}
      </div>
    `;
  }
  return renderCliHelp(draft);
}

function renderCliModeFields(modeConfig, draft, editing, fieldErrors, status) {
  const label = activeModelProvider === "claude" ? "Claude Code" : "Codex CLI";
  return `
    ${renderModelRunBanner(modeConfig, false)}
    <button class="ollama-detect-button cli-detect-button" data-model-mode-run="${activeModelMode}" type="button">
      Run and detect ${label} locally
    </button>
    ${draft.status === "testing" ? renderConnectionNote(draft.result, draft.status) : ""}
    ${renderCliStatusCard(draft)}
  `;
}

function bindModelProviderTabs() {
  settingsPlaceholder.querySelectorAll("[data-model-provider]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeModelProvider = tab.dataset.modelProvider || "openai";
      activeModelMode = activeModelConfig().active_mode || "";
      expandedModelMode = "";
      editingModelMode = "";
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  });
}

function bindOllamaRunAndEnable(modeConfig) {
  const boundRunButtons = new Set();
  settingsPlaceholder.querySelectorAll("[data-model-mode-run]").forEach((button) => {
    if (boundRunButtons.has(button)) return;
    boundRunButtons.add(button);
    button.addEventListener("click", async () => {
      const selectedModels = [...(modeConfig.selected_models || [])];
      const savedValues = {
        model: modeConfig.model || selectedModels[0] || "",
        baseUrl: modeConfig.base_url || "",
        apiKey: "",
        includeApiKey: false,
        selectedModels,
      };
      const draftKey = modelModeDraftKey("ollama", "api");
      delete lastModelRunResults[draftKey];
      button.disabled = true;
      try {
        if (!savedValues.baseUrl || !selectedModels.length) {
          const missingMessage = runMissingRequirementsMessage(savedValues, modeConfig);
          lastModelRunResults[draftKey] = {
            reason: "required_fields_incomplete",
            message: missingMessage,
            dismissed: false,
          };
          await saveModelConfiguration("ollama", "api", {
            ...savedValues,
            configured: false,
            enabled: false,
            resumeEnabledOnRun: false,
          });
          renderSettings();
          return;
        }
        const result = await testModelConfiguration("ollama", "api", savedValues);
        const models = result.models || [];
        const invalidSelected = selectedModels.filter((item) => !models.includes(item));
        const validForConfigured = Boolean(savedValues.baseUrl && selectedModels.length && !invalidSelected.length && result.status === "connected");
        await saveModelConfiguration("ollama", "api", {
          ...savedValues,
          configured: validForConfigured,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.api || modeConfig, {
          result: result.message || "Connected.",
          status: result.status || "connected",
          reason: invalidSelected.length ? "selected_models_unavailable" : "",
          models,
          loadedThisSession: true,
          selectedModels,
        });
        if (validForConfigured) {
          delete lastModelRunResults[draftKey];
        } else {
          lastModelRunResults[draftKey] = {
            reason: invalidSelected.length ? "selected_models_unavailable" : "required_fields_incomplete",
            message: invalidSelected.length
              ? "Still draft. Remove old models that are no longer available."
              : "Still draft. Select at least one available local model before running.",
            dismissed: false,
          };
        }
        renderSettings();
      } catch (error) {
        const friendlyMessage = classifyRunFailureMessage(error);
        await saveModelConfiguration("ollama", "api", {
          ...savedValues,
          configured: false,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        lastModelRunResults[draftKey] = {
          reason: error.reason || "api_request_failed",
          message: friendlyMessage,
          dismissed: false,
        };
        renderSettings();
      } finally {
        button.disabled = false;
      }
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-enable]").forEach((toggle) => {
    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        await saveModelConfiguration("ollama", "api", {
          enabled: !modeConfig.enabled,
        });
        renderSettings();
      } finally {
        toggle.disabled = false;
      }
    });
  });
}

function renderModelConfiguration() {
  telegramSettings.hidden = true;
  serviceConfigSettings.hidden = true;
  settingsPlaceholder.hidden = false;
  const providers = modelProviders();
  const activeConfig = activeModelConfig();
  syncActiveModelMode();
  const activeModeConfig = activeModelModeConfig();
  const activeTestDraft = activeModelTestDraft();
  const isCliMode = activeModelMode.includes("cli");
  const inEditingFlow =
    editingModelMode === activeModelMode
    || (!isModelModeConfigured(activeModeConfig, activeModelProvider, activeModelMode) && Boolean(activeModelMode));
  const showModelSelector = !isCliMode
    && (isLoadableModelMode(activeModeConfig, activeModelProvider, activeModelMode)
      ? Boolean(activeModelMode)
      : inEditingFlow || isModelModeConfigured(activeModeConfig, activeModelProvider, activeModelMode));
  const allModelOptions = modelOptionsForDraft(activeTestDraft);
  const selectedModelItems = selectedModelPreview(activeTestDraft);
  const trimmedModelSearch = modelPickerSearch.trim().toLowerCase();
  const modelOptions = allModelOptions.filter((item) =>
    !trimmedModelSearch || item.toLowerCase().includes(trimmedModelSearch),
  );
  const modelOptionGroups = groupedModelOptions(modelOptions, activeTestDraft);
  const defaultBaseUrl = providerDefaultBaseUrl(activeModelProvider, activeModelMode);
  const currentBaseUrlValue = activeTestDraft.baseUrl || "";
  const invalidSelected = invalidSelectedModels(activeTestDraft);
  const fieldErrors = fieldErrorState(activeModeConfig, activeTestDraft, editingModelMode === activeModelMode);
  const allVisibleSelected =
    modelOptions.length > 0 && modelOptions.every((item) => activeTestDraft.selectedModels?.includes(item));
  const modelPickerBulkLabel = allVisibleSelected ? "Unselect all" : "Select all";
  const modeEntries = modelModeEntries(activeModelProvider, activeConfig);
  const noEnabledModelOptions = enabledModelOptions().length === 0;
  const providerEntries = [
    ["openai", providers.openai],
    ["claude", providers.claude],
    ["ollama", providers.ollama],
    ["deepseek", providers.deepseek],
  ];

  if (activeModelProvider === "ollama") {
    renderOllamaConfiguration(providerEntries);
    return;
  }

  settingsPlaceholder.innerHTML = `
    <h3>Model Configuration</h3>
    <p class="settings-subcopy model-configuration-subcopy">Configure AI provider connection and save settings locally.</p>
    <div class="service-scope">
      ${
        noEnabledModelOptions && activeModelProvider === "openai"
          ? `
            <div class="model-empty-error-box" role="alert">
              <strong>No Enabled AI Provider (Model) Enabled</strong>
              <span>You need to configure/run and enable at least 1 AI Provider (Model)</span>
            </div>
          `
          : ""
      }
      <div class="service-switcher">
        <div class="service-tabs model-provider-tabs" aria-label="Model provider tabs">
          ${providerEntries
            .map(([provider, config]) => {
              return `
                <button class="service-tab ${provider === activeModelProvider ? "active" : ""}" data-model-provider="${provider}" type="button">
                  <span class="service-tab-main">${modelProviderDisplayName(provider)}</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
      <section class="service-card model-config-card">
        <div class="model-mode-drawers" aria-label="Model connection modes">
          ${modeEntries
            .map(([mode, modeConfig]) => {
              const expanded = mode === expandedModelMode || editingModelMode === mode;
              const configured = isModelModeConfigured(modeConfig, activeModelProvider, mode);
              const draft = isModelModeDraft(modeConfig, activeModelProvider, mode);
              const editing = editingModelMode === mode;
              const apiMode = isApiModelMode(modeConfig);
              const cliMode = isCliModelMode(modeConfig, activeModelProvider, mode);
              const loadableMode = apiMode || isLocalModelMode(modeConfig, activeModelProvider, mode);
              const status = modelModeStatus(modeConfig, mode, editing);
              const showCancel = editing && (configured || draft) && !cliMode;
              const showRemove = apiMode && editing && activeTestDraft.loadedThisSession;
              const showEnableToggle = configured;
              const showEditButton = !cliMode && (loadableMode || configured || draft);
              const showRunButton = loadableMode && !editing;
              const showSaveButton = editing && !cliMode;
              const runButtonLabel = "Run";
              return `
                <section class="model-mode-drawer ${expanded ? "active" : ""} ${cliMode ? "cli-mode-drawer" : ""}">
                  <div class="model-mode-drawer-head">
                    <button class="model-mode-drawer-toggle" data-model-mode-toggle="${mode}" type="button" aria-expanded="${expanded}">
                      <span class="model-mode-drawer-title-row">
                        <span class="model-mode-drawer-title">${modeConfig.label}</span>
                        <span class="target-label ${status.tone}">${status.label}</span>
                      </span>
                    </button>
                    <div class="model-mode-drawer-actions">
                      ${
                        showEnableToggle
                          ? `
                            <button class="target-toggle model-mode-enable ${modeConfig.enabled ? "enabled" : ""}" data-model-mode-enable="${mode}" type="button" aria-pressed="${modeConfig.enabled ? "true" : "false"}" aria-label="${modeConfig.enabled ? "Disable" : "Enable"} ${modeConfig.label}">
                              <span class="target-toggle-track" aria-hidden="true">
                                <span class="target-toggle-thumb"></span>
                              </span>
                            </button>
                          `
                          : ""
                      }
                      ${
                        showRunButton
                          ? `
                            <button class="target-action secondary" data-model-mode-run="${mode}" type="button">${runButtonLabel}</button>
                          `
                          : ""
                      }
                      ${
                        showEditButton
                          ? `
                            <button class="target-action secondary model-mode-edit-pill" data-model-mode-edit="${mode}" type="button">Edit</button>
                          `
                          : ""
                      }
                      <button class="model-mode-caret-button" data-model-mode-toggle="${mode}" type="button" aria-expanded="${expanded}" aria-label="${expanded ? "Collapse" : "Expand"} ${modeConfig.label}">
                        <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  ${
                    expanded
                      ? `
                        <div class="model-mode-drawer-body ${cliMode ? "cli-mode-drawer-body" : ""}">
                          <form class="model-config-form ${cliMode ? "cli-mode-form" : ""}" id="modelConfigForm">
          ${isCliMode
            ? renderCliModeFields(activeModeConfig, activeTestDraft, editing, fieldErrors, status)
            : `
              ${renderModelDraftBanner(activeModeConfig, activeTestDraft, editing, status)}
              ${renderModelRunBanner(activeModeConfig, editing)}
              <div class="settings-field ${fieldErrors.baseUrl ? "has-error" : ""}">
                <label class="settings-label" for="modelBaseUrlInput">Base URL</label>
                ${
                  editing
                    ? `
                      <div class="settings-input-with-action">
                        <input class="settings-input" id="modelBaseUrlInput" name="baseUrl" autocomplete="off" placeholder="${providerDefaultBaseUrl(
                          activeModelProvider,
                          activeModelMode,
                        )}" value="${currentBaseUrlValue}" />
                        <button class="settings-input-action compact light-action ${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "text-action" : "icon-only"}" id="modelBaseUrlAction" type="button" aria-label="${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "Restore default Base URL" : "Clear Base URL"}">
                          ${
                            !currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl
                              ? "Default"
                              : `
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M6 6L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                  <path d="M14 6L6 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                              `
                          }
                        </button>
                      </div>
                      ${
                        editing && isLocalModelMode(activeModeConfig)
                          ? `
                            <div class="settings-inline-actions">
                              <button class="settings-input-action compact light-action" id="modelLoadButton" type="button">Load</button>
                            </div>
                            ${renderConnectionNote(activeTestDraft.result, activeTestDraft.status)}
                            ${renderLoadHint(activeModeConfig, activeTestDraft, editing)}
                          `
                          : ""
                      }
                    `
                    : currentBaseUrlValue
                      ? `<div class="settings-empty-block filled">${currentBaseUrlValue}</div>`
                      : '<div class="settings-empty-block">No Base URL is added ...</div>'
                }
              </div>
              ${
                "api_key" in activeModeConfig
                  ? `
                    <div class="settings-field ${fieldErrors.apiKey ? "has-error" : ""}">
                      <div class="settings-label-row">
                        <label class="settings-label" for="modelApiKeyInput">
                          API Key
                        </label>
                      </div>
                      ${
                        editing
                          ? `
                            <div class="settings-input-with-action ${activeTestDraft.locked ? "locked" : ""}">
                              <input class="settings-input" id="modelApiKeyInput" name="apiKey" type="password" autocomplete="off" placeholder="${
                              activeModeConfig.api_key_configured ? "Configured. Enter a new key to replace." : "Paste API key"
                            }" value="${activeTestDraft.locked ? (activeTestDraft.displayApiKey || "••••••••••••••••") : (activeTestDraft.apiKey || "")}" ${editing && !activeTestDraft.locked ? "" : "disabled"} />
                              ${
                                editing
                                  ? showRemove
                                    ? '<button class="settings-input-action danger compact" id="modelApiKeyRemove" type="button">Remove</button>'
                                    : !isCliMode
                                      ? '<button class="settings-input-action compact light-action" id="modelLoadButton" type="button">Load</button>'
                                    : ""
                                  : ""
                              }
                            </div>
                          `
                          : hasSavedApiKey(activeModeConfig)
                            ? '<div class="settings-empty-block filled">••••••••••••••••</div>'
                            : '<div class="settings-empty-block">No API Key is added ...</div>'
                      }
                      ${editing ? renderConnectionNote(activeTestDraft.result, activeTestDraft.status) : ""}
                      ${renderLoadHint(activeModeConfig, activeTestDraft, editing)}
                    </div>
                  `
                  : ""
              }
            `}
          ${
            showModelSelector
              ? `
                <div class="settings-field ${fieldErrors.models ? "has-error" : ""}">
                  <div class="settings-label-row">
                    <label class="settings-label" for="modelNameInput">${isCliMode ? "Model Name" : "Models"}</label>
                  </div>
                  ${
                    isCliMode
                      ? `
                        <input class="settings-input" id="modelNameInput" name="model" autocomplete="off" placeholder="${
                          activeModelProvider === "openai"
                            ? "gpt-4.1"
                            : activeModelProvider === "claude"
                              ? "claude-sonnet-4-20250514"
                              : activeModelProvider === "ollama"
                                ? "llama3.1"
                                : "deepseek-chat"
                        }" value="${activeModeConfig.model || ""}" ${editing ? "" : "disabled"} />
                      `
                      : `
                        <div class="model-picker">
                          ${
                            selectedModelItems.length || !isCliMode
                              ? `
                                <div class="model-selected-panel ${editing ? "" : "compact"}">
                                  <div class="model-selected-panel-head">
                                    <span class="model-selected-panel-title">Selected Models</span>
                                    <div class="model-selected-panel-actions">
                                      ${
                                        editing && invalidSelected.length
                                          ? '<button class="settings-label-link subtle model-selected-remove-old" id="modelSelectedRemoveOld" type="button">Remove old models</button>'
                                          : ""
                                      }
                                      ${
                                        selectedModelItems.length > 4
                                          ? `<button class="settings-label-link subtle model-selected-toggle" id="modelSelectedToggle" type="button">${modelSelectedListExpanded ? "Collapse" : "View all"}</button>`
                                          : ""
                                      }
                                    </div>
                                  </div>
                                  ${
                                    selectedModelItems.length
                                      ? `
                                        <div class="model-selected-chip-list ${modelSelectedListExpanded ? "expanded" : ""}">
                                          ${selectedModelItems
                                            .map((modelName) => {
                                              const invalid = invalidSelected.includes(modelName);
                                              return `
                                                <span class="model-selected-chip ${invalid ? "invalid" : ""}" ${invalid ? 'title="This model is not available in the latest loaded list."' : ""}>
                                                  <span>${modelName}</span>
                                                  ${invalid ? '<span class="model-selected-chip-status">unavailable</span>' : ""}
                                                </span>
                                              `;
                                            })
                                            .join("")}
                                        </div>
                                      `
                                      : `
                                        <div class="model-selected-empty">${
                                          editing
                                            ? "0 model is selected"
                                            : "No model is selected yet..."
                                        }</div>
                                      `
                                  }
                                </div>
                              `
                              : ""
                          }
                          ${
                            editing && activeTestDraft.loadedThisSession && activeTestDraft.models?.length
                              ? `
                                <button class="model-picker-trigger ${modelPickerOpen ? "open" : ""}" id="modelPickerTrigger" type="button" aria-expanded="${modelPickerOpen ? "true" : "false"}">
                                  <span class="model-picker-summary">Select models ...</span>
                                  <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                                </button>
                                ${
                                  modelPickerOpen
                                    ? `
                                      <div class="model-picker-menu">
                                        <input class="home-bot-search model-picker-search" id="modelPickerSearch" autocomplete="off" placeholder="Search model by name" />
                                        <div class="model-picker-toolbar">
                                          <span class="model-picker-toolbar-summary">${modelToolbarSummary(activeTestDraft)}</span>
                                          <button class="settings-label-link subtle model-picker-bulk-action" id="modelPickerBulkAction" type="button">${modelPickerBulkLabel}</button>
                                        </div>
                                        ${
                                          activeTestDraft.models?.length
                                            ? `
                                              <div class="model-select-list">
                                                ${
                                                  modelOptions.length
                                                    ? renderModelOptionGroups(modelOptionGroups, activeTestDraft)
                                                    : '<div class="target-item">No models match your search.</div>'
                                                }
                                              </div>
                                            `
                                            : '<div class="target-item model-picker-empty">Click Load to fetch available models.</div>'
                                        }
                                      </div>
                                    `
                                    : ""
                                }
                              `
                              : ""
                          }
                        </div>
                      `
                  }
                </div>
              `
              : ""
          }
          ${
            showSaveButton || showCancel
              ? `
                <div class="settings-actions model-config-actions">
                  <span class="settings-feedback" id="modelConfigFeedback"></span>
                  <div class="model-config-action-buttons">
                    ${showCancel ? '<button class="target-action secondary" id="modelConfigCancel" type="button">Cancel</button>' : ""}
                    ${showSaveButton ? '<button class="target-action" id="modelConfigSave" type="submit">Save</button>' : ""}
                  </div>
                </div>
              `
              : '<span class="settings-feedback sr-only" id="modelConfigFeedback"></span>'
          }
                          </form>
                        </div>
                      `
                      : ""
                  }
                </section>
              `;
            })
            .join("")}
        </div>
      </section>
    </div>
  `;

  bindModelProviderTabs();

  settingsPlaceholder.querySelectorAll("[data-model-mode-toggle]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextMode = tab.dataset.modelModeToggle || "";
      activeModelMode = nextMode;
      if (expandedModelMode === nextMode) {
        expandedModelMode = "";
        editingModelMode = "";
      } else {
        expandedModelMode = nextMode;
        editingModelMode = "";
      }
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-edit]").forEach((tab) => {
    tab.addEventListener("click", async () => {
      activeModelMode = tab.dataset.modelModeEdit || "";
      expandedModelMode = activeModelMode;
      const modeConfig = activeModelConfig()?.modes?.[activeModelMode] || {};
      if (isCliModelMode(modeConfig, activeModelProvider, activeModelMode)) {
        return;
      }
      const enterEdit = (nextModeConfig = modeConfig, overrides = {}) => {
        modelTestDrafts[modelModeDraftKey(activeModelProvider, activeModelMode)] = createModelTestDraft(nextModeConfig, {
          status: "",
          result: "",
          reason: "",
          loadedThisSession: false,
          ...overrides,
        });
        editingModelMode = activeModelMode;
        expandedModelMode = activeModelMode;
        modelPickerOpen = false;
        modelPickerSearch = "";
        modelSelectedListExpanded = false;
        renderSettings();
      };

      if ((isApiModelMode(modeConfig) || isCliModelMode(modeConfig, activeModelProvider, activeModelMode)) && isModelModeConfigured(modeConfig, activeModelProvider, activeModelMode)) {
        openRoleChoice({
          title: "Edit configured model?",
          copy: `${modeConfig.label} will move back to Draft and be disabled before editing. You can run it again after updating the settings.`,
          confirmLabel: "Continue to edit",
          cancelLabel: "Don't edit",
          defaultAction: "cancel",
          danger: true,
          onConfirm: async () => {
            closeRoleChoice();
            try {
              const selectedModels = [...(modeConfig.selected_models || [])];
              const nextModel = modeConfig.model || selectedModels[0] || "";
              await saveModelConfiguration(activeModelProvider, activeModelMode, {
                model: nextModel,
                baseUrl: modeConfig.base_url || "",
                cliPath: modeConfig.cli_path || "",
                workingDirectory: modeConfig.working_directory || "",
                apiKey: "",
                includeApiKey: false,
                selectedModels,
                configured: false,
                enabled: false,
                resumeEnabledOnRun: false,
              });
              const nextModeConfig = activeModelConfig()?.modes?.[activeModelMode] || modeConfig;
              enterEdit(nextModeConfig, { status: "", result: "", reason: "" });
            } catch (error) {
              const feedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
              if (feedback) {
                feedback.textContent = `Edit failed: ${error.message}`;
                feedback.dataset.tone = "error";
              }
            }
          },
        });
        return;
      }

      enterEdit();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModelMode = button.dataset.modelRunEdit || activeModelMode;
      expandedModelMode = activeModelMode;
      const modeConfig = activeModelConfig()?.modes?.[activeModelMode] || {};
      modelTestDrafts[modelModeDraftKey(activeModelProvider, activeModelMode)] = createModelTestDraft(modeConfig, {
        status: "",
        result: "",
        reason: "",
        loadedThisSession: false,
      });
      editingModelMode = activeModelMode;
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.modelRunDismiss || activeModelMode;
      const key = modelModeDraftKey(activeModelProvider, mode);
      lastModelRunResults[key] = {
        ...(lastModelRunResults[key] || {}),
        dismissed: true,
      };
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-draft-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.modelDraftDismiss || activeModelMode;
      const modeConfig = activeModelConfig()?.modes?.[mode] || {};
      const draft = modelTestDrafts[modelModeDraftKey(activeModelProvider, mode)] || createModelTestDraft(modeConfig);
      const issues = modelDraftIssues(modeConfig, draft, true);
      dismissedModelDraftBanners[modelModeDraftKey(activeModelProvider, mode)] = issues.join(" · ");
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-run]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mode = button.dataset.modelModeRun || "";
      activeModelMode = mode;
      expandedModelMode = mode;
      const providerConfig = activeModelConfig();
      const modeConfig = providerConfig?.modes?.[mode] || {};
      const selectedModels = [...(modeConfig.selected_models || [])];
      const savedValues = {
        model: isCliModelMode(modeConfig, activeModelProvider, mode) ? "" : modeConfig.model || selectedModels[0] || "",
        baseUrl: modeConfig.base_url || "",
        cliPath: modeConfig.cli_path || "",
        workingDirectory: modeConfig.working_directory || "",
        apiKey: "",
        includeApiKey: false,
        selectedModels,
      };
      if (isTerminalCliMode(modeConfig, activeModelProvider, mode)) {
        delete savedValues.cliPath;
        delete savedValues.workingDirectory;
      }
      const wasConfigured = isModelModeConfigured(modeConfig, activeModelProvider, mode);
      const draftKey = modelModeDraftKey(activeModelProvider, mode);
      if (isCliModelMode(modeConfig, activeModelProvider, mode)) {
        delete lastModelRunResults[draftKey];
        setFeedback("Running...");
        button.disabled = true;
        try {
          const result = await testModelConfiguration(activeModelProvider, mode, savedValues);
          await saveModelConfiguration(activeModelProvider, mode, {
            ...savedValues,
            configured: result.status === "connected",
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
            ...savedValues,
            result: result.message || "Connected.",
            status: result.status || "connected",
          });
          delete lastModelRunResults[draftKey];
          setFeedback("");
          renderSettings();
        } catch (error) {
          const friendlyMessage = classifyRunFailureMessage(error);
          await saveModelConfiguration(activeModelProvider, mode, {
            ...savedValues,
            configured: false,
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
            result: friendlyMessage,
            status: "error",
            reason: error.reason || "cli_not_found",
          });
          renderSettings();
        } finally {
          button.disabled = false;
        }
        return;
      }
      const missingRequirements =
        !savedValues.baseUrl
        || (isApiModelMode(modeConfig) && !hasSavedApiKey(modeConfig))
        || !selectedModels.length;

      delete lastModelRunResults[draftKey];
      setFeedback("Running...");
      button.disabled = true;
      try {
        if (missingRequirements) {
          const missingMessage = runMissingRequirementsMessage(savedValues, modeConfig);
          await saveModelConfiguration(activeModelProvider, mode, {
            model: savedValues.model,
            baseUrl: savedValues.baseUrl,
            apiKey: "",
            includeApiKey: false,
            selectedModels,
            configured: false,
            enabled: false,
            resumeEnabledOnRun: Boolean(modeConfig.resume_enabled_on_run),
          });
          modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
            selectedModels,
            reason: "required_fields_incomplete",
            result: missingMessage,
          });
          lastModelRunResults[draftKey] = {
            reason: "required_fields_incomplete",
            message: missingMessage,
            dismissed: false,
          };
          renderSettings();
          const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
          if (nextFeedback) {
            nextFeedback.textContent = "";
            delete nextFeedback.dataset.tone;
          }
          return;
        }

        const result = await testModelConfiguration(activeModelProvider, mode, savedValues);
        const models = result.models || [];
        modelTestDrafts[draftKey] = createModelTestDraft(modeConfig, {
          result: result.message || "Connected.",
          status: result.status || "connected",
          models,
          loadedThisSession: true,
          selectedModels,
        });

        const invalidSelected = selectedModels.filter((item) => !models.includes(item));
        const validForConfigured = Boolean(
          savedValues.baseUrl
          && (!isApiModelMode(modeConfig) || hasSavedApiKey(modeConfig))
          && selectedModels.length
          && !invalidSelected.length
          && result.status === "connected",
        );

        const nextTestReason = invalidSelected.length
          ? "selected_models_unavailable"
          : result.status === "no_quota"
            ? "no_quota"
            : validForConfigured
              ? ""
              : "required_fields_incomplete";
        await saveModelConfiguration(activeModelProvider, mode, {
          model: savedValues.model,
          baseUrl: savedValues.baseUrl,
          apiKey: "",
          includeApiKey: false,
          selectedModels,
          configured: validForConfigured,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        if (nextTestReason) {
          lastModelRunResults[draftKey] = {
            reason: nextTestReason,
            message: invalidSelected.length
              ? "Still draft. Remove old models that are no longer available."
              : result.status === "no_quota"
                ? "Still draft. This API key connected, but it has no available quota yet."
                : "Still draft. Complete Base URL, API key validation, and at least one valid model to finish setup.",
            dismissed: false,
          };
        } else {
          delete lastModelRunResults[draftKey];
        }

        modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
          result: result.message || "Connected.",
          status: result.status || "connected",
          reason: nextTestReason,
          models,
          loadedThisSession: true,
          selectedModels,
        });

        if (validForConfigured) {
          setFeedback("Configured. This model stays disabled until you enable it.", "success");
        } else if (invalidSelected.length) {
          setFeedback("Still draft. Remove old models that are no longer available.", "error");
        } else if (result.status === "no_quota") {
          setFeedback("Still draft. This API key connected, but it has no available quota yet.", "error");
        } else {
          setFeedback("Still draft. Complete Base URL, API key validation, and at least one valid model to finish setup.", "error");
        }
        renderSettings();
        const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
        if (nextFeedback) {
          nextFeedback.textContent = validForConfigured
            ? "Configured. This model stays disabled until you enable it."
            : "";
          if (validForConfigured) {
            nextFeedback.dataset.tone = "success";
          } else {
            delete nextFeedback.dataset.tone;
          }
        }
      } catch (error) {
        const friendlyMessage = classifyRunFailureMessage(error);
        modelTestDrafts[draftKey] = createModelTestDraft(modeConfig, {
          result: friendlyMessage,
          status: "error",
          reason: error.reason || "api_request_failed",
          loadedThisSession: false,
          selectedModels,
        });
        await saveModelConfiguration(activeModelProvider, mode, {
          model: savedValues.model,
          baseUrl: savedValues.baseUrl,
          apiKey: "",
          includeApiKey: false,
          selectedModels,
          configured: false,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        lastModelRunResults[draftKey] = {
          reason: error.reason || "api_request_failed",
          message: friendlyMessage,
          dismissed: false,
        };
        renderSettings();
        const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
        if (nextFeedback) {
          nextFeedback.textContent = "";
          delete nextFeedback.dataset.tone;
        }
      } finally {
        button.disabled = false;
      }
    });
  });

  const feedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
  const setFeedback = (message = "", tone = "") => {
    if (!feedback) return;
    feedback.textContent = message;
    if (tone) {
      feedback.dataset.tone = tone;
    } else {
      delete feedback.dataset.tone;
    }
  };
  settingsPlaceholder.querySelectorAll("[data-model-mode-enable]").forEach((toggle) => {
    toggle.addEventListener("click", async () => {
      const mode = toggle.dataset.modelModeEnable || "";
      const providerConfig = activeModelConfig();
      const modeConfig = providerConfig?.modes?.[mode] || {};
      toggle.disabled = true;
      try {
        await saveModelConfiguration(activeModelProvider, mode, {
          enabled: !modeConfig.enabled,
        });
        renderSettings();
      } catch (error) {
        setFeedback(`Update failed: ${error.message}`, "error");
      } finally {
        toggle.disabled = false;
      }
    });
  });

  const form = settingsPlaceholder.querySelector("#modelConfigForm");
  if (!form) {
    return;
  }
  const saveButton = settingsPlaceholder.querySelector("#modelConfigSave");
  const cancelButton = settingsPlaceholder.querySelector("#modelConfigCancel");
  const apiKeyRemoveButton = settingsPlaceholder.querySelector("#modelApiKeyRemove");
  const apiKeyInput = settingsPlaceholder.querySelector("#modelApiKeyInput");
  const baseUrlInput = settingsPlaceholder.querySelector("#modelBaseUrlInput");
  const baseUrlActionButton = settingsPlaceholder.querySelector("#modelBaseUrlAction");
  const modelPickerTrigger = settingsPlaceholder.querySelector("#modelPickerTrigger");
  const modelPickerSearchInput = settingsPlaceholder.querySelector("#modelPickerSearch");
  const modelPickerBulkAction = settingsPlaceholder.querySelector("#modelPickerBulkAction");
  const modelLoadButton = settingsPlaceholder.querySelector("#modelLoadButton");
  const collectValues = () => {
    const formData = new FormData(form);
    const draft = activeModelTestDraft();
    const apiKeyValue = String(formData.get("apiKey") || "").trim();
    const values = {
      model: String(formData.get("model") || "").trim(),
      apiKey: apiKeyValue || draft.apiKey || "",
      includeApiKey: Boolean(apiKeyValue || draft.apiKey),
      baseUrl: String(formData.get("baseUrl") || "").trim(),
      selectedModels: [...(draft.selectedModels || [])],
    };
    if (formData.has("cliPath")) {
      values.cliPath = String(formData.get("cliPath") || "").trim();
    }
    if (formData.has("workingDirectory")) {
      values.workingDirectory = String(formData.get("workingDirectory") || "").trim();
    }
    return values;
  };

  if (apiKeyInput) {
    apiKeyInput.addEventListener("input", () => {
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        locked: false,
        apiKey: apiKeyInput.value,
        displayApiKey: "",
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
    });
  }

  if (baseUrlActionButton && baseUrlInput) {
    baseUrlActionButton.addEventListener("click", () => {
      const defaultUrl = providerDefaultBaseUrl(activeModelProvider, activeModelMode);
      const currentValue = baseUrlInput.value.trim();
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        baseUrl: currentValue === defaultUrl ? "" : defaultUrl,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
      const nextBaseUrlInput = settingsPlaceholder.querySelector("#modelBaseUrlInput");
      if (nextBaseUrlInput) {
        nextBaseUrlInput.focus();
        nextBaseUrlInput.setSelectionRange(nextBaseUrlInput.value.length, nextBaseUrlInput.value.length);
      }
    });
  }

  if (baseUrlInput) {
    baseUrlInput.addEventListener("input", () => {
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        baseUrl: baseUrlInput.value,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
    });
  }

  if (apiKeyRemoveButton) {
    apiKeyRemoveButton.addEventListener("click", () => {
      const modeConfig = activeModelModeConfig();
      const persistedMode = Boolean(
        modeConfig?.base_url
        || hasSavedApiKey(modeConfig)
        || modeConfig?.selected_models?.length
        || modeConfig?.configured,
      );
      openRoleChoice({
        title: "Remove API key?",
        copy: persistedMode
          ? `The saved API key and model selection for ${activeModeConfig.label} will be removed, and this mode will return to Draft.`
          : `The loaded API key and selected models for ${activeModeConfig.label} will be removed.`,
        confirmLabel: "Remove",
        cancelLabel: "Don't remove",
        defaultAction: "cancel",
        danger: true,
        onConfirm: async () => {
          closeRoleChoice();
          setFeedback("Removing...");
          apiKeyRemoveButton.disabled = true;
          if (saveButton) saveButton.disabled = true;
          if (cancelButton) cancelButton.disabled = true;
          try {
            if (persistedMode) {
              await saveModelConfiguration(activeModelProvider, activeModelMode, {
                model: "",
                apiKey: "",
                includeApiKey: true,
                baseUrl: collectValues().baseUrl,
                selectedModels: [],
                configured: false,
                enabled: false,
                resumeEnabledOnRun: false,
              });
              delete modelTestDrafts[modelModeDraftKey()];
              editingModelMode = "";
              modelPickerOpen = false;
              modelPickerSearch = "";
              modelSelectedListExpanded = false;
              setFeedback("Removed.", "success");
              renderSettings();
              const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
              if (nextFeedback) {
                nextFeedback.textContent = "Removed.";
                nextFeedback.dataset.tone = "success";
              }
            } else {
              modelTestDrafts[modelModeDraftKey()] = {
                ...createModelTestDraft(activeModelModeConfig()),
                locked: false,
                apiKey: "",
                displayApiKey: "",
                selectedModels: [],
              };
              modelPickerOpen = false;
              modelPickerSearch = "";
              modelSelectedListExpanded = false;
              setFeedback("Removed.", "success");
              renderSettings();
            }
          } catch (error) {
            setFeedback(`Remove failed: ${error.message}`, "error");
          } finally {
            apiKeyRemoveButton.disabled = false;
            if (saveButton) saveButton.disabled = false;
            if (cancelButton) cancelButton.disabled = false;
          }
        },
      });
    });
  }

  if (modelPickerSearchInput) {
    modelPickerSearchInput.value = modelPickerSearch;
    modelPickerSearchInput.addEventListener("input", () => {
      modelPickerSearch = modelPickerSearchInput.value;
      renderSettings();
    });
  }

  if (modelPickerTrigger) {
    modelPickerTrigger.addEventListener("click", () => {
      modelPickerOpen = !modelPickerOpen;
      if (!modelPickerOpen) {
        modelPickerSearch = "";
      }
      renderSettings();
    });
  }

  const modelSelectedToggle = settingsPlaceholder.querySelector("#modelSelectedToggle");
  if (modelSelectedToggle) {
    modelSelectedToggle.addEventListener("click", () => {
      modelSelectedListExpanded = !modelSelectedListExpanded;
      renderSettings();
    });
  }

  const modelSelectedRemoveOld = settingsPlaceholder.querySelector("#modelSelectedRemoveOld");
  if (modelSelectedRemoveOld) {
    modelSelectedRemoveOld.addEventListener("click", () => {
      const draft = activeModelTestDraft();
      const invalid = new Set(invalidSelectedModels(draft));
      modelTestDrafts[modelModeDraftKey()] = {
        ...draft,
        selectedModels: (draft.selectedModels || []).filter((item) => !invalid.has(item)),
      };
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
    });
  }

  settingsPlaceholder.querySelectorAll("[data-model-choice]").forEach((input) => {
    input.addEventListener("change", () => {
      const changedModel = input.dataset.modelChoice;
      const checked = input.checked;
      const currentSelected = new Set(activeModelTestDraft().selectedModels || []);
      if (checked) {
        currentSelected.add(changedModel);
      } else {
        currentSelected.delete(changedModel);
      }
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        selectedModels: [...currentSelected],
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
    });
  });

  if (modelPickerBulkAction) {
    modelPickerBulkAction.addEventListener("click", () => {
      const draft = activeModelTestDraft();
      const nextSelectedModels = allVisibleSelected ? [] : [...modelOptions];
      modelTestDrafts[modelModeDraftKey()] = {
        ...draft,
        selectedModels: nextSelectedModels,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
    });
  }

  const runApiTest = async () => {
    modelTestDrafts[modelModeDraftKey()] = {
      ...activeModelTestDraft(),
      result: "Testing and loading ...",
      status: "testing",
    };
    renderSettings();
    const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
    if (nextFeedback) {
      nextFeedback.textContent = "";
      delete nextFeedback.dataset.tone;
    }
    if (saveButton) saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    try {
      const values = collectValues();
      const result = await testModelConfiguration(activeModelProvider, activeModelMode, values);
      const currentDraft = activeModelTestDraft();
      const models = result.models || [];
      modelTestDrafts[modelModeDraftKey()] = {
        ...currentDraft,
        model: values.model,
        baseUrl: values.baseUrl,
        locked: Boolean(values.apiKey || currentDraft.displayApiKey || currentDraft.locked),
        apiKey: values.apiKey,
        displayApiKey:
          values.apiKey || currentDraft.displayApiKey ? "••••••••••••••••" : "",
        result: result.message || "Connected.",
        status: result.status || "connected",
        models,
        loadedThisSession: Boolean(models.length) || result.status === "connected" || result.status === "no_quota",
      };
      if ("cliPath" in values || "workingDirectory" in values) {
        modelTestDrafts[modelModeDraftKey()] = {
          ...modelTestDrafts[modelModeDraftKey()],
          cliPath: values.cliPath,
          workingDirectory: values.workingDirectory,
        };
      }
      modelPickerOpen = Boolean(models.length);
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
      const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
      if (nextFeedback) {
        nextFeedback.textContent = "";
        delete nextFeedback.dataset.tone;
      }
    } catch (error) {
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        result: `Test failed: ${error.message}`,
        status: "error",
        loadedThisSession: false,
      };
      renderSettings();
      setFeedback("");
    } finally {
      const nextSaveButton = settingsPlaceholder.querySelector("#modelConfigSave");
      const nextCancelButton = settingsPlaceholder.querySelector("#modelConfigCancel");
      if (nextSaveButton) nextSaveButton.disabled = false;
      if (nextCancelButton) nextCancelButton.disabled = false;
    }
  };

  if (modelLoadButton) {
    modelLoadButton.addEventListener("click", async () => {
      const modeConfig = activeModelModeConfig();
      if (isCliModelMode(modeConfig, activeModelProvider, activeModelMode)) {
        modelTestDrafts[modelModeDraftKey()] = {
          ...activeModelTestDraft(),
          result: "Testing local CLI ...",
          status: "testing",
        };
        renderSettings();
        const nextButton = settingsPlaceholder.querySelector("#modelLoadButton");
        if (nextButton) nextButton.disabled = true;
        try {
          const values = collectValues();
          const result = await testModelConfiguration(activeModelProvider, activeModelMode, values);
          await saveModelConfiguration(activeModelProvider, activeModelMode, {
            ...values,
            model: "",
            selectedModels: [],
            configured: result.status === "connected",
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[modelModeDraftKey()] = createModelTestDraft(activeModelConfig()?.modes?.[activeModelMode] || modeConfig, {
            result: result.message || "Connected.",
            status: result.status || "connected",
          });
          delete lastModelRunResults[modelModeDraftKey()];
          editingModelMode = "";
          setFeedback("Configured. This CLI mode stays disabled until you enable it.", "success");
          renderSettings();
        } catch (error) {
          await saveModelConfiguration(activeModelProvider, activeModelMode, {
            ...collectValues(),
            model: "",
            selectedModels: [],
            configured: false,
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[modelModeDraftKey()] = {
            ...activeModelTestDraft(),
            result: `Test failed: ${error.message}`,
            status: "error",
            reason: error.reason || "cli_not_found",
          };
          renderSettings();
        }
        return;
      }
      await runApiTest();
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      delete modelTestDrafts[modelModeDraftKey()];
      editingModelMode = "";
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = collectValues();
    setFeedback("Saving...");
    if (saveButton) saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    try {
      await saveModelConfiguration(activeModelProvider, activeModelMode, {
        ...values,
        model: isCliMode ? values.model : values.selectedModels[0],
        configured: false,
        enabled: false,
      });
      delete lastModelRunResults[modelModeDraftKey()];
      editingModelMode = "";
      delete modelTestDrafts[modelModeDraftKey()];
      const saveMessage = "Saved.";
      setFeedback(saveMessage, "success");
      renderSettings();
      const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
      if (nextFeedback) {
        nextFeedback.textContent = saveMessage;
        nextFeedback.dataset.tone = "success";
      }
    } catch (error) {
      setFeedback(`Save failed: ${error.message}`, "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  });
}

function workerDisplayState(botId, bot) {
  if (!bot.enabled) {
    return { label: "disabled", tone: "" };
  }

  const worker = telegramWorkerStatus(botId);
  if (worker.state === "conflict") {
    return { label: "conflict", tone: "error" };
  }
  if (worker.state === "retrying") {
    return { label: "retrying", tone: "warning" };
  }
  if (worker.state === "running") {
    return { label: "listening", tone: "success" };
  }
  if (worker.state === "stopped") {
    return { label: "stopped", tone: "" };
  }
  return { label: "pending", tone: "warning" };
}

function enabledBotWorkerStates() {
  return Object.entries(telegramBots())
    .filter(([, bot]) => bot.enabled)
    .map(([botId]) => telegramWorkerStatus(botId).state || "pending");
}

function hasBotWorkerError() {
  return enabledBotWorkerStates().some((item) => item === "conflict");
}

function activeAccessBot() {
  const bots = telegramBots();
  if (!bots[activeAccessBotId]) {
    activeAccessBotId = Object.keys(bots)[0] || "";
  }
  return bots[activeAccessBotId] || emptyTelegramBot();
}

function ownerTarget() {
  const bot = firstTelegramBotEntry()[1] || emptyTelegramBot();
  return normalizeTargetRecords(bot.allowed?.chats || [], "chat").find(
    (target) => target.role === "owner",
  );
}

function normalizeTargetRecords(records, type) {
  return (records || [])
    .map((record, index) => {
      const id = typeof record === "object" ? record.id : record;
      if (!id) return null;
      return {
        id: String(id),
        role: normalizeApprovalRole(
          typeof record === "object" && record.role
            ? record.role
            : index === 0 && type === "chat"
              ? "owner"
              : "admin",
        ),
        enabled: typeof record === "object" && "enabled" in record ? Boolean(record.enabled) : true,
        added_at: typeof record === "object" && record.added_at ? record.added_at : new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function sortTargetRecords(records) {
  return [...records].sort((a, b) => {
    if (normalizeApprovalRole(a.role) === "owner" && normalizeApprovalRole(b.role) !== "owner") return -1;
    if (normalizeApprovalRole(a.role) !== "owner" && normalizeApprovalRole(b.role) === "owner") return 1;
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return new Date(b.added_at || 0) - new Date(a.added_at || 0);
  });
}

function renderSettingsView() {
  telegramSettings.hidden = true;
  serviceConfigSettings.hidden = true;
  messageSettings.hidden = true;
  settingsPlaceholder.hidden = true;

  const messageMatch = messageSettingsViewMatch(activeSettingsView);
  if (messageMatch) {
    activeMessageServiceId = messageMatch[1];
    activeMessageSettingsTab = messageMatch[2];
    if (activeMessageServiceId === "telegram") {
      renderMessageSettings();
    } else {
      renderLarkMessageSettings();
    }
    return;
  }

  if (activeSettingsView === "service") {
    serviceConfigSettings.hidden = false;
    renderServiceConfiguration();
    return;
  }

  if (activeSettingsView === "model") {
    renderModelConfiguration();
    return;
  }

  if (activeSettingsView === "messages") {
    renderMessageSettings();
    return;
  }

  if (activeSettingsView !== "telegram") {
    telegramSettings.hidden = true;
    settingsPlaceholder.hidden = false;
    const copy = {
      lark: "Lark service is not configured yet.",
    }[activeSettingsView];
    settingsPlaceholder.innerHTML = `
      <h3>${activeSettingsView === "lark" ? "Lark" : "Service Configuration"}</h3>
      <div class="placeholder-card">${copy}</div>
    `;
    return;
  }

  settingsPlaceholder.hidden = true;
  telegramSettings.hidden = false;
  renderTelegramSettings();
}

function renderLarkMessageSettings() {
  settingsPlaceholder.hidden = false;
  const viewLabel = activeMessageSettingsTab === "command-flows"
    ? "Command flows"
    : messageTemplateGroup(activeMessageSettingsTab)?.title || "Messages";
  settingsPlaceholder.innerHTML = `
    <div class="message-settings-empty">
      <h3>Lark ${viewLabel}</h3>
      <div class="placeholder-card">
        Lark ${viewLabel.toLowerCase()} settings are not configured yet.
      </div>
    </div>
  `;
}

function messageTemplateGroup(groupId = activeMessageSettingsTab) {
  return TELEGRAM_MESSAGE_TEMPLATE_GROUPS.find((group) => group.id === groupId) || null;
}

function messageSettingsSectionTitle(tabId = activeMessageSettingsTab) {
  if (tabId === "command-flows") return "Command flows";
  return messageTemplateGroup(tabId)?.title || "Messages";
}

function renderMessageSettings() {
  messageSettings.hidden = false;
  const validMessageTabs = new Set(["command-flows", "status", "access", "role"]);
  if (!validMessageTabs.has(activeMessageSettingsTab)) {
    activeMessageSettingsTab = "command-flows";
  }
  if (messageSettingsHeading) {
    messageSettingsHeading.textContent = messageSettingsSectionTitle(activeMessageSettingsTab);
  }
  updateMessageSettingsStatus();
  messageSettingsPanels.forEach((panel) => {
    const isCommandPanel = panel.dataset.messageSettingsPanel === "commands";
    const isMessagePanel = panel.dataset.messageSettingsPanel === "messages";
    panel.hidden = activeMessageSettingsTab === "command-flows" ? !isCommandPanel : !isMessagePanel;
  });
  const savedMessages = state.settings?.services?.telegram?.messages || {};
  const messages = { ...savedMessages, ...draftTelegramMessages };
  const commands = state.settings?.services?.telegram?.commands || {};
  const commandDescriptions = state.settings?.services?.telegram?.command_descriptions || {};
  renderMessageCommandList(commands, commandDescriptions);
  renderMessageTemplateGroups(messages, activeMessageSettingsTab);
  commandTemplateInputs.forEach((input) => {
    const key = input.dataset.commandKey;
    input.value = commands[key] || TELEGRAM_COMMAND_FALLBACKS[key] || "";
  });
  messageSettingsForm.querySelectorAll("[data-message-key]").forEach((input) => {
    const key = input.dataset.messageKey;
    input.value = messages[key] || TELEGRAM_MESSAGE_FALLBACKS[key] || "";
  });
}

function createMessageTemplateRow(item, messages = {}) {
  const row = document.createElement("details");
  row.className = "message-reply-row";
  row.dataset.messageTemplateKey = item.key;

  const summary = document.createElement("summary");
  summary.className = "message-reply-summary";

  const main = document.createElement("span");
  main.className = "message-reply-summary-main";
  const title = document.createElement("strong");
  title.textContent = item.title;
  const subtitle = document.createElement("span");
  subtitle.textContent = item.subtitle;
  main.append(title, subtitle);

  const toggle = document.createElement("span");
  toggle.className = "message-command-toggle";
  toggle.setAttribute("aria-hidden", "true");
  toggle.textContent = "Expand";
  summary.append(main, toggle);

  const drawer = document.createElement("div");
  drawer.className = "message-reply-drawer";
  const editor = document.createElement("div");
  editor.className = "message-reply-editor";
  const field = document.createElement("label");
  field.className = "message-reply-content-field";
  const label = document.createElement("span");
  label.className = "settings-label";
  label.textContent = "Message";
  const textarea = document.createElement("textarea");
  textarea.className = "settings-input message-template-input";
  textarea.dataset.messageKey = item.key;
  textarea.rows = 1;
  textarea.value = messages[item.key] || TELEGRAM_MESSAGE_FALLBACKS[item.key] || "";
  field.append(label, textarea);
  const save = document.createElement("button");
  save.className = "message-command-action-button primary message-reply-inline-save";
  save.dataset.saveMessageReply = item.key;
  save.type = "button";
  save.textContent = "Save";
  save.disabled = !messageTemplateHasChanges(item.key, textarea.value);
  editor.append(field, save);
  drawer.append(editor);

  const feedback = document.createElement("div");
  feedback.className = "message-reply-feedback";
  feedback.dataset.messageReplyFeedback = item.key;
  feedback.setAttribute("role", "status");
  drawer.append(feedback);

  if (item.placeholders?.length) {
    const placeholders = document.createElement("div");
    placeholders.className = "message-template-placeholders";
    const placeholderLabel = document.createElement("span");
    placeholderLabel.className = "settings-label";
    placeholderLabel.textContent = "Placeholders";
    const chips = document.createElement("span");
    chips.className = "message-template-placeholder-chips";
    item.placeholders.forEach((placeholder) => {
      const chip = document.createElement("code");
      chip.textContent = placeholder;
      chips.append(chip);
    });
    placeholders.append(placeholderLabel, chips);
    drawer.append(placeholders);
  }

  row.append(summary, drawer);
  return row;
}

let messageReplyFeedbackTimer = 0;

function showMessageReplyFeedback(key, message, tone = "success", timeout = 2400) {
  const feedback = messageSettingsForm?.querySelector(`[data-message-reply-feedback="${key}"]`);
  if (!feedback) return;
  window.clearTimeout(messageReplyFeedbackTimer);
  feedback.textContent = message;
  feedback.dataset.tone = tone;
  if (tone === "error") return;
  messageReplyFeedbackTimer = window.setTimeout(() => {
    if (feedback.textContent === message) {
      feedback.textContent = "";
      feedback.removeAttribute("data-tone");
    }
  }, timeout);
}

function messageReplyPlaceholders(key, value = "") {
  const configured = TELEGRAM_MESSAGE_TEMPLATE_GROUPS
    .flatMap((group) => group.items || [])
    .find((item) => item.key === key)?.placeholders;
  if (configured?.length) return configured;
  const matches = `${value || ""} ${TELEGRAM_MESSAGE_FALLBACKS[key] || ""}`.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return [...new Set(matches)];
}

function createInlineMessageReplyEditor({ key, label, value, rows = 1 }) {
  const card = document.createElement("div");
  card.className = "message-command-reply-card";
  if (label) {
    const heading = document.createElement("div");
    heading.className = "message-command-reply-heading";
    heading.textContent = label;
    card.append(heading);
  }

  const editor = document.createElement("div");
  editor.className = "message-reply-editor";
  const field = document.createElement("label");
  field.className = "message-reply-content-field";
  const fieldLabel = document.createElement("span");
  fieldLabel.className = "settings-label";
  fieldLabel.textContent = "Message";
  const textarea = document.createElement("textarea");
  textarea.className = "settings-input message-template-input";
  textarea.dataset.messageKey = key;
  textarea.dataset.originalMessageValue = value;
  textarea.rows = rows;
  textarea.value = value;
  field.append(fieldLabel, textarea);
  const save = document.createElement("button");
  save.className = "message-command-action-button primary message-reply-inline-save";
  save.dataset.saveMessageReply = key;
  save.type = "button";
  save.textContent = "Save";
  save.disabled = !messageTemplateHasChanges(key, value);
  editor.append(field, save);
  card.append(editor);

  const feedback = document.createElement("div");
  feedback.className = "message-reply-feedback";
  feedback.dataset.messageReplyFeedback = key;
  feedback.setAttribute("role", "status");
  card.append(feedback);

  const placeholders = messageReplyPlaceholders(key, value);
  if (placeholders.length) {
    const placeholderBlock = document.createElement("div");
    placeholderBlock.className = "message-template-placeholders";
    const placeholderLabel = document.createElement("span");
    placeholderLabel.className = "settings-label";
    placeholderLabel.textContent = "Placeholders";
    const chips = document.createElement("span");
    chips.className = "message-template-placeholder-chips";
    placeholders.forEach((placeholder) => {
      const chip = document.createElement("code");
      chip.textContent = placeholder;
      chips.append(chip);
    });
    placeholderBlock.append(placeholderLabel, chips);
    card.append(placeholderBlock);
  }
  return card;
}

function renderMessageTemplateGroups(messages = {}, groupId = activeMessageSettingsTab) {
  if (!messageTemplateGroups) return;
  const openKeys = new Set(
    [...messageTemplateGroups.querySelectorAll(".message-reply-row[open]")]
      .map((row) => row.dataset.messageTemplateKey)
      .filter(Boolean),
  );
  messageTemplateGroups.replaceChildren();
  const groups = groupId === "command-flows"
    ? []
    : TELEGRAM_MESSAGE_TEMPLATE_GROUPS.filter((group) => group.id === groupId);
  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "message-template-group";
    const list = document.createElement("div");
    list.className = "message-reply-list";
    let items = group.items;
    if (group.id === "status") {
      items = group.items.filter((item) => {
        const tags = item.tags || [];
        if (activeStatusMessageTarget === "service") return tags.includes("Service");
        if (activeStatusMessageTarget === "bot") return tags.includes("Bot");
        return tags.includes("User") || tags.includes("Channel");
      });
      const tabs = document.createElement("div");
      tabs.className = "message-template-target-tabs";
      tabs.dataset.targetTabsVariant = "status";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "Status & Availability target type");
      [
        ["service", "Service"],
        ["bot", "Bot"],
        ["user-channel", "User & Channel"],
      ].forEach(([target, label]) => {
        const tab = document.createElement("button");
        const active = activeStatusMessageTarget === target;
        tab.className = `message-template-target-tab ${active ? "active" : ""}`;
        tab.type = "button";
        tab.dataset.statusMessageTargetTab = target;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(active));
        tab.textContent = label;
        tabs.append(tab);
      });
      section.append(tabs);
    } else if (group.id === "access") {
      items = group.items.filter((item) => {
        const tags = item.tags || [];
        return activeAccessMessageTarget === "channel"
          ? tags.includes("Channel")
          : !tags.includes("Channel");
      });
      const tabs = document.createElement("div");
      tabs.className = "message-template-target-tabs";
      tabs.dataset.targetTabsVariant = "access";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "Access Control target type");
      ["chat", "channel"].forEach((target) => {
        const tab = document.createElement("button");
        const active = activeAccessMessageTarget === target;
        tab.className = `message-template-target-tab ${active ? "active" : ""}`;
        tab.type = "button";
        tab.dataset.messageTargetTab = target;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(active));
        tab.textContent = target === "chat" ? "Chat" : "Channel";
        tabs.append(tab);
      });
      section.append(tabs);
    }
    items.forEach((item) => {
      const row = createMessageTemplateRow(item, messages);
      if (openKeys.has(item.key)) row.open = true;
      const toggle = row.querySelector(".message-command-toggle");
      if (toggle) toggle.textContent = row.open ? "Collapse" : "Expand";
      list.append(row);
    });
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "placeholder-card message-template-empty";
      empty.textContent = "No templates in this section.";
      list.append(empty);
    }
    section.append(list);
    messageTemplateGroups.append(section);
  });
  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "placeholder-card message-template-empty";
    empty.textContent = "No message templates in this section.";
    messageTemplateGroups.append(empty);
  }
}

function updateMessageSettingsStatus(syncState = "") {
  if (messageDraftStatus) {
    messageDraftStatus.textContent = messageCommandDraftActive ? "Unsaved draft" : "Draft";
    messageDraftStatus.classList.toggle("active", messageCommandDraftActive);
  }
  if (messageSyncStatus) {
    messageSyncStatus.textContent = syncState || "Sync manually";
    messageSyncStatus.classList.toggle("active", syncState === "Synced to Telegram");
  }
}

function markMessageSettingsDirty() {
  if (messageDraftStatus) {
    messageDraftStatus.textContent = "Unsaved draft";
    messageDraftStatus.classList.add("active");
  }
  if (messageSyncStatus) {
    messageSyncStatus.textContent = "Sync after save";
    messageSyncStatus.classList.remove("active");
  }
}

function showMessageSettingsFeedback(message, tone = "info", timeout = 3200) {
  if (!messageSettingsFeedback) return;
  window.clearTimeout(messageFeedbackTimer);
  const icons = {
    info: "i",
    warning: "!",
    success: "✓",
    error: "×",
  };
  const icon = icons[tone] || icons.info;
  messageSettingsFeedback.replaceChildren();
  messageSettingsFeedback.dataset.tone = tone;
  if (!message) {
    messageSettingsFeedback.removeAttribute("data-tone");
    return;
  }
  const iconEl = document.createElement("span");
  iconEl.className = "message-feedback-icon";
  iconEl.textContent = icon;
  const textEl = document.createElement("span");
  textEl.className = "message-feedback-text";
  textEl.textContent = message;
  messageSettingsFeedback.append(iconEl, textEl);
  if (tone === "error") return;
  messageFeedbackTimer = window.setTimeout(() => {
    if (messageSettingsFeedback.querySelector(".message-feedback-text")?.textContent === message) {
      messageSettingsFeedback.replaceChildren();
      messageSettingsFeedback.removeAttribute("data-tone");
    }
  }, timeout);
}

function switchMessageSettingsTab(tabId) {
  collectMessageCommandSettings();
  activeMessageSettingsTab = tabId || "commands";
  renderMessageSettings();
}

function collectMessageCommandSettings({ commitDraft = true } = {}) {
  const commands = {};
  const commandDescriptions = {};
  const customCommands = [];
  const commandOrder = [];
  const commandRegistry = [];
  if (!messageCommandList) {
    return { commands, commandDescriptions, customCommands, commandOrder, commandRegistry };
  }
  messageCommandList.querySelectorAll(".message-command-row").forEach((row, index) => {
    const key = row.dataset.commandKey || `custom_${index + 1}`;
    const command = row.querySelector('[data-command-role="command"]')?.value || "";
    const description = row.querySelector('[data-command-role="description"]')?.value || "";
    const builtIn = row.dataset.builtIn === "true";
    const status = row.dataset.commandStatus || "";
    commandOrder.push(key);
    commandRegistry.push({
      key,
      command,
      description,
      built_in: builtIn,
      ...(status === "delete" ? { status } : {}),
    });
    if (builtIn) {
      commands[key] = command;
      commandDescriptions[key] = description;
    } else {
      customCommands.push({
        key,
        command,
        description,
      });
    }
  });
  if (commitDraft) {
    draftTelegramCommands = commands;
    draftTelegramCommandDescriptions = commandDescriptions;
    draftCustomTelegramCommands = customCommands;
    draftTelegramCommandOrder = commandOrder;
    draftTelegramCommandRegistry = commandRegistry;
    messageCommandDraftActive = true;
  }
  return { commands, commandDescriptions, customCommands, commandOrder, commandRegistry };
}

function clearMessageCommandDraft() {
  messageCommandDraftActive = false;
  draftCustomTelegramCommands = [];
  draftTelegramCommands = {};
  draftTelegramCommandDescriptions = {};
  draftTelegramCommandOrder = [];
  draftTelegramCommandRegistry = [];
  draftTelegramMessages = {};
}

function collectMessageTemplateDrafts() {
  const messages = {};
  messageSettingsForm.querySelectorAll("[data-message-key]").forEach((input) => {
    messages[input.dataset.messageKey] = input.value;
  });
  return messages;
}

function savedMessageTemplateValue(key) {
  return state.settings?.services?.telegram?.messages?.[key] || TELEGRAM_MESSAGE_FALLBACKS[key] || "";
}

function messageTemplateHasChanges(key, value) {
  return String(value ?? "") !== savedMessageTemplateValue(key);
}

function updateMessageTemplateSaveButton(key) {
  const input = messageSettingsForm?.querySelector(`[data-message-key="${key}"]`);
  const button = messageSettingsForm?.querySelector(`[data-save-message-reply="${key}"]`);
  if (!input || !button) return;
  button.disabled = !messageTemplateHasChanges(key, input.value);
}

function updateMessageTemplateSaveButtons() {
  messageSettingsForm?.querySelectorAll("[data-save-message-reply]").forEach((button) => {
    updateMessageTemplateSaveButton(button.dataset.saveMessageReply || "");
  });
}

function normalizeMessageCommandSnapshot(snapshot = {}) {
  const registry = Array.isArray(snapshot.commandRegistry)
    ? snapshot.commandRegistry
    : state.settings?.services?.telegram?.command_registry;
  const fallbackKeys = Object.keys(TELEGRAM_COMMAND_FALLBACKS);
  const commands = {};
  const descriptions = {};
  const registryBuiltIns = Array.isArray(registry)
    ? registry.filter((item) => item?.built_in !== false)
    : fallbackKeys.map((key) => ({
      key,
      command: snapshot.commands?.[key] || TELEGRAM_COMMAND_FALLBACKS[key],
      description: snapshot.commandDescriptions?.[key] || TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS[key],
    }));
  registryBuiltIns.forEach((item) => {
    const key = String(item.key || "");
    if (!key) return;
    commands[key] = String(snapshot.commands?.[key] || item.command || TELEGRAM_COMMAND_FALLBACKS[key] || "");
    descriptions[key] = String(
      snapshot.commandDescriptions?.[key]
      || item.description
      || TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS[key]
      || "",
    );
  });
  const customSource = Array.isArray(registry)
    ? registry.filter((item) => item?.built_in === false)
    : snapshot.customCommands || [];
  const customCommands = customSource.map((item) => ({
    key: String(item.key || ""),
    command: String(item.command || ""),
    description: String(item.description || ""),
    ...(item.status ? { status: String(item.status) } : {}),
  }));
  const defaultOrder = [
    ...registryBuiltIns.map((item) => item.key).filter(Boolean),
    ...customCommands.map((item) => item.key).filter(Boolean),
  ];
  const commandOrder = (snapshot.commandOrder?.length ? snapshot.commandOrder : defaultOrder)
    .map((item) => String(item || ""))
    .filter(Boolean);
  return {
    commands,
    commandDescriptions: descriptions,
    customCommands,
    commandOrder,
    commandRegistry: [
      ...registryBuiltIns.map((item) => ({
        key: String(item.key || ""),
        command: String(commands[item.key] || item.command || ""),
        description: String(descriptions[item.key] || item.description || ""),
        built_in: true,
        ...(item.status ? { status: String(item.status) } : {}),
      })),
      ...customCommands.map((item) => ({ ...item, built_in: false })),
    ],
  };
}

function savedMessageCommandSnapshot() {
  const telegram = state.settings?.services?.telegram || {};
  return normalizeMessageCommandSnapshot({
    commands: telegram.commands || {},
    commandDescriptions: telegram.command_descriptions || {},
    customCommands: telegram.custom_commands || [],
    commandOrder: telegram.command_order || [],
    commandRegistry: telegram.command_registry || [],
  });
}

function syncedMessageCommandSnapshot() {
  const rawSnapshot = state.settings?.services?.telegram?.command_sync?.snapshot || "";
  if (!rawSnapshot) return null;
  try {
    const commandRegistry = JSON.parse(rawSnapshot);
    if (!Array.isArray(commandRegistry)) return null;
    return normalizeMessageCommandSnapshot({ commandRegistry });
  } catch (_error) {
    return null;
  }
}

function messageCommandItemsByKey(snapshot = {}) {
  const items = new Map();
  (snapshot.commandRegistry || []).forEach((item) => {
    if (!item?.key) return;
    items.set(item.key, {
      key: item.key,
      command: item.command || "",
      description: item.description || "",
      builtIn: Boolean(item.built_in),
      status: item.status || "",
    });
  });
  return items;
}

function messageCommandItemSignature(item = {}) {
  return JSON.stringify({
    built_in: Boolean(item.builtIn ?? item.built_in),
    command: item.command || "",
    description: item.description || "",
    key: item.key || "",
  });
}

function messageCommandSnapshotSignature(snapshot = savedMessageCommandSnapshot()) {
  const itemsByKey = new Map();
  const registryItems = (snapshot.commandRegistry?.length
    ? snapshot.commandRegistry
    : [
      ...Object.keys(TELEGRAM_COMMAND_FALLBACKS).map((key) => ({
        built_in: true,
        command: snapshot.commands[key] || TELEGRAM_COMMAND_FALLBACKS[key] || "",
        description: snapshot.commandDescriptions[key] || TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS[key] || "",
        key,
      })),
      ...(snapshot.customCommands || []).map((item) => ({ ...item, built_in: false })),
    ]
  ).filter((item) => item.status !== "delete");
  registryItems.forEach((item) => {
    itemsByKey.set(item.key, {
      built_in: Boolean(item.built_in),
      command: item.command || "",
      description: item.description || "",
      key: item.key,
    });
  });
  const order = (snapshot.commandOrder?.length ? snapshot.commandOrder : [...itemsByKey.keys()])
    .filter((key, index, list) => itemsByKey.has(key) && list.indexOf(key) === index);
  return JSON.stringify(order.map((key) => itemsByKey.get(key)));
}

function messageCommandsAreSynced() {
  const syncedSnapshot = state.settings?.services?.telegram?.command_sync?.snapshot || "";
  if (!syncedSnapshot) return false;
  return syncedSnapshot === messageCommandSnapshotSignature();
}

function messageTemplateDraftsAreDirty(messages = draftTelegramMessages) {
  const savedMessages = state.settings?.services?.telegram?.messages || {};
  return Object.entries(messages).some(([key, value]) => {
    return value !== (savedMessages[key] || TELEGRAM_MESSAGE_FALLBACKS[key] || "");
  });
}

function hasUnsavedMessageCommandChanges() {
  const current = normalizeMessageCommandSnapshot(collectMessageCommandSettings({ commitDraft: false }));
  const saved = savedMessageCommandSnapshot();
  const dirty = JSON.stringify(current) !== JSON.stringify(saved)
    || messageTemplateDraftsAreDirty({ ...draftTelegramMessages, ...collectMessageTemplateDrafts() });
  if (!dirty) {
    clearMessageCommandDraft();
  }
  return dirty;
}

function moveMessageCommand(commandKey, direction) {
  collectMessageCommandSettings();
  const index = draftTelegramCommandOrder.indexOf(commandKey);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= draftTelegramCommandOrder.length) return;
  const nextOrder = [...draftTelegramCommandOrder];
  [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
  draftTelegramCommandOrder = nextOrder;
  messageCommandDraftActive = true;
  renderMessageSettings();
}

function reorderMessageCommandByDrag(sourceKey, targetKey, placement = "before") {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return;
  collectMessageCommandSettings();
  const nextOrder = draftTelegramCommandOrder.filter((key) => key !== sourceKey);
  const targetIndex = nextOrder.indexOf(targetKey);
  if (targetIndex < 0) return;
  nextOrder.splice(placement === "after" ? targetIndex + 1 : targetIndex, 0, sourceKey);
  draftTelegramCommandOrder = nextOrder;
  messageCommandDraftActive = true;
  renderMessageSettings();
  markMessageSettingsDirty();
}

function saveMessageCommandDraft(commandKey) {
  const row = messageCommandList?.querySelector(`.message-command-row[data-command-key="${CSS.escape(commandKey)}"]`);
  const originalCommand = row?.dataset.originalCommand || "";
  const originalDescription = row?.dataset.originalDescription || "";
  const command = row?.querySelector('[data-command-role="command"]')?.value || "";
  const description = row?.querySelector('[data-command-role="description"]')?.value || "";
  const replyChanged = [...(row?.querySelectorAll("[data-message-key]") || [])].some((input) => {
    return input.value !== (input.dataset.originalMessageValue || "");
  });
  if (command === originalCommand && description === originalDescription && !replyChanged) {
    return;
  }
  collectMessageCommandSettings();
  draftTelegramMessages = { ...draftTelegramMessages, ...collectMessageTemplateDrafts() };
  messageCommandDraftActive = true;
  showMessageSettingsFeedback("Command draft saved. Sync commands when you are ready.", "success");
  renderMessageSettings();
  const nextRow = messageCommandList?.querySelector(`.message-command-row[data-command-key="${CSS.escape(commandKey)}"]`);
  if (nextRow) {
    nextRow.open = false;
    const toggle = nextRow.querySelector(".message-command-toggle");
    if (toggle) toggle.textContent = "Expand";
  }
  markMessageSettingsDirty();
}

function cancelMessageCommandDraft(commandKey) {
  const row = messageCommandList?.querySelector(`.message-command-row[data-command-key="${CSS.escape(commandKey)}"]`);
  if (!row) return;
  const saved = savedMessageCommandSnapshot();
  if (row.dataset.builtIn === "true") {
    const commandInput = row.querySelector('[data-command-role="command"]');
    const descriptionInput = row.querySelector('[data-command-role="description"]');
    const savedMessages = state.settings?.services?.telegram?.messages || {};
    if (commandInput) commandInput.value = saved.commands[commandKey] || TELEGRAM_COMMAND_FALLBACKS[commandKey] || "";
    if (descriptionInput) {
      descriptionInput.value = saved.commandDescriptions[commandKey] || TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS[commandKey] || "";
    }
    row.querySelectorAll("[data-message-key]").forEach((input) => {
      const key = input.dataset.messageKey;
      input.value = savedMessages[key] || TELEGRAM_MESSAGE_FALLBACKS[key] || "";
    });
    row.open = false;
    return;
  }
  const savedCustom = saved.customCommands.find((command) => command.key === commandKey);
  if (!savedCustom) {
    collectMessageCommandSettings();
    draftCustomTelegramCommands = draftCustomTelegramCommands.filter((item) => item.key !== commandKey);
    draftTelegramCommandOrder = draftTelegramCommandOrder.filter((key) => key !== commandKey);
    renderMessageSettings();
    return;
  }
  const commandInput = row.querySelector('[data-command-role="command"]');
  const descriptionInput = row.querySelector('[data-command-role="description"]');
  if (commandInput) commandInput.value = savedCustom.command || "";
  if (descriptionInput) descriptionInput.value = savedCustom.description || "";
  row.open = false;
}

function deleteMessageCommandDraft(commandKey, options = {}) {
  collectMessageCommandSettings();
  delete draftTelegramCommands[commandKey];
  delete draftTelegramCommandDescriptions[commandKey];
  draftCustomTelegramCommands = draftCustomTelegramCommands.filter((item) => item.key !== commandKey);
  draftTelegramCommandOrder = draftTelegramCommandOrder.filter((key) => key !== commandKey);
  draftTelegramCommandRegistry = draftTelegramCommandRegistry.filter((item) => item.key !== commandKey);
  messageCommandDraftActive = true;
  renderMessageSettings();
  markMessageSettingsDirty();
  if (!options.silent) {
    showMessageSettingsFeedback("New command deleted.", "warning");
  }
}

function markMessageCommandForDelete(commandKey) {
  collectMessageCommandSettings();
  draftTelegramCommandRegistry = draftTelegramCommandRegistry.map((item) => {
    if (item.key !== commandKey) return item;
    return { ...item, status: "delete" };
  });
  messageCommandDraftActive = true;
  renderMessageSettings();
  showMessageSettingsFeedback("Command marked for deletion. Sync commands to apply.", "warning");
  markMessageSettingsDirty();
}

function recoverMessageCommand(commandKey) {
  const syncedSnapshot = syncedMessageCommandSnapshot();
  const syncedItem = syncedSnapshot ? messageCommandItemsByKey(syncedSnapshot).get(commandKey) : null;
  if (!syncedItem) {
    deleteMessageCommandDraft(commandKey);
    return;
  }
  collectMessageCommandSettings();
  const restored = {
    key: syncedItem.key,
    command: syncedItem.command,
    description: syncedItem.description,
    built_in: syncedItem.builtIn,
  };
  const existingIndex = draftTelegramCommandRegistry.findIndex((item) => item.key === commandKey);
  if (existingIndex >= 0) {
    draftTelegramCommandRegistry.splice(existingIndex, 1, restored);
  } else {
    draftTelegramCommandRegistry.push(restored);
  }
  if (!draftTelegramCommandOrder.includes(commandKey)) {
    draftTelegramCommandOrder.push(commandKey);
  }
  if (restored.built_in) {
    draftTelegramCommands[commandKey] = restored.command;
    draftTelegramCommandDescriptions[commandKey] = restored.description;
  } else {
    const customIndex = draftCustomTelegramCommands.findIndex((item) => item.key === commandKey);
    const custom = {
      key: restored.key,
      command: restored.command,
      description: restored.description,
    };
    if (customIndex >= 0) {
      draftCustomTelegramCommands.splice(customIndex, 1, custom);
    } else {
      draftCustomTelegramCommands.push(custom);
    }
  }
  messageCommandDraftActive = true;
  renderMessageSettings();
  showMessageSettingsFeedback("Command recovered to the last active version.", "success");
  markMessageSettingsDirty();
}

function confirmDeleteMessageCommand(commandKey) {
  collectMessageCommandSettings();
  const item = draftTelegramCommandRegistry.find((command) => command.key === commandKey)
    || (state.settings?.services?.telegram?.command_registry || []).find((command) => command.key === commandKey);
  const command = item?.command || "this command";
  const status = messageCommandStatus({
    key: commandKey,
    command: item?.command || "",
    description: item?.description || "",
    builtIn: Boolean(item?.built_in),
    status: item?.status || "",
  });
  const isNew = status === "new";
  openRoleChoice({
    title: "Delete command?",
    copy: isNew
      ? `${command} has never been synced. It will be removed immediately.`
      : `${command} will be marked for deletion. It will be removed from Telegram the next time you Sync commands.`,
    confirmLabel: "Delete",
    danger: true,
    defaultAction: "cancel",
    onConfirm: () => {
      if (isNew) {
        deleteMessageCommandDraft(commandKey);
      } else {
        markMessageCommandForDelete(commandKey);
      }
      closeRoleChoice();
    },
    cancelLabel: "Cancel",
    onCancel: () => {},
  });
}

function createMessageCommandInput(className, value, placeholder = "") {
  const input = document.createElement("input");
  input.className = `settings-input ${className}`;
  input.value = value || "";
  input.placeholder = placeholder;
  input.autocomplete = "off";
  return input;
}

function messageCommandIsDirty(item) {
  return messageCommandStatus(item) === "draft";
}

function messageCommandStatus(item) {
  if (item.status === "delete") return "delete";
  const syncedSnapshot = syncedMessageCommandSnapshot();
  const syncedItem = syncedSnapshot ? messageCommandItemsByKey(syncedSnapshot).get(item.key) : null;
  if (!syncedItem) return "new";
  if (messageCommandItemSignature(item) !== messageCommandItemSignature(syncedItem)) return "draft";
  return "active";
}

function messageCommandReplyHasDraft(commandKey) {
  const templates = TELEGRAM_COMMAND_REPLY_TEMPLATES[commandKey] || [];
  const savedMessages = state.settings?.services?.telegram?.messages || {};
  return templates.some((template) => {
    return template.key in draftTelegramMessages
      && draftTelegramMessages[template.key] !== (savedMessages[template.key] || TELEGRAM_MESSAGE_FALLBACKS[template.key] || "");
  });
}

function createMessageCommandRow(item) {
  const row = document.createElement("details");
  row.className = "message-command-row";
  row.dataset.commandKey = item.key;
  row.dataset.builtIn = String(Boolean(item.builtIn));
  row.dataset.commandStatus = item.status || "";
  row.dataset.originalCommand = item.command || "";
  row.dataset.originalDescription = item.description || "";
  let statusType = messageCommandStatus(item);
  if (statusType === "active" && messageCommandReplyHasDraft(item.key)) {
    statusType = "draft";
  }
  row.dataset.resolvedCommandStatus = statusType;
  row.classList.toggle("has-draft", statusType === "draft");
  row.classList.toggle("is-delete", statusType === "delete");
  if (item.open) row.open = true;

  const summary = document.createElement("summary");
  summary.className = "message-command-summary";
  const dragHandle = document.createElement("span");
  dragHandle.className = "message-command-drag-handle";
  dragHandle.draggable = true;
  dragHandle.dataset.dragCommandKey = item.key;
  dragHandle.title = "Drag to reorder";
  dragHandle.setAttribute("aria-label", `Drag ${item.command || "command"} to reorder`);
  dragHandle.textContent = "⋮⋮";
  const summaryMain = document.createElement("span");
  summaryMain.className = "message-command-summary-main";
  const commandText = document.createElement("strong");
  commandText.textContent = item.command || "/command";
  const token = document.createElement("span");
  token.className = "message-command-token";
  token.textContent = item.builtIn ? `{${item.key}_command}` : "{custom_command}";
  const status = document.createElement("span");
  status.className = `message-command-status-pill ${statusType}`;
  const statusLabels = {
    new: "New",
    active: "Active",
    draft: "Draft",
    delete: "Delete",
  };
  status.textContent = statusLabels[statusType] || "Draft";
  summaryMain.append(status, commandText, token);

  const actions = document.createElement("span");
  actions.className = "message-command-actions";
  const toggle = document.createElement("span");
  toggle.className = "message-command-toggle";
  toggle.setAttribute("aria-hidden", "true");
  toggle.textContent = row.open ? "Collapse" : "Expand";
  actions.append(toggle);
  summary.append(dragHandle, summaryMain, actions);

  const commandField = document.createElement("label");
  commandField.className = "settings-field";
  const commandLabel = document.createElement("span");
  commandLabel.className = "settings-label";
  commandLabel.textContent = item.label || "Command";
  const commandInput = createMessageCommandInput(
    "message-command-input",
    item.command,
    "/command",
  );
  commandInput.dataset.commandKey = item.key;
  commandInput.dataset.commandRole = "command";
  commandInput.disabled = statusType === "delete";
  commandField.append(commandLabel, commandInput);

  const descriptionField = document.createElement("label");
  descriptionField.className = "settings-field";
  const descriptionLabel = document.createElement("span");
  descriptionLabel.className = "settings-label";
  descriptionLabel.textContent = "Description";
  const descriptionInput = createMessageCommandInput(
    "message-command-description-input",
    item.description,
    "Shown in Telegram command menu",
  );
  descriptionInput.dataset.commandKey = item.key;
  descriptionInput.dataset.commandRole = "description";
  descriptionInput.disabled = statusType === "delete";
  descriptionField.append(descriptionLabel, descriptionInput);

  const logicBlock = document.createElement("div");
  logicBlock.className = "message-command-logic";
  const logicPrefix = document.createElement("strong");
  logicPrefix.textContent = "Backend logic";
  const logicText = document.createElement("p");
  logicText.textContent = item.logic || "无";
  logicBlock.append(logicPrefix, logicText);

  const body = document.createElement("div");
  body.className = "message-command-drawer";
  const commandTabs = document.createElement("div");
  commandTabs.className = "message-command-drawer-tabs";
  commandTabs.setAttribute("role", "tablist");
  commandTabs.setAttribute("aria-label", `${item.command || "Command"} settings`);
  const selectedDrawerTab = activeMessageCommandDrawerTabs[item.key] === "reply" ? "reply" : "instruction";
  const instructionTab = document.createElement("button");
  instructionTab.className = `message-command-drawer-tab${selectedDrawerTab === "instruction" ? " active" : ""}`;
  instructionTab.type = "button";
  instructionTab.dataset.commandDrawerTab = "instruction";
  instructionTab.setAttribute("role", "tab");
  instructionTab.setAttribute("aria-selected", String(selectedDrawerTab === "instruction"));
  instructionTab.textContent = "Instruction";
  const replyTab = document.createElement("button");
  replyTab.className = `message-command-drawer-tab${selectedDrawerTab === "reply" ? " active" : ""}`;
  replyTab.type = "button";
  replyTab.dataset.commandDrawerTab = "reply";
  replyTab.setAttribute("role", "tab");
  replyTab.setAttribute("aria-selected", String(selectedDrawerTab === "reply"));
  replyTab.textContent = "Reply";
  commandTabs.append(instructionTab, replyTab);

  const instructionPane = document.createElement("div");
  instructionPane.className = "message-command-tab-panel";
  instructionPane.dataset.commandDrawerPanel = "instruction";
  instructionPane.hidden = selectedDrawerTab !== "instruction";

  const replyPane = document.createElement("div");
  replyPane.className = "message-command-tab-panel";
  replyPane.dataset.commandDrawerPanel = "reply";
  replyPane.hidden = selectedDrawerTab !== "reply";

  const replyTemplates = TELEGRAM_COMMAND_REPLY_TEMPLATES[item.key] || [];
  const savedMessages = state.settings?.services?.telegram?.messages || {};
  const currentMessages = { ...savedMessages, ...draftTelegramMessages };
  const replySection = document.createElement("div");
  replySection.className = "message-command-replies";
  const replyFields = replyTemplates.map((template) => {
    const value = currentMessages[template.key] || TELEGRAM_MESSAGE_FALLBACKS[template.key] || "";
    return createInlineMessageReplyEditor({
      key: template.key,
      label: template.label,
      value,
      rows: 1,
    });
  });
  if (replyFields.length) {
    replySection.append(...replyFields);
  } else {
    const empty = document.createElement("div");
    empty.className = "message-command-empty-replies";
    empty.textContent = item.builtIn
      ? "No editable reply. Status text is generated by backend runtime."
      : "No editable reply until backend handling exists.";
    replySection.append(empty);
  }
  const drawerActions = document.createElement("div");
  drawerActions.className = "message-command-drawer-actions";
  const cancel = document.createElement("button");
  cancel.className = "message-command-action-button subtle";
  cancel.type = "button";
  cancel.dataset.cancelCommandDraft = item.key;
  cancel.textContent = "Cancel";
  const apply = document.createElement("button");
  apply.className = "message-command-action-button primary";
  apply.type = "button";
  apply.dataset.saveCommandDraft = item.key;
  apply.textContent = "Save Draft";
  if (statusType !== "delete") {
    drawerActions.append(cancel, apply);
  }
  if (statusType === "new" || statusType === "active") {
    const remove = document.createElement("button");
    remove.className = "message-command-action-button danger";
    remove.type = "button";
    remove.dataset.removeCustomCommand = item.key;
    remove.textContent = "Delete";
    drawerActions.append(remove);
  }
  if (statusType === "draft" || statusType === "delete") {
    const recover = document.createElement("button");
    recover.className = "message-command-action-button subtle";
    recover.type = "button";
    recover.dataset.recoverCommandDraft = item.key;
    recover.textContent = "Recover";
    drawerActions.append(recover);
  }
  instructionPane.append(commandField, descriptionField, drawerActions);
  replyPane.append(replySection);
  body.append(logicBlock, commandTabs, instructionPane, replyPane);
  row.append(summary, body);
  return row;
}

function renderMessageCommandList(commands = {}, descriptions = {}) {
  if (!messageCommandList) return;
  const openKeys = new Set(
    [...messageCommandList.querySelectorAll(".message-command-row[open]")]
      .map((row) => row.dataset.commandKey)
      .filter(Boolean),
  );
  messageCommandList.replaceChildren();
  const savedRegistry = state.settings?.services?.telegram?.command_registry || [];
  const registry = messageCommandDraftActive ? draftTelegramCommandRegistry : savedRegistry;
  const builtIns = (registry.length
    ? registry.filter((item) => item.built_in !== false)
    : Object.keys(TELEGRAM_COMMAND_FALLBACKS).map((key) => ({
      key,
      command: TELEGRAM_COMMAND_FALLBACKS[key],
      description: TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS[key],
      logic: TELEGRAM_COMMAND_LOGIC[key],
      built_in: true,
    }))
  ).map((item) => {
    const key = item.key;
    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      command: (messageCommandDraftActive ? draftTelegramCommands[key] : commands[key])
        || item.command
        || TELEGRAM_COMMAND_FALLBACKS[key],
      description: (messageCommandDraftActive ? draftTelegramCommandDescriptions[key] : descriptions[key])
        || item.description
        || TELEGRAM_COMMAND_DESCRIPTION_FALLBACKS[key],
	      logic: item.logic || TELEGRAM_COMMAND_LOGIC[key] || "无",
	      builtIn: true,
	      status: item.status || "",
	    };
	  });
  const customItems = (registry.length
    ? registry.filter((item) => item.built_in === false)
    : state.settings?.services?.telegram?.custom_commands || []
  ).map((item, index) => ({
    key: item.key || `custom_${index + 1}`,
    label: "Custom",
    command: item.command || "",
    description: item.description || "",
    logic: "无",
    builtIn: false,
    status: item.status || "",
  }));
  const itemsByKey = new Map([...builtIns, ...customItems].map((item) => [item.key, item]));
  const storedOrder = messageCommandDraftActive
    ? draftTelegramCommandOrder
    : state.settings?.services?.telegram?.command_order || [];
  const order = [...storedOrder, ...itemsByKey.keys()].filter((key, index, list) => {
    return itemsByKey.has(key) && list.indexOf(key) === index;
  });
  order.forEach((key) => {
    const item = itemsByKey.get(key);
    item.open = openKeys.has(key);
    item.dirty = messageCommandIsDirty(item);
    messageCommandList.append(createMessageCommandRow(item));
  });
}

function renderServiceConfiguration() {
  serviceConfigSettings.querySelector("h3").textContent = "Service Configuration";
  serviceConfigTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.serviceConfigTab === activeServiceConfigTab);
  });
  const service = telegramService();
  const bots = telegramBots();
  const enabledBotCount = Object.values(bots).filter((item) => item.enabled).length;
  const botCount = Object.keys(bots).length;
  telegramServicePanel.hidden = activeServiceConfigTab !== "telegram";
  larkServicePanel.hidden = activeServiceConfigTab !== "lark";
  if (activeServiceConfigTab !== "telegram") {
    const focusBot = telegramBotWorkersCard.dataset.manageFocus === "true";
    larkServerCard?.classList.toggle("active", !focusBot);
    larkBotWorkersCard?.classList.toggle("active", focusBot);
    return;
  }
  const botWorkersManageFocus = telegramBotWorkersCard.dataset.manageFocus === "true";
  telegramServerCard.classList.toggle("active", !activeServiceBotId && !botWorkersManageFocus);
  telegramBotWorkersCard.classList.toggle("active", Boolean(activeServiceBotId) || botWorkersManageFocus);

  const bot = firstTelegramBotEntry()[1] || emptyTelegramBot();
  const connection = telegramConnection();
  const tokenConfigured = Boolean(connection.bot_token);
  const enabled = Boolean(service.enabled && enabledBotCount > 0);
  const listenerState = state.services?.listener?.state || "unknown";
  const listenerPid = state.services?.listener?.pid;
  const listenerRunning = listenerIsRunning();
  const listenerDisplayState = listenerRunning ? listenerState : "stopped";
  const listenerDisplayPid = listenerRunning ? listenerPid : "";

  telegramServiceToggle.classList.remove("pending");
  telegramServiceToggle.classList.toggle("enabled", listenerRunning);
  telegramServiceToggle.setAttribute("aria-pressed", String(listenerRunning));
  telegramServiceToggle.querySelector(".target-toggle-label").textContent = listenerRunning ? "started" : "stopped";
  telegramListenerStatus.textContent = `${listenerDisplayPid ? `${listenerDisplayState} · ${listenerDisplayPid}` : listenerDisplayState} (${connection.mode || "polling"})`;
  const serviceModelIssue = !service.model || modelRouteHasIssue(service.model);
  telegramServiceModelFact.innerHTML = `
    <span>Provider (Model)</span>
    <div class="service-model-control ${serviceModelIssue ? "is-error" : ""}">
      ${renderModelRouteDropdown(service.model, "telegramServiceModelRoute", {
        fallbackLabel: "Select Provider (Model)",
        kind: "service",
        serviceId: "telegram",
      })}
      ${
        serviceModelIssue
          ? `<span class="target-label warning">Unavailable</span>`
          : ""
      }
    </div>
  `;
  if (telegramServiceProfileFact) {
    telegramServiceProfileFact.innerHTML = `
      <span>Runtime Profile</span>
      <div class="service-model-control">
        ${renderRuntimeProfileDropdown(
          service.model,
          service.model_profile || "default",
          "telegramServiceRuntimeProfile",
          { kind: "service", serviceId: "telegram" },
        )}
      </div>
    `;
  }
  bindModelRouteDropdowns(telegramServiceModelFact);
  if (telegramServiceProfileFact) {
    bindModelRouteDropdowns(telegramServiceProfileFact);
  }
  renderTelegramServiceManageModal();
  telegramTokenInput.value = "";
  renderTelegramBotsList();
}

function renderTelegramServiceManageModal() {
  const service = telegramService();
  const connection = telegramConnection();
  const listenerState = state.services?.listener?.state || "unknown";
  const listenerPid = state.services?.listener?.pid;
  const listenerRunning = listenerIsRunning();
  const listenerDisplayState = listenerRunning ? listenerState : "stopped";
  const listenerDisplayPid = listenerRunning ? listenerPid : "";
  const hasEnabledModels = enabledModelOptions().length > 0;
  const serviceModelMissing = !service.model;
  const serviceModelIssue = !hasEnabledModels || serviceModelMissing || modelRouteHasIssue(service.model) || !modelRouteIsEnabled(service.model);

  if (telegramServiceModelAlert) {
    telegramServiceModelAlert.hidden = false;
    if (!hasEnabledModels) {
      telegramServiceModelAlert.innerHTML = `
        <div>
          <strong>No Enabled AI Provider (Model)</strong>
          <span>No AI Provider (Model) is enabled. Please enable at least one in Model Configuration.</span>
        </div>
        <button class="target-action compact" type="button" data-open-model-settings>Enable AI Provider</button>
      `;
    } else if (serviceModelMissing) {
      telegramServiceModelAlert.innerHTML = `
        <div>
          <strong>AI Provider (Model) is not configured yet.</strong>
          <span>Please select a Provider (Model) for this service.</span>
        </div>
      `;
    } else if (serviceModelIssue) {
      telegramServiceModelAlert.innerHTML = `
        <div>
          <strong>AI Provider (Model) is disabled</strong>
          <span>AI Provider (Model) configured for this service is disabled. Please select another Provider (Model).</span>
        </div>
      `;
    } else {
      telegramServiceModelAlert.hidden = true;
      telegramServiceModelAlert.replaceChildren();
    }
  }

  telegramServiceManageToggle.classList.remove("pending");
  telegramServiceManageToggle.classList.toggle("enabled", listenerRunning);
  telegramServiceManageToggle.setAttribute("aria-pressed", String(listenerRunning));
  telegramServiceManageToggle.querySelector(".target-toggle-label").textContent = listenerRunning ? "started" : "stopped";
  telegramServerManageCard?.classList.toggle("is-stopped", listenerDisplayState === "stopped");
  telegramServerManageCard?.classList.remove("is-starting");
  telegramManageListenerStatus.textContent = `${listenerDisplayPid ? `${listenerDisplayState} · ${listenerDisplayPid}` : listenerDisplayState} (${connection.mode || "polling"})`;
  telegramManageServiceModelFact.innerHTML = `
    <span>Provider (Model)</span>
    <div class="service-model-control ${serviceModelIssue ? "is-error" : ""}">
      ${renderModelRouteDropdown(service.model, "telegramManageServiceModelRoute", {
        fallbackLabel: "Select Provider (Model)",
        kind: "service",
        serviceId: "telegram",
      })}
      ${
        serviceModelIssue
          ? `<span class="target-label warning">Unavailable</span>`
          : ""
      }
    </div>
  `;
  if (telegramManageServiceProfileFact) {
    telegramManageServiceProfileFact.innerHTML = `
      <span>Runtime Profile</span>
      <div class="service-model-control">
        ${renderRuntimeProfileDropdown(
          service.model,
          service.model_profile || "default",
          "telegramManageServiceRuntimeProfile",
          { kind: "service", serviceId: "telegram" },
        )}
      </div>
    `;
  }
  bindModelRouteDropdowns(telegramManageServiceModelFact);
  if (telegramManageServiceProfileFact) {
    bindModelRouteDropdowns(telegramManageServiceProfileFact);
  }
}

function renderLarkServiceManageModal() {
  const service = state.settings?.services?.lark || { label: "Lark", enabled: false };
  const route = service.model || null;
  const hasModel = Boolean(route);
  const hasEnabledModels = enabledModelOptions().length > 0;
  const routeIssue = !hasEnabledModels || !hasModel || modelRouteHasIssue(route) || !modelRouteIsEnabled(route);
  const statusText = service.enabled ? "started" : "disabled";

  if (larkServiceModelAlert) {
    if (!hasEnabledModels) {
      larkServiceModelAlert.hidden = false;
      larkServiceModelAlert.innerHTML = `
        <div>
          <strong>No Enabled AI Provider (Model)</strong>
          <span>No AI Provider (Model) is enabled. Please enable at least one in Model Configuration.</span>
        </div>
        <button class="target-action compact" type="button" data-open-model-settings>Enable AI Provider</button>
      `;
    } else if (!hasModel) {
      larkServiceModelAlert.hidden = false;
      larkServiceModelAlert.innerHTML = `
        <div>
          <strong>AI Provider (Model) is not configured yet.</strong>
          <span>Please select a Provider (Model) for this service.</span>
        </div>
      `;
    } else if (routeIssue) {
      larkServiceModelAlert.hidden = false;
      larkServiceModelAlert.innerHTML = `
        <div>
          <strong>AI Provider (Model) is disabled</strong>
          <span>AI Provider (Model) configured for this service is disabled. Please select another Provider (Model).</span>
        </div>
      `;
    } else {
      larkServiceModelAlert.hidden = true;
      larkServiceModelAlert.replaceChildren();
    }
  }

  larkServiceManageToggle.classList.toggle("enabled", Boolean(service.enabled));
  larkServiceManageToggle.setAttribute("aria-pressed", String(Boolean(service.enabled)));
  larkServiceManageToggle.querySelector(".target-toggle-label").textContent = statusText;
  larkManageListenerStatus.textContent = service.enabled ? "not configured" : "not configured";
  larkManageServiceModelFact.innerHTML = `
    <span>Provider (Model)</span>
    <div class="service-model-control ${routeIssue ? "is-error" : ""}">
      ${renderModelRouteDropdown(route, "larkManageServiceModelRoute", {
        fallbackLabel: "Select Provider (Model)",
        kind: "service",
        serviceId: "lark",
      })}
      ${routeIssue ? '<span class="target-label warning">Unavailable</span>' : ""}
    </div>
  `;
  larkManageServiceProfileFact.innerHTML = `
    <span>Runtime Profile</span>
    <div class="service-model-control">
      ${renderRuntimeProfileDropdown(
        route,
        service.model_profile || "default",
        "larkManageServiceRuntimeProfile",
        { kind: "service", serviceId: "lark" },
      )}
    </div>
  `;
  bindModelRouteDropdowns(larkManageServiceModelFact);
  bindModelRouteDropdowns(larkManageServiceProfileFact);
}

function renderTelegramBotsList() {
  renderTelegramBotsListInto({
    countEl: telegramBotCount,
    listEl: telegramBotsList,
    routePrefix: "botModelRoute",
    profilePrefix: "botRuntimeProfile",
  });
}

function renderTelegramBotWorkersManageModal() {
  renderTelegramBotsListInto({
    countEl: telegramManageBotCount,
    listEl: telegramManageBotsList,
    routePrefix: "manageBotModelRoute",
    profilePrefix: "manageBotRuntimeProfile",
  });
}

function renderLarkBotWorkersManageModal() {
  renderServiceBotsListInto({
    countEl: larkManageBotCount,
    listEl: larkManageBotsList,
    serviceId: "lark",
    routePrefix: "larkManageBotModelRoute",
    profilePrefix: "larkManageBotRuntimeProfile",
  });
}

function renderTelegramBotDetailModal() {
  const bots = telegramBots();
  const bot = bots[activeServiceBotId];
  if (!bot) {
    closeTelegramBotDetailModal();
    return;
  }
  const connection = bot.connection || {};
  const label = bot.label || (connection.bot_username ? `@${connection.bot_username}` : "Telegram Bot");
  telegramBotDetailModalTitle.textContent = `${label} Settings`;

  const showSettings = telegramDetailFocus !== "approval";
  const showApproval = telegramDetailFocus === "approval";
  telegramDetailBotList.closest(".service-card").hidden = !showSettings;
  telegramDetailAccessCard.hidden = !showApproval;

  if (showSettings) {
    renderTelegramBotsListInto({
      countEl: null,
      listEl: telegramDetailBotList,
      routePrefix: "detailBotModelRoute",
      profilePrefix: "detailBotRuntimeProfile",
      botFilterId: activeServiceBotId,
      flatSingle: true,
    });
  } else {
    telegramDetailBotList.innerHTML = "";
  }

  telegramDetailAccessCard?.classList.remove("active");
  if (showApproval) {
    renderAccessControlTargets({
      listEl: telegramDetailAllowedTargets,
      formEl: telegramDetailAllowedTargetForm,
      inputEl: telegramDetailAllowedTargetInput,
      chatTabEl: telegramDetailChatTargetTab,
      channelTabEl: telegramDetailChannelTargetTab,
      panelEl: telegramDetailAccessPanel,
      feedbackEl: telegramDetailAccessFeedback,
      manageFocus: false,
    });
    renderRequestButtonCount(telegramDetailRequestsButton, activeServiceBotId);
  } else {
    telegramDetailAllowedTargets.innerHTML = "";
  }
}

function renderLarkBotDetailModal(botId = "") {
  const bots = homeBots("lark");
  const botEntry = botId ? bots.find(([id]) => id === botId) : bots[0];
  const [resolvedBotId, bot] = botEntry || ["", null];
  const label = bot ? botLabel(resolvedBotId, bot) : "Lark Bot";
  larkBotDetailModalTitle.textContent = `${label} Settings`;
  renderServiceBotsListInto({
    countEl: null,
    listEl: larkDetailBotList,
    serviceId: "lark",
    routePrefix: "larkDetailBotModelRoute",
    profilePrefix: "larkDetailBotRuntimeProfile",
    botFilterId: resolvedBotId,
  });
}

function createNoBotAddedState() {
  const empty = document.createElement("div");
  empty.className = "bot-empty-state";
  const title = document.createElement("strong");
  title.textContent = "No BOT Added";
  const subtitle = document.createElement("span");
  subtitle.textContent = "There is no bot yet. Please add your first BOT.";
  empty.append(title, subtitle);
  return empty;
}

function renderServiceBotsListInto({
  countEl,
  listEl,
  serviceId,
  routePrefix,
  profilePrefix,
  botFilterId = "",
}) {
  const service = state.settings?.services?.[serviceId] || {};
  const bots = homeBots(serviceId);
  const visibleBots = botFilterId ? bots.filter(([botId]) => botId === botFilterId) : bots;
  const enabledCount = visibleBots.filter(([, bot]) => bot.enabled).length;
  if (countEl) {
    countEl.textContent = botFilterId
      ? (visibleBots.length ? "1 worker" : "0 configured")
      : `${enabledCount} enabled / ${visibleBots.length} configured`;
  }
  listEl.innerHTML = "";

  if (!visibleBots.length) {
    listEl.append(createNoBotAddedState());
    return;
  }

  for (const [botId, bot] of visibleBots) {
    const connection = bot.connection || {};
    const item = document.createElement("div");
    item.className = "bot-list-item";

    const info = document.createElement("div");
    info.className = "access-bot-info";
    const head = document.createElement("div");
    head.className = "bot-list-head";
    const name = document.createElement("div");
    name.className = "bot-list-name";
    const nameText = document.createElement("span");
    nameText.textContent = botLabel(botId, bot);
    const status = document.createElement("span");
    status.className = `target-label ${bot.enabled ? "connected" : "disabled"}`.trim();
    status.textContent = bot.enabled ? "enabled" : "disabled";
    name.append(nameText, status);

    const meta = document.createElement("div");
    meta.className = "bot-list-meta";
    meta.textContent = [
      connection.bot_id || botId,
      connection.mode || "not configured",
    ].filter(Boolean).join(" · ");

    const actions = document.createElement("div");
    actions.className = "bot-list-actions";
    const edit = document.createElement("button");
    edit.className = "home-bot-option-edit";
    edit.type = "button";
    edit.textContent = "edit";
    edit.addEventListener("click", () => {
      if (serviceId === "lark") {
        openLarkBotDetailModal(botId);
      }
    });
    actions.append(edit);

    const override = bot.model_override || null;
    const overrideValid = override ? modelRouteIsEnabled(override) : true;
    const routeForProfile = override || service.model || null;
    const profileOverride = bot.model_profile_override || "";
    const modelRow = document.createElement("div");
    modelRow.className = "service-fact bot-model-row";
    modelRow.innerHTML = `
      <span>Provider (Model)</span>
      <div class="service-model-control ${override && !overrideValid ? "is-error" : ""}">
        ${renderModelRouteDropdown(override, `${routePrefix}-${botId}`, {
          fallbackLabel: "Inherit service model",
          includeInherit: true,
          kind: "bot",
          serviceId,
          botId,
        })}
        ${override && !overrideValid ? '<span class="target-label warning">Unavailable</span>' : ""}
      </div>
    `;
    const profileRow = document.createElement("div");
    profileRow.className = "service-fact bot-model-row bot-profile-row";
    profileRow.innerHTML = `
      <span>Runtime Profile</span>
      <div class="service-model-control">
        ${renderRuntimeProfileDropdown(routeForProfile, profileOverride, `${profilePrefix}-${botId}`, {
          includeInherit: true,
          kind: "bot",
          serviceId,
          botId,
        })}
      </div>
    `;

    head.append(info, actions);
    info.append(name, meta);
    item.append(head, modelRow, profileRow);
    listEl.append(item);
  }

  bindModelRouteDropdowns(listEl);
}

function renderTelegramBotsListInto({ countEl, listEl, routePrefix, profilePrefix, botFilterId = "", flatSingle = false }) {
  const service = telegramService();
  const allBots = Object.entries(telegramBots());
  const bots = botFilterId ? allBots.filter(([botId]) => botId === botFilterId) : allBots;
  const enabledCount = bots.filter(([, bot]) => bot.enabled).length;
  if (countEl) {
    countEl.textContent = botFilterId
      ? "1 worker"
      : `${enabledCount} enabled / ${bots.length} configured`;
  }
  listEl.innerHTML = "";

  if (!bots.length) {
    listEl.append(createNoBotAddedState());
    return;
  }

  for (const [botId, bot] of bots) {
    const connection = bot.connection || {};
    const item = document.createElement("div");
    const highlightWorker =
      botId === activeServiceBotId
      && telegramDetailFocus !== "approval"
      && listEl !== telegramDetailBotList;
    item.className = `bot-list-item ${highlightWorker ? "active" : ""} ${flatSingle ? "flat-single" : ""}`.trim();
    item.dataset.serviceBotId = botId;

    const info = document.createElement("div");
    info.className = "access-bot-info";
    const head = document.createElement("div");
    head.className = "bot-list-head";
    const name = document.createElement("div");
    name.className = "bot-list-name";
    const nameText = document.createElement("span");
    nameText.textContent = bot.label || (connection.bot_username ? `@${connection.bot_username}` : "Telegram Bot");

    const meta = document.createElement("div");
    meta.className = "bot-list-meta";
    meta.textContent = [
      connection.bot_id || botId,
      connection.mode || "polling",
    ].filter(Boolean).join(" · ");

    const status = document.createElement("span");
    const displayState = workerDisplayState(botId, bot);
    const worker = telegramWorkerStatus(botId);
    status.className = `target-label ${displayState.tone}`.trim();
    status.textContent = displayState.label;
    if (worker.message) {
      status.title = worker.message;
    }
    name.append(nameText, status);

    const hasAllowedTargets =
      enabledAllowedCount(bot, "chat") + enabledAllowedCount(bot, "channel") > 0;
    if (bot.enabled && !hasAllowedTargets) {
      const warning = document.createElement("button");
      warning.className = "target-label warning actionable";
      warning.type = "button";
      warning.textContent = "no allowed users";
      warning.title = "No users or channels are allowed for this bot.";
      warning.addEventListener("click", () => promptConfigureBotAccess(botId, bot));
      name.append(warning);
    }

    const toggle = document.createElement("button");
    toggle.className = `target-toggle ${bot.enabled ? "enabled" : ""}`;
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", String(Boolean(bot.enabled)));
    toggle.innerHTML = `
      <span class="target-toggle-track" aria-hidden="true">
        <span class="target-toggle-thumb"></span>
      </span>
      <span>${bot.enabled ? "enabled" : "disabled"}</span>
    `;
    toggle.addEventListener("click", () => updateTelegramBot(botId, { enabled: !bot.enabled }));

    const remove = document.createElement("button");
    remove.className = "target-remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.title = bot.enabled ? "Disable this bot before removing it." : "Remove this bot";
    const removeHint = document.createElement("div");
    removeHint.className = "bot-remove-hint";
    removeHint.hidden = true;
    remove.addEventListener("click", () => {
      if (bot.enabled) {
        removeHint.textContent = "Disable this bot before removing it.";
        removeHint.hidden = false;
        window.clearTimeout(removeHint._timer);
        removeHint._timer = window.setTimeout(() => {
          removeHint.hidden = true;
        }, 2200);
        return;
      }
      removeTelegramBot(botId);
    });
    const actions = document.createElement("div");
    actions.className = "bot-list-actions";
    actions.append(toggle, remove);

    const override = bot.model_override || null;
    const overrideValid = override ? modelRouteIsEnabled(override) : true;
    const routeForProfile = override || service.model || null;
    const profileOverride = bot.model_profile_override || "";
    const modelRow = document.createElement("div");
    modelRow.className = "service-fact bot-model-row";
    modelRow.innerHTML = `
      <span>Provider (Model)</span>
      <div class="service-model-control ${override && !overrideValid ? "is-error" : ""}">
        ${renderModelRouteDropdown(override, `${routePrefix}-${botId}`, {
          fallbackLabel: "Inherit service model",
          includeInherit: true,
          kind: "bot",
          botId,
        })}
        ${override && !overrideValid ? '<span class="target-label warning">Unavailable</span>' : ""}
      </div>
    `;
    const profileRow = document.createElement("div");
    profileRow.className = "service-fact bot-model-row bot-profile-row";
    profileRow.innerHTML = `
      <span>Runtime Profile</span>
      <div class="service-model-control">
        ${renderRuntimeProfileDropdown(routeForProfile, profileOverride, `${profilePrefix}-${botId}`, {
          includeInherit: true,
          kind: "bot",
          botId,
        })}
      </div>
    `;

    head.append(info, actions);
    info.append(name, meta);
    item.append(head, removeHint, modelRow, profileRow);
    listEl.append(item);
  }

  bindModelRouteDropdowns(listEl);
}

function renderTelegramSettings() {
  renderAccessBotSelector();
  if (!activeAccessBotId) {
    allowedTargets.innerHTML = "";
    return;
  }
  renderAccessControlTargets({
    listEl: allowedTargets,
    formEl: allowedTargetForm,
    inputEl: allowedTargetInput,
    chatTabEl: chatTargetTab,
    channelTabEl: channelTargetTab,
    panelEl: accessControlPanel,
    publicToggleEl: publicAccessToggle,
    feedbackEl: settingsFeedback,
    manageFocus: accessControlManageFocus,
  });
}

function renderAccessControlTargets({
  listEl,
  formEl,
  inputEl,
  chatTabEl,
  channelTabEl,
  panelEl,
  publicToggleEl = null,
  feedbackEl = settingsFeedback,
  manageFocus = false,
}) {
  listEl.innerHTML = "";
  if (!draftAllowedTargets) {
    const bot = activeAccessBot();
    draftAllowedTargets = {
      chat: normalizeTargetRecords(
        bot.allowed?.chats || state.settings?.allowed_user_ids,
        "chat",
      ),
      channel: normalizeTargetRecords(
        bot.allowed?.channels || state.settings?.allowed_channel_ids,
        "channel",
      ),
    };
  }
  chatTabEl.classList.toggle("active", activeTargetType === "chat");
  channelTabEl.classList.toggle("active", activeTargetType === "channel");
  chatTabEl.classList.toggle("manage-focus", manageFocus && activeTargetType === "chat");
  channelTabEl.classList.toggle("manage-focus", manageFocus && activeTargetType === "channel");
  panelEl?.classList.toggle("active", manageFocus);
  const activeBot = activeAccessBot();
  if (publicToggleEl) {
    publicToggleEl.classList.toggle("enabled", Boolean(activeBot.public));
    publicToggleEl.setAttribute("aria-pressed", String(Boolean(activeBot.public)));
    publicToggleEl.title = activeBot.public
      ? "Public access is enabled."
      : "Public access is disabled.";
  }
  if (activeAccessBotId) {
    renderRequestButtonCount(requestsButton, activeAccessBotId);
    renderRequestButtonCount(telegramDetailRequestsButton, activeAccessBotId);
  }
  inputEl.placeholder =
    activeTargetType === "chat" ? "Please enter user ID." : "Please enter channel ID.";
  const targets = sortTargetRecords(draftAllowedTargets[activeTargetType] || []);

  if (!targets.length) {
    const empty = document.createElement("div");
    empty.className = "target-item";
    empty.textContent =
      activeTargetType === "chat"
        ? "No user IDs configured for this bot."
        : "No channel IDs configured for this bot.";
    listEl.append(empty);
    return;
  }

  for (const [index, target] of targets.entries()) {
    const row = document.createElement("div");
    row.className = "target-item";

    const info = document.createElement("div");
    info.className = "target-info";

    const main = document.createElement("div");
    main.className = "target-main";

    const value = document.createElement("span");
    value.className = "target-value";
    value.textContent = target.id;

    const addedAt = document.createElement("span");
    addedAt.className = "target-time";
    addedAt.textContent = `Added ${formatTime(target.added_at) || "unknown"}`;

    const label = document.createElement("button");
    label.className = "target-label";
    label.type = "button";
    label.title = activeTargetType === "chat"
      ? `${formatApprovalRole(target.role)} · bot role`
      : `${formatApprovalRole(target.role)} · channel role`;
    label.addEventListener("click", () => changeTargetRole(target, { feedbackEl, formEl, listEl }));
    label.textContent = formatApprovalRole(target.role);
    const isOwner = normalizeApprovalRole(target.role) === "owner";

    const remove = document.createElement("button");
    remove.className = "target-remove";
    remove.type = "button";
    remove.textContent = "Remove";
    if (isOwner) {
      remove.dataset.locked = "true";
      remove.title = "Change this owner to another role before removing.";
    }
    remove.addEventListener("click", async () => {
      const targetTypeLabel = activeTargetType === "chat" ? "user" : "channel";
      if (isOwner) {
        openRoleChoice({
          title: "Owner cannot be removed",
          copy: "This user is currently bot owner. Change the role to bot admin or public before removing.",
          confirmLabel: "Set as bot admin",
          extraLabel: "Set as public",
          cancelLabel: "Cancel",
          defaultAction: "close",
          onConfirm: () => setAllowedTargetRole(target, "admin", { feedbackEl, formEl, listEl }),
          onExtra: () => setAllowedTargetRole(target, "public", { feedbackEl, formEl, listEl }),
          onCancel: null,
        });
        return;
      }
      openRoleChoice({
        title: `Remove ${targetTypeLabel}?`,
        copy: createRemoveConversationCopy(
          target.id,
          activeTargetType,
          target.enabled,
        ),
        confirmLabel: `Remove ${targetTypeLabel}`,
        cancelLabel: "Don't remove",
        defaultAction: "cancel",
        danger: true,
        onConfirm: () => removeAllowedTarget(target, { feedbackEl, formEl, listEl }),
      });
    });

    const valueRow = document.createElement("div");
    valueRow.className = "target-value-row";
    valueRow.append(value, label);

    main.append(valueRow, addedAt);
    info.append(main);
    const controls = document.createElement("div");
    controls.className = "target-controls";
    controls.append(remove);
    row.append(info, controls);
    listEl.append(row);
  }
}

function normalizeApprovalRole(role) {
  return {
    allowed_user: "admin",
    allowed_channel: "admin",
    bot_admin: "admin",
    bot_owner: "owner",
    channel_owner: "owner",
  }[role] || (["owner", "admin", "public"].includes(role) ? role : "public");
}

function formatApprovalRole(role) {
  const normalized = normalizeApprovalRole(role);
  if (normalized === "owner") return "bot owner";
  if (normalized === "admin") return "bot admin";
  return "public";
}

function requestPendingCount(botId = activeAccessBotId) {
  const counts = state.settings?.telegram_request_counts || {};
  return Number(counts?.[botId]?.total || 0);
}

function formatRequestCount(count) {
  return count > 99 ? "99+" : String(count);
}

function renderRequestButtonCount(button, botId = activeAccessBotId) {
  if (!button) return;
  const count = requestPendingCount(botId);
  button.innerHTML = `
    <span>Requests</span>
    <span class="request-button-count">${formatRequestCount(count)}</span>
  `;
}

function renderRequests(items, { append = false } = {}) {
  if (!append) {
    requestsList.innerHTML = "";
  }
  currentRequestItems = append ? [...currentRequestItems, ...items] : [...items];
  requestTypeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.requestsType === activeRequestsType);
  });
  renderRequestsBulkbar();
  if (!items.length && !append) {
    const empty = document.createElement("div");
    empty.className = "requests-empty-card";
    empty.textContent = "There is no pending request currently ...";
    requestsList.append(empty);
    return;
  }

  for (const target of items) {
    const row = document.createElement("div");
    row.className = "target-item request-item";
    const key = requestTargetKey(target);

    const checkbox = document.createElement("input");
    checkbox.className = "request-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = selectedRequestKeys.has(key);
    checkbox.setAttribute("aria-label", `Select ${target.label || target.id}`);
    const setSelected = (isSelected) => {
      if (isSelected) {
        selectedRequestKeys.add(key);
      } else {
        selectedRequestKeys.delete(key);
      }
      checkbox.checked = isSelected;
      row.classList.toggle("selected", isSelected);
      renderRequestsBulkbar();
    };
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", () => {
      setSelected(checkbox.checked);
    });
    row.addEventListener("click", () => {
      setSelected(!selectedRequestKeys.has(key));
    });

    const main = document.createElement("div");
    main.className = "request-row-main";

    const valueRow = document.createElement("div");
    valueRow.className = "request-row-title";

    const value = document.createElement("span");
    value.className = "target-value";
    value.textContent = target.label || target.id;

    const idValue = document.createElement("span");
    idValue.className = "target-id-inline";
    idValue.textContent = `· id-${target.id}`;

    const role = document.createElement("span");
    role.className = "target-label";
    role.textContent = target.status || "pending";
    valueRow.append(value, idValue, role);

    const meta = document.createElement("span");
    meta.className = "request-row-meta";
    meta.textContent = formatDateTime(target.last_request_at || target.last_seen_at) || "--";

    main.append(valueRow);

    row.classList.toggle("selected", checkbox.checked);
    row.append(checkbox, main, meta);
    requestsList.append(row);
  }
}

function renderRequestsBulkbar() {
  const hasItems = currentRequestItems.length > 0;
  const visibleKeys = currentRequestItems.map(requestTargetKey);
  const selectedCount = visibleKeys.filter((key) => selectedRequestKeys.has(key)).length;
  const allSelected = hasItems && selectedCount === visibleKeys.length;
  requestsSelectedCount.textContent = `${selectedCount} selected`;
  requestsSelectedCount.hidden = false;
  requestsClearSelection.hidden = true;
  requestsMasterCheckbox.checked = allSelected;
  requestsMasterCheckbox.indeterminate = selectedCount > 0 && !allSelected;
  requestsMasterCheckbox.disabled = !hasItems;
  requestsSelectAll.textContent = allSelected ? "Clear" : "All";
  requestsSelectAll.disabled = !hasItems;
  requestsAllowSelected.disabled = selectedCount === 0;
  requestsRejectSelected.disabled = selectedCount === 0;
  requestsClearSelection.disabled = selectedCount === 0;
}

function renderAccessBotSelector() {
  const bots = Object.entries(telegramBots());
  accessBotCount.textContent = `${bots.length} configured`;
  accessBotOptions.innerHTML = "";
  accessControlPanel.hidden = true;
  selectedBotPanel.hidden = true;

  if (!bots.length) {
    activeAccessBotId = "";
    draftAllowedTargets = null;
    accessBotSelectWrap.hidden = true;
    accessBotTrigger.disabled = true;
    accessBotValue.textContent = "No bot configured";
    accessBotStatus.hidden = true;
    setAccessBotMenu(false);
    selectedBotPanel.hidden = false;
    selectedBotPanel.classList.add("selected-bot-empty");
    selectedBotPanel.textContent = "No Telegram bot configured. Add one in Service Configuration first.";
    return;
  }

  accessBotSelectWrap.hidden = false;
  accessBotTrigger.disabled = false;
  selectedBotPanel.classList.remove("selected-bot-empty");
  selectedBotPanel.textContent = "";

  if (!telegramBots()[activeAccessBotId]) {
    activeAccessBotId = bots[0][0];
    draftAllowedTargets = null;
  }

  const activeBotForDropdown = telegramBots()[activeAccessBotId];
  const activeDisplayState = workerDisplayState(activeAccessBotId, activeBotForDropdown);
  accessBotValue.textContent = botDisplayName(activeAccessBotId, activeBotForDropdown);
  accessBotStatus.hidden = false;
  accessBotStatus.className = `target-label ${activeDisplayState.tone}`.trim();
  accessBotStatus.textContent = activeDisplayState.label;

  const normalizedFilter = accessBotFilter.trim().toLowerCase();
  const filteredBots = bots.filter(([botId, bot]) => {
    const haystack = [
      botLabel(botId, bot),
      botConnectionId(botId, bot),
      workerDisplayState(botId, bot).label,
    ].join(" ").toLowerCase();
    return !normalizedFilter || haystack.includes(normalizedFilter);
  });

  if (!filteredBots.length) {
    const empty = document.createElement("div");
    empty.className = "home-bot-empty";
    empty.textContent = "No bots match your search.";
    accessBotOptions.append(empty);
  }

  for (const [botId, bot] of filteredBots) {
    const displayState = workerDisplayState(botId, bot);
    const option = document.createElement("button");
    option.type = "button";
    option.className = `home-bot-option ${botId === activeAccessBotId ? "active" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(botId === activeAccessBotId));
    option.addEventListener("click", () => switchAccessBot(botId));

    const label = document.createElement("span");
    label.className = "home-bot-value";
    label.textContent = botDisplayName(botId, bot);

    const optionStatus = document.createElement("span");
    optionStatus.className = `target-label ${displayState.tone}`.trim();
    optionStatus.textContent = displayState.label;

    option.append(label, optionStatus);
    accessBotOptions.append(option);
  }

  const bot = activeAccessBot();
  const connection = bot.connection || {};
  const displayState = workerDisplayState(activeAccessBotId, bot);
  const worker = telegramWorkerStatus(activeAccessBotId);

  const head = document.createElement("div");
  head.className = "selected-bot-head";

  const name = document.createElement("div");
  name.className = "bot-list-name";
  const nameText = document.createElement("span");
  nameText.textContent = bot.label || (connection.bot_username ? `@${connection.bot_username}` : "Telegram Bot");
  const status = document.createElement("span");
  status.className = `target-label ${displayState.tone}`.trim();
  status.textContent = displayState.label;
  if (worker.message) {
    status.title = worker.message;
  }
  name.append(nameText, status);

  selectedBotMeta.textContent = [
    connection.bot_id || activeAccessBotId,
    connection.mode || "polling",
  ].filter(Boolean).join(" · ");

  head.append(name, selectedBotMeta);
  selectedBotPanel.append(head, accessControlPanel);
  selectedBotPanel.hidden = false;
  accessControlPanel.hidden = false;
}
