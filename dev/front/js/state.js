const chatList = document.querySelector("#chatList");
const shell = document.querySelector(".shell");
const shellResizer = document.querySelector("#shellResizer");
const mobileSidebarToggle = document.querySelector("#mobileSidebarToggle");
const homeServiceNav = document.querySelector("#homeServiceNav");
const homeListenerMeta = document.querySelector("#homeListenerMeta");
const homeListenerDot = document.querySelector("#homeListenerDot");
const homeListenerText = document.querySelector("#homeListenerText");
const listenerConfigureButton = document.querySelector("#listenerConfigureButton");
const homeServiceMessagesButton = document.querySelector("#homeServiceMessagesButton");
const homeServiceModelDot = document.querySelector("#homeServiceModelDot");
const homeServiceModelText = document.querySelector("#homeServiceModelText");
const homeBotDropdown = document.querySelector("#homeBotDropdown");
const homeBotTrigger = document.querySelector("#homeBotTrigger");
const homeBotValue = document.querySelector("#homeBotValue");
const homeBotStatus = document.querySelector("#homeBotStatus");
const homeBotEditButton = document.querySelector("#homeBotEditButton");
const homeEmptyBotCard = document.querySelector("#homeEmptyBotCard");
const homeEmptyBotAddButton = document.querySelector("#homeEmptyBotAddButton");
const homeBotMenu = document.querySelector("#homeBotMenu");
const homeBotSearch = document.querySelector("#homeBotSearch");
const homeBotFilterTabs = [...document.querySelectorAll("[data-home-bot-kind]")];
const homeBotOptions = document.querySelector("#homeBotOptions");
const homeModelSettingCard = document.querySelector("#homeModelSettingCard");
const homeModelSettingButton = document.querySelector("#homeModelSettingButton");
const homeModelSettingList = document.querySelector("#homeModelSettingList");
const homeConversationPanel = document.querySelector("#homeConversationPanel");
const homeConversationFilters = document.querySelector("#homeConversationFilters");
const homeConversationFilterTrigger = document.querySelector("#homeConversationFilterTrigger");
const homeConversationAvatar = document.querySelector("#homeConversationAvatar");
const homeConversationAvatarText = document.querySelector("#homeConversationAvatarText");
const homeConversationFilterLabel = document.querySelector("#homeConversationFilterLabel");
const homeConversationFilterStatus = document.querySelector("#homeConversationFilterStatus");
const homeConversationFilterMeta = document.querySelector("#homeConversationFilterMeta");
const homeConversationFilterMenu = document.querySelector("#homeConversationFilterMenu");
const homeConversationFilterTabs = [...document.querySelectorAll("[data-home-conversation-kind]")];
const homeConversationAllCount = document.querySelector("#homeConversationAllCount");
const homeConversationChatCount = document.querySelector("#homeConversationChatCount");
const homeConversationChannelCount = document.querySelector("#homeConversationChannelCount");
const homeConversationMenuOptions = document.querySelector("#homeConversationMenuOptions");
const homeConversationManageButton = document.querySelector("#homeConversationManageButton");
const homeConversationSearch = document.querySelector("#homeConversationSearch");
const messages = document.querySelector("#messages");
const manualComposer = document.querySelector("#manualComposer");
const manualComposerDrop = document.querySelector("#manualComposerDrop");
const manualComposerHint = document.querySelector("#manualComposerHint");
const manualComposerFiles = document.querySelector("#manualComposerFiles");
const manualComposerText = document.querySelector("#manualComposerText");
const manualComposerMediaInput = document.querySelector("#manualComposerMediaInput");
const manualComposerFileInput = document.querySelector("#manualComposerFileInput");
const manualComposerMediaButton = document.querySelector("#manualComposerMediaButton");
const manualComposerFileButton = document.querySelector("#manualComposerFileButton");
const manualComposerVoiceButton = document.querySelector("#manualComposerVoiceButton");
const manualComposerSend = document.querySelector("#manualComposerSend");
const activeTitle = document.querySelector("#activeTitle");
const activeMeta = document.querySelector("#activeMeta");
const chatHeaderIdentity = document.querySelector("#chatHeaderIdentity");
const chatHeaderActions = document.querySelector("#chatHeaderActions");
const themeToggleButton = document.querySelector("#themeToggleButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsModal = document.querySelector("#settingsModal");
const settingsTitle = document.querySelector("#settingsTitle");
const settingsClose = document.querySelector("#settingsClose");
const roleChoiceModal = document.querySelector("#roleChoiceModal");
const roleChoiceTitle = document.querySelector("#roleChoiceTitle");
const roleChoiceCopy = document.querySelector("#roleChoiceCopy");
const roleChoiceError = document.querySelector("#roleChoiceError");
const roleChoiceClose = document.querySelector("#roleChoiceClose");
const appToast = document.querySelector("#appToast");
const roleChoiceConfirm = document.querySelector("#roleChoiceConfirm");
const roleChoiceExtra = document.querySelector("#roleChoiceExtra");
const roleChoiceCancel = document.querySelector("#roleChoiceCancel");
const settingsTabs = [...document.querySelectorAll("[data-settings-view]")];
const settingsPlaceholder = document.querySelector("#settingsPlaceholder");
const telegramSettings = document.querySelector("#telegramSettings");
const serviceConfigSettings = document.querySelector("#serviceConfigSettings");
const messageSettings = document.querySelector("#messageSettings");
const messageSettingsForm = document.querySelector("#messageSettingsForm");
const messageTemplateInputs = [...document.querySelectorAll("[data-message-key]")];
const commandTemplateInputs = [...document.querySelectorAll("[data-command-key]")];
const messageSettingsHeading = document.querySelector("#messageSettingsHeading");
const messageCommandList = document.querySelector("#messageCommandList");
const messageTemplateGroups = document.querySelector("#messageTemplateGroups");
const addMessageCommandButton = document.querySelector("#addMessageCommandButton");
const syncMessageCommandsButton = document.querySelector("#syncMessageCommandsButton");
const refreshMessageCommandsButton = document.querySelector("#refreshMessageCommandsButton");
const messageDraftStatus = document.querySelector("#messageDraftStatus");
const messageSyncStatus = document.querySelector("#messageSyncStatus");
const messageSettingsTabs = [...document.querySelectorAll("[data-message-settings-tab]")];
const messageSettingsPanels = [...document.querySelectorAll("[data-message-settings-panel]")];
const messageSettingsFeedback = document.querySelector("#messageSettingsFeedback");
const serviceConfigTabs = [...document.querySelectorAll("[data-service-config-tab]")];
const telegramServicePanel = document.querySelector("#telegramServicePanel");
const larkServicePanel = document.querySelector("#larkServicePanel");
const telegramServerCard = document.querySelector("#telegramServerCard");
const telegramBotWorkersCard = document.querySelector("#telegramBotWorkersCard");
const larkServerCard = document.querySelector("#larkServerCard");
const larkBotWorkersCard = document.querySelector("#larkBotWorkersCard");
const accessBotCount = document.querySelector("#accessBotCount");
const accessBotSelectWrap = document.querySelector("#accessBotSelectWrap");
const accessBotDropdown = document.querySelector("#accessBotDropdown");
const accessBotTrigger = document.querySelector("#accessBotTrigger");
const accessBotValue = document.querySelector("#accessBotValue");
const accessBotStatus = document.querySelector("#accessBotStatus");
const accessBotMenu = document.querySelector("#accessBotMenu");
const accessBotSearch = document.querySelector("#accessBotSearch");
const accessBotOptions = document.querySelector("#accessBotOptions");
const selectedBotPanel = document.querySelector("#selectedBotPanel");
const selectedBotName = document.querySelector("#selectedBotName");
const selectedBotMeta = document.querySelector("#selectedBotMeta");
const accessControlPanel = document.querySelector("#accessControlPanel");
const telegramServiceToggle = document.querySelector("#telegramServiceToggle");
const telegramServiceModelFact = document.querySelector("#telegramServiceModelFact");
const telegramServiceProfileFact = document.querySelector("#telegramServiceProfileFact");
const telegramServiceModel = document.querySelector("#telegramServiceModel");
const telegramListenerStatus = document.querySelector("#telegramListenerStatus");
const telegramServiceModal = document.querySelector("#telegramServiceModal");
const telegramServiceModalClose = document.querySelector("#telegramServiceModalClose");
const telegramServiceManageToggle = document.querySelector("#telegramServiceManageToggle");
const telegramServerManageCard = document.querySelector("#telegramServerManageCard");
const larkServiceModal = document.querySelector("#larkServiceModal");
const larkServiceModalClose = document.querySelector("#larkServiceModalClose");
const larkServiceManageToggle = document.querySelector("#larkServiceManageToggle");
const larkServiceModelAlert = document.querySelector("#larkServiceModelAlert");
const larkManageListenerStatus = document.querySelector("#larkManageListenerStatus");
const larkManageServiceModelFact = document.querySelector("#larkManageServiceModelFact");
const larkManageServiceProfileFact = document.querySelector("#larkManageServiceProfileFact");
const modelSettingsModal = document.querySelector("#modelSettingsModal");
const modelSettingsModalClose = document.querySelector("#modelSettingsModalClose");
const modelSettingsModalBody = document.querySelector("#modelSettingsModalBody");
const settingsPlaceholderHome = settingsPlaceholder.parentElement;
const settingsPlaceholderNextSibling = settingsPlaceholder.nextSibling;
const telegramServiceModelAlert = document.querySelector("#telegramServiceModelAlert");
const telegramManageServiceModelFact = document.querySelector("#telegramManageServiceModelFact");
const telegramManageServiceProfileFact = document.querySelector("#telegramManageServiceProfileFact");
const telegramManageListenerStatus = document.querySelector("#telegramManageListenerStatus");
const telegramBotCount = document.querySelector("#telegramBotCount");
const telegramBotsList = document.querySelector("#telegramBotsList");
const telegramTokenInput = document.querySelector("#telegramTokenInput");
const telegramValidateToken = document.querySelector("#telegramValidateToken");
const telegramBotWorkersModal = document.querySelector("#telegramBotWorkersModal");
const telegramBotWorkersModalClose = document.querySelector("#telegramBotWorkersModalClose");
const telegramManageBotCount = document.querySelector("#telegramManageBotCount");
const telegramManageBotsList = document.querySelector("#telegramManageBotsList");
const telegramManageTokenInput = document.querySelector("#telegramManageTokenInput");
const telegramManageValidateToken = document.querySelector("#telegramManageValidateToken");
const telegramManageFeedback = document.querySelector("#telegramManageFeedback");
const larkBotWorkersModal = document.querySelector("#larkBotWorkersModal");
const larkBotWorkersModalClose = document.querySelector("#larkBotWorkersModalClose");
const larkManageBotCount = document.querySelector("#larkManageBotCount");
const larkManageBotsList = document.querySelector("#larkManageBotsList");
const larkManageTokenInput = document.querySelector("#larkManageTokenInput");
const larkManageValidateToken = document.querySelector("#larkManageValidateToken");
const larkManageFeedback = document.querySelector("#larkManageFeedback");
const telegramBotDetailModal = document.querySelector("#telegramBotDetailModal");
const telegramBotDetailModalTitle = document.querySelector("#telegramBotDetailModalTitle");
const telegramBotDetailModalClose = document.querySelector("#telegramBotDetailModalClose");
const telegramDetailBotList = document.querySelector("#telegramDetailBotList");
const telegramDetailAccessCard = document.querySelector("#telegramDetailAccessCard");
const telegramDetailAccessPanel = document.querySelector("#telegramDetailAccessPanel");
const telegramDetailChatTargetTab = document.querySelector("#telegramDetailChatTargetTab");
const telegramDetailChannelTargetTab = document.querySelector("#telegramDetailChannelTargetTab");
const telegramDetailRequestsButton = document.querySelector("#telegramDetailRequestsButton");
const telegramDetailAllowedTargetForm = document.querySelector("#telegramDetailAllowedTargetForm");
const telegramDetailAllowedTargetInput = document.querySelector("#telegramDetailAllowedTargetInput");
const telegramDetailAllowedTargets = document.querySelector("#telegramDetailAllowedTargets");
const telegramDetailAccessFeedback = document.querySelector("#telegramDetailAccessFeedback");
const larkBotDetailModal = document.querySelector("#larkBotDetailModal");
const larkBotDetailModalTitle = document.querySelector("#larkBotDetailModalTitle");
const larkBotDetailModalClose = document.querySelector("#larkBotDetailModalClose");
const larkDetailBotList = document.querySelector("#larkDetailBotList");
const allowedTargets = document.querySelector("#allowedTargets");
const allowedTargetForm = document.querySelector("#allowedTargetForm");
const allowedTargetInput = document.querySelector("#allowedTargetInput");
const chatTargetTab = document.querySelector("#chatTargetTab");
const channelTargetTab = document.querySelector("#channelTargetTab");
const publicAccessToggle = document.querySelector("#publicAccessToggle");
const requestsButton = document.querySelector("#requestsButton");
const requestsModal = document.querySelector("#requestsModal");
const requestsTitle = document.querySelector("#requestsTitle");
const requestsClose = document.querySelector("#requestsClose");
const requestsList = document.querySelector("#requestsList");
const requestsToolbar = document.querySelector("#requestsToolbar");
const requestsSearch = document.querySelector("#requestsSearch");
const requestsBulkbar = document.querySelector("#requestsBulkbar");
const requestsMasterCheckbox = document.querySelector("#requestsMasterCheckbox");
const requestsSelectAll = document.querySelector("#requestsSelectAll");
const requestsClearSelection = document.querySelector("#requestsClearSelection");
const requestsSelectedCount = document.querySelector("#requestsSelectedCount");
const requestsAllowSelected = document.querySelector("#requestsAllowSelected");
const requestsRejectSelected = document.querySelector("#requestsRejectSelected");
const requestsFeedback = document.querySelector("#requestsFeedback");
const requestsLoadMore = document.querySelector("#requestsLoadMore");
const requestTypeTabs = [...document.querySelectorAll("[data-requests-type]")];
const settingsFeedback = document.querySelector("#settingsFeedback");
const serviceConfigFeedback = document.querySelector("#serviceConfigFeedback");

let state = { chats: [], messages: {}, services: {}, settings: {} };
let draftAllowedTargets = null;
let activeTargetType = "chat";
let activeRequestsType = "chat";
let requestsPage = 1;
let requestsHasMore = false;
let requestsQuery = "";
let currentRequestItems = [];
let selectedRequestKeys = new Set();
let activeSettingsView = "messages-telegram-command-flows";
let activeMessageServiceId = "telegram";
let activeServiceConfigTab = "telegram";
let activeMessageSettingsTab = "command-flows";
let activeStatusMessageTarget = "service";
let activeAccessMessageTarget = "chat";
let draftCustomTelegramCommands = [];
let draftTelegramCommands = {};
let draftTelegramCommandDescriptions = {};
let draftTelegramCommandOrder = [];
let draftTelegramCommandRegistry = [];
let draftTelegramMessages = {};
let messageCommandDraftActive = false;
let draggedMessageCommandKey = "";
let activeMessageCommandDrawerTabs = {};
let telegramListenerPendingAction = "";
let messageFeedbackTimer = null;
let activeModelProvider = "openai";
let activeModelMode = "";
let expandedModelMode = "";
let accessControlManageFocus = false;
let editingModelMode = "";
let modelTestDrafts = {};
// Run feedback is intentionally session-only; backend stores config facts, not error history.
let lastModelRunResults = {};
let dismissedModelDraftBanners = {};
let modelPickerOpen = false;
let modelPickerSearch = "";
let modelSelectedListExpanded = false;
let activeAccessBotId = "";
let activeServiceBotId = "";
let accessBotMenuOpen = false;
let accessBotFilter = "";
let activeModelRouteDropdown = "";
let modelRouteFilters = {};
let telegramDetailFocus = "";
let activeHomeServiceId = (() => {
  try {
    return localStorage.getItem("whalematesActiveHomeService") || "telegram";
  } catch (error) {
    return "telegram";
  }
})();
let activeHomeBotId = "";
let homeBotMenuOpen = false;
let collapsedHomeBotActionMenuIds = new Set();
let homeBotFilter = "";
let activeHomeBotKind = "all";
let activeHomeConversationKind = "all";
let homeConversationAccessFilter = "enabled";
let homeConversationGroupsOpen = { chat: true, channel: true };
let homeConversationFilterMenuOpen = false;
let homeConversationFilter = "";
let activeChatId = null;
let manualComposerFilesDraft = [];
let manualComposerSending = false;
let manualComposerDragDepth = 0;
let forceScrollMessagesToBottom = false;
let loadingOlderMessages = false;
let preserveMessageScrollPosition = false;
let isLoading = false;
let socket = null;
let reconnectTimer = null;
let dashboardRecoveryTimer = null;
let dashboardReloading = false;
let lastRenderedChatId = null;
let lastRenderedTurnCount = 0;
let pendingRoleChoice = null;
let pendingExtraChoice = null;
let pendingCancelChoice = null;
let messageSelectionMode = false;
let selectedMessageIndexes = new Set();

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat([], {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function roleLabel(turn, chatId) {
  if (turn.role !== "user") return "Codex";
  if (turn.sender?.username && turn.sender?.id) {
    return `@${turn.sender.username} (UID: ${turn.sender.id})`;
  }
  if (turn.sender?.name && turn.sender?.id) {
    return `${turn.sender.name} (UID: ${turn.sender.id})`;
  }
  if (turn.sender?.label) return turn.sender.label;
  return `Unknown (UID: ${chatId})`;
}

function homeServices() {
  const services = state.settings?.services || {};
  return [
    ["telegram", services.telegram || { label: "Telegram" }],
    ["lark", services.lark || { label: "Lark", enabled: false }],
  ];
}

function homeBots(serviceId) {
  const bots = state.settings?.services?.[serviceId]?.bots || {};
  return Object.entries(bots);
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

function modelRouteModeSettings(route = null) {
  if (!route) return {};
  const provider = route.provider_id || route.provider || "";
  const mode = route.mode_id || route.mode || "";
  return state.settings?.models?.[provider]?.modes?.[mode] || {};
}

function modelRouteHasRuntimeFailure(route = null) {
  const failure = modelRouteModeSettings(route).last_runtime_failure;
  return Boolean(failure?.reason || failure?.message);
}

function modelRouteHasIssue(route = null) {
  return Boolean(route && !modelRouteIsEnabled(route));
}

function serviceModelRoute(serviceId = activeHomeServiceId) {
  return state.settings?.services?.[serviceId]?.model || null;
}

function effectiveBotModelRoute(bot, serviceId = activeHomeServiceId) {
  const serviceRoute = serviceModelRoute(serviceId);
  if (bot?.model_override) {
    return {
      route: bot.model_override,
      source: "override",
      enabled: modelRouteIsEnabled(bot.model_override),
    };
  }
  return {
    route: serviceRoute,
    source: "service",
    enabled: modelRouteIsEnabled(serviceRoute),
  };
}

function botLabel(botId, bot) {
  return bot?.label || (bot?.connection?.bot_username ? `@${bot.connection.bot_username}` : `Bot ${botId}`);
}

function botConnectionId(botId, bot) {
  return bot?.connection?.bot_id || botId;
}

function botDisplayName(botId, bot) {
  return `${botLabel(botId, bot)} (${botConnectionId(botId, bot)})`;
}

function statusLabel(status) {
  const normalized = String(status || "public").trim().toLowerCase();
  if (normalized === "owner") return "bot owner";
  if (normalized === "admin") return "bot admin";
  if (normalized === "public") return "public";
  return normalized || "public";
}

function botContextLabel(chat) {
  const botId = chat?.bot_id && chat.bot_id !== "default" ? chat.bot_id : activeHomeBotId;
  const bot = homeBots(chat?.service_id || activeHomeServiceId).find(([id]) => id === botId)?.[1];
  const label = chat?.bot_label || botLabel(botId, bot);
  const connectionId = botConnectionId(botId, bot);
  return botId ? `${label} (${connectionId})` : "";
}

function botContextState(chat) {
  const botId = chat?.bot_id && chat.bot_id !== "default" ? chat.bot_id : activeHomeBotId;
  const bot = homeBots(chat?.service_id || activeHomeServiceId).find(([id]) => id === botId)?.[1];
  return workerDisplayState(botId, bot || {});
}

function botConversationCount(botId, serviceId = activeHomeServiceId) {
  return state.chats.filter((chat) => chatBelongsToBot(chat, botId, serviceId)).length;
}

function botConnectionTone(displayState) {
  if (displayState.tone === "success") return "connected";
  if (displayState.tone === "warning") return "warning";
  if (displayState.tone === "error") return "error";
  return "disconnected";
}

function createBotStateDot(displayState) {
  const dot = document.createElement("span");
  dot.className = `bot-state-dot ${botConnectionTone(displayState)}`.trim();
  dot.title = displayState.label;
  dot.setAttribute("aria-label", displayState.label);
  return dot;
}

function createBotCountPill(botId, serviceId = activeHomeServiceId) {
  const pill = document.createElement("span");
  pill.className = "bot-count-pill";
  pill.textContent = botConversationCount(botId, serviceId);
  pill.title = "conversations";
  pill.setAttribute("aria-label", `${pill.textContent} conversations`);
  return pill;
}

function compactIdLabel(value) {
  return value ? `id-${value}` : "";
}

function botFilterKind(botId, bot) {
  const displayState = workerDisplayState(botId, bot);
  if (!bot?.enabled) return "disabled";
  if (displayState.tone === "success") return "enabled";
  return "others";
}

function firstHomeBotId(serviceId = activeHomeServiceId) {
  return homeBots(serviceId)[0]?.[0] || "";
}

function firstHomeBotWithConversations(serviceId = activeHomeServiceId) {
  return homeBots(serviceId).find(([botId]) =>
    state.chats.some((chat) => chatBelongsToBot(chat, botId, serviceId)),
  )?.[0] || firstHomeBotId(serviceId);
}

function allowedIdsForBot(bot) {
  const chats = bot?.allowed?.chats || [];
  const channels = bot?.allowed?.channels || [];
  return [...chats, ...channels].map((item) => String(item?.id ?? item)).filter(Boolean);
}

function enabledAllowedCount(bot, type) {
  const key = type === "channel" ? "channels" : "chats";
  return (bot?.allowed?.[key] || []).filter((record) => record?.enabled !== false).length;
}

function targetRecordForChat(chat, bot = null) {
  const activeBot = bot || homeBots(activeHomeServiceId).find(([id]) => id === activeHomeBotId)?.[1];
  const records = [
    ...(activeBot?.allowed?.chats || []),
    ...(activeBot?.allowed?.channels || []),
  ];
  return records.find((record) => String(record?.id) === String(chat?.id)) || null;
}

function conversationAccessKind(chat, bot = null) {
  const record = targetRecordForChat(chat, bot);
  return record?.enabled === false ? "disabled" : "enabled";
}

function conversationAvailabilityKind(chat) {
  const serviceId = chat?.service_id || activeHomeServiceId;
  const botId = chat?.bot_id && chat.bot_id !== "default" ? chat.bot_id : activeHomeBotId;
  const bot = homeBots(serviceId).find(([id]) => String(id) === String(botId))?.[1];
  const serverListening = serviceId === "telegram" && typeof listenerIsRunning === "function" && listenerIsRunning();
  const botEnabled = Boolean(bot?.enabled);
  const targetEnabled = conversationAccessKind(chat, bot) === "enabled";
  return serverListening && botEnabled && targetEnabled ? "enabled" : "disabled";
}

function chatBelongsToBot(chat, botId, serviceIdOverride = activeHomeServiceId) {
  if (!chat || !botId) return false;
  const serviceId = chat.service_id || "telegram";
  if (serviceId !== serviceIdOverride) return false;

  if (chat.bot_id && chat.bot_id !== "default") {
    return String(chat.bot_id) === String(botId);
  }

  const bot = homeBots(serviceIdOverride).find(([id]) => String(id) === String(botId))?.[1];
  const targetId = String(chat.target_id || chat.uid || chat.id || "");
  if (allowedIdsForBot(bot).includes(targetId)) return true;

  return String(botId) === String(firstHomeBotId(serviceIdOverride));
}

function homeConversationKind(chat) {
  const label = String(chat?.target_label || "").toLowerCase();
  if (label.startsWith("channel")) return "channel";
  return "chat";
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[()：:·,，。]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function homeConversationSearchText(chat) {
  const targetId = chat.target_id || chat.uid || chat.id;
  return normalizeSearchText([
    chat.target_label,
    chat.title,
    chat.uid,
    targetId,
    `id-${targetId}`,
    chat.user_status,
    formatTime(chat.updated_at),
  ].join(" "));
}

function renderHomeConversationFilters(chats) {
  if (activeHomeServiceId !== "telegram" || !activeHomeBotId) {
    homeConversationFilters.hidden = true;
    homeConversationPanel.hidden = activeHomeServiceId !== "telegram";
    homeConversationSearch.hidden = true;
    homeConversationFilterMenu.hidden = true;
    return;
  }

  const chatCount = chats.filter((chat) => homeConversationKind(chat) === "chat").length;
  const channelCount = chats.filter((chat) => homeConversationKind(chat) === "channel").length;
  if (homeConversationAllCount) homeConversationAllCount.textContent = chats.length;
  if (homeConversationChatCount) homeConversationChatCount.textContent = chatCount;
  if (homeConversationChannelCount) homeConversationChannelCount.textContent = channelCount;
  const activeChat = state.chats.find((chat) => chat.id === activeChatId);
  if (activeChat) {
    const chatId = activeChat.uid || activeChat.id || "";
    const titleParts = [activeChat.target_label || `Chat: ${activeChat.id}`, chatId].filter(Boolean);
    const turns = state.messages?.[activeChat.id] || [];
    const turnCount = activeChat.turn_count || turns.length || 0;
    homeConversationAvatar.hidden = false;
    homeConversationAvatar.className = `conversation-trigger-avatar ${conversationAvailabilityKind(activeChat)}`;
    homeConversationAvatar.style.backgroundImage = "";
    homeConversationAvatarText.textContent = avatarInitialForChat(activeChat);
    if (activeChat.uid) {
      const avatar = new Image();
      const botId = activeChat.bot_id || activeHomeBotId || "default";
      avatar.onload = () => {
        if (activeChatId === activeChat.id) {
          homeConversationAvatar.classList.add("has-image");
          homeConversationAvatar.style.backgroundImage = `url("${avatar.src}")`;
        }
      };
      avatar.onerror = () => {
        homeConversationAvatar.classList.remove("has-image");
        homeConversationAvatar.style.backgroundImage = "";
      };
      avatar.src = `/api/avatars/telegram?user_id=${encodeURIComponent(activeChat.uid)}&bot_id=${encodeURIComponent(botId)}`;
    }
    homeConversationFilterLabel.textContent = titleParts.join(" · ");
    homeConversationFilterStatus.hidden = !activeChat.user_status;
    homeConversationFilterStatus.textContent = statusLabel(activeChat.user_status);
    homeConversationFilterMeta.textContent = [`${turnCount} messages`, formatTime(activeChat.updated_at)].filter(Boolean).join(" · ");
  } else {
    homeConversationAvatar.hidden = true;
    homeConversationAvatar.classList.remove("has-image");
    homeConversationAvatar.style.backgroundImage = "";
    homeConversationFilterLabel.textContent = "Select a conversation";
    homeConversationFilterStatus.hidden = true;
    homeConversationFilterMeta.textContent = "Waiting for Telegram messages";
  }
  homeConversationFilterTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.homeConversationKind === activeHomeConversationKind);
  });
  homeConversationPanel.hidden = false;
  homeConversationFilters.hidden = false;
  homeConversationFilters.classList.toggle("menu-open", homeConversationFilterMenuOpen);
  homeConversationFilterMenu.hidden = !homeConversationFilterMenuOpen;
  homeConversationFilterTrigger.setAttribute("aria-expanded", String(homeConversationFilterMenuOpen));
  homeConversationFilterTrigger.classList.toggle("active", homeConversationFilterMenuOpen);
  homeConversationSearch.value = homeConversationFilter;
}

function filteredHomeChats() {
  const botChats = state.chats.filter((chat) => chatBelongsToBot(chat, activeHomeBotId));
  return botChats.filter((chat) => conversationAccessKind(chat) === homeConversationAccessFilter);
}

function homeBotChats() {
  return state.chats.filter((chat) => chatBelongsToBot(chat, activeHomeBotId));
}

function serviceListenerStatus(serviceId) {
  if (serviceId !== "telegram") {
    return { label: "not configured", tone: "disconnected" };
  }

  const consoleState = currentConnectionState();
  const consoleOk = consoleState === "connected";
  const listenerOk = listenerIsRunning();

  if (consoleOk && listenerOk) return { label: "connected", tone: "connected" };
  return { label: "disconnected", tone: "disconnected" };
}

function renderHomeListenerStatus() {
  const status = serviceListenerStatus(activeHomeServiceId);
  const activeBot = homeBots(activeHomeServiceId).find(([id]) => id === activeHomeBotId)?.[1];
  const mode = activeBot?.connection?.mode || (activeHomeServiceId === "telegram" ? "polling" : "not configured");
  const statusLabel = status.label ? `${status.label[0].toUpperCase()}${status.label.slice(1)}` : "";
  homeListenerDot.className = "home-listener-dot";
  homeListenerMeta?.classList.remove("is-disconnected", "is-clickable");
  if (status.tone === "connected") {
    homeListenerDot.classList.add("connected");
  } else {
    homeListenerDot.classList.add("error");
    homeListenerMeta?.classList.add("is-disconnected", "is-clickable");
  }
  homeListenerText.textContent = `${statusLabel} · ${mode} · ${formatNow()}`;
  if (homeListenerMeta) {
    homeListenerMeta.dataset.statusTone = status.tone || "";
    homeListenerMeta.setAttribute("role", status.tone === "connected" ? "text" : "button");
    homeListenerMeta.setAttribute("tabindex", status.tone === "connected" ? "-1" : "0");
    homeListenerMeta.setAttribute("aria-label", status.tone === "connected"
      ? `${statusLabel} · ${mode}`
      : `Open ${activeHomeServiceId === "lark" ? "Lark" : "Telegram"} service settings`);
    homeListenerMeta.title = status.tone === "connected"
      ? ""
      : `Open ${activeHomeServiceId === "lark" ? "Lark" : "Telegram"} service settings`;
  }
  listenerConfigureButton.hidden = false;
}

function setHomeBotMenu(open) {
  if (homeBotDropdown.classList.contains("home-bot-flat")) {
    homeBotMenuOpen = false;
    homeBotMenu.hidden = false;
    homeBotTrigger.classList.remove("open");
    homeBotTrigger.setAttribute("aria-expanded", "false");
    return;
  }

  homeBotMenuOpen = open;
  homeBotMenu.hidden = !open;
  homeBotTrigger.classList.toggle("open", open);
  homeBotTrigger.setAttribute("aria-expanded", String(open));
  if (open) {
    requestAnimationFrame(() => homeBotSearch.focus());
  }
}

function switchHomeBot(botId) {
  activeHomeBotId = botId;
  activeChatId = null;
  homeBotFilter = "";
  homeBotSearch.value = "";
  activeHomeBotKind = "all";
  activeHomeConversationKind = "all";
  homeConversationAccessFilter = "enabled";
  homeConversationFilterMenuOpen = false;
  homeConversationFilter = "";
  homeConversationSearch.value = "";
  setHomeBotMenu(false);
  render();
}

function syncHomeSelection() {
  const services = homeServices();
  if (!services.some(([id]) => id === activeHomeServiceId)) {
    activeHomeServiceId = services[0]?.[0] || "telegram";
  }
  try {
    localStorage.setItem("whalematesActiveHomeService", activeHomeServiceId);
  } catch (error) {
    // Service selection persistence is a convenience; rendering should not depend on it.
  }

  const bots = homeBots(activeHomeServiceId);
  if (!bots.some(([id]) => id === activeHomeBotId)) {
    activeHomeBotId = firstHomeBotWithConversations(activeHomeServiceId);
  }

  const botChats = homeBotChats();
  const visibleChats = filteredHomeChats();
  if (activeHomeServiceId !== "telegram") {
    activeChatId = null;
  } else if (botChats.length && !botChats.some((chat) => chat.id === activeChatId)) {
    activeChatId = botChats[0].id;
  } else if (!botChats.length && activeHomeBotId) {
    activeChatId = null;
  } else if (!activeHomeBotId) {
    activeChatId = null;
  }

  return visibleChats;
}
