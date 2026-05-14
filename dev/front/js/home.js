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
    groups: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M7 21v-2a4 4 0 0 1 3-3.87"></path>
        <circle cx="12" cy="7" r="4"></circle>
        <path d="M5 8a3 3 0 1 0 0 6"></path>
        <path d="M19 8a3 3 0 1 1 0 6"></path>
      </svg>
    `,
  };
  return icons[name] || "";
}

function homeUserRequestPendingCount(botId) {
  const counts = state.settings?.telegram_request_counts || {};
  return Number(counts?.[botId]?.chat || 0);
}

function homeFormatRequestCount(count) {
  return count > 99 ? "99+" : String(count);
}

function createBotActionButton({ icon, label, onClick, quiet = false, pendingCount = null, newBadge = false }) {
  const hasPendingCount = Number.isFinite(pendingCount);
  const pendingLabel = hasPendingCount ? homeFormatRequestCount(pendingCount) : "";
  const button = document.createElement("button");
  button.className = `home-bot-action-item ${quiet ? "quiet" : ""} ${hasPendingCount ? `has-request-pill ${pendingCount > 0 ? "request-active" : "request-empty"}` : ""} ${newBadge ? "has-new-pill" : ""}`;
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", newBadge ? `${label}: new item` : hasPendingCount ? `${label}: ${pendingLabel}` : label);
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

function targetRemoveDisplayName(target) {
  const username = String(target?.username || target?.target_username || "").trim();
  if (username) return username.startsWith("@") ? username : `@${username}`;
  return String(target?.title || target?.id || "").trim() || "this target";
}

function createRemoveConversationCopy(target, targetTypeLabel, isEnabled, botName = "This bot") {
  const wrap = document.createElement("div");
  wrap.className = "choice-bullet-copy";

  const isGroupChannel = targetTypeLabel === "channel" || targetTypeLabel === "group";
  const label = typeof target === "object" ? targetRemoveDisplayName(target) : String(target || "");
  const intro = document.createElement("p");
  intro.textContent = isGroupChannel
    ? `${botName} will be removed from this ${targetTypeLabel} ${label}.`
    : `${label} will be removed from this bot.`;

  const list = document.createElement("ul");
  const subject = targetTypeLabel === "channel" ? "Channels" : targetTypeLabel === "group" ? "Groups" : "Users";
  const items = isGroupChannel
    ? [
        `The bot will leave this Telegram ${targetTypeLabel}.`,
        "All conversation history stored locally will be deleted.",
      ]
    : [
        `${subject} will be removed from this bot's approval list.`,
        "Historical conversation will be deleted.",
        `An update message will be sent to the ${targetTypeLabel === "channel" ? "channel" : targetTypeLabel === "group" ? "group" : "user"}.`,
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

  const avatarUrl = conversationAvatarUrl(chat);
  if (avatarUrl) {
    const img = new Image();
    img.onload = () => {
      avatar.classList.add("has-image");
      avatar.style.backgroundImage = `url("${img.src}")`;
    };
    img.onerror = () => {
      avatar.classList.remove("has-image");
      avatar.style.backgroundImage = "";
    };
    img.src = avatarUrl;
  }

  return avatar;
}

function renderHomeConversationMenuOptions(chats) {
  homeConversationMenuOptions.innerHTML = "";
  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "home-conversation-menu-empty";
    const title = document.createElement("strong");
    const copy = document.createElement("span");
    if (homeConversationFilter.trim()) {
      title.textContent = "No conversations match your search.";
      copy.textContent = "Try another keyword.";
    } else if (activeHomeConversationKind === "channel") {
      title.textContent = "No channel with this bot added yet.";
      copy.textContent = "Add this bot to a channel to discover more.";
    } else if (activeHomeConversationKind === "group") {
      title.textContent = "No group with this bot added yet.";
      copy.textContent = "Add this bot to a group to discover more.";
    } else {
      title.textContent = "No chats with this bot yet.";
      copy.textContent = "Drop a message to begin.";
    }
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
      renderChatList();
      renderMessages();
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
    title.append(createConversationTitleFragment(chat));

    const meta = document.createElement("span");
    meta.className = "home-conversation-menu-meta";
    meta.append(createConversationBotMeta(chat));

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

function renderHomeConversationDropdown() {
  const botChats = state.chats.filter((chat) => chatBelongsToBot(chat, activeHomeBotId));
  ensureHomeConversationKind(botChats);
  renderHomeConversationFilters(botChats);
  const normalizedConversationFilter = normalizeSearchText(homeConversationFilter);
  const visibleConversationOptions = botChats.filter((chat) => {
    const matchesKind = homeConversationKind(chat) === activeHomeConversationKind;
    const matchesSearch = !normalizedConversationFilter || homeConversationSearchText(chat).includes(normalizedConversationFilter);
    return matchesKind && matchesSearch;
  });
  renderHomeConversationMenuOptions(visibleConversationOptions);
}

function renderChatList() {
  homeConversationMenuOptions.innerHTML = "";
  homeConversationPanel.hidden = activeHomeServiceId !== "telegram";
  syncHomeSelection();

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
      activeHomeConversationKind = "chat";
      homeConversationAccessFilter = "enabled";
      homeConversationFilterMenuOpen = false;
      homeConversationFilter = "";
      homeConversationSearch.value = "";
      renderChatList();
      renderMessages();
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
            label: "User",
            pendingCount: homeUserRequestPendingCount(botId),
            onClick: () => {
              setHomeBotMenu(false);
              activeTargetType = "chat";
              openTelegramBotDetailModal(botId, { focus: "approval" });
            },
          }),
          createBotActionButton({
            icon: "groups",
            label: "Groups / Channels",
            quiet: true,
            newBadge: hasNewGroupChannelTargets(botId),
            onClick: () => {
              setHomeBotMenu(false);
              const latestNewTarget = newGroupChannelTargets(botId)
                .sort((a, b) => new Date(b.target?.added_at || 0) - new Date(a.target?.added_at || 0))[0] || null;
              activeAccessBotId = botId;
              activeTargetType = latestNewTarget?.type || "group";
              openTelegramBotDetailModal(botId, {
                focus: "group-channel",
                highlightTarget: latestNewTarget
                  ? { type: latestNewTarget.type, id: String(latestNewTarget.target.id) }
                  : null,
              });
            },
          }),
        );
        option.append(actionDrawer);
      }
      homeBotOptions.append(option);
    }
  }

  if (!bots.length) {
    renderHomeConversationMenuOptions([]);
    return;
  }

  const allBotChats = state.chats.filter((chat) => chatBelongsToBot(chat, activeHomeBotId));
  ensureHomeConversationKind(allBotChats);

  const normalizedConversationFilter = normalizeSearchText(homeConversationFilter);
  const visibleConversationOptions = allBotChats.filter((chat) => {
    const matchesKind = homeConversationKind(chat) === activeHomeConversationKind;
    const matchesSearch = !normalizedConversationFilter || homeConversationSearchText(chat).includes(normalizedConversationFilter);
    return matchesKind && matchesSearch;
  });
  renderHomeConversationMenuOptions(visibleConversationOptions);
}
