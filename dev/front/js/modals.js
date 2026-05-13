function openSettings() {
  restoreSettingsPlaceholder();
  accessControlManageFocus = false;
  activeMessageServiceId = "telegram";
  activeSettingsView = "messages-telegram-command-flows";
  renderSettings();
  settingsModal.hidden = false;
}

function openActiveServiceMessages() {
  restoreSettingsPlaceholder();
  accessControlManageFocus = false;
  activeMessageServiceId = activeHomeServiceId === "lark" ? "lark" : "telegram";
  activeSettingsView = `messages-${activeMessageServiceId}-command-flows`;
  activeMessageSettingsTab = "command-flows";
  renderSettings();
  settingsModal.hidden = false;
}

function closeSettings() {
  settingsModal.hidden = true;
}

function restoreSettingsPlaceholder() {
  if (!settingsPlaceholderHome || settingsPlaceholder.parentElement === settingsPlaceholderHome) return;
  if (settingsPlaceholderNextSibling && settingsPlaceholderNextSibling.parentElement === settingsPlaceholderHome) {
    settingsPlaceholderHome.insertBefore(settingsPlaceholder, settingsPlaceholderNextSibling);
  } else {
    settingsPlaceholderHome.append(settingsPlaceholder);
  }
}

function mountModelSettingsPlaceholder() {
  if (!modelSettingsModalBody || settingsPlaceholder.parentElement === modelSettingsModalBody) return;
  modelSettingsModalBody.append(settingsPlaceholder);
}

function openTelegramServiceModal() {
  activeServiceConfigTab = "telegram";
  serviceConfigFeedback.textContent = "";
  settingsFeedback.textContent = "";
  renderTelegramServiceManageModal();
  telegramServiceModal.hidden = false;
}

function openLarkServiceModal() {
  activeServiceConfigTab = "lark";
  serviceConfigFeedback.textContent = "";
  settingsFeedback.textContent = "";
  renderLarkServiceManageModal();
  larkServiceModal.hidden = false;
}

function openActiveServiceConfiguration({ focus = "server" } = {}) {
  if (activeHomeServiceId === "telegram" && focus === "server") {
    openTelegramServiceModal();
    return;
  }
  if (activeHomeServiceId === "telegram" && focus === "bot") {
    openTelegramBotWorkersModal();
    return;
  }
  if (activeHomeServiceId === "lark" && focus === "server") {
    openLarkServiceModal();
    return;
  }
  if (activeHomeServiceId === "lark" && focus === "bot") {
    openLarkBotWorkersModal();
    return;
  }

  activeSettingsView = "service";
  activeServiceConfigTab = activeHomeServiceId || "telegram";
  activeServiceBotId = "";
  telegramBotWorkersCard.dataset.manageFocus = focus === "bot" ? "true" : "false";
  serviceConfigFeedback.textContent = "";
  settingsFeedback.textContent = "";
  renderSettings();
  settingsModal.hidden = false;
  const target = activeServiceConfigTab === "lark"
    ? (focus === "bot" ? larkBotWorkersCard : larkServerCard)
    : (focus === "bot" ? telegramBotWorkersCard : telegramServerCard);
  scrollSettingsTarget(target, "center");
}

function closeTelegramServiceModal() {
  telegramServiceModal.hidden = true;
}

function closeLarkServiceModal() {
  larkServiceModal.hidden = true;
}

function openModelSettingsModal(provider = "", mode = "") {
  settingsModal.hidden = true;
  activeSettingsView = "model";
  activeModelProvider = modelProviderFromRouteProvider(provider);
  activeModelMode = mode || "";
  expandedModelMode = "";
  editingModelMode = "";
  accessControlManageFocus = false;
  settingsFeedback.textContent = "";
  serviceConfigFeedback.textContent = "";
  mountModelSettingsPlaceholder();
  renderSettings();
  modelSettingsModal.hidden = false;
  scrollSettingsTarget(settingsPlaceholder, "start");
}

