function activeHomeBotEntry() {
  return homeBots(activeHomeServiceId).find(([botId]) => botId === activeHomeBotId) || ["", null];
}

function renderHomeServiceModel() {
  const service = state.settings?.services?.[activeHomeServiceId] || {};
  const route = service.model || null;
  const routeEnabled = modelRouteIsEnabled(route);
  const routeIssue = !route || modelRouteHasIssue(route);
  const profileLabel = route ? runtimeProfileLabel(service.model_profile || "default", route) : "";
  homeServiceModelDot.className = "home-listener-dot";
  if (routeEnabled) {
    homeServiceModelDot.classList.add("connected");
  } else {
    homeServiceModelDot.classList.add("error");
  }
  homeServiceModelText.textContent = route ? `${modelRouteLabel(route, "not set yet")} · ${profileLabel}` : "AI Provider (Model) is not configured yet.";
  const serviceLabel = service.label || (activeHomeServiceId === "lark" ? "Lark" : "Telegram");
  homeServiceModelText.title = `Open ${serviceLabel} Service settings`;
  homeServiceModelText.setAttribute("aria-label", `Open ${serviceLabel} Service settings`);
  homeServiceModelText.classList.toggle("is-missing", !route);
  homeServiceModelText.classList.toggle("is-error", routeIssue);
  listenerConfigureButton.classList.remove("is-error");
  homeServiceModelText.dataset.modelProvider = route?.provider_id || route?.provider || "";
  homeServiceModelText.dataset.modelMode = route?.mode_id || route?.mode || "";
}

function effectiveBotRuntimeProfile(bot, route) {
  const service = state.settings?.services?.[activeHomeServiceId] || {};
  const profile = bot?.model_profile_override || service.model_profile || "default";
  return runtimeProfileLabel(profile, route);
}

function botModelMetaText(bot) {
  if (!bot) return "not set yet";
  const model = effectiveBotModelRoute(bot, activeHomeServiceId);
  const routeLabel = modelRouteLabel(model.route, "not set yet");
  const profileLabel = model.route ? effectiveBotRuntimeProfile(bot, model.route) : "";
  if (!model.route) return "not set yet";
  if (model.source === "override") {
    return `${model.enabled ? "Custom" : "Custom unavailable"} · ${routeLabel} · ${profileLabel}`;
  }
  return `Inherits · ${routeLabel} · ${profileLabel}`;
}

function renderHomeModelSettingCard() {
  const options = enabledModelOptions();
  homeModelSettingCard.classList.toggle("warning", !options.length);
  homeModelSettingList.innerHTML = "";

  if (!options.length) {
    const empty = document.createElement("button");
    empty.className = "home-model-setting-empty";
    empty.type = "button";
    empty.textContent = "No enabled models. Configure at least one model to keep replies working.";
    empty.addEventListener("click", () => openModelSettingsModal());
    homeModelSettingList.append(empty);
    return;
  }

  for (const option of options) {
    const item = document.createElement("button");
    item.className = "home-model-setting-item";
    item.type = "button";
    item.addEventListener("click", () => {
      openModelSettingsModal(option.provider_id, option.mode_id);
    });

    const dot = document.createElement("span");
    dot.className = "home-listener-dot connected";

    const label = document.createElement("span");
    label.className = "home-model-setting-label";
    label.textContent = option.label || modelRouteLabel(option, "Model");

    item.append(dot, label);
    homeModelSettingList.append(item);
  }
}

