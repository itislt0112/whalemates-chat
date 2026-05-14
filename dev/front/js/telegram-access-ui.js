function normalizeTargetRecords(records, type) {
  return (records || [])
    .map((record, index) => {
      const id = typeof record === "object" ? record.id : record;
      if (!id) return null;
      const fallbackRole = index === 0 && type === "chat" ? "owner" : "admin";
      const rawRole = typeof record === "object" && record.role ? record.role : fallbackRole;
      return {
        id: String(id),
        role: type === "channel" ? normalizeChannelBotStatus(rawRole) : normalizeApprovalRole(rawRole),
        enabled: typeof record === "object" && "enabled" in record ? Boolean(record.enabled) : true,
        added_at: typeof record === "object" && record.added_at ? record.added_at : new Date().toISOString(),
        chat_type: typeof record === "object" && record.chat_type ? String(record.chat_type) : "",
        title: typeof record === "object" && record.title ? String(record.title) : "",
        username: typeof record === "object" && record.username ? String(record.username) : "",
        target_username: typeof record === "object" && record.target_username ? String(record.target_username) : "",
      };
    })
    .filter(Boolean);
}

function sortTargetRecords(records) {
  return [...records].sort((a, b) => {
    if (activeTargetType === "chat") {
      if (normalizeApprovalRole(a.role) === "owner" && normalizeApprovalRole(b.role) !== "owner") return -1;
      if (normalizeApprovalRole(a.role) !== "owner" && normalizeApprovalRole(b.role) === "owner") return 1;
    }
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return new Date(b.added_at || 0) - new Date(a.added_at || 0);
  });
}

function targetStorageType(type = activeTargetType) {
  return type === "channel" ? "channel" : "chat";
}

function recordsForTargetType(type = activeTargetType) {
  const storageType = targetStorageType(type);
  const records = draftAllowedTargets?.[storageType] || [];
  if (type === "group") return records.filter((record) => isGroupTargetRecord(record));
  if (type === "chat") return records.filter((record) => !isGroupTargetRecord(record));
  return records;
}

function statusForGroupChannelTarget(target, activeBot, isChannelTarget) {
  return normalizeChannelBotStatus(
    activeBot.group_channel_statuses?.[target.id]?.status
    || activeBot.channel_statuses?.[target.id]?.status
    || (isChannelTarget ? target.role : "member"),
  );
}

function groupChannelTargetDisplayLabel(target, activeBot) {
  const statusRecord = activeBot.group_channel_statuses?.[target.id]
    || activeBot.channel_statuses?.[target.id]
    || {};
  const name = [
    target.title,
    statusRecord.title,
    target.username,
    target.target_username,
    statusRecord.username,
  ]
    .map((item) => String(item || "").trim())
    .find(Boolean);
  return name ? `${name} · ${target.id}` : target.id;
}