function closeModelSettingsModal() {
  modelSettingsModal.hidden = true;
  restoreSettingsPlaceholder();
  settingsPlaceholder.hidden = true;
}

function openTelegramBotWorkersModal() {
  activeServiceConfigTab = "telegram";
  activeServiceBotId = "";
  telegramManageFeedback.textContent = "";
  telegramManageTokenInput.value = "";
  renderTelegramBotWorkersManageModal();
  telegramBotWorkersModal.hidden = false;
}

function closeTelegramBotWorkersModal() {
  telegramBotWorkersModal.hidden = true;
}

function openLarkBotWorkersModal() {
  activeServiceConfigTab = "lark";
  activeServiceBotId = "";
  larkManageFeedback.textContent = "";
  larkManageTokenInput.value = "";
  renderLarkBotWorkersManageModal();
  larkBotWorkersModal.hidden = false;
}

function closeLarkBotWorkersModal() {
  larkBotWorkersModal.hidden = true;
}

function openTelegramBotDetailModal(botId, { focus = "settings" } = {}) {
  const bots = telegramBots();
  if (!botId || !bots[botId]) return;

  activeServiceConfigTab = "telegram";
  activeServiceBotId = botId;
  activeAccessBotId = botId;
  telegramDetailFocus = focus;
  draftAllowedTargets = null;
  telegramDetailAccessFeedback.textContent = "";
  renderTelegramBotDetailModal();
  telegramBotDetailModal.hidden = false;
  if (focus === "approval") {
    requestAnimationFrame(() => telegramDetailAllowedTargetInput?.focus({ preventScroll: true }));
  }
}

function closeTelegramBotDetailModal() {
  telegramBotDetailModal.hidden = true;
  activeServiceBotId = "";
  telegramDetailFocus = "";
}

function openLarkBotDetailModal(botId = "") {
  activeServiceConfigTab = "lark";
  activeServiceBotId = botId;
  renderLarkBotDetailModal(botId);
  larkBotDetailModal.hidden = false;
}

function closeLarkBotDetailModal() {
  larkBotDetailModal.hidden = true;
  activeServiceBotId = "";
}

function closeRoleChoice() {
  roleChoiceModal.hidden = true;
  roleChoiceModal.classList.remove("error-only");
  roleChoiceClose.classList.remove("is-default-focus");
  pendingRoleChoice = null;
  pendingExtraChoice = null;
  pendingCancelChoice = null;
  roleChoiceExtra.hidden = true;
  roleChoiceCopy.hidden = true;
  roleChoiceError.hidden = true;
  roleChoiceError.textContent = "";
  roleChoiceError.replaceChildren();
  roleChoiceConfirm.className = "choice-action primary";
  roleChoiceExtra.className = "choice-action secondary";
  roleChoiceCancel.className = "choice-action secondary";
}

function openRoleChoice({
  title,
  copy,
  confirmLabel,
  onConfirm,
  extraLabel = "",
  onExtra = null,
  onCancel = null,
  cancelLabel = "Cancel",
  defaultAction = "confirm",
  danger = false,
}) {
  roleChoiceTitle.textContent = title;
  roleChoiceCopy.replaceChildren();
  if (copy instanceof Node) {
    roleChoiceCopy.append(copy);
  } else {
    roleChoiceCopy.textContent = copy;
  }
  roleChoiceCopy.hidden = !copy;
  roleChoiceError.hidden = true;
  roleChoiceError.textContent = "";
  roleChoiceError.replaceChildren();
  roleChoiceModal.classList.remove("error-only");
  roleChoiceConfirm.textContent = confirmLabel;
  roleChoiceCancel.textContent = cancelLabel;
  roleChoiceConfirm.className = `choice-action ${
    defaultAction === "confirm" ? (danger ? "danger" : "primary") : "secondary"
  }`;
  roleChoiceCancel.className = `choice-action ${defaultAction === "cancel" ? "primary" : "secondary"}`;
  roleChoiceExtra.className = `choice-action ${defaultAction === "extra" ? "primary" : "secondary"}`;
  roleChoiceConfirm.hidden = !confirmLabel || !onConfirm;
  roleChoiceCancel.hidden = !cancelLabel || !onCancel;
  roleChoiceExtra.hidden = !extraLabel || !onExtra;
  roleChoiceExtra.textContent = extraLabel;
  pendingRoleChoice = onConfirm;
  pendingExtraChoice = onExtra;
  pendingCancelChoice = onCancel;
  roleChoiceClose.classList.add("is-default-focus");
  roleChoiceModal.hidden = false;
  requestAnimationFrame(() => {
    if (roleChoiceClose) {
      roleChoiceClose.focus();
    } else if (defaultAction === "cancel") {
      roleChoiceCancel.focus();
    } else if (defaultAction === "extra" && !roleChoiceExtra.hidden) {
      roleChoiceExtra.focus();
    } else {
      roleChoiceConfirm.focus();
    }
  });
}