function botActionIcon(name) {
  const icons = {
    edit: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4Z"></path>
      </svg>
    `,
    people: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M19 8v6"></path>
        <path d="M22 11h-6"></path>
      </svg>
    `,
    requests: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h4l2 3h4l2-3h4"></path>
        <path d="M5 13 7 5h10l2 8"></path>
        <path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path>
      </svg>
    `,
  };
  return icons[name] || "";
}

function homeRequestPendingCount(botId) {
  const counts = state.settings?.telegram_request_counts || {};
  return Number(counts?.[botId]?.total || 0);
}

function homeFormatRequestCount(count) {
  return count > 99 ? "99+" : String(count);
}

function createBotActionButton({ icon, label, onClick, quiet = false, pendingCount = null }) {
  const hasPendingCount = Number.isFinite(pendingCount);
  const pendingLabel = hasPendingCount ? homeFormatRequestCount(pendingCount) : "";
  const button = document.createElement("button");
  button.className = `home-bot-action-item ${quiet ? "quiet" : ""} ${hasPendingCount ? `has-request-pill ${pendingCount > 0 ? "request-active" : "request-empty"}` : ""}`;
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", hasPendingCount ? `${label}: ${pendingLabel}` : label);
  if (hasPendingCount) {
    button.dataset.requestCount = pendingLabel;
  }
  button.innerHTML = `<span class="home-bot-action-icon">${botActionIcon(icon)}</span>`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function renderHomeConversationManageButton() {
  if (!homeConversationManageButton) return;
  homeConversationManageButton.hidden = activeHomeServiceId !== "telegram" || !activeHomeBotId;
  homeConversationManageButton.classList.remove("active");
  homeConversationManageButton.setAttribute("aria-pressed", "false");
  homeConversationManageButton.textContent = "manage";
}

function createRemoveConversationCopy(label, targetTypeLabel, isEnabled) {
  const wrap = document.createElement("div");
  wrap.className = "choice-bullet-copy";

  const intro = document.createElement("p");
  intro.textContent = `${label} will be removed from this bot.`;

  const list = document.createElement("ul");
  const subject = targetTypeLabel === "channel" ? "Channels" : "Users";
  const items = [
    `${subject} will be removed from this bot's approval list.`,
    "Historical conversation will be deleted.",
    `An update message will be sent to the ${targetTypeLabel === "channel" ? "channel" : "user"}.`,
  ];
  for (const text of items) {
    const item = document.createElement("li");
    item.textContent = text;
    list.append(item);
  }

  wrap.append(intro, list);
  return wrap;
}

function avatarInitialForChat(chat) {
  return (chat?.target_label || chat?.uid || chat?.id || "C")
    .replace(/^Chat with\s+/i, "")
    .trim()
    .charAt(0)
    .toUpperCase() || "C";
}

function createConversationAvatar(chat) {
  const avatar = document.createElement("span");
  avatar.className = `conversation-trigger-avatar ${conversationAvailabilityKind(chat)}`;
  avatar.setAttribute("aria-hidden", "true");

  const fallback = document.createElement("span");
  fallback.textContent = avatarInitialForChat(chat);
  avatar.append(fallback);

  if (chat?.uid) {
    const img = new Image();
    img.onload = () => {
      avatar.classList.add("has-image");
      avatar.style.backgroundImage = `url("${img.src}")`;
    };
    img.onerror = () => {
      avatar.classList.remove("has-image");
      avatar.style.backgroundImage = "";
    };
    img.src = `/api/avatars/telegram?user_id=${encodeURIComponent(chat.uid)}&bot_id=${encodeURIComponent(chat.bot_id || activeHomeBotId || "default")}`;
  }

  return avatar;
}

