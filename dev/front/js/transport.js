async function loadConversations() {
  if (isLoading) return;
  isLoading = true;

  try {
    const response = await fetch(`/api/conversations?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state = await response.json();
    updateStatus(currentConnectionState());
    render();
  } catch (error) {
    updateStatus("error", `something wrong · ${formatNow()}`);
  } finally {
    isLoading = false;
  }
}

async function refreshConversationsOnce() {
  const response = await fetch(`/api/conversations?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  state = await response.json();
  updateStatus(currentConnectionState());
  render();
  if (!telegramServiceModal.hidden) {
    renderTelegramServiceManageModal();
  }
  if (!larkServiceModal.hidden) {
    renderLarkServiceManageModal();
  }
  return state;
}

function telegramListenerActuallyRunning() {
  return isListenerStateRunning(state.services?.listener?.state);
}

async function waitForListenerState(shouldRun, { attempts = 60, delayMs = 750 } = {}) {
  for (let index = 0; index < attempts; index += 1) {
    await refreshConversationsOnce();
    if (telegramListenerActuallyRunning() === shouldRun) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function listenerIsRunning() {
  const bots = state.settings?.services?.telegram?.bots || {};
  const enabledBotIds = Object.entries(bots)
    .filter(([, bot]) => bot?.enabled && bot?.connection?.bot_token)
    .map(([botId]) => String(botId));
  const runtimeBots = state.runtime?.telegram?.bots || {};
  if (enabledBotIds.length) {
    const workerStates = enabledBotIds.map((botId) => runtimeBots?.[botId]?.state || "");
    if (workerStates.some((workerState) => workerState === "running")) return true;
    if (workerStates.every((workerState) => workerState === "stopped")) return false;
  }
  const listenerState = state.services?.listener?.state;
  return isListenerStateRunning(listenerState);
}

function isListenerStateRunning(listenerState) {
  return Boolean(listenerState && !["stopped", "unknown"].includes(listenerState));
}

function updateStatus(connectionState, text) {
  renderHomeListenerStatus();
}

function currentConnectionState() {
  if (!socket) return "offline";
  if (socket.readyState === WebSocket.OPEN) return "connected";
  if (socket.readyState === WebSocket.CONNECTING) return "reconnecting";
  return "offline";
}

function anyModalOpen() {
  return [...document.querySelectorAll(".modal-backdrop")].some((modal) => !modal.hidden);
}

function syncModalOpenState() {
  const open = anyModalOpen();
  document.body.classList.toggle("modal-open", open);
  shell?.classList.toggle("modal-open", open);
  if (open && isResizingSidebar) {
    isResizingSidebar = false;
    shell?.classList.remove("resizing");
  }
}

function initModalOpenObserver() {
  syncModalOpenState();
  const observer = new MutationObserver(syncModalOpenState);
  document.querySelectorAll(".modal-backdrop").forEach((modal) => {
    observer.observe(modal, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
  });
}

function applyConversationPayload(payload) {
  state = payload;
  if (settingsModal.hidden) {
    const bot = activeAccessBot();
    draftAllowedTargets = {
      chat: normalizeTargetRecords(bot.allowed?.chats || [], "chat"),
      channel: normalizeTargetRecords(bot.allowed?.channels || [], "channel"),
    };
  }
  updateStatus("connected");
  render();
}

function wsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:8766/ws`;
}

function connectWebSocket() {
  if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) {
    return;
  }

  socket = new WebSocket(wsUrl());
  updateStatus("connecting");

  socket.addEventListener("open", () => {
    updateStatus("connected");
    loadConversations();
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "conversation.updated" && message.payload) {
        applyConversationPayload(message.payload);
      } else if (message.type === "console.shutdown") {
        closeConsoleWindow();
      }
    } catch (error) {
      updateStatus("error", `something wrong · ${formatNow()}`);
    }
  });

  socket.addEventListener("close", () => {
    updateStatus("error");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWebSocket, 1200);
  });

  socket.addEventListener("error", () => {
    updateStatus("error");
    socket.close();
  });
}

function setTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem("whalematesTheme", nextTheme);
  } catch (error) {
    // Theme persistence is optional; the visual switch should still work.
  }
  const nextLabel = nextTheme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  themeToggleButton?.setAttribute("aria-label", nextLabel);
  themeToggleButton?.setAttribute("title", nextLabel);
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

function initTheme() {
  let storedTheme = "light";
  try {
    storedTheme = localStorage.getItem("whalematesTheme") || "light";
  } catch (error) {
    storedTheme = "light";
  }
  setTheme(storedTheme);
}

initTheme();

const SIDEBAR_WIDTH_STORAGE_KEY = "whalematesSidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 334;
const MIN_MAIN_WIDTH = 360;
const MAX_SIDEBAR_WIDTH = 520;
let isResizingSidebar = false;

function measuredSidebarMinWidth() {
  const headerTop = document.querySelector(".header-top");
  const brand = document.querySelector(".brand-lockup");
  const brandMark = document.querySelector(".brand-mark");
  const brandCopy = document.querySelector(".brand-copy");
  const brandTitle = document.querySelector(".brand-copy h1");
  const brandSubtitle = document.querySelector(".brand-copy span");
  const actions = document.querySelector(".header-actions");
  if (!headerTop || !brand || !actions) return MIN_SIDEBAR_WIDTH;
  const headerStyle = getComputedStyle(headerTop);
  const brandStyle = getComputedStyle(brand);
  const gap = Number.parseFloat(headerStyle.columnGap || headerStyle.gap || "0") || 0;
  const brandGap = Number.parseFloat(brandStyle.columnGap || brandStyle.gap || "0") || 0;
  const markWidth = brandMark?.getBoundingClientRect().width || 38;
  const copyWidth = Math.max(
    brandCopy?.scrollWidth || 0,
    brandTitle?.scrollWidth || 0,
    brandSubtitle?.scrollWidth || 0,
  );
  const neededWidth = markWidth + brandGap + copyWidth + actions.scrollWidth + gap + 60;
  return Math.max(MIN_SIDEBAR_WIDTH, Math.ceil(neededWidth));
}

function sidebarWidthBounds() {
  const viewportWidth = window.innerWidth || DEFAULT_SIDEBAR_WIDTH + MIN_MAIN_WIDTH;
  const minWidth = measuredSidebarMinWidth();
  const maxWidth = Math.max(
    minWidth,
    Math.min(MAX_SIDEBAR_WIDTH, viewportWidth - MIN_MAIN_WIDTH),
  );
  return { min: minWidth, max: maxWidth };
}

function clampSidebarWidth(width) {
  const { min, max } = sidebarWidthBounds();
  return Math.min(max, Math.max(min, Math.round(width)));
}

function setSidebarWidth(width, { persist = false } = {}) {
  if (!shell) return;
  const nextWidth = clampSidebarWidth(width);
  shell.style.setProperty("--sidebar-width", `${nextWidth}px`);
  if (persist) {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
    } catch (error) {
      // Sidebar persistence is optional.
    }
  }
}

function storedSidebarWidth() {
  try {
    const storedValue = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (!storedValue) return DEFAULT_SIDEBAR_WIDTH;
    const value = Number(storedValue);
    return Number.isFinite(value) ? value : DEFAULT_SIDEBAR_WIDTH;
  } catch (error) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function initSidebarResize() {
  if (!shell || !shellResizer) return;
  setSidebarWidth(storedSidebarWidth());

  shellResizer.addEventListener("pointerdown", (event) => {
    if (anyModalOpen()) return;
    if (window.matchMedia("(max-width: 760px)").matches) return;
    isResizingSidebar = true;
    shell.classList.add("resizing");
    shellResizer.setPointerCapture?.(event.pointerId);
    setSidebarWidth(event.clientX, { persist: true });
  });

  shellResizer.addEventListener("pointermove", (event) => {
    if (!isResizingSidebar) return;
    setSidebarWidth(event.clientX, { persist: true });
  });

  const stopResize = (event) => {
    if (!isResizingSidebar) return;
    isResizingSidebar = false;
    shell.classList.remove("resizing");
    shellResizer.releasePointerCapture?.(event.pointerId);
  };
  shellResizer.addEventListener("pointerup", stopResize);
  shellResizer.addEventListener("pointercancel", stopResize);
  window.addEventListener("resize", () => setSidebarWidth(storedSidebarWidth()));
}

initSidebarResize();
initModalOpenObserver();

function setMobileSidebarCollapsed(collapsed) {
  if (!shell || !mobileSidebarToggle) return;
  shell.classList.toggle("mobile-sidebar-collapsed", collapsed);
  mobileSidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  const label = collapsed ? "Expand top panel" : "Collapse top panel";
  mobileSidebarToggle.setAttribute("aria-label", label);
  mobileSidebarToggle.setAttribute("title", label);
}

function initMobileSidebarToggle() {
  if (!shell || !mobileSidebarToggle) return;
  mobileSidebarToggle.addEventListener("click", () => {
    setMobileSidebarCollapsed(!shell.classList.contains("mobile-sidebar-collapsed"));
  });
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 760px)").matches) {
      setMobileSidebarCollapsed(false);
    }
  });
}

initMobileSidebarToggle();

window.addEventListener("load", () => {
  scrollMessagesToBottom();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadConversations();
    connectWebSocket();
  }
});
settingsButton.addEventListener("click", openConsoleExitChoice);
themeToggleButton?.addEventListener("click", toggleTheme);
roleChoiceConfirm.addEventListener("click", async () => {
  clearRoleChoiceDefaultFocus();
  const action = pendingRoleChoice;
  if (!action) return;
  roleChoiceConfirm.disabled = true;
  roleChoiceExtra.disabled = true;
  roleChoiceCancel.disabled = true;
  try {
    await action();
  } finally {
    roleChoiceConfirm.disabled = false;
    roleChoiceExtra.disabled = false;
    roleChoiceCancel.disabled = false;
  }
});
roleChoiceExtra.addEventListener("click", async () => {
  clearRoleChoiceDefaultFocus();
  const action = pendingExtraChoice;
  if (!action) return;
  roleChoiceConfirm.disabled = true;
  roleChoiceExtra.disabled = true;
  roleChoiceCancel.disabled = true;
  try {
    await action();
  } finally {
    roleChoiceConfirm.disabled = false;
    roleChoiceExtra.disabled = false;
    roleChoiceCancel.disabled = false;
  }
});
roleChoiceCancel.addEventListener("click", async () => {
  clearRoleChoiceDefaultFocus();
  const action = pendingCancelChoice;
  if (!action) {
    closeRoleChoice();
    return;
  }
  roleChoiceConfirm.disabled = true;
  roleChoiceExtra.disabled = true;
  roleChoiceCancel.disabled = true;
  try {
    await action();
  } finally {
    roleChoiceConfirm.disabled = false;
    roleChoiceExtra.disabled = false;
    roleChoiceCancel.disabled = false;
  }
});
roleChoiceClose.addEventListener("click", () => {
  clearRoleChoiceDefaultFocus();
  closeRoleChoice();
});
roleChoiceModal.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    clearRoleChoiceDefaultFocus();
  }
});
roleChoiceModal.addEventListener("click", (event) => {
  if (event.target === roleChoiceModal) {
    closeRoleChoice();
  }
});
telegramServiceModal.addEventListener("click", (event) => {
  const openModelSettingsButton = event.target.closest("[data-open-model-settings]");
  if (openModelSettingsButton) {
    closeTelegramServiceModal();
    openModelSettingsModal();
    return;
  }
  if (event.target === telegramServiceModal) {
    closeTelegramServiceModal();
  }
});
telegramServiceModalClose.addEventListener("click", closeTelegramServiceModal);
telegramServiceManageToggle.addEventListener("click", toggleTelegramListener);
larkServiceModal.addEventListener("click", (event) => {
  const openModelSettingsButton = event.target.closest("[data-open-model-settings]");
  if (openModelSettingsButton) {
    closeLarkServiceModal();
    openModelSettingsModal();
    return;
  }
  if (event.target === larkServiceModal) {
    closeLarkServiceModal();
  }
});
larkServiceModalClose.addEventListener("click", closeLarkServiceModal);
telegramBotWorkersModal.addEventListener("click", (event) => {
  if (event.target === telegramBotWorkersModal) {
    closeTelegramBotWorkersModal();
  }
});
telegramBotWorkersModalClose.addEventListener("click", closeTelegramBotWorkersModal);
telegramManageValidateToken.addEventListener("click", validateTelegramManageToken);
larkBotWorkersModal.addEventListener("click", (event) => {
  if (event.target === larkBotWorkersModal) {
    closeLarkBotWorkersModal();
  }
});
larkBotWorkersModalClose.addEventListener("click", closeLarkBotWorkersModal);
larkManageValidateToken.addEventListener("click", () => {
  larkManageFeedback.textContent = "Lark bot connection is to be released.";
});
telegramBotDetailModal.addEventListener("click", (event) => {
  if (event.target === telegramBotDetailModal) {
    closeTelegramBotDetailModal();
  }
});
telegramBotDetailModalClose.addEventListener("click", closeTelegramBotDetailModal);
larkBotDetailModal.addEventListener("click", (event) => {
  if (event.target === larkBotDetailModal) {
    closeLarkBotDetailModal();
  }
});
larkBotDetailModalClose.addEventListener("click", closeLarkBotDetailModal);
telegramDetailAllowedTargetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addAllowedTarget(telegramDetailAllowedTargetInput.value, {
    inputEl: telegramDetailAllowedTargetInput,
    feedbackEl: telegramDetailAccessFeedback,
    formEl: telegramDetailAllowedTargetForm,
    listEl: telegramDetailAllowedTargets,
  });
});
telegramDetailChatTargetTab.addEventListener("click", () => switchTargetType("chat"));
telegramDetailChannelTargetTab.addEventListener("click", () => switchTargetType("channel"));
telegramDetailRequestsButton.addEventListener("click", () => openRequestsModal());
listenerConfigureButton.addEventListener("click", () => {
  if (activeHomeServiceId === "lark") {
    openLarkServiceModal();
    return;
  }
  openActiveServiceConfiguration({ focus: "server" });
});
homeListenerMeta?.addEventListener("click", () => {
  if (!homeListenerMeta.classList.contains("is-disconnected")) return;
  if (activeHomeServiceId === "lark") {
    openLarkServiceModal();
    return;
  }
  openActiveServiceConfiguration({ focus: "server" });
});
homeListenerMeta?.addEventListener("keydown", (event) => {
  if (!homeListenerMeta.classList.contains("is-disconnected")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  homeListenerMeta.click();
});
homeServiceMessagesButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  openActiveServiceMessages();
});
homeBotEditButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (activeHomeServiceId === "telegram") {
    openTelegramBotWorkersModal();
    return;
  }
  openLarkBotWorkersModal();
});
homeEmptyBotAddButton.addEventListener("click", (event) => {
  event.stopPropagation();
  if (activeHomeServiceId === "telegram") {
    openTelegramBotWorkersModal();
    return;
  }
  openLarkBotWorkersModal();
});
homeConversationManageButton?.addEventListener("click", () => {
  openActiveBotAllowlist();
});
homeServiceModelText.addEventListener("click", () => {
  if (activeHomeServiceId === "lark") {
    openLarkServiceModal();
    return;
  }
  openActiveServiceConfiguration({ focus: "server" });
});
homeModelSettingButton.addEventListener("click", () => {
  openModelSettingsModal();
});
settingsClose.addEventListener("click", closeSettings);
modelSettingsModalClose.addEventListener("click", closeModelSettingsModal);
settingsTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchSettingsView(tab.dataset.settingsView));
});
messageSettingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveMessageSettings();
});
messageSettingsForm.addEventListener("input", (event) => {
  const messageInput = event.target.closest("[data-message-key]");
  if (messageInput) {
    draftTelegramMessages[messageInput.dataset.messageKey] = messageInput.value;
    updateMessageTemplateSaveButton(messageInput.dataset.messageKey);
  }
  if (messageInput || event.target.closest("[data-command-role]")) {
    markMessageSettingsDirty();
  }
});
messageSettingsForm.addEventListener("click", async (event) => {
  const statusMessageTargetTab = event.target.closest("[data-status-message-target-tab]");
  if (statusMessageTargetTab) {
    event.preventDefault();
    activeStatusMessageTarget = statusMessageTargetTab.dataset.statusMessageTargetTab || "service";
    draftTelegramMessages = { ...draftTelegramMessages, ...collectMessageTemplateDrafts() };
    renderMessageSettings();
    return;
  }

  const messageTargetTab = event.target.closest("[data-message-target-tab]");
  if (messageTargetTab) {
    event.preventDefault();
    activeAccessMessageTarget = messageTargetTab.dataset.messageTargetTab || "chat";
    draftTelegramMessages = { ...draftTelegramMessages, ...collectMessageTemplateDrafts() };
    renderMessageSettings();
    return;
  }

  const saveReplyButton = event.target.closest("[data-save-message-reply]");
  if (!saveReplyButton) return;
  event.preventDefault();
  const commandRow = saveReplyButton.closest(".message-command-row");
  if (commandRow?.dataset.commandKey) {
    activeMessageCommandDrawerTabs[commandRow.dataset.commandKey] = "reply";
  }
  const replyKey = saveReplyButton.dataset.saveMessageReply;
  const input = messageSettingsForm.querySelector(`[data-message-key="${replyKey}"]`);
  const value = input?.value ?? "";
  if (!messageTemplateHasChanges(replyKey, value)) {
    saveReplyButton.textContent = "No changes";
    showMessageReplyFeedback(replyKey, "No changes to save.", "info", 3200);
    window.setTimeout(() => {
      if (saveReplyButton.textContent === "No changes") {
        saveReplyButton.textContent = "Save";
      }
    }, 1600);
    updateMessageTemplateSaveButton(replyKey);
    return;
  }
  saveReplyButton.disabled = true;
  saveReplyButton.dataset.saveState = "saving";
  saveReplyButton.textContent = "Saving...";
  showMessageReplyFeedback(replyKey, "Saving...", "info", 10000);
  try {
    await persistSingleMessageTemplate(replyKey, value);
    saveReplyButton.dataset.saveState = "saved";
    saveReplyButton.textContent = "Saved";
    showMessageReplyFeedback(replyKey, "Saved.", "success", 5200);
    window.setTimeout(() => {
      if (saveReplyButton.dataset.saveState === "saved") {
        saveReplyButton.textContent = "Save";
        delete saveReplyButton.dataset.saveState;
        updateMessageTemplateSaveButton(replyKey);
      }
    }, 5200);
  } catch (error) {
    saveReplyButton.textContent = "Save";
    delete saveReplyButton.dataset.saveState;
    showMessageReplyFeedback(replyKey, `Save failed: ${error.message}`, "error", 0);
    saveReplyButton.disabled = false;
  } finally {
    if (saveReplyButton.dataset.saveState !== "saved") {
      updateMessageTemplateSaveButton(replyKey);
    }
  }
});
messageSettingsForm.addEventListener("toggle", (event) => {
  const row = event.target.closest(".message-reply-row");
  if (!row) return;
  const toggle = row.querySelector(".message-command-toggle");
  if (toggle) toggle.textContent = row.open ? "Collapse" : "Expand";
}, true);
syncMessageCommandsButton?.addEventListener("click", syncMessageCommands);
refreshMessageCommandsButton?.addEventListener("click", refreshMessageCommands);
messageSettingsTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchMessageSettingsTab(tab.dataset.messageSettingsTab));
});
addMessageCommandButton?.addEventListener("click", () => {
  collectMessageCommandSettings();
  const commandKey = `custom_${Date.now()}`;
  draftCustomTelegramCommands.push({
    key: commandKey,
    command: "",
    description: "",
  });
  draftTelegramCommandRegistry.push({
    key: commandKey,
    command: "",
    description: "",
    built_in: false,
  });
  draftTelegramCommandOrder.push(commandKey);
  messageCommandDraftActive = true;
  renderMessageSettings();
  const row = messageCommandList?.querySelector(`.message-command-row[data-command-key="${CSS.escape(commandKey)}"]`);
  if (row) {
    row.open = true;
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const toggle = row.querySelector(".message-command-toggle");
    if (toggle) toggle.textContent = "Collapse";
    row.querySelector('[data-command-role="command"]')?.focus();
  }
  markMessageSettingsDirty();
});
messageCommandList?.addEventListener("click", (event) => {
  const drawerTab = event.target.closest("[data-command-drawer-tab]");
  if (drawerTab) {
    event.preventDefault();
    const row = drawerTab.closest(".message-command-row");
    const selectedTab = drawerTab.dataset.commandDrawerTab || "instruction";
    if (row?.dataset.commandKey) {
      activeMessageCommandDrawerTabs[row.dataset.commandKey] = selectedTab;
    }
    row?.querySelectorAll("[data-command-drawer-tab]").forEach((tab) => {
      const active = tab.dataset.commandDrawerTab === selectedTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    row?.querySelectorAll("[data-command-drawer-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.commandDrawerPanel !== selectedTab;
    });
    return;
  }

  const saveButton = event.target.closest("[data-save-command-draft]");
  if (saveButton) {
    event.preventDefault();
    saveMessageCommandDraft(saveButton.dataset.saveCommandDraft);
    return;
  }
  const cancelButton = event.target.closest("[data-cancel-command-draft]");
  if (cancelButton) {
    event.preventDefault();
    cancelMessageCommandDraft(cancelButton.dataset.cancelCommandDraft);
    return;
  }
  const recoverButton = event.target.closest("[data-recover-command-draft]");
  if (recoverButton) {
    event.preventDefault();
    recoverMessageCommand(recoverButton.dataset.recoverCommandDraft);
    return;
  }
  const removeButton = event.target.closest("[data-remove-custom-command]");
  if (!removeButton) return;
  event.preventDefault();
  confirmDeleteMessageCommand(removeButton.dataset.removeCustomCommand);
});
messageCommandList?.addEventListener("toggle", (event) => {
  const row = event.target.closest(".message-command-row");
  const toggle = row?.querySelector(".message-command-toggle");
  if (toggle) {
    toggle.textContent = row.open ? "Collapse" : "Expand";
  }
}, true);
messageCommandList?.addEventListener("dragstart", (event) => {
  const handle = event.target.closest("[data-drag-command-key]");
  if (!handle) {
    event.preventDefault();
    return;
  }
  draggedMessageCommandKey = handle.dataset.dragCommandKey || "";
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedMessageCommandKey);
  handle.closest(".message-command-row")?.classList.add("dragging");
});
messageCommandList?.addEventListener("dragover", (event) => {
  if (!draggedMessageCommandKey) return;
  const row = event.target.closest(".message-command-row");
  if (!row || row.dataset.commandKey === draggedMessageCommandKey) return;
  event.preventDefault();
  const rect = row.getBoundingClientRect();
  const placement = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
  messageCommandList.querySelectorAll(".drag-over-before, .drag-over-after").forEach((item) => {
    item.classList.remove("drag-over-before", "drag-over-after");
  });
  row.classList.add(placement === "after" ? "drag-over-after" : "drag-over-before");
});
messageCommandList?.addEventListener("drop", (event) => {
  if (!draggedMessageCommandKey) return;
  const row = event.target.closest(".message-command-row");
  if (!row || row.dataset.commandKey === draggedMessageCommandKey) return;
  event.preventDefault();
  const rect = row.getBoundingClientRect();
  const placement = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
  reorderMessageCommandByDrag(draggedMessageCommandKey, row.dataset.commandKey, placement);
});
messageCommandList?.addEventListener("dragend", () => {
  draggedMessageCommandKey = "";
  messageCommandList.querySelectorAll(".dragging, .drag-over-before, .drag-over-after").forEach((item) => {
    item.classList.remove("dragging", "drag-over-before", "drag-over-after");
  });
});
serviceConfigTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchServiceConfigTab(tab.dataset.serviceConfigTab));
});
telegramServiceToggle.addEventListener("click", toggleTelegramListener);
homeBotTrigger.addEventListener("click", () => {
  if (homeBotTrigger.disabled) return;
  setHomeBotMenu(!homeBotMenuOpen);
});
homeBotSearch.addEventListener("input", () => {
  homeBotFilter = homeBotSearch.value;
  renderChatList();
});
homeBotFilterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeHomeBotKind = tab.dataset.homeBotKind || "all";
    renderChatList();
  });
});
homeConversationFilterTrigger.addEventListener("click", () => {
  homeConversationFilterMenuOpen = !homeConversationFilterMenuOpen;
  render();
});
homeConversationFilterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeHomeConversationKind = tab.dataset.homeConversationKind || "all";
    render();
  });
});
function updateHomeConversationSearch() {
  homeConversationFilter = homeConversationSearch.value;
  render();
}

homeConversationSearch.addEventListener("input", updateHomeConversationSearch);
homeConversationSearch.addEventListener("keyup", updateHomeConversationSearch);
homeConversationSearch.addEventListener("search", updateHomeConversationSearch);
homeConversationSearch.addEventListener("change", updateHomeConversationSearch);
document.addEventListener("click", (event) => {
  if (homeBotMenuOpen && !homeBotDropdown.contains(event.target)) {
    setHomeBotMenu(false);
  }
  if (homeConversationFilterMenuOpen && !homeConversationFilters.contains(event.target)) {
    homeConversationFilterMenuOpen = false;
    homeConversationFilter = "";
    homeConversationSearch.value = "";
    renderChatList();
  }
});
homeBotDropdown.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && homeBotMenuOpen) {
    event.preventDefault();
    setHomeBotMenu(false);
    homeBotTrigger.focus();
  }
});
accessBotTrigger.addEventListener("click", () => {
  if (accessBotTrigger.disabled) return;
  setAccessBotMenu(!accessBotMenuOpen);
});
accessBotSearch.addEventListener("input", () => {
  accessBotFilter = accessBotSearch.value;
  renderAccessBotSelector();
});
document.addEventListener("click", (event) => {
  if (accessBotMenuOpen && !accessBotDropdown.contains(event.target)) {
    setAccessBotMenu(false);
  }
  if (
    activeModelRouteDropdown
    && !event.target.closest("[data-model-route-dropdown]")
  ) {
    activeModelRouteDropdown = "";
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
  }
});
accessBotDropdown.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accessBotMenuOpen) {
    event.preventDefault();
    setAccessBotMenu(false);
    accessBotTrigger.focus();
  }
});
telegramValidateToken.addEventListener("click", validateTelegramToken);
allowedTargetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addAllowedTarget(allowedTargetInput.value);
});
chatTargetTab.addEventListener("click", () => switchTargetType("chat"));
channelTargetTab.addEventListener("click", () => switchTargetType("channel"));
publicAccessToggle.addEventListener("click", togglePublicAccess);
requestsButton.addEventListener("click", () => {
  openRequestsModal();
});
requestsClose.addEventListener("click", () => {
  requestsModal.hidden = true;
});
requestsModal.addEventListener("click", (event) => {
  if (event.target === requestsModal) {
    requestsModal.hidden = true;
  }
});
requestTypeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeRequestsType = tab.dataset.requestsType || "chat";
    loadRequests();
  });
});
requestsSearch.addEventListener("input", () => {
  requestsQuery = requestsSearch.value;
  loadRequests();
});
requestsSelectAll.addEventListener("click", () => {
  const visibleKeys = currentRequestItems.map(requestTargetKey);
  const selectedCount = visibleKeys.filter((key) => selectedRequestKeys.has(key)).length;
  if (visibleKeys.length && selectedCount === visibleKeys.length) {
    selectedRequestKeys = new Set();
  } else {
    visibleKeys.forEach((key) => selectedRequestKeys.add(key));
  }
  renderRequests(currentRequestItems);
});
requestsMasterCheckbox.addEventListener("change", () => {
  const visibleKeys = currentRequestItems.map(requestTargetKey);
  if (requestsMasterCheckbox.checked) {
    visibleKeys.forEach((key) => selectedRequestKeys.add(key));
  } else {
    selectedRequestKeys = new Set();
  }
  renderRequests(currentRequestItems);
});
requestsClearSelection.addEventListener("click", () => {
  selectedRequestKeys = new Set();
  renderRequests(currentRequestItems);
});
requestsAllowSelected.addEventListener("click", approveSelectedRequests);
requestsRejectSelected.addEventListener("click", rejectSelectedRequests);
requestsLoadMore.addEventListener("click", () => {
  if (!requestsHasMore) return;
  requestsPage += 1;
  loadRequests({ append: true });
});
settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettings();
  }
});
modelSettingsModal.addEventListener("click", (event) => {
  if (event.target === modelSettingsModal) {
    closeModelSettingsModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !roleChoiceModal.hidden) {
    closeRoleChoice();
    return;
  }
  if (event.key === "Escape" && !requestsModal.hidden) {
    requestsModal.hidden = true;
    return;
  }
  if (event.key === "Escape" && !settingsModal.hidden) {
    closeSettings();
    return;
  }
  if (event.key === "Escape" && !modelSettingsModal.hidden) {
    closeModelSettingsModal();
  }
});
loadConversations();
connectWebSocket();
setInterval(loadConversations, 30000);