function clearRoleChoiceDefaultFocus() {
  roleChoiceClose.classList.remove("is-default-focus");
}

function showToast(message, type = "info") {
  appToast.textContent = message;
  appToast.dataset.type = type;
  appToast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    appToast.hidden = true;
  }, 1800);
}

function switchTargetType(type) {
  activeTargetType = type;
  settingsFeedback.textContent = "";
  telegramDetailAccessFeedback.textContent = "";
  renderSettings();
  if (!telegramBotDetailModal.hidden) {
    renderTelegramBotDetailModal();
  }
}

function switchSettingsView(view) {
  if (activeSettingsView.startsWith("messages-telegram")) {
    collectMessageCommandSettings();
    draftTelegramMessages = { ...draftTelegramMessages, ...collectMessageTemplateDrafts() };
  }
  activeSettingsView = view;
  if (view !== "telegram") {
    accessControlManageFocus = false;
  }
  if (settingsFeedback) settingsFeedback.textContent = "";
  if (serviceConfigFeedback) serviceConfigFeedback.textContent = "";
  renderSettings();
}

function switchServiceConfigTab(tab) {
  activeServiceConfigTab = tab;
  serviceConfigFeedback.textContent = "";
  renderSettings();
}

function modelProviderFromRouteProvider(provider = "") {
  const normalized = String(provider || "").trim().toLowerCase();
  if (normalized === "anthropic" || normalized === "claude") return "claude";
  if (normalized === "openai") return "openai";
  if (normalized === "ollama") return "ollama";
  if (normalized === "deepseek") return "deepseek";
  return "openai";
}

function openModelConfigurationFromRoute(provider = "", mode = "") {
  restoreSettingsPlaceholder();
  activeSettingsView = "model";
  activeModelProvider = modelProviderFromRouteProvider(provider);
  activeModelMode = mode || "";
  expandedModelMode = "";
  editingModelMode = "";
  accessControlManageFocus = false;
  settingsFeedback.textContent = "";
  serviceConfigFeedback.textContent = "";
  settingsModal.hidden = false;
  renderSettings();
  scrollSettingsTarget(settingsPlaceholder, "start");
}

function scrollSettingsTarget(target, block = "center") {
  requestAnimationFrame(() => {
    target?.scrollIntoView({ block, behavior: "smooth" });
  });
}

function openTelegramServiceConfiguration({ focus = "server" } = {}) {
  activeSettingsView = "service";
  activeServiceConfigTab = "telegram";
  activeServiceBotId = focus === "bot" ? activeServiceBotId : "";
  telegramBotWorkersCard.dataset.manageFocus = focus === "bot" && !activeServiceBotId ? "true" : "false";
  accessControlManageFocus = false;
  serviceConfigFeedback.textContent = "";
  settingsFeedback.textContent = "";
  settingsModal.hidden = false;
  renderSettings();
  if (focus === "server") {
    scrollSettingsTarget(telegramServerCard, "center");
  }
}