function applyPendingGroupChannelHighlight(listEl) {
  if (
    !pendingGroupChannelHighlight
    || pendingGroupChannelHighlight.type !== activeTargetType
    || pendingGroupChannelHighlight.botId && pendingGroupChannelHighlight.botId !== activeAccessBotId
  ) {
    return;
  }
  const targetId = String(pendingGroupChannelHighlight.id || "");
  if (!targetId) return;
  const row = listEl.querySelector(`[data-target-id="${CSS.escape(targetId)}"]`);
  if (!row) return;
  row.classList.add("target-item-highlight");
  requestAnimationFrame(() => {
    row.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  window.setTimeout(() => {
    row.classList.remove("target-item-highlight");
  }, 3200);
  pendingGroupChannelHighlight = null;
}

function renderAccessControlTargets({
  listEl,
  formEl,
  inputEl,
  chatTabEl,
  groupTabEl,
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
  groupTabEl?.classList.toggle("active", activeTargetType === "group");
  channelTabEl.classList.toggle("active", activeTargetType === "channel");
  chatTabEl.classList.toggle("manage-focus", manageFocus && activeTargetType === "chat");
  groupTabEl?.classList.toggle("manage-focus", manageFocus && activeTargetType === "group");
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
    activeTargetType === "channel"
      ? "Add bot to a Telegram channel to discover it here, or enter channel ID."
      : activeTargetType === "group"
        ? "Add bot to a Telegram group to discover it here, or enter group ID."
        : "Please enter user ID.";
  const isGroupChannelView = activeTargetType === "channel" || activeTargetType === "group";
  const allTargets = sortTargetRecords(recordsForTargetType(activeTargetType));
  const targets = isGroupChannelView
    ? allTargets.filter((target) => {
      const status = statusForGroupChannelTarget(target, activeBot, activeTargetType === "channel");
      const statusMatches = targetStatusFilter === "all" || status === targetStatusFilter;
      const listeningMatches = targetListeningFilter === "all"
        || (targetListeningFilter === "enabled" ? target.enabled : !target.enabled);
      return statusMatches && listeningMatches;
    })
    : allTargets;

  if (isGroupChannelView) {
    const filterBar = document.createElement("div");
    filterBar.className = "target-filter-bar";

    const statusGroup = document.createElement("div");
    statusGroup.className = "target-filter-group roles";
    for (const option of ["all", "member", "admin", "left"]) {
      const button = document.createElement("button");
      button.className = "target-filter-chip";
      button.type = "button";
      button.classList.toggle("active", targetStatusFilter === option);
      button.textContent = option === "all" ? "all roles" : option;
      button.addEventListener("click", () => {
        targetStatusFilter = option;
        renderAccessControlTargets({ listEl, formEl, inputEl, chatTabEl, groupTabEl, channelTabEl, panelEl, publicToggleEl, feedbackEl, manageFocus });
      });
      statusGroup.append(button);
    }

    const accessGroup = document.createElement("label");
    accessGroup.className = "target-filter-group access";
    const accessSelect = document.createElement("select");
    accessSelect.className = "target-filter-select";
    accessSelect.setAttribute("aria-label", "Filter by access state");
    for (const [value, label] of [["all", "all"], ["enabled", "enabled"], ["disabled", "disabled"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = targetListeningFilter === value;
      accessSelect.append(option);
    }
    accessSelect.addEventListener("change", () => {
      targetListeningFilter = accessSelect.value;
      renderAccessControlTargets({ listEl, formEl, inputEl, chatTabEl, groupTabEl, channelTabEl, panelEl, publicToggleEl, feedbackEl, manageFocus });
    });
    accessGroup.append(accessSelect);

    filterBar.append(statusGroup, accessGroup);
    listEl.append(filterBar);
  }

  if (!targets.length) {
    const empty = document.createElement("div");
    if (isGroupChannelView) {
      empty.className = "requests-empty-card target-empty-card";
      const title = document.createElement("strong");
      title.textContent = activeTargetType === "channel"
        ? "No channels with this bot added yet."
        : "No groups with this bot added yet.";
      const subtitle = document.createElement("span");
      subtitle.textContent = activeTargetType === "channel"
        ? "Add this bot to a Telegram channel to discover more."
        : "Add this bot to a Telegram group to discover more.";
      empty.append(title, subtitle);
    } else {
      empty.className = "target-item";
      empty.textContent = "No user IDs configured for this bot.";
    }
    listEl.append(empty);
    return;
  }

  for (const [index, target] of targets.entries()) {
    const row = document.createElement("div");
    row.className = "target-item";
    row.dataset.targetId = String(target.id);

    const info = document.createElement("div");
    info.className = "target-info";

    const main = document.createElement("div");
    main.className = "target-main";

    const value = document.createElement("span");
    value.className = "target-value";

    const isChannelTarget = activeTargetType === "channel";
    const isGroupTarget = activeTargetType === "group";
    value.textContent = isChannelTarget || isGroupTarget
      ? groupChannelTargetDisplayLabel(target, activeBot)
      : target.id;
    const targetTypeForBadge = isChannelTarget ? "channel" : isGroupTarget ? "group" : "";
    const showNewTargetPill = targetTypeForBadge
      ? isNewGroupChannelTarget(activeAccessBotId, targetTypeForBadge, target)
      : false;

    const addedAt = document.createElement("span");
    addedAt.className = "target-time";
    addedAt.textContent = `Added ${formatTime(target.added_at) || "unknown"}`;

    const label = document.createElement("button");
    label.className = "target-label";
    label.type = "button";
    const targetStatus = isChannelTarget || isGroupTarget
      ? statusForGroupChannelTarget(target, activeBot, isChannelTarget)
      : "";
    label.title = isChannelTarget
      ? `${formatChannelBotStatus(targetStatus)} · bot channel status`
      : isGroupTarget
        ? `${formatChannelBotStatus(targetStatus)} · bot group status`
        : `${formatApprovalRole(target.role)} · bot role`;
    label.addEventListener("click", () => {
      if (!isChannelTarget && !isGroupTarget) {
        changeTargetRole(target, { feedbackEl, formEl, listEl });
      }
    });
    label.textContent = isChannelTarget
      ? formatChannelBotStatus(targetStatus)
      : isGroupTarget
        ? formatChannelBotStatus(targetStatus)
        : formatApprovalRole(target.role);
    if (isChannelTarget) {
      label.disabled = true;
    }
    if (isGroupTarget) {
      label.disabled = true;
    }
    const isOwner = !isChannelTarget && !isGroupTarget && normalizeApprovalRole(target.role) === "owner";

    const remove = document.createElement("button");
    remove.className = "target-remove";
    remove.type = "button";
    remove.textContent = "Remove";
    if (isOwner) {
      remove.dataset.locked = "true";
      remove.title = "Change this owner to another role before removing.";
    }
    remove.addEventListener("click", async () => {
      const targetTypeLabel = activeTargetType === "channel" ? "channel" : activeTargetType === "group" ? "group" : "user";
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
      const isGroupChannelRemove = activeTargetType === "channel" || activeTargetType === "group";
      openRoleChoice({
        title: isGroupChannelRemove ? "Remove BOT?" : `Remove ${targetTypeLabel}?`,
        copy: createRemoveConversationCopy(
          target,
          activeTargetType,
          target.enabled,
          botLabel(activeAccessBotId, activeBot),
        ),
        confirmLabel: isGroupChannelRemove ? "Remove BOT" : `Remove ${targetTypeLabel}`,
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
    if (isChannelTarget || isGroupTarget) {
      const listenToggle = document.createElement("button");
      listenToggle.className = "target-toggle";
      listenToggle.type = "button";
      listenToggle.classList.toggle("enabled", Boolean(target.enabled));
      listenToggle.setAttribute("aria-pressed", String(Boolean(target.enabled)));
      listenToggle.setAttribute("aria-label", target.enabled ? "Disable listening" : "Enable listening");
      listenToggle.title = target.enabled ? "Listening is enabled." : "Listening is disabled.";
      listenToggle.innerHTML = `
        <span class="target-toggle-track" aria-hidden="true">
          <span class="target-toggle-thumb"></span>
        </span>
      `;
      listenToggle.disabled = normalizeChannelBotStatus(targetStatus) === "left";
      if (listenToggle.disabled) {
        listenToggle.dataset.locked = "true";
      }
      listenToggle.addEventListener("click", () => {
        toggleAllowedTargetListening(target, !target.enabled, { feedbackEl, formEl, listEl });
      });
      controls.append(listenToggle);
    }
    controls.append(remove);
    if (showNewTargetPill) {
      row.classList.add("has-row-new-pill");
      row.append(createNewPill("target-row-new-pill"));
    }
    row.append(info, controls);
    listEl.append(row);
  }

  applyPendingGroupChannelHighlight(listEl);

  if (isGroupChannelView) {
    markGroupChannelTargetsSeen(activeAccessBotId, activeTargetType);
  }
}

function normalizeApprovalRole(role) {
  return {
    allowed_user: "admin",
    allowed_channel: "admin",
    bot_admin: "admin",
    bot_owner: "owner",
    channel_owner: "admin",
  }[role] || (["owner", "admin", "public"].includes(role) ? role : "public");
}

function formatApprovalRole(role) {
  const normalized = normalizeApprovalRole(role);
  if (normalized === "owner") return "bot owner";
  if (normalized === "admin") return "bot admin";
  return "public";
}

function normalizeChannelBotStatus(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return {
    allowed_channel: "admin",
    bot_admin: "admin",
    channel_owner: "admin",
    owner: "admin",
    administrator: "admin",
    creator: "admin",
    public: "member",
    restricted: "member",
    kicked: "left",
  }[normalized] || (["admin", "member", "left"].includes(normalized) ? normalized : "member");
}

function formatChannelBotStatus(role) {
  return normalizeChannelBotStatus(role);
}

function requestPendingCount(botId = activeAccessBotId) {
  const counts = state.settings?.telegram_request_counts || {};
  return Number(counts?.[botId]?.total || 0);
}

function requestPendingCountByType(type, botId = activeAccessBotId) {
  const counts = state.settings?.telegram_request_counts || {};
  return Number(counts?.[botId]?.[type] || 0);
}

function updateRequestPendingCount(type, total, botId = activeAccessBotId) {
  if (!botId || !type) return;
  const nextSettings = state.settings || {};
  const allCounts = nextSettings.telegram_request_counts || {};
  const current = allCounts[botId] || { total: 0, chat: 0, group: 0, channel: 0 };
  const next = {
    total: Number(current.total || 0),
    chat: Number(current.chat || 0),
    group: Number(current.group || 0),
    channel: Number(current.channel || 0),
    [type]: Number(total || 0),
  };
  next.total = Number(next.chat || 0) + Number(next.group || 0) + Number(next.channel || 0);
  state = {
    ...state,
    settings: {
      ...nextSettings,
      telegram_request_counts: {
        ...allCounts,
        [botId]: next,
      },
    },
  };
}

function formatRequestCount(count) {
  return count > 99 ? "99+" : String(count);
}

function renderRequestButtonCount(button, botId = activeAccessBotId) {
  if (!button) return;
  const count = requestPendingCount(botId);
  const label = document.createElement("span");
  label.textContent = "Requests";
  if (count === 0) {
    button.replaceChildren(label);
    return;
  }
  const badge = document.createElement("span");
  badge.className = "request-button-count";
  badge.textContent = formatRequestCount(count);
  badge.title = `${count} pending request${count === 1 ? "" : "s"}`;
  button.replaceChildren(label, badge);
}

function telegramDetailTitleActions() {
  return telegramDetailAccessCard?.querySelector(".service-section-title");
}

function removeTelegramDetailSectionTitle() {
  telegramDetailTitleActions()?.remove();
  telegramDetailAccessCard?.classList.add("detail-no-shell");
}

function restoreTelegramDetailSectionTitle() {
  if (!telegramDetailAccessCard) return;
  telegramDetailAccessCard.classList.remove("detail-no-shell");
  if (telegramDetailTitleActions()) return;
  const sectionTitle = document.createElement("div");
  sectionTitle.className = "service-section-title";
  const textWrap = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = "Approval List";
  const copy = document.createElement("p");
  copy.className = "service-subcopy";
  copy.textContent = "Manage this bot's allowed users, groups, and channels.";
  textWrap.append(title, copy);
  sectionTitle.append(textWrap);
  telegramDetailAccessCard.prepend(sectionTitle);
}

function removeTelegramDetailRequestsButton() {
  telegramDetailRequestsButton?.remove();
}

function restoreTelegramDetailRequestsButton() {
  const title = telegramDetailTitleActions();
  if (!title || !telegramDetailRequestsButton || telegramDetailRequestsButton.parentElement) return;
  title.append(telegramDetailRequestsButton);
}

function ensureTelegramDetailTargetForm() {
  if (!telegramDetailAllowedTargetForm || !telegramDetailAllowedTargets) return;
  if (telegramDetailAllowedTargetForm.parentElement) return;
  telegramDetailAllowedTargets.before(telegramDetailAllowedTargetForm);
}

function renderTelegramDetailTabSet(mode) {
  const tabGroup = telegramDetailAccessPanel?.querySelector(".target-tab-group");
  if (!tabGroup) return;
  if (mode === "user") {
    tabGroup.replaceChildren(telegramDetailChatTargetTab, telegramDetailRequestsTargetTab);
    return;
  }
  if (mode === "group-channel") {
    tabGroup.replaceChildren(telegramDetailGroupTargetTab, telegramDetailChannelTargetTab);
    return;
  }
  tabGroup.replaceChildren(telegramDetailChatTargetTab, telegramDetailGroupTargetTab, telegramDetailChannelTargetTab);
}

function renderTelegramDetailRequestsTabLabel() {
  const count = requestPendingCountByType("chat", activeServiceBotId || activeAccessBotId);
  telegramDetailRequestsTargetTab.setAttribute("aria-label", `Requests, ${count} pending`);
  const label = document.createElement("span");
  label.textContent = "Requests";
  if (count === 0) {
    telegramDetailRequestsTargetTab.replaceChildren(label);
    return;
  }
  const badge = document.createElement("span");
  badge.className = "request-button-count";
  badge.textContent = formatRequestCount(count);
  badge.title = `${count} pending request${count === 1 ? "" : "s"}`;
  telegramDetailRequestsTargetTab.replaceChildren(label, badge);
}

function createNewPill(className = "") {
  const pill = document.createElement("span");
  pill.className = `new-pill ${className}`.trim();
  pill.textContent = "new";
  return pill;
}

function renderGroupChannelTabLabel(tab, label, type, botId = activeAccessBotId) {
  tab.replaceChildren(document.createTextNode(label));
  if (hasNewGroupChannelTargets(botId, type)) {
    tab.append(createNewPill("target-tab-new-pill"));
  }
}

function renderTelegramDetailRequestsPanel() {
  telegramDetailAllowedTargets.innerHTML = "";
  telegramDetailAllowedTargetForm.remove();
  renderTelegramDetailRequestsTabLabel();
  telegramDetailAccessFeedback.textContent = telegramDetailRequestsLoading ? "Loading..." : "";

  if (telegramDetailRequestsLoading) {
    const loading = document.createElement("div");
    loading.className = "requests-empty-card";
    loading.textContent = "Loading pending requests...";
    telegramDetailAllowedTargets.append(loading);
    return;
  }

  if (!telegramDetailRequestItems.length) {
    const empty = document.createElement("div");
    empty.className = "requests-empty-card";
    empty.textContent = "There is no pending user request currently ...";
    telegramDetailAllowedTargets.append(empty);
    return;
  }

  const bulkbar = createTelegramDetailRequestsBulkbar();
  telegramDetailAllowedTargets.append(bulkbar);

  for (const target of telegramDetailRequestItems) {
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
      renderTelegramDetailRequestsPanel();
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

    const status = document.createElement("span");
    status.className = "target-label";
    status.textContent = target.status || "pending";
    valueRow.append(value, idValue, status);

    const meta = document.createElement("span");
    meta.className = "request-row-meta";
    meta.textContent = formatDateTime(target.last_request_at || target.last_seen_at) || "--";

    const actions = document.createElement("div");
    actions.className = "target-actions";

    const approve = document.createElement("button");
    approve.className = "target-action secondary compact";
    approve.type = "button";
    approve.textContent = "Approve";
    approve.addEventListener("click", async () => {
      telegramDetailAccessFeedback.textContent = "Approving...";
      try {
        await approveRequestTargetSilently(target);
        draftAllowedTargets = null;
        await loadTelegramDetailUserRequests({ force: true });
        render();
      } catch (error) {
        telegramDetailAccessFeedback.textContent = `Approve failed: ${error.message}`;
      }
    });

    const reject = document.createElement("button");
    reject.className = "target-action secondary compact";
    reject.type = "button";
    reject.textContent = "Reject";
    reject.addEventListener("click", async () => {
      telegramDetailAccessFeedback.textContent = "Rejecting...";
      try {
        await rejectRequestTargetSilently(target);
        await loadTelegramDetailUserRequests({ force: true });
        render();
      } catch (error) {
        telegramDetailAccessFeedback.textContent = `Reject failed: ${error.message}`;
      }
    });

    actions.append(approve, reject);
    main.append(valueRow);
    row.classList.toggle("selected", checkbox.checked);
    row.append(checkbox, main, meta, actions);
    telegramDetailAllowedTargets.append(row);
  }
}

function createTelegramDetailRequestsBulkbar() {
  const bar = document.createElement("div");
  bar.className = "requests-action-row detail-requests-action-row";

  const bulkbar = document.createElement("div");
  bulkbar.className = "requests-bulkbar";

  const visibleKeys = telegramDetailRequestItems.map(requestTargetKey);
  const selectedCount = visibleKeys.filter((key) => selectedRequestKeys.has(key)).length;
  const allSelected = visibleKeys.length > 0 && selectedCount === visibleKeys.length;

  const master = document.createElement("input");
  master.className = "request-checkbox request-master-checkbox";
  master.type = "checkbox";
  master.checked = allSelected;
  master.indeterminate = selectedCount > 0 && !allSelected;
  master.setAttribute("aria-label", "Select all requests");
  master.addEventListener("change", () => {
    if (master.checked) {
      visibleKeys.forEach((key) => selectedRequestKeys.add(key));
    } else {
      visibleKeys.forEach((key) => selectedRequestKeys.delete(key));
    }
    renderTelegramDetailRequestsPanel();
  });

  const selectAll = document.createElement("button");
  selectAll.className = "request-select-toggle";
  selectAll.type = "button";
  selectAll.textContent = allSelected ? "Clear" : "Select all";
  selectAll.addEventListener("click", () => {
    if (allSelected) {
      visibleKeys.forEach((key) => selectedRequestKeys.delete(key));
    } else {
      visibleKeys.forEach((key) => selectedRequestKeys.add(key));
    }
    renderTelegramDetailRequestsPanel();
  });

  const actions = document.createElement("div");
  actions.className = "requests-bulk-actions";

  const selectedLabel = document.createElement("span");
  selectedLabel.className = "requests-selected-count";
  selectedLabel.textContent = `${selectedCount} selected`;

  const approve = document.createElement("button");
  approve.className = "request-bulk-approve";
  approve.type = "button";
  approve.textContent = "Approve";
  approve.disabled = selectedCount === 0;
  approve.addEventListener("click", approveTelegramDetailSelectedRequests);

  const reject = document.createElement("button");
  reject.className = "request-bulk-reject";
  reject.type = "button";
  reject.textContent = "Reject";
  reject.disabled = selectedCount === 0;
  reject.addEventListener("click", rejectTelegramDetailSelectedRequests);

  actions.append(selectedLabel, approve, reject);
  bulkbar.append(master, selectAll, actions);
  bar.append(bulkbar);
  return bar;
}

async function approveTelegramDetailSelectedRequests() {
  const selected = telegramDetailRequestItems.filter((item) => selectedRequestKeys.has(requestTargetKey(item)));
  if (!selected.length) return;
  telegramDetailAccessFeedback.textContent = `Approving ${selected.length}...`;
  try {
    for (const target of selected) {
      await approveRequestTargetSilently(target);
    }
    draftAllowedTargets = null;
    selectedRequestKeys = new Set();
    await loadTelegramDetailUserRequests({ force: true });
    render();
  } catch (error) {
    telegramDetailAccessFeedback.textContent = `Approve failed: ${error.message}`;
  }
}

async function rejectTelegramDetailSelectedRequests() {
  const selected = telegramDetailRequestItems.filter((item) => selectedRequestKeys.has(requestTargetKey(item)));
  if (!selected.length) return;
  telegramDetailAccessFeedback.textContent = `Rejecting ${selected.length}...`;
  try {
    for (const target of selected) {
      await rejectRequestTargetSilently(target);
    }
    selectedRequestKeys = new Set();
    await loadTelegramDetailUserRequests({ force: true });
    render();
  } catch (error) {
    telegramDetailAccessFeedback.textContent = `Reject failed: ${error.message}`;
  }
}

async function loadTelegramDetailUserRequests({ force = false } = {}) {
  const loadKey = `${activeAccessBotId}:chat`;
  if (!force && telegramDetailRequestsLoadedFor === loadKey) return;
  telegramDetailRequestsLoading = true;
  renderTelegramDetailRequestsPanel();
  const params = new URLSearchParams({
    bot_id: activeAccessBotId,
    type: "chat",
    status: "pending",
    q: "",
    page: "1",
    page_size: "100",
  });
  try {
    const response = await fetch(`/api/settings/telegram/requests?${params.toString()}`);
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    telegramDetailRequestItems = result.items || [];
    telegramDetailRequestsLoadedFor = loadKey;
    updateRequestPendingCount("chat", result.total || 0);
    renderTelegramDetailRequestsTabLabel();
    telegramDetailAccessFeedback.textContent = "";
  } catch (error) {
    telegramDetailAccessFeedback.textContent = `Load failed: ${error.message}`;
    telegramDetailRequestItems = [];
  } finally {
    telegramDetailRequestsLoading = false;
    if (!telegramBotDetailModal.hidden && telegramDetailFocus === "approval" && telegramDetailListTab === "requests") {
      renderTelegramDetailRequestsPanel();
    }
  }
}
