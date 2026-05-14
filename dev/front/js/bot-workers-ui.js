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
  const showUserList = telegramDetailFocus === "approval";
  const showGroupChannelList = telegramDetailFocus === "group-channel";
  const showSettings = !showUserList && !showGroupChannelList;
  const showApproval = showUserList || showGroupChannelList;
  const botId = botConnectionId(activeServiceBotId, bot) || activeServiceBotId;
  const botHandle = connection.bot_username
    ? `@${String(connection.bot_username).replace(/^@/, "")}`
    : label;
  telegramBotDetailModalTitle.textContent = showUserList
    ? "User List"
    : showGroupChannelList
      ? "Channel / Group List"
      : `${label} Settings`;
  telegramBotDetailModalMeta.hidden = !showApproval;
  telegramBotDetailModalMeta.replaceChildren();
  if (showApproval) {
    const icon = document.createElement("span");
    icon.className = "bot-detail-meta-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="7" width="14" height="12" rx="4"></rect>
        <path d="M12 7V4"></path>
        <path d="M9 12h.01"></path>
        <path d="M15 12h.01"></path>
      </svg>
    `;
    const text = document.createElement("span");
    text.textContent = [botHandle, botId].filter(Boolean).join(" · ");
    telegramBotDetailModalMeta.append(icon, text);
  }
  telegramBotDetailModalSubtitle.hidden = !showApproval;
  telegramBotDetailModalSubtitle.textContent = showUserList
    ? "Manage allowed users and pending user requests."
    : showGroupChannelList
      ? `Manage groups and channels with ${botHandle} added.`
      : "";
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

  if (showApproval) {
    removeTelegramDetailSectionTitle();
    removeTelegramDetailRequestsButton();

    if (showUserList) {
      activeTargetType = "chat";
      renderTelegramDetailTabSet("user");
      telegramDetailChatTargetTab.replaceChildren(document.createTextNode("Approvals"));
      renderTelegramDetailRequestsTabLabel();
      telegramDetailChatTargetTab.classList.toggle("active", telegramDetailListTab === "approvals");
      telegramDetailRequestsTargetTab.classList.toggle("active", telegramDetailListTab === "requests");
      if (telegramDetailListTab === "requests") {
        telegramDetailAllowedTargetForm.remove();
        renderTelegramDetailRequestsPanel();
        loadTelegramDetailUserRequests();
      } else {
        ensureTelegramDetailTargetForm();
        renderAccessControlTargets({
          listEl: telegramDetailAllowedTargets,
          formEl: telegramDetailAllowedTargetForm,
          inputEl: telegramDetailAllowedTargetInput,
          chatTabEl: telegramDetailChatTargetTab,
          groupTabEl: null,
          channelTabEl: telegramDetailChannelTargetTab,
          panelEl: telegramDetailAccessPanel,
          feedbackEl: telegramDetailAccessFeedback,
          manageFocus: true,
        });
      }
    } else {
      telegramDetailListTab = "approvals";
      if (activeTargetType !== "channel") activeTargetType = "group";
      renderTelegramDetailTabSet("group-channel");
      telegramDetailAllowedTargetForm.remove();
      renderGroupChannelTabLabel(telegramDetailGroupTargetTab, "Groups", "group", activeAccessBotId);
      renderGroupChannelTabLabel(telegramDetailChannelTargetTab, "Channels", "channel", activeAccessBotId);
      renderAccessControlTargets({
        listEl: telegramDetailAllowedTargets,
        formEl: telegramDetailAllowedTargetForm,
        inputEl: telegramDetailAllowedTargetInput,
        chatTabEl: telegramDetailChatTargetTab,
        groupTabEl: telegramDetailGroupTargetTab,
        channelTabEl: telegramDetailChannelTargetTab,
        panelEl: telegramDetailAccessPanel,
        feedbackEl: telegramDetailAccessFeedback,
        manageFocus: true,
      });
    }
  } else {
    restoreTelegramDetailSectionTitle();
    restoreTelegramDetailRequestsButton();
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
      enabledAllowedCount(bot, "chat") + enabledAllowedCount(bot, "group") + enabledAllowedCount(bot, "channel") > 0;
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