function openBotServiceConfiguration(botId, { highlight = true } = {}) {
  activeServiceBotId = highlight ? botId : "";
  if (highlight) {
    activeAccessBotId = botId;
  }
  openTelegramServiceConfiguration({ focus: "bot" });
  scrollSettingsTarget(telegramBotWorkersCard, "center");
  if (!highlight) return;
  requestAnimationFrame(() => {
    const activeBotWorker = telegramBotsList.querySelector(
      `.bot-list-item[data-service-bot-id="${CSS.escape(botId)}"]`,
    );
    scrollSettingsTarget(activeBotWorker, "center");
  });
}

function openBotAllowlist(botId, type = "chat") {
  activeAccessBotId = botId;
  activeTargetType = type;
  activeSettingsView = "telegram";
  accessControlManageFocus = true;
  draftAllowedTargets = null;
  settingsFeedback.textContent = "";
  serviceConfigFeedback.textContent = "";
  settingsModal.hidden = false;
  renderSettings();
  scrollSettingsTarget(accessControlPanel, "center");
}

function openRequestsModal() {
  const bot = activeAccessBot();
  const botId = botConnectionId(activeAccessBotId, bot) || activeAccessBotId;
  const botName = (botLabel(activeAccessBotId, bot) || "Telegram Bot")
    .replace(new RegExp(`\\s*\\(${String(botId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)\\s*$`), "");
  requestsTitle.textContent = `Requests to ${botName} (${botId})`;
  activeRequestsType = activeTargetType;
  requestsQuery = "";
  requestsSearch.value = "";
  requestsHasMore = false;
  requestsLoadMore.hidden = true;
  requestsModal.hidden = false;
  loadRequests();
}

function promptConfigureBotAccess(botId, bot) {
  const confirmed = window.confirm(
    `${bot?.label || botId} has no allowed users or channels yet.\\n\\nOpen Access Control to add one now?`,
  );
  if (!confirmed) return;
  openBotAllowlist(botId, "chat");
}

function openActiveBotAllowlist(type) {
  if (activeHomeBotId) {
    openBotAllowlist(
      activeHomeBotId,
      type || (activeHomeConversationKind === "channel" ? "channel" : "chat"),
    );
    return;
  }
}

function openActiveBotServiceConfiguration() {
  if (activeHomeBotId) {
    openBotServiceConfiguration(activeHomeBotId, { highlight: false });
    return;
  }
  openTelegramServiceConfiguration();
}

function openDeleteConversationChoice(chat) {
  openRoleChoice({
    title: "删除对话？",
    copy: `${chat.target_label || chat.id} 的历史将从 Console 移除，不可恢复，请谨慎操作。`,
    confirmLabel: "仅删除 Console 对话",
    extraLabel: "同时，删除 TG Bot 对应的对话",
    cancelLabel: "取消删除",
    defaultAction: "cancel",
    danger: true,
    onConfirm: async () => {
      closeRoleChoice();
      await deleteConversation(chat.id, "local");
    },
    onExtra: async () => {
      closeRoleChoice();
      await deleteConversation(chat.id, "telegram_recorded");
    },
  });
}

async function deleteConversation(chatId, mode) {
  try {
    const response = await fetch("/api/conversations/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, mode }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    activeChatId = null;
    render();
  } catch (error) {
    updateStatus("error", `delete failed · ${formatNow()}`);
    window.alert(error.message || "Delete failed.");
    console.error(error);
  }
}

function switchAccessBot(botId) {
  activeAccessBotId = botId;
  draftAllowedTargets = null;
  accessBotFilter = "";
  accessBotSearch.value = "";
  setAccessBotMenu(false);
  settingsFeedback.textContent = "";
  renderSettings();
}

function setAccessBotMenu(open) {
  accessBotMenuOpen = open;
  accessBotMenu.hidden = !open;
  accessBotTrigger.classList.toggle("open", open);
  accessBotTrigger.setAttribute("aria-expanded", String(open));
  if (open) {
    requestAnimationFrame(() => accessBotSearch.focus());
  }
}