function renderHomeConversationMenuOptions(chats) {
  homeConversationMenuOptions.innerHTML = "";
  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "home-conversation-menu-empty";
    const title = document.createElement("strong");
    title.textContent = homeConversationFilter.trim()
      ? "No conversations match your search."
      : `No ${activeHomeConversationKind === "channel" ? "channels" : activeHomeConversationKind === "chat" ? "chats" : "conversations"} with this bot yet.`;
    const copy = document.createElement("span");
    copy.textContent = "Drop a message to begin.";
    empty.append(title, copy);
    homeConversationMenuOptions.append(empty);
    return;
  }

  for (const chat of chats) {
    const option = document.createElement("div");
    option.className = `home-conversation-menu-option ${chat.id === activeChatId ? "active" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(chat.id === activeChatId));
    option.tabIndex = 0;
    const selectChat = () => {
      activeChatId = chat.id;
      homeConversationFilterMenuOpen = false;
      render();
    };
    option.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectChat();
    });

    const content = document.createElement("span");
    content.className = "home-conversation-menu-content";
    content.addEventListener("click", (event) => {
      event.stopPropagation();
      selectChat();
    });

    const text = document.createElement("span");
    text.className = "home-conversation-menu-text";

    const title = document.createElement("span");
    title.className = "home-conversation-menu-title";
    title.textContent = chat.target_label || `Chat: ${chat.id}`;

    const meta = document.createElement("span");
    meta.className = "home-conversation-menu-meta";
    const kindLabel = homeConversationKind(chat) === "channel" ? "Channel" : "Chat";
    meta.textContent = `${kindLabel} · ${formatTime(chat.updated_at)}`;

    text.append(title, meta);
    content.append(createConversationAvatar(chat), text);

    const actions = document.createElement("span");
    actions.className = "home-conversation-menu-actions";

    const accessKind = conversationAccessKind(chat);
    const toggle = document.createElement("button");
    toggle.className = `target-toggle home-conversation-toggle ${accessKind === "enabled" ? "enabled" : ""}`;
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", String(accessKind === "enabled"));
    toggle.title = accessKind === "enabled" ? "Disable conversation" : "Enable conversation";
    toggle.innerHTML = `
      <span class="target-toggle-track" aria-hidden="true">
        <span class="target-toggle-thumb"></span>
      </span>
      <span>${accessKind === "enabled" ? "enabled" : "disabled"}</span>
    `;
    toggle.addEventListener("click", async (event) => {
      event.stopPropagation();
      event.preventDefault();
      toggle.disabled = true;
      try {
        await updateConversationTargetAccess(chat, { enabled: accessKind !== "enabled" });
      } catch (error) {
        toggle.disabled = false;
        updateStatus("error", `save failed · ${formatNow()}`);
        window.alert(error.message || "Save failed.");
      }
    });

    actions.append(toggle);
    option.append(content, actions);
    homeConversationMenuOptions.append(option);
  }
}

function renderChatList() {
  chatList.innerHTML = "";
  homeConversationMenuOptions.innerHTML = "";
  homeConversationPanel.hidden = activeHomeServiceId !== "telegram";
  const visibleChats = syncHomeSelection();

  homeServiceNav.innerHTML = "";
  for (const [serviceId, service] of homeServices()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `home-service-chip ${serviceId === activeHomeServiceId ? "active" : ""}`;
    button.textContent = service?.label || serviceId;
    button.addEventListener("click", () => {
      activeHomeServiceId = serviceId;
      try {
        localStorage.setItem("whalematesActiveHomeService", serviceId);
      } catch (error) {
        // Ignore storage failures; the tab switch should still work.
      }
      activeHomeBotId = "";
      activeChatId = null;
      activeHomeConversationKind = "all";
      homeConversationAccessFilter = "enabled";
      homeConversationFilterMenuOpen = false;
      homeConversationFilter = "";
      homeConversationSearch.value = "";
      render();
    });
    homeServiceNav.append(button);
  }
  renderHomeListenerStatus();
  renderHomeServiceModel();
  renderHomeModelSettingCard();
  renderHomeConversationManageButton();
  const activeServiceLabel = state.settings?.services?.[activeHomeServiceId]?.label
    || (activeHomeServiceId === "lark" ? "Lark" : "Telegram");
  listenerConfigureButton.setAttribute("aria-label", `Manage ${activeServiceLabel} service settings`);
  homeServiceMessagesButton?.setAttribute("aria-label", `Open ${activeServiceLabel} messages settings`);
  homeServiceMessagesButton?.setAttribute("title", `Open ${activeServiceLabel} messages settings`);
  homeBotEditButton.setAttribute("aria-label", `Manage ${activeServiceLabel} bot workers`);

  if (activeHomeServiceId !== "telegram") {
    homeConversationPanel.hidden = false;
    homeBotValue.textContent = "Service not configured";
    homeBotStatus.hidden = false;
    homeBotStatus.className = "bot-state-dot";
    homeBotStatus.title = "not configured";
    homeBotStatus.setAttribute("aria-label", "not configured");
    homeBotTrigger.disabled = true;
    homeBotOptions.innerHTML = "";
    homeBotEditButton.hidden = false;
    homeBotEditButton.disabled = false;
    homeEmptyBotCard.hidden = homeBots(activeHomeServiceId).length > 0;
    renderHomeConversationFilters([]);
    setHomeBotMenu(false);

    const empty = document.createElement("div");
    empty.className = "home-service-empty";
    empty.textContent = "Lark service is not configured yet.";
    chatList.append(empty);
    return;
  }

  const bots = homeBots(activeHomeServiceId);
  homeBotOptions.innerHTML = "";
  homeBotTrigger.disabled = !bots.length;
  const showBotSearch = bots.length >= 5;
  homeBotSearch.hidden = !showBotSearch;
  homeBotFilterTabs.forEach((tab) => {
    tab.hidden = true;
  });
  activeHomeBotKind = "all";
  if (!showBotSearch) {
    homeBotFilter = "";
    homeBotSearch.value = "";
  }

  if (!bots.length) {
    homeConversationPanel.hidden = false;
    homeBotValue.textContent = "No bot configured";
    homeBotStatus.hidden = true;
    homeBotEditButton.hidden = false;
    homeBotEditButton.disabled = false;
    homeEmptyBotCard.hidden = false;
    renderHomeConversationFilters([]);
    setHomeBotMenu(false);
  } else {
    homeEmptyBotCard.hidden = true;
    const activeBot = activeHomeBotEntry()[1];
    const activeState = workerDisplayState(activeHomeBotId, activeBot);
    const botChats = state.chats.filter((chat) => chatBelongsToBot(chat, activeHomeBotId));
    renderHomeConversationFilters(botChats);
    homeBotValue.textContent = botLabel(activeHomeBotId, activeBot);
    homeBotStatus.hidden = false;
    homeBotStatus.className = `bot-state-dot ${botConnectionTone(activeState)}`.trim();
    homeBotStatus.title = activeState.label;
    homeBotStatus.setAttribute("aria-label", activeState.label);
    homeBotEditButton.hidden = false;
    homeBotEditButton.disabled = false;
    const normalizedFilter = homeBotFilter.trim().toLowerCase();
    const filteredBots = bots.filter(([botId, bot]) => {
      const haystack = [
        botLabel(botId, bot),
        botConnectionId(botId, bot),
        workerDisplayState(botId, bot).label,
      ].join(" ").toLowerCase();
      const matchesSearch = !normalizedFilter || haystack.includes(normalizedFilter);
      const matchesKind = activeHomeBotKind === "all" || botFilterKind(botId, bot) === activeHomeBotKind;
      return matchesSearch && matchesKind;
    });

    if (!filteredBots.length) {
      const empty = document.createElement("div");
      empty.className = "home-bot-empty";
      empty.textContent = "No bots match your search.";
      homeBotOptions.append(empty);
    }

    for (const [botId, bot] of filteredBots) {
      const displayState = workerDisplayState(botId, bot);
      const actionsOpen = !collapsedHomeBotActionMenuIds.has(botId);
      const option = document.createElement("div");
      option.className = `home-bot-option home-bot-option-filter ${botId === activeHomeBotId ? "active" : ""} ${actionsOpen ? "actions-open" : ""}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(botId === activeHomeBotId));
      option.addEventListener("click", () => switchHomeBot(botId));

      const status = createBotStateDot(displayState);

      const main = document.createElement("span");
      main.className = "home-bot-option-main";
      const label = document.createElement("span");
      label.className = "home-bot-value";
      label.textContent = botLabel(botId, bot);

      const modelMeta = document.createElement("span");
      modelMeta.className = "home-bot-model-row";
      const model = effectiveBotModelRoute(bot, activeHomeServiceId);
      modelMeta.classList.toggle("is-error", Boolean(model.source === "override" && model.route && !model.enabled));
      modelMeta.textContent = botModelMetaText(bot);

      const actionToggle = document.createElement("button");
      actionToggle.className = "home-bot-option-edit home-bot-action-toggle";
      actionToggle.type = "button";
      actionToggle.setAttribute("aria-label", `${actionsOpen ? "Close" : "Open"} actions for ${botLabel(botId, bot)}`);
      actionToggle.setAttribute("aria-expanded", String(actionsOpen));
      actionToggle.innerHTML = '<span class="home-bot-action-caret" aria-hidden="true"></span>';
      actionToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (actionsOpen) {
          collapsedHomeBotActionMenuIds.add(botId);
        } else {
          collapsedHomeBotActionMenuIds.delete(botId);
        }
        renderChatList();
      });

      main.append(label, modelMeta);

      option.append(status, main, actionToggle);
      if (actionsOpen) {
        const actionDrawer = document.createElement("div");
        actionDrawer.className = "home-bot-action-drawer";
        actionDrawer.addEventListener("click", (event) => event.stopPropagation());
        actionDrawer.append(
          createBotActionButton({
            icon: "edit",
            label: "编辑",
            onClick: () => {
              setHomeBotMenu(false);
              openTelegramBotDetailModal(botId);
            },
          }),
          createBotActionButton({
            icon: "people",
            label: "添加/删除人",
            onClick: () => {
              setHomeBotMenu(false);
              activeTargetType = "chat";
              openTelegramBotDetailModal(botId, { focus: "approval" });
            },
          }),
          createBotActionButton({
            icon: "requests",
            label: "Pending Request",
            quiet: true,
            pendingCount: homeRequestPendingCount(botId),
            onClick: () => {
              setHomeBotMenu(false);
              activeAccessBotId = botId;
              activeTargetType = "chat";
              openRequestsModal();
            },
          }),
        );
        option.append(actionDrawer);
      }
      homeBotOptions.append(option);
    }
  }

  renderHomeConversationMenuOptions([]);

  if (!bots.length) {
    const empty = document.createElement("div");
    empty.className = "status";
    empty.style.padding = "14px 12px";
    empty.textContent = "No bot configured yet. Open Settings to add one.";
    chatList.append(empty);
    return;
  }

  const allBotChats = state.chats.filter((chat) => chatBelongsToBot(chat, activeHomeBotId));

  const normalizedConversationFilter = normalizeSearchText(homeConversationFilter);
  const visibleConversationOptions = allBotChats.filter((chat) => {
    const matchesKind = activeHomeConversationKind === "all" || homeConversationKind(chat) === activeHomeConversationKind;
    const matchesSearch = !normalizedConversationFilter || homeConversationSearchText(chat).includes(normalizedConversationFilter);
    return matchesKind && matchesSearch;
  });
  renderHomeConversationMenuOptions(visibleConversationOptions);

  if (chatList.hidden) {
    return;
  }

  function createAccessFilter() {
    const filter = document.createElement("div");
    filter.className = "conversation-access-filter";
    filter.setAttribute("aria-label", "Filter conversations by access state");
    for (const [value, label] of [["enabled", "Enabled"], ["disabled", "Disabled"]]) {
      const button = document.createElement("button");
      button.className = `conversation-access-filter-button ${homeConversationAccessFilter === value ? "active" : ""}`;
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(homeConversationAccessFilter === value));
      button.addEventListener("click", () => {
        homeConversationAccessFilter = value;
        activeChatId = null;
        render();
      });
      filter.append(button);
    }
    return filter;
  }

  function createConversationManageAction(groupKey, label) {
    const action = document.createElement("button");
    action.className = "conversation-drawer-manage";
    action.type = "button";
    action.textContent = "manage";
    action.setAttribute("aria-label", `Manage ${label}`);
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      openActiveBotAllowlist(groupKey);
    });
    return action;
  }

  function createConversationEmpty(kind) {
    const empty = document.createElement("div");
    empty.className = "conversation-drawer-empty";
    const title = document.createElement("strong");
    title.textContent = `No ${kind === "channel" ? "channels" : "chats"} with this bot yet.`;
    const copy = document.createElement("span");
    copy.textContent = "Drop a message to begin.";
    empty.append(title, copy);
    return empty;
  }

  function createConversationButton(chat) {
    const button = document.createElement("div");
    button.setAttribute("role", "button");
    button.tabIndex = 0;
    button.className = `chat-button ${chat.id === activeChatId ? "active" : ""}`;
    const selectConversation = () => {
      activeChatId = chat.id;
      render();
    };
    button.addEventListener("click", selectConversation);
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectConversation();
    });

    const title = document.createElement("div");
    title.className = "chat-title";
    title.textContent = chat.target_label || `Chat: ${chat.id}`;

    const titleRow = document.createElement("div");
    titleRow.className = "chat-title-row";
    titleRow.append(title, createStatusPill(chat.user_status));

    const footerRow = document.createElement("div");
    footerRow.className = "chat-footer-row";

    const deleteButton = document.createElement("button");
    deleteButton.className = "chat-delete";
    deleteButton.type = "button";
    deleteButton.title = "Delete conversation";
    deleteButton.setAttribute("aria-label", `Delete ${chat.target_label || chat.id}`);
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M19 6l-1 14H6L5 6"></path>
        <path d="M10 11v5"></path>
        <path d="M14 11v5"></path>
      </svg>
    `;
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openDeleteConversationChoice(chat);
    });

    const metaRow = document.createElement("div");
    metaRow.className = "chat-meta-row";
    metaRow.append(
      createMetaText([
        { text: formatTime(chat.updated_at), tone: "tertiary" },
      ]),
    );

    footerRow.append(metaRow, deleteButton);
    button.append(titleRow, footerRow);
    return button;
  }

  const allChatConversations = allBotChats.filter((chat) => homeConversationKind(chat) === "chat");
  const allChannelConversations = allBotChats.filter((chat) => homeConversationKind(chat) === "channel");
  const chatConversations = allChatConversations.filter((chat) => conversationAccessKind(chat) === homeConversationAccessFilter);
  const channelConversations = allChannelConversations.filter((chat) => conversationAccessKind(chat) === homeConversationAccessFilter);
  const groups = [
    ["chat", "Chat List", "chat", allChatConversations, chatConversations],
    ["channel", "Channel List", "channel", allChannelConversations, channelConversations],
  ];

  for (const [groupKey, label, singular, allChats, chats] of groups) {
    const group = document.createElement("section");
    group.className = "conversation-drawer";

    const header = document.createElement("div");
    header.className = "conversation-drawer-head";
    header.setAttribute("aria-expanded", String(homeConversationGroupsOpen[groupKey] !== false));

    const toggleDrawer = () => {
      homeConversationGroupsOpen[groupKey] = homeConversationGroupsOpen[groupKey] === false;
      renderChatList();
    };

    const toggle = document.createElement("button");
    toggle.className = "conversation-drawer-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", String(homeConversationGroupsOpen[groupKey] !== false));
    toggle.addEventListener("click", toggleDrawer);

    const title = document.createElement("span");
    title.className = "conversation-drawer-title";
    title.textContent = label;

    const countText = document.createElement("span");
    countText.className = "conversation-drawer-count-text";
    countText.textContent = `(${allChats.length} ${allChats.length === 1 ? singular : `${singular}s`})`;

    const titleGroup = document.createElement("span");
    titleGroup.className = "conversation-drawer-title-group";

    const manage = createConversationManageAction(groupKey, label);

    titleGroup.append(title, countText);
    toggle.append(titleGroup);

    const caretButton = document.createElement("button");
    caretButton.className = "conversation-drawer-caret-button";
    caretButton.type = "button";
    caretButton.setAttribute("aria-label", `${homeConversationGroupsOpen[groupKey] === false ? "Expand" : "Collapse"} ${label}`);
    caretButton.addEventListener("click", toggleDrawer);

    const caret = document.createElement("span");
    caret.className = "conversation-drawer-caret";
    caret.setAttribute("aria-hidden", "true");
    caretButton.append(caret);

    header.append(toggle, manage, caretButton);
    group.append(header);

    if (homeConversationGroupsOpen[groupKey] !== false) {
      const body = document.createElement("div");
      body.className = "conversation-drawer-body";
      if (groupKey === "chat") {
        body.append(createAccessFilter());
      }
      if (chats.length) {
        for (const chat of chats) {
          body.append(createConversationButton(chat));
        }
      } else {
        body.append(createConversationEmpty(groupKey));
      }
      group.append(body);
    }

    chatList.append(group);
  }
}
