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

function activeAccessBot() {
  const bots = telegramBots();
  if (!bots[activeAccessBotId]) {
    activeAccessBotId = Object.keys(bots)[0] || "";
  }
  return bots[activeAccessBotId] || emptyTelegramBot();
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
  const feedback = document.createElement("div");
  feedback.className = "message-reply-feedback";
  feedback.dataset.messageReplyFeedback = item.key;
  feedback.setAttribute("role", "status");
  const save = document.createElement("button");
  save.className = "message-command-action-button primary message-reply-inline-save";
  save.dataset.saveMessageReply = item.key;
  save.type = "button";
  save.textContent = "Save";
  save.disabled = !messageTemplateHasChanges(item.key, textarea.value);
  editor.append(field, feedback, save);
  drawer.append(editor);

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
  const feedback = document.createElement("div");
  feedback.className = "message-reply-feedback";
  feedback.dataset.messageReplyFeedback = key;
  feedback.setAttribute("role", "status");
  const save = document.createElement("button");
  save.className = "message-command-action-button primary message-reply-inline-save";
  save.dataset.saveMessageReply = key;
  save.type = "button";
  save.textContent = "Save";
  save.disabled = !messageTemplateHasChanges(key, value);
  editor.append(field, feedback, save);
  card.append(editor);

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
  if (button.dataset.saveState === "saving" || button.dataset.saveState === "saved") return;
  button.textContent = "Save";
  button.disabled = !messageTemplateHasChanges(key, input.value);
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
  const listenerRunning = isListenerStateRunning(listenerState);
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
  telegramServiceManageToggle.classList.toggle("pending", Boolean(telegramListenerPendingAction));
  telegramServiceManageToggle.classList.toggle("enabled", listenerRunning);
  telegramServiceManageToggle.setAttribute("aria-pressed", String(listenerRunning));
  telegramServiceManageToggle.querySelector(".target-toggle-label").textContent = listenerRunning ? "started" : "stopped";
  const pendingLabel = telegramServiceManageToggle.querySelector(".target-toggle-pending-label");
  if (pendingLabel) {
    pendingLabel.textContent = telegramListenerPendingAction
      ? (telegramListenerPendingAction === "start" ? "Starting..." : "Stopping...")
      : "";
  }
  telegramServiceManageToggle.disabled = Boolean(telegramListenerPendingAction);
  telegramServerManageCard?.classList.toggle("is-stopped", listenerDisplayState === "stopped");
  telegramServerManageCard?.classList.toggle("is-starting", telegramListenerPendingAction === "start" && listenerDisplayState === "stopped");
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
    groupTabEl: groupTargetTab,
    channelTabEl: channelTargetTab,
    panelEl: accessControlPanel,
    publicToggleEl: publicAccessToggle,
    feedbackEl: settingsFeedback,
    manageFocus: accessControlManageFocus,
  });
}



function renderRequests(items, { append = false } = {}) {
  if (!append) {
    requestsList.innerHTML = "";
  }
  currentRequestItems = append ? [...currentRequestItems, ...items] : [...items];
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
