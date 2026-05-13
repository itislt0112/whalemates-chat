function addAllowedTarget(value, {
  inputEl = allowedTargetInput,
  feedbackEl = settingsFeedback,
  formEl = allowedTargetForm,
  listEl = allowedTargets,
} = {}) {
  const target = value.trim();
  if (!target) return;
  draftAllowedTargets ||= { chat: [], channel: [] };
  const targets = draftAllowedTargets[activeTargetType] || [];
  if (targets.some((item) => item.id === target)) {
    feedbackEl.textContent = "Already added";
    return;
  }

  const confirmed = window.confirm(`Add ${target} as an allowed ${activeTargetType}?`);
  if (!confirmed) return;
  draftAllowedTargets[activeTargetType] = [
    ...targets,
    {
      id: target,
      role: "public",
      enabled: true,
      added_at: new Date().toISOString(),
    },
  ];
  inputEl.value = "";
  saveAllowedTargetsToServer({ feedbackEl, formEl, listEl });
}

async function setAllowedTargetRole(target, nextRole, {
  feedbackEl = settingsFeedback,
  formEl = allowedTargetForm,
  listEl = allowedTargets,
} = {}) {
  if (!target?.id) return false;

  const currentRole = normalizeApprovalRole(target.role);
  const normalizedNextRole = normalizeApprovalRole(nextRole);
  if (normalizedNextRole === currentRole) {
    showToast(`Successfully set ${target.id}`, "success");
    closeRoleChoice();
    return true;
  }

  draftAllowedTargets ||= { chat: [], channel: [] };
  const targets = draftAllowedTargets[activeTargetType] || [];
  const currentOwner = activeTargetType === "chat"
    ? targets.find((item) => item.id !== target.id && normalizeApprovalRole(item.role) === "owner")
    : null;

  if (normalizedNextRole === "owner" && currentOwner) {
    roleChoiceCopy.textContent = `${target.id}'s role is currently ${formatApprovalRole(currentRole)}.`;
    roleChoiceCopy.hidden = false;
    const title = document.createElement("strong");
    title.textContent = "Only one bot owner is allowed.";
    const copy = document.createElement("span");
    copy.textContent = `${currentOwner.id} is current bot owner.\nPlease remove ${currentOwner.id} as bot owner first.`;
    roleChoiceError.replaceChildren(title, copy);
    roleChoiceError.hidden = false;
    roleChoiceModal.classList.add("error-only");
    roleChoiceClose.classList.add("is-default-focus");
    return false;
  }

  draftAllowedTargets[activeTargetType] = targets.map((item) => {
    if (item.id === target.id) {
      return { ...item, role: normalizedNextRole };
    }
    return item;
  });
  await saveAllowedTargetsToServer({ feedbackEl, formEl, listEl });
  showToast(`Successfully set ${target.id}`, "success");
  closeRoleChoice();
  return true;
}

async function changeTargetRole(target, {
  feedbackEl = settingsFeedback,
  formEl = allowedTargetForm,
  listEl = allowedTargets,
} = {}) {
  if (!target?.id) return;

  const currentRole = normalizeApprovalRole(target.role);

  openRoleChoice({
    title: `Set Role for User ${target.id}`,
    copy: `${target.id}'s role is currently ${formatApprovalRole(currentRole)}.`,
    confirmLabel: currentRole === "owner" ? "" : "Set as bot owner",
    extraLabel: currentRole === "admin" ? "" : "Set as bot admin",
    cancelLabel: currentRole === "public" ? "" : "Set as public",
    defaultAction: "close",
    onConfirm: currentRole === "owner" ? null : () => setAllowedTargetRole(target, "owner", { feedbackEl, formEl, listEl }),
    onExtra: currentRole === "admin" ? null : () => setAllowedTargetRole(target, "admin", { feedbackEl, formEl, listEl }),
    onCancel: currentRole === "public" ? null : () => setAllowedTargetRole(target, "public", { feedbackEl, formEl, listEl }),
  });
}

async function persistAllowedTargetsToServer(allowedChats, allowedChannels, options = {}) {
  const response = await fetch("/api/settings/allowed-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: "telegram",
      bot_id: activeAccessBotId,
      allowed_chats: allowedChats,
      allowed_channels: allowedChannels,
      ...options,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  state = result.payload;
  const accessBot = activeAccessBot();
  draftAllowedTargets = {
    chat: normalizeTargetRecords(accessBot.allowed?.chats || [], "chat"),
    channel: normalizeTargetRecords(accessBot.allowed?.channels || [], "channel"),
  };
  updateStatus(currentConnectionState());
  return result;
}

async function saveAllowedTargetsToServer({
  feedbackEl = settingsFeedback,
  formEl = allowedTargetForm,
  listEl = allowedTargets,
  renderAfter = true,
} = {}) {
  feedbackEl.textContent = "Saving...";
  formEl.querySelectorAll("button, input").forEach((item) => {
    item.disabled = true;
  });
  listEl.querySelectorAll("button").forEach((item) => {
    item.disabled = true;
  });

  try {
    await persistAllowedTargetsToServer(
      draftAllowedTargets?.chat || [],
      draftAllowedTargets?.channel || [],
    );
    feedbackEl.textContent = "Saved";
    if (renderAfter) {
      render();
      if (!telegramBotDetailModal.hidden) {
        renderTelegramBotDetailModal();
      }
    }
  } catch (error) {
    feedbackEl.textContent = `Save failed: ${error.message}`;
  } finally {
    formEl.querySelectorAll("button, input").forEach((item) => {
      item.disabled = false;
    });
    listEl.querySelectorAll("button").forEach((item) => {
      if (item.dataset.locked !== "true") {
        item.disabled = false;
      }
    });
  }
}

async function removeAllowedTarget(target, {
  feedbackEl = settingsFeedback,
  formEl = allowedTargetForm,
  listEl = allowedTargets,
} = {}) {
  if (!target?.id) return;
  closeRoleChoice();
  feedbackEl.textContent = "Disabling...";
  formEl.querySelectorAll("button, input").forEach((item) => {
    item.disabled = true;
  });
  listEl.querySelectorAll("button").forEach((item) => {
    item.disabled = true;
  });

  try {
    draftAllowedTargets ||= { chat: [], channel: [] };
    const currentTargets = draftAllowedTargets[activeTargetType] || [];
    const disabledTargets = currentTargets.map((item) =>
      item.id === target.id ? { ...item, enabled: false } : item,
    );
    await persistAllowedTargetsToServer(
      activeTargetType === "chat" ? disabledTargets : draftAllowedTargets.chat || [],
      activeTargetType === "channel" ? disabledTargets : draftAllowedTargets.channel || [],
      { disabled_message_key: "approval_removed" },
    );

    feedbackEl.textContent = "Removing...";
    const latestTargets = draftAllowedTargets[activeTargetType] || [];
    const removedTargets = latestTargets.filter((item) => item.id !== target.id);
    await persistAllowedTargetsToServer(
      activeTargetType === "chat" ? removedTargets : draftAllowedTargets.chat || [],
      activeTargetType === "channel" ? removedTargets : draftAllowedTargets.channel || [],
      { notify_removed: false },
    );

    feedbackEl.textContent = "Removed";
    showToast(`Removed ${target.id}`, "success");
    render();
    if (!telegramBotDetailModal.hidden) {
      renderTelegramBotDetailModal();
    }
  } catch (error) {
    feedbackEl.textContent = `Remove failed: ${error.message}`;
    showToast(`Remove failed: ${error.message}`, "error");
  } finally {
    formEl.querySelectorAll("button, input").forEach((item) => {
      item.disabled = false;
    });
    listEl.querySelectorAll("button").forEach((item) => {
      if (item.dataset.locked !== "true") {
        item.disabled = false;
      }
    });
  }
}

async function updateConversationTargetAccess(chat, { enabled, remove = false } = {}) {
  if (!chat || !activeHomeBotId) return;

  const bot = homeBots(activeHomeServiceId).find(([id]) => id === activeHomeBotId)?.[1];
  const targetType = homeConversationKind(chat) === "channel" ? "channel" : "chat";
  const key = targetType === "channel" ? "channels" : "chats";
  const currentChats = normalizeTargetRecords(bot?.allowed?.chats || [], "chat");
  const currentChannels = normalizeTargetRecords(bot?.allowed?.channels || [], "channel");
  const targets = targetType === "channel" ? currentChannels : currentChats;
  const targetId = String(chat.target_id || chat.uid || chat.id);
  const existing = targets.find((item) => String(item.id) === targetId);
  const fallbackRole = targetType === "chat" ? "public" : "admin";
  const nextTarget = {
    id: targetId,
    role: existing?.role || fallbackRole,
    enabled: enabled ?? existing?.enabled ?? true,
    added_at: existing?.added_at || new Date().toISOString(),
  };
  const nextTargets = remove
    ? targets.filter((item) => String(item.id) !== targetId)
    : existing
      ? targets.map((item) => (String(item.id) === targetId ? { ...item, enabled: Boolean(enabled) } : item))
      : [...targets, nextTarget];

  const payload = {
    service_id: activeHomeServiceId,
    bot_id: activeHomeBotId,
    allowed_chats: key === "chats" ? nextTargets : currentChats,
    allowed_channels: key === "channels" ? nextTargets : currentChannels,
  };

  const response = await fetch("/api/settings/allowed-targets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }

  state = result.payload;
  if (remove && activeChatId === chat.id) {
    activeChatId = null;
  }
  updateStatus(currentConnectionState());
  render();
}

async function updateTelegramBot(botId, changes) {
  return updateServiceBot("telegram", botId, changes);
}

async function updateServiceBot(serviceId, botId, changes) {
  serviceConfigFeedback.textContent = "Saving...";
  try {
    const response = await fetch(`/api/settings/services/${encodeURIComponent(serviceId)}/bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, ...changes }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    serviceConfigFeedback.textContent = "Saved. Listener will reconcile automatically.";
    if (!telegramBots()[activeAccessBotId]) {
      activeAccessBotId = Object.keys(telegramBots())[0] || "";
      draftAllowedTargets = null;
    }
    updateStatus(currentConnectionState());
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
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
  } catch (error) {
    serviceConfigFeedback.textContent = `Save failed: ${error.message}`;
    if (!telegramBotWorkersModal.hidden) {
      telegramManageFeedback.textContent = `Save failed: ${error.message}`;
    }
    if (!telegramBotDetailModal.hidden) {
      telegramDetailAccessFeedback.textContent = `Save failed: ${error.message}`;
    }
  }
}

async function updateServiceConfig(serviceId, changes) {
  serviceConfigFeedback.textContent = "Saving...";
  try {
    const response = await fetch(`/api/settings/services/${encodeURIComponent(serviceId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    serviceConfigFeedback.textContent = "Saved.";
    updateStatus(currentConnectionState());
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
    if (!larkServiceModal.hidden) {
      renderLarkServiceManageModal();
    }
  } catch (error) {
    serviceConfigFeedback.textContent = `Save failed: ${error.message}`;
  }
}

async function updateTelegramService(changes) {
  return updateServiceConfig("telegram", changes);
}

async function saveMessageSettings() {
  showMessageSettingsFeedback("Saving draft...", "info", 10000);
  updateMessageSettingsStatus("Saving draft");
  try {
    await persistMessageSettingsDraft();
    render();
    showMessageSettingsFeedback("Draft saved locally. Sync commands when ready.", "success");
    updateMessageSettingsStatus("Saved locally");
    return true;
  } catch (error) {
    showMessageSettingsFeedback(`Save failed: ${error.message}`, "error", 6000);
    updateMessageSettingsStatus("Save failed");
    return false;
  }
}

async function persistMessageSettingsDraft() {
  const messages = {
    ...(state.settings?.services?.telegram?.messages || {}),
    ...draftTelegramMessages,
  };
  const commandSettings = collectMessageCommandSettings();
  messageSettingsForm.querySelectorAll("[data-message-key]").forEach((input) => {
    messages[input.dataset.messageKey] = input.value;
  });
  const response = await fetch("/api/settings/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: "telegram",
      commands: commandSettings.commands,
        command_descriptions: commandSettings.commandDescriptions,
        custom_commands: commandSettings.customCommands,
        command_order: commandSettings.commandOrder,
        command_registry: commandSettings.commandRegistry,
        messages,
      }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  state = result.payload;
  messageCommandDraftActive = false;
  draftCustomTelegramCommands = [];
  draftTelegramCommands = {};
  draftTelegramCommandDescriptions = {};
  draftTelegramCommandOrder = [];
  draftTelegramCommandRegistry = [];
  draftTelegramMessages = {};
  return result;
}

async function persistSingleMessageTemplate(key, value) {
  const messages = {
    ...(state.settings?.services?.telegram?.messages || {}),
    [key]: value,
  };
  const response = await fetch("/api/settings/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: "telegram",
      messages,
    }),
  });
  if (response.status === 401) {
    window.location.href = "./app.html";
    throw new Error("Unauthorized");
  }
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  state = result.payload;
  delete draftTelegramMessages[key];
  return result;
}

async function syncMessageCommands() {
  const hasLocalChanges = hasUnsavedMessageCommandChanges();
  showMessageSettingsFeedback("Syncing commands...", "info", 10000);
  updateMessageSettingsStatus("Syncing");
  syncMessageCommandsButton.disabled = true;
  try {
    if (hasLocalChanges) {
      await persistMessageSettingsDraft();
    }
    const response = await fetch("/api/settings/messages/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: "telegram" }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    if (result.payload) {
      state = result.payload;
      render();
    }
    showMessageSettingsFeedback(
      result.command_sync_errors?.length
        ? `Command sync warnings: ${result.command_sync_errors.join("; ")}`
        : "Commands synced to Telegram bots.",
      result.command_sync_errors?.length ? "warning" : "success",
      result.command_sync_errors?.length ? 7000 : 3200,
    );
    updateMessageSettingsStatus(result.command_sync_errors?.length ? "Sync warnings" : "Synced to Telegram");
  } catch (error) {
    showMessageSettingsFeedback(`Sync failed: ${error.message}`, "error", 6000);
    updateMessageSettingsStatus("Sync failed");
  } finally {
    syncMessageCommandsButton.disabled = false;
  }
}

async function performMessageCommandRefresh() {
  showMessageSettingsFeedback("Refreshing commands from backend...", "info", 10000);
  if (refreshMessageCommandsButton) refreshMessageCommandsButton.disabled = true;
  try {
    const response = await fetch("/api/settings/messages/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: "telegram" }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    clearMessageCommandDraft();
    render();
    showMessageSettingsFeedback("Commands refreshed from backend.", "success");
    updateMessageSettingsStatus();
  } catch (error) {
    showMessageSettingsFeedback(`Refresh failed: ${error.message}`, "error");
  } finally {
    if (refreshMessageCommandsButton) refreshMessageCommandsButton.disabled = false;
  }
}

async function syncAndRefreshMessageCommands() {
  showMessageSettingsFeedback("Syncing commands before refresh...", "info", 10000);
  updateMessageSettingsStatus("Syncing");
  if (syncMessageCommandsButton) syncMessageCommandsButton.disabled = true;
  if (refreshMessageCommandsButton) refreshMessageCommandsButton.disabled = true;
  try {
    await persistMessageSettingsDraft();
    const response = await fetch("/api/settings/messages/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: "telegram" }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    if (result.command_sync_errors?.length) {
      throw new Error(result.command_sync_errors.join("; "));
    }
    if (result.payload) {
      state = result.payload;
      render();
    }
    await performMessageCommandRefresh();
  } catch (error) {
    showMessageSettingsFeedback(`Sync failed: ${error.message}`, "error");
    updateMessageSettingsStatus("Sync failed");
  } finally {
    if (syncMessageCommandsButton) syncMessageCommandsButton.disabled = false;
    if (refreshMessageCommandsButton) refreshMessageCommandsButton.disabled = false;
  }
}

function refreshMessageCommands() {
  if (!hasUnsavedMessageCommandChanges() && messageCommandsAreSynced()) {
    performMessageCommandRefresh();
    return;
  }
  const copy = document.createElement("div");
  copy.className = "choice-bullet-copy";
  const intro = document.createElement("p");
  intro.textContent = "Refreshing will pull the current active commands from the backend.";
  const warning = document.createElement("span");
  warning.textContent = "All unsynced changes will be lost, including:";
  const list = document.createElement("ul");
  ["New items", "Drafts", "Pending deletions"].forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  copy.append(intro, warning, list);
  openRoleChoice({
    title: "Refresh commands?",
    copy,
    confirmLabel: "Refresh Anyway",
    extraLabel: "Sync Changes & Refresh",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    onConfirm: async () => {
      closeRoleChoice();
      clearMessageCommandDraft();
      await performMessageCommandRefresh();
    },
    onExtra: async () => {
      closeRoleChoice();
      await syncAndRefreshMessageCommands();
    },
    onCancel: () => {
      closeRoleChoice();
      updateMessageSettingsStatus();
    },
  });
}

async function updateTelegramBotAccess(botId, changes) {
  settingsFeedback.textContent = "Saving...";
  try {
    const response = await fetch("/api/settings/services/telegram/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, ...changes }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    settingsFeedback.textContent = "Saved";
    render();
    if (!telegramBotDetailModal.hidden) {
      renderTelegramBotDetailModal();
    }
  } catch (error) {
    settingsFeedback.textContent = `Save failed: ${error.message}`;
  }
}

async function loadRequests({ append = false } = {}) {
  if (!activeAccessBotId) return;
  if (!append) {
    requestsPage = 1;
    requestsList.innerHTML = "";
    currentRequestItems = [];
    selectedRequestKeys = new Set();
  }
  requestsFeedback.textContent = "Loading...";
  const params = new URLSearchParams({
    bot_id: activeAccessBotId,
    type: activeRequestsType,
    status: "pending",
    q: requestsQuery,
    page: String(requestsPage),
    page_size: "100",
  });
  try {
    const response = await fetch(`/api/settings/telegram/requests?${params.toString()}`);
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    requestsToolbar.hidden = false;
    renderRequests(result.items || [], { append });
    requestsHasMore = Boolean(result.has_more);
    requestsLoadMore.hidden = true;
    requestsFeedback.textContent = `${result.total || 0} pending request${result.total === 1 ? "" : "s"}`;
  } catch (error) {
    requestsFeedback.textContent = `Load failed: ${error.message}`;
  }
}

async function refreshRequestsAndCloseIfEmpty() {
  await loadRequests();
  if (!currentRequestItems.length && !requestsModal.hidden) {
    requestsModal.hidden = true;
  }
}

function requestTargetKey(target) {
  return `${target.target_type || activeRequestsType}:${target.id}`;
}

async function approveRequestTargetSilently(target) {
  const response = await fetch("/api/settings/telegram/requests/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_id: activeAccessBotId,
      target_type: target.target_type,
      target_id: target.id,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  if (result.payload) {
    state = result.payload;
  }
  return result;
}

async function approveRequestTarget(target) {
  requestsFeedback.textContent = "Approving...";
  try {
    await approveRequestTargetSilently(target);
    draftAllowedTargets = null;
    await refreshRequestsAndCloseIfEmpty();
    render();
  } catch (error) {
    requestsFeedback.textContent = `Approve failed: ${error.message}`;
  }
}

async function rejectRequestTargetSilently(target) {
  const response = await fetch("/api/settings/telegram/requests/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_id: activeAccessBotId,
      target_type: target.target_type,
      target_id: target.id,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  if (result.payload) {
    state = result.payload;
  }
  return result;
}

async function rejectRequestTarget(target) {
  requestsFeedback.textContent = "Rejecting...";
  try {
    await rejectRequestTargetSilently(target);
    await refreshRequestsAndCloseIfEmpty();
    render();
  } catch (error) {
    requestsFeedback.textContent = `Reject failed: ${error.message}`;
  }
}

async function approveSelectedRequests() {
  const selected = currentRequestItems.filter((item) => selectedRequestKeys.has(requestTargetKey(item)));
  if (!selected.length) return;
  requestsFeedback.textContent = `Approving ${selected.length}...`;
  try {
    for (const target of selected) {
      await approveRequestTargetSilently(target);
    }
    draftAllowedTargets = null;
    await refreshRequestsAndCloseIfEmpty();
    render();
    showToast(`Successfully approved ${selected.length}`, "success");
  } catch (error) {
    requestsFeedback.textContent = `Approve failed: ${error.message}`;
  }
}

async function rejectSelectedRequests() {
  const selected = currentRequestItems.filter((item) => selectedRequestKeys.has(requestTargetKey(item)));
  if (!selected.length) return;
  requestsFeedback.textContent = `Rejecting ${selected.length}...`;
  try {
    for (const target of selected) {
      await rejectRequestTargetSilently(target);
    }
    await refreshRequestsAndCloseIfEmpty();
    render();
    showToast(`Successfully rejected ${selected.length}`, "success");
  } catch (error) {
    requestsFeedback.textContent = `Reject failed: ${error.message}`;
  }
}

function togglePublicAccess() {
  if (!activeAccessBotId) return;
  const bot = activeAccessBot();
  const nextPublic = !Boolean(bot.public);
  if (!nextPublic) {
    updateTelegramBotAccess(activeAccessBotId, { public: false });
    return;
  }

  openRoleChoice({
    title: "Enable public access?",
    copy: "Anyone who can message this Telegram bot will be able to access it. Disabled users and channels will still be blocked. This can expose your local assistant to unexpected users.",
    confirmLabel: "Enable public access",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    onConfirm: async () => {
      closeRoleChoice();
      await updateTelegramBotAccess(activeAccessBotId, { public: true });
    },
  });
}

async function setTelegramListenerState(action) {
  if (!["start", "stop"].includes(action)) return;
  const listenerState = state.services?.listener?.state;
  const listenerRunning = isListenerStateRunning(listenerState);
  if ((action === "start" && listenerRunning) || (action === "stop" && !listenerRunning)) return;

  const toggles = [telegramServiceToggle, telegramServiceManageToggle].filter(Boolean);
  const applyPendingToggleState = () => {
    telegramListenerPendingAction = action;
    toggles.forEach((toggle) => {
      toggle.classList.add("pending");
      toggle.disabled = true;
    });
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
  };
  serviceConfigFeedback.textContent = action === "start" ? "Starting listener..." : "Stopping listener...";
  applyPendingToggleState();
  try {
    const response = await fetch("/api/services/telegram/listener", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.href = "./app.html";
      return;
    }
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    serviceConfigFeedback.textContent = action === "start" ? "Starting Telegram listener..." : "Stopping Telegram listener...";
    updateStatus(currentConnectionState());
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
    const reachedTargetState = await waitForListenerState(action === "start");
    serviceConfigFeedback.textContent = reachedTargetState
      ? (action === "start" ? "Telegram listener started." : "Telegram listener stopped.")
      : (action === "start"
        ? "Telegram listener is still stopped. Please check service logs or try again."
        : "Telegram listener is still running. Please try stopping again.");
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
  } catch (error) {
    serviceConfigFeedback.textContent = `Service update failed: ${error.message}`;
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
  } finally {
    telegramListenerPendingAction = "";
    toggles.forEach((toggle) => {
      toggle.classList.remove("pending");
      toggle.disabled = false;
    });
    render();
    if (!telegramServiceModal.hidden) {
      renderTelegramServiceManageModal();
    }
  }
}

async function toggleTelegramListener() {
  const listenerState = state.services?.listener?.state;
  const listenerRunning = isListenerStateRunning(listenerState);
  const action = listenerRunning ? "stop" : "start";
  if (action === "start") {
    await setTelegramListenerState("start");
    return;
  }

  openRoleChoice({
    title: "Stop Telegram Server?",
    copy: "All enabled bot workers will stop receiving and replying to Telegram messages until the server is started again.",
    confirmLabel: "Stop server",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    danger: true,
    onConfirm: async () => {
      closeRoleChoice();
      await setTelegramListenerState("stop");
    },
  });
}

function setServiceToggleStopped(toggle, label = "stopped") {
  if (!toggle) return;
  toggle.classList.remove("enabled");
  toggle.setAttribute("aria-pressed", "false");
  toggle.disabled = true;
  const labelEl = toggle.querySelector(".target-toggle-label");
  if (labelEl) labelEl.textContent = label;
}

function markServicesStoppingForExit() {
  setServiceToggleStopped(telegramServiceToggle, "stopping");
  setServiceToggleStopped(telegramServiceManageToggle, "stopping");
  setServiceToggleStopped(larkServiceManageToggle, "stopped");
  if (homeListenerDot) {
    homeListenerDot.className = "home-listener-dot";
  }
  if (homeListenerText) {
    homeListenerText.textContent = `Disconnecting · ${formatNow()}`;
  }
}

function closeConsoleWindow() {
  window.setTimeout(() => {
    window.open("", "_self");
    window.close();
    window.setTimeout(() => {
      document.documentElement.innerHTML = `
        <head>
          <title>AI Chat Console Closed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            :root {
              color-scheme: light dark;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            * { box-sizing: border-box; }
            body {
              align-items: center;
              background:
                radial-gradient(circle at 50% 24%, rgba(132, 102, 255, 0.22), transparent 34%),
                linear-gradient(180deg, #fbf9ff 0%, #efe8ff 100%);
              color: #251b44;
              display: grid;
              min-height: 100vh;
              margin: 0;
              padding: 24px;
              place-items: center;
            }
            main {
              max-width: 420px;
              text-align: center;
            }
            .mark {
              align-items: center;
              background: linear-gradient(135deg, #7ddaff, #7a5cff);
              border: 1px solid rgba(255, 255, 255, 0.75);
              border-radius: 18px;
              box-shadow: 0 18px 45px rgba(97, 73, 190, 0.22);
              color: white;
              display: inline-flex;
              font-size: 28px;
              font-weight: 900;
              height: 64px;
              justify-content: center;
              margin-bottom: 18px;
              width: 64px;
            }
            h1 {
              font-size: clamp(28px, 6vw, 42px);
              line-height: 1;
              margin: 0 0 10px;
            }
            p {
              color: #6d6382;
              font-size: 15px;
              line-height: 1.55;
              margin: 0 0 22px;
            }
            .hint {
              color: #6f57d9;
              font-size: 13px;
              font-weight: 900;
              letter-spacing: 0;
              margin-top: 18px;
              text-transform: uppercase;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background:
                  radial-gradient(circle at 50% 24%, rgba(248, 205, 102, 0.18), transparent 34%),
                  linear-gradient(180deg, #170d32 0%, #100822 100%);
                color: #fff6cf;
              }
              p { color: #cbbfe6; }
              .hint { color: #f4c95d; }
            }
          </style>
        </head>
        <body>
          <main>
            <div class="mark">AI</div>
            <h1>Bye bye</h1>
            <p>Thanks for using AI Chat Console. The local console server has stopped.</p>
            <div class="hint">You can close your tab now ...</div>
          </main>
        </body>
      `;
      notifyNativeConsoleClosed();
    }, 350);
  }, 250);
}

function notifyNativeConsoleClosed() {
  try {
    window.webkit?.messageHandlers?.whalematesNative?.postMessage({
      type: "console.closed",
    });
  } catch (error) {
    // Native close notification is optional; browser tabs keep the Bye page.
  }
}

async function requestConsoleShutdown() {
  closeRoleChoice();
  markServicesStoppingForExit();
  showToast("Stopping console and listeners...", "info");
  settingsButton.disabled = true;
  try {
    const response = await fetch("/api/console/shutdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    showToast("Console stopped.", "success");
    closeConsoleWindow();
  } catch (error) {
    settingsButton.disabled = false;
    showToast(`Exit failed: ${error.message}`, "error");
  }
}

function openConsoleExitChoice() {
  openRoleChoice({
    title: "Exit Console?",
    copy: "This will stop the console server and all local listening services.",
    confirmLabel: "Exit console",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    danger: true,
    onConfirm: requestConsoleShutdown,
    onCancel: closeRoleChoice,
  });
}

async function removeTelegramBot(botId) {
  const bot = telegramBots()[botId] || {};
  if (bot.enabled) {
    serviceConfigFeedback.textContent = "Disable this bot before removing it.";
    return;
  }
  const label = bot.label || botId;
  openRoleChoice({
    title: "Remove bot?",
    copy: `${label} will be removed from this Console. This deletes the bot token, connection settings, allowlist users/channels, runtime status, and local Console conversations created by this bot. Telegram app chat history will not be deleted.`,
    confirmLabel: "Remove bot",
    cancelLabel: "Don't remove",
    defaultAction: "cancel",
    danger: true,
    onConfirm: async () => {
      closeRoleChoice();
      serviceConfigFeedback.textContent = "Removing...";
      try {
        const response = await fetch("/api/settings/services/telegram/bot/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bot_id: botId }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || `HTTP ${response.status}`);
        }
        state = result.payload;
        if (activeAccessBotId === botId) {
          activeAccessBotId = Object.keys(telegramBots())[0] || "";
          draftAllowedTargets = null;
        }
        serviceConfigFeedback.textContent = "Removed. Listener will reconcile automatically.";
        updateStatus(currentConnectionState());
        render();
        if (!telegramBotWorkersModal.hidden) {
          telegramManageFeedback.textContent = "Removed. Listener will reconcile automatically.";
          renderTelegramBotWorkersManageModal();
        }
        if (!telegramBotDetailModal.hidden && activeServiceBotId === botId) {
          closeTelegramBotDetailModal();
        }
      } catch (error) {
        serviceConfigFeedback.textContent = `Remove failed: ${error.message}`;
        if (!telegramBotWorkersModal.hidden) {
          telegramManageFeedback.textContent = `Remove failed: ${error.message}`;
        }
        if (!telegramBotDetailModal.hidden) {
          telegramDetailAccessFeedback.textContent = `Remove failed: ${error.message}`;
        }
      }
    },
  });
}

async function validateTelegramTokenFrom(input, button, feedback) {
  const token = input.value.trim();
  if (!token) {
    feedback.textContent = "Paste a bot token first";
    return;
  }

  openRoleChoice({
    title: "Add Telegram bot?",
    copy: "Validate this token, add the bot worker, and sync Telegram commands.",
    confirmLabel: "Add bot",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    onConfirm: async () => {
      closeRoleChoice();
      await validateAndAddTelegramToken(input, button, feedback, token);
    },
  });
}

function botIdFromToken(token = "") {
  return String(token || "").split(":", 1)[0]?.trim() || "unknown";
}

function setAddBotError(feedback, botId) {
  const box = document.createElement("div");
  box.className = "add-bot-error-box";
  const title = document.createElement("strong");
  title.textContent = "无法添加当前BOT";
  const copy = document.createElement("span");
  copy.textContent = `没有根据当前BOT ID (${botId}) 找到对应的BOT。`;
  box.append(title, copy);
  feedback.replaceChildren(box);
}

async function validateAndAddTelegramToken(input, button, feedback, token) {
  feedback.textContent = "Validating token...";
  button.disabled = true;
  input.disabled = true;

  try {
    const response = await fetch("/api/settings/services/telegram/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_token: token }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    state = result.payload;
    const addedConnectionId = result.connection?.bot_id;
    const addedBot = Object.entries(telegramBots()).find(
      ([, item]) => item.connection?.bot_id === addedConnectionId,
    );
    if (addedBot) {
      activeAccessBotId = addedBot[0];
    }
    const bot = activeAccessBot();
    draftAllowedTargets = {
      chat: normalizeTargetRecords(bot.allowed?.chats || [], "chat"),
      channel: normalizeTargetRecords(bot.allowed?.channels || [], "channel"),
    };
    input.value = "";
    feedback.textContent = result.command_sync_errors?.length
      ? `Bot saved. Command sync warnings: ${result.command_sync_errors.join("; ")}`
      : "Bot saved. Commands synced to this bot. Listener will pick it up automatically.";
    updateStatus(currentConnectionState());
    render();
    if (!telegramBotWorkersModal.hidden) {
      renderTelegramBotWorkersManageModal();
    }
    if (!larkBotWorkersModal.hidden) {
      renderLarkBotWorkersManageModal();
    }
  } catch (error) {
    const botId = botIdFromToken(token);
    setAddBotError(feedback, botId);
    showToast(`无法添加BOT (BOT ID ${botId})`, "error");
  } finally {
    button.disabled = false;
    input.disabled = false;
  }
}

async function validateTelegramToken() {
  await validateTelegramTokenFrom(telegramTokenInput, telegramValidateToken, serviceConfigFeedback);
}

async function validateTelegramManageToken() {
  await validateTelegramTokenFrom(telegramManageTokenInput, telegramManageValidateToken, telegramManageFeedback);
}

async function saveModelConfiguration(provider, mode, values) {
  const payload = {
    provider,
    mode,
  };
  if ("model" in values) {
    payload.model = values.model || "";
  }
  if ("baseUrl" in values) {
    payload.base_url = values.baseUrl || "";
  }
  if ("selectedModels" in values) {
    payload.selected_models = values.selectedModels || [];
  }
  if ("enabled" in values) {
    payload.enabled = Boolean(values.enabled);
  }
  if ("cliPath" in values) {
    payload.cli_path = values.cliPath || "";
  }
  if ("workingDirectory" in values) {
    payload.working_directory = values.workingDirectory || "";
  }
  if ("apiKey" in values && values.includeApiKey !== false) {
    payload.api_key = values.apiKey || "";
  }
  if ("configured" in values) {
    payload.configured = Boolean(values.configured);
  }
  if ("resumeEnabledOnRun" in values) {
    payload.resume_enabled_on_run = Boolean(values.resumeEnabledOnRun);
  }

  const response = await fetch("/api/settings/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  state = result.payload;
  updateStatus(currentConnectionState());
  render();
  return result;
}

async function testModelConfiguration(provider, mode, values) {
  const payload = {
    provider,
    mode,
    model: values.model || "",
    base_url: values.baseUrl || "",
  };
  if ("cliPath" in values) {
    payload.cli_path = values.cliPath || "";
  }
  if ("workingDirectory" in values) {
    payload.working_directory = values.workingDirectory || "";
  }
  if ("apiKey" in values && values.includeApiKey !== false) {
    payload.api_key = values.apiKey || "";
  }

  const response = await fetch("/api/settings/models/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    const error = new Error(result.error || `HTTP ${response.status}`);
    error.reason = result.reason || "";
    throw error;
  }
  return result;
}
