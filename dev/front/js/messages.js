const imageViewer = document.querySelector("#imageViewer");
const imageViewerClose = document.querySelector("#imageViewerClose");
const imageViewerTitle = document.querySelector("#imageViewerTitle");
const imageViewerMeta = document.querySelector("#imageViewerMeta");
const imageViewerImage = document.querySelector("#imageViewerImage");
const imageViewerVideo = document.querySelector("#imageViewerVideo");
const imageViewerPrevious = document.querySelector("#imageViewerPrevious");
const imageViewerNext = document.querySelector("#imageViewerNext");
const imageViewerShowInChat = document.querySelector("#imageViewerShowInChat");
const imageViewerSave = document.querySelector("#imageViewerSave");
const imageViewerDelete = document.querySelector("#imageViewerDelete");
let imageGalleryItems = [];
let activeImageGalleryIndex = -1;

function createStatusPill(status) {
  const pill = document.createElement("span");
  pill.className = "status-pill";
  pill.textContent = statusLabel(status);
  return pill;
}

function createMetaText(parts) {
  const row = document.createElement("span");
  row.className = "meta-row";

  const visibleParts = parts.filter((part) => part.text);
  visibleParts.forEach((part, index) => {
    if (index > 0) {
      const dot = document.createElement("span");
      dot.className = "meta-dot";
      dot.textContent = "·";
      row.append(dot);
    }

    const item = document.createElement("span");
    item.className = `meta-${part.tone || "primary"}`;
    item.textContent = part.text;
    row.append(item);
  });

  return row;
}

function isChannelConversation(chat, turn) {
  const chatType = String(turn?.target?.chat_type || "").trim();
  if (chatType) {
    return chatType === "channel" || chatType === "group" || chatType === "supergroup";
  }
  return String(chat?.target_label || "").startsWith("Channel in ");
}

function messageSenderName(turn, chatId) {
  if (turn.sender?.username) return `@${turn.sender.username}`;
  if (turn.sender?.name) return turn.sender.name;
  return `UID ${turn.sender?.id || chatId}`;
}

function shouldShowTimeDivider(previousTurn, currentTurn) {
  if (!currentTurn?.created_at) return false;
  if (!previousTurn?.created_at) return true;

  const previousDate = new Date(previousTurn.created_at);
  const currentDate = new Date(currentTurn.created_at);
  if (Number.isNaN(previousDate.getTime()) || Number.isNaN(currentDate.getTime())) {
    return true;
  }

  const dayChanged =
    previousDate.getFullYear() !== currentDate.getFullYear() ||
    previousDate.getMonth() !== currentDate.getMonth() ||
    previousDate.getDate() !== currentDate.getDate();
  if (dayChanged) return true;

  return currentDate.getTime() - previousDate.getTime() >= 5 * 60 * 1000;
}

function createTimeDivider(value) {
  const divider = document.createElement("div");
  divider.className = "time-divider";
  divider.textContent = formatTime(value);
  return divider;
}

function assistantModelLabel(turn) {
  if (turn.role !== "assistant") return "";
  if (turn.manual) return "Send from local";
  const model = turn.model || {};
  return model.label || [
    model.route_label,
    model.profile_label,
  ].filter(Boolean).join(" · ");
}

function assistantModelInitial(turn) {
  const model = turn.model || {};
  const source = String(model.model_id || model.route_label || model.label || "Codex").trim();
  const normalized = source.toLowerCase();
  if (normalized.includes("qwen")) return "Q";
  if (normalized.includes("codex")) return "C";
  if (normalized.includes("claude")) return "C";
  if (normalized.includes("deepseek")) return "D";
  if (normalized.includes("gpt") || normalized.includes("openai")) return "O";
  if (normalized.includes("ollama")) return "O";
  const match = source.match(/[A-Za-z0-9\u4e00-\u9fff]/u);
  return (match?.[0] || "C").toUpperCase();
}

function avatarText(turn, activeChatId) {
  if (turn.role === "assistant") return assistantModelInitial(turn);

  const sender = turn.sender || {};
  const candidates = [
    sender.name,
    sender.username ? `@${sender.username}` : "",
    roleLabel(turn, activeChatId),
  ];
  const source = candidates.find((value) => typeof value === "string" && value.trim()) || "T";
  const match = source.trim().match(/[A-Za-z0-9\u4e00-\u9fff]/u);
  return (match?.[0] || "T").toUpperCase();
}

function createMessageAvatar(turn, activeChatId, fallbackBotId) {
  const avatar = document.createElement("div");
  avatar.className = `message-avatar ${turn.role === "assistant" ? "assistant" : "user"} ${turn.manual ? "local" : ""}`.trim();
  avatar.setAttribute("aria-hidden", "true");

  const fallback = document.createElement("span");
  fallback.className = "message-avatar-fallback";
  fallback.textContent = avatarText(turn, activeChatId);
  avatar.append(fallback);

  if (turn.role !== "user") {
    return avatar;
  }

  const senderId = String(turn.sender?.id || "").trim();
  const botId = String(turn.bot_id || fallbackBotId || "").trim();
  if (!senderId) {
    return avatar;
  }

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = `/api/avatars/telegram?user_id=${encodeURIComponent(senderId)}&bot_id=${encodeURIComponent(botId || "default")}`;
  img.addEventListener("load", () => {
    avatar.classList.add("has-image");
  });
  img.addEventListener("error", () => {
    img.remove();
    avatar.classList.remove("has-image");
  });
  avatar.append(img);
  return avatar;
}

function formatAttachmentSize(size) {
  const value = Number(size || 0);
  if (!value) return "";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  for (const unit of units) {
    if (amount < 1024 || unit === units[units.length - 1]) {
      return unit === "B" ? `${Math.round(amount)} ${unit}` : `${amount.toFixed(1)} ${unit}`;
    }
    amount /= 1024;
  }
  return "";
}

function attachmentTitle(attachment) {
  if (attachment.file_name) return attachment.file_name;
  return {
    image: "Image",
    voice: "Voice message",
    audio: "Audio",
    video: "Video",
    file: "File",
  }[attachment.kind] || "Attachment";
}

function collectImageGallery(turns, chat, startIndex = 0) {
  return turns.flatMap((turn, turnIndex) => {
    const historyTurnIndex = startIndex + turnIndex;
    const attachments = Array.isArray(turn.attachments) ? turn.attachments : [];
    return attachments
      .map((attachment, attachmentIndex) => ({ attachment, attachmentIndex }))
      .filter(({ attachment }) => (attachment?.kind === "image" || attachment?.kind === "video") && attachment.public_url)
      .map(({ attachment, attachmentIndex }) => ({
        attachment,
        attachmentIndex,
        turn,
        turnIndex: historyTurnIndex,
        title: turn.role === "assistant" ? "Whalemates" : messageSenderName(turn, activeChatId),
        meta: [
          formatTime(turn.created_at),
          chat?.target_label || "",
        ].filter(Boolean).join(" · "),
      }));
  });
}

function galleryIndexForAttachment(turnIndex, attachmentIndex) {
  return imageGalleryItems.findIndex((item) =>
    item.turnIndex === turnIndex && item.attachmentIndex === attachmentIndex,
  );
}

function activeImageGalleryItem() {
  if (activeImageGalleryIndex < 0 || activeImageGalleryIndex >= imageGalleryItems.length) {
    return null;
  }
  return imageGalleryItems[activeImageGalleryIndex];
}

function closeImageViewer() {
  if (!imageViewer) return;
  imageViewer.hidden = true;
  activeImageGalleryIndex = -1;
  if (imageViewerImage) {
    imageViewerImage.removeAttribute("src");
    imageViewerImage.hidden = false;
  }
  if (imageViewerVideo) {
    imageViewerVideo.pause();
    imageViewerVideo.removeAttribute("src");
    imageViewerVideo.load();
    imageViewerVideo.hidden = true;
  }
}

function renderImageViewer() {
  const item = activeImageGalleryItem();
  if (!imageViewer || !item) {
    closeImageViewer();
    return;
  }

  const attachment = item.attachment;
  imageViewer.hidden = false;
  imageViewerTitle.textContent = [
    item.title || "Image",
    `${activeImageGalleryIndex + 1} / ${imageGalleryItems.length}`,
  ].filter(Boolean).join(" · ");
  imageViewerMeta.textContent = item.meta || "";
  const isVideo = attachment.kind === "video";
  imageViewerImage.hidden = isVideo;
  imageViewerVideo.hidden = !isVideo;
  if (isVideo) {
    imageViewerImage.removeAttribute("src");
    imageViewerVideo.src = attachment.public_url;
  } else {
    imageViewerVideo.pause();
    imageViewerVideo.removeAttribute("src");
    imageViewerVideo.load();
    imageViewerImage.src = attachment.public_url;
    imageViewerImage.alt = attachmentTitle(attachment);
  }
  imageViewerPrevious.disabled = activeImageGalleryIndex <= 0;
  imageViewerNext.disabled = activeImageGalleryIndex >= imageGalleryItems.length - 1;
  imageViewerSave.href = attachment.public_url;
  imageViewerSave.download = attachment.file_name || (isVideo ? "telegram-video.mp4" : "telegram-image.jpg");
}

function openImageViewer(turnIndex, attachmentIndex) {
  const nextIndex = galleryIndexForAttachment(turnIndex, attachmentIndex);
  if (nextIndex < 0) return;
  activeImageGalleryIndex = nextIndex;
  renderImageViewer();
}

function moveImageViewer(delta) {
  if (imageViewer?.hidden) return;
  const nextIndex = activeImageGalleryIndex + delta;
  if (nextIndex < 0 || nextIndex >= imageGalleryItems.length) return;
  activeImageGalleryIndex = nextIndex;
  renderImageViewer();
}

function showImageInChat() {
  const item = activeImageGalleryItem();
  if (!item) return;
  closeImageViewer();
  requestAnimationFrame(() => {
    const row = messages.querySelector(`[data-history-index="${item.turnIndex}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("message-focus-flash");
    window.setTimeout(() => row.classList.remove("message-focus-flash"), 1400);
  });
}

async function deleteImageAttachment(mode) {
  const item = activeImageGalleryItem();
  if (!item || !activeChatId) return;
  const mediaLabel = item.attachment.kind === "video" ? "video" : "image";

  try {
    const response = await fetch("/api/messages/attachment/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: activeChatId,
        turn_index: item.turnIndex,
        attachment_index: item.attachmentIndex,
        mode,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    if (!state.messages?.[activeChatId]) {
      activeChatId = null;
    }
    closeImageViewer();
    render();
    showToast(mode === "telegram_recorded" ? `Deleted ${mediaLabel} from local + TG` : `Deleted local ${mediaLabel}`, "success");
  } catch (error) {
    updateStatus("error", `delete failed · ${formatNow()}`);
    showToast(error.message || "Delete failed", "error");
    console.error(error);
  }
}

function openDeleteImageChoice() {
  const item = activeImageGalleryItem();
  if (!item) return;
  const hasTelegramMessage = Number.isInteger(item.attachment.telegram_message_id);
  const mediaLabel = item.attachment.kind === "video" ? "video" : "image";
  openRoleChoice({
    title: `Delete this ${mediaLabel}?`,
    copy: hasTelegramMessage
      ? `Choose whether to delete only this local ${mediaLabel}, or delete both the local ${mediaLabel} and its Telegram message.`
      : `This ${mediaLabel} does not have a recorded Telegram message id, so only local deletion is available.`,
    confirmLabel: `Delete local ${mediaLabel}`,
    extraLabel: hasTelegramMessage ? `Delete local + TG ${mediaLabel}` : "",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    danger: true,
    onConfirm: async () => {
      closeRoleChoice();
      await deleteImageAttachment("local");
    },
    onExtra: hasTelegramMessage
      ? async () => {
          closeRoleChoice();
          await deleteImageAttachment("telegram_recorded");
        }
      : null,
  });
}

function createAttachmentCard(attachment, index, total, turnIndex = -1, attachmentIndex = index) {
  const kind = attachment.kind || "file";
  if (kind === "image" && attachment.public_url) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "attachment-image-card";
    link.style.backgroundImage = `url("${attachment.public_url}")`;
    link.setAttribute("aria-label", `Open ${attachmentTitle(attachment)}`);
    link.addEventListener("click", (event) => {
      event.stopPropagation();
      openImageViewer(turnIndex, attachmentIndex);
    });
    if (total > 4 && index === 3) {
      const more = document.createElement("span");
      more.className = "attachment-more";
      more.textContent = `+${total - 4}`;
      link.append(more);
    }
    return link;
  }

  if ((kind === "voice" || kind === "audio" || kind === "video") && attachment.public_url) {
    const card = document.createElement("div");
    card.className = `attachment-player-card ${kind}`;
    const media = document.createElement(kind === "video" ? "video" : "audio");
    media.controls = true;
    media.preload = "metadata";
    media.src = attachment.public_url;
    if (kind === "video") {
      media.playsInline = true;
      media.controlsList = "nofullscreen";
      media.disablePictureInPicture = true;
      media.addEventListener("click", (event) => {
        const bounds = media.getBoundingClientRect();
        const controlAreaHeight = 56;
        if (event.clientY >= bounds.bottom - controlAreaHeight) return;
        event.preventDefault();
        event.stopPropagation();
        media.pause();
        openImageViewer(turnIndex, attachmentIndex);
      });
      const openButton = document.createElement("button");
      openButton.className = "attachment-video-open";
      openButton.type = "button";
      openButton.setAttribute("aria-label", `Open ${attachmentTitle(attachment)}`);
      openButton.title = "Open preview";
      openButton.innerHTML = `
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M15 3h6v6"></path>
          <path d="m21 3-7 7"></path>
          <path d="M9 21H3v-6"></path>
          <path d="m3 21 7-7"></path>
        </svg>
      `;
      openButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openImageViewer(turnIndex, attachmentIndex);
      });
      card.append(openButton);
    }
    const meta = document.createElement("div");
    meta.className = "attachment-player-meta";
    const title = document.createElement("strong");
    title.textContent = attachmentTitle(attachment);
    const details = document.createElement("span");
    details.textContent = [
      kind === "voice" ? "Voice" : kind[0].toUpperCase() + kind.slice(1),
      attachment.duration ? `${attachment.duration}s` : "",
      formatAttachmentSize(attachment.file_size),
    ].filter(Boolean).join(" · ");
    meta.append(title, details);
    card.append(media, meta);
    return card;
  }

  const card = document.createElement("div");
  card.className = `attachment-file-card ${kind}`;
  const icon = document.createElement("span");
  icon.className = "attachment-icon";
  icon.textContent = {
    image: "IMG",
    voice: "VOC",
    audio: "AUD",
    video: "VID",
    file: "FILE",
  }[kind] || "FILE";

  const text = document.createElement("span");
  text.className = "attachment-file-text";
  const title = document.createElement("strong");
  title.textContent = attachmentTitle(attachment);
  const meta = document.createElement("span");
  meta.textContent = [
    kind === "voice" ? "Voice" : kind[0]?.toUpperCase() + kind.slice(1),
    attachment.duration ? `${attachment.duration}s` : "",
    formatAttachmentSize(attachment.file_size),
    attachment.download_error ? "Attachment unavailable" : "",
  ].filter(Boolean).join(" · ");
  text.append(title, meta);
  card.append(icon, text);

  if (attachment.public_url) {
    const action = document.createElement("a");
    action.className = "attachment-action";
    action.href = attachment.public_url;
    action.target = "_blank";
    action.rel = "noreferrer";
    action.textContent = kind === "video" || kind === "audio" || kind === "voice" ? "Open" : "Download";
    card.append(action);
  }
  return card;
}

function createAttachmentsView(turn, turnIndex) {
  const attachments = Array.isArray(turn.attachments) ? turn.attachments.filter(Boolean) : [];
  if (!attachments.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "attachments-view";
  const images = attachments
    .map((attachment, attachmentIndex) => ({ attachment, attachmentIndex }))
    .filter(({ attachment }) => attachment.kind === "image");
  const files = attachments
    .map((attachment, attachmentIndex) => ({ attachment, attachmentIndex }))
    .filter(({ attachment }) => attachment.kind !== "image");

  if (images.length) {
    const grid = document.createElement("div");
    grid.className = `attachment-image-grid count-${Math.min(images.length, 4)}`;
    images.slice(0, 4).forEach(({ attachment, attachmentIndex }, index) => {
      grid.append(createAttachmentCard(attachment, index, images.length, turnIndex, attachmentIndex));
    });
    wrap.append(grid);
  }

  files.forEach(({ attachment, attachmentIndex }, index) => {
    wrap.append(createAttachmentCard(attachment, index, files.length, turnIndex, attachmentIndex));
  });

  return wrap;
}

function isNearBottom() {
  const distance = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
  return distance < 96;
}

function isNearTop() {
  return messages.scrollTop < 24;
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
    updateMessageJumpActions();
    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
      updateMessageJumpActions();
    });
  });
}

function scrollMessagesToTop() {
  requestAnimationFrame(() => {
    messages.scrollTop = 0;
    updateMessageJumpActions();
  });
}

function hasScrollableMessages() {
  return messages.scrollHeight > messages.clientHeight + 8;
}

function updateJumpActionVisibility(jumpActions, topButton, bottomButton) {
  const scrollable = hasScrollableMessages();
  jumpActions.hidden = false;
  topButton.hidden = false;
  bottomButton.hidden = false;

  if (!scrollable) {
    topButton.disabled = true;
    bottomButton.disabled = true;
    return;
  }

  topButton.disabled = isNearTop();
  bottomButton.disabled = isNearBottom();
}

function updateMessageJumpActions() {
  const jumpActions = chatHeaderActions.querySelector(".message-jump-actions");
  const topButton = chatHeaderActions.querySelector('[aria-label="Back to top"]');
  const bottomButton = chatHeaderActions.querySelector('[aria-label="Jump to bottom"]');
  if (!jumpActions || !topButton || !bottomButton) return;
  updateJumpActionVisibility(jumpActions, topButton, bottomButton);
}

function resetMessageSelection() {
  messageSelectionMode = false;
  selectedMessageIndexes = new Set();
}

function toggleMessageSelectionMode() {
  if (messageSelectionMode) {
    resetMessageSelection();
  } else {
    messageSelectionMode = true;
    selectedMessageIndexes = new Set();
  }
  renderMessages();
}

function syncMessageSelection(turns) {
  const validIndexes = new Set();
  selectedMessageIndexes.forEach((index) => {
    if (index >= 0 && index < turns.length) {
      validIndexes.add(index);
    }
  });
  selectedMessageIndexes = validIndexes;
}

function toggleMessageSelection(index) {
  if (selectedMessageIndexes.has(index)) {
    selectedMessageIndexes.delete(index);
  } else {
    selectedMessageIndexes.add(index);
  }
  renderMessages();
}

function selectAllMessages(turns) {
  selectedMessageIndexes = new Set(turns.map((_, index) => index));
  renderMessages();
}

function clearSelectedMessages() {
  selectedMessageIndexes = new Set();
  renderMessages();
}

function selectedTurns(turns) {
  return [...selectedMessageIndexes]
    .sort((left, right) => left - right)
    .map((index) => ({ index, turn: turns[index] }))
    .filter((item) => item.turn);
}

function hasRecordedTelegramMessages(turns) {
  return selectedTurns(turns).some(({ turn }) =>
    Number.isInteger(turn.telegram_message_id)
    || (Array.isArray(turn.telegram_message_ids) && turn.telegram_message_ids.length > 0),
  );
}

function activeMessagePage(chatId = activeChatId) {
  return state.message_pages?.[chatId] || {
    total: (state.messages?.[chatId] || []).length,
    start: 0,
    loaded: (state.messages?.[chatId] || []).length,
    has_more: false,
  };
}

function displayIndexToHistoryIndex(index, chatId = activeChatId) {
  const page = activeMessagePage(chatId);
  return Number(page.start || 0) + index;
}

async function loadOlderMessages() {
  if (!activeChatId || loadingOlderMessages) return;
  const page = activeMessagePage(activeChatId);
  if (!page.has_more) return;

  const previousScrollHeight = messages.scrollHeight;
  const previousScrollTop = messages.scrollTop;
  loadingOlderMessages = true;
  renderMessages();
  let loaded = false;
  try {
    const params = new URLSearchParams({
      chat_id: activeChatId,
      before_index: String(page.start || 0),
      limit: "20",
    });
    const response = await fetch(`/api/conversations/messages?${params.toString()}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    const existing = state.messages?.[activeChatId] || [];
    state.messages = {
      ...(state.messages || {}),
      [activeChatId]: [...(result.messages || []), ...existing],
    };
    state.message_pages = {
      ...(state.message_pages || {}),
      [activeChatId]: result.page || activeMessagePage(activeChatId),
    };
    loaded = true;
  } catch (error) {
    updateStatus("error", `load older failed · ${formatNow()}`);
    showToast(error.message || "Load older messages failed", "error");
  } finally {
    loadingOlderMessages = false;
    preserveMessageScrollPosition = loaded;
    renderMessages();
    if (loaded) {
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight - previousScrollHeight + previousScrollTop;
        updateMessageJumpActions();
        requestAnimationFrame(() => {
          messages.scrollTop = messages.scrollHeight - previousScrollHeight + previousScrollTop;
          updateMessageJumpActions();
        });
      });
    }
  }
}

function manualComposerActiveChat() {
  return state.chats.find((chat) => chat.id === activeChatId) || null;
}

function manualComposerBotId(chat = manualComposerActiveChat()) {
  return chat?.bot_id && chat.bot_id !== "default" ? chat.bot_id : activeHomeBotId;
}

function manualComposerWarning(chat = manualComposerActiveChat()) {
  if (!chat) return "Select a conversation to send as bot.";
  if ((chat.service_id || activeHomeServiceId) !== "telegram") {
    return "Manual bot sending is only available for Telegram.";
  }
  const botId = manualComposerBotId(chat);
  const bot = homeBots(chat.service_id || activeHomeServiceId).find(([id]) => id === botId)?.[1];
  if (conversationAccessKind(chat, bot) === "disabled") {
    return "This conversation is disabled. Manual sending is still allowed.";
  }
  const stateInfo = botContextState(chat);
  if (stateInfo.tone !== "success") {
    return "Bot listener is not running. Manual sending is still allowed.";
  }
  return "";
}

function composerFileKind(file, explicitKind = "file") {
  if (explicitKind === "image_video") {
    return file.type.startsWith("video/") ? "video" : "image";
  }
  return "file";
}

function addManualComposerFiles(files, fileType) {
  const items = [...files].filter(Boolean).map((file) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    fileType,
    kind: composerFileKind(file, fileType),
  }));
  manualComposerFilesDraft = [...manualComposerFilesDraft, ...items];
  renderManualComposer();
}

function removeManualComposerFile(id) {
  manualComposerFilesDraft = manualComposerFilesDraft.filter((item) => item.id !== id);
  renderManualComposer();
}

function renderManualComposerFiles() {
  manualComposerFiles.innerHTML = "";
  manualComposerFiles.hidden = manualComposerFilesDraft.length === 0;
  for (const item of manualComposerFilesDraft) {
    const card = document.createElement("div");
    card.className = `manual-composer-file ${item.kind}`;
    if (item.kind === "image") {
      const preview = document.createElement("span");
      preview.className = "manual-composer-preview";
      preview.style.backgroundImage = `url("${URL.createObjectURL(item.file)}")`;
      card.append(preview);
    } else {
      const icon = document.createElement("span");
      icon.className = "manual-composer-file-icon";
      icon.textContent = item.kind === "video" ? "VID" : "FILE";
      card.append(icon);
    }
    const text = document.createElement("span");
    text.className = "manual-composer-file-text";
    const name = document.createElement("strong");
    name.textContent = item.file.name || "file";
    const meta = document.createElement("span");
    meta.textContent = [item.kind === "image" ? "Image" : item.kind === "video" ? "Video" : "File", formatAttachmentSize(item.file.size)].join(" · ");
    text.append(name, meta);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "manual-composer-file-remove";
    remove.setAttribute("aria-label", `Remove ${item.file.name}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeManualComposerFile(item.id));
    card.append(text, remove);
    manualComposerFiles.append(card);
  }
}

function resizeManualComposerText() {
  if (!manualComposerText) return;
  const minHeight = 60;
  const maxHeight = 168;
  const currentHeight = parseFloat(manualComposerText.style.height || "0") || manualComposerText.offsetHeight || minHeight;
  manualComposerText.style.height = `${minHeight}px`;
  const nextHeight = Math.min(maxHeight, Math.max(minHeight, manualComposerText.scrollHeight));
  const resolvedHeight = Math.max(nextHeight, Math.min(currentHeight, maxHeight));
  manualComposerText.style.height = `${resolvedHeight}px`;
  manualComposerText.style.overflowY = manualComposerText.scrollHeight > maxHeight ? "auto" : "hidden";
  manualComposer?.classList.toggle("expanded", resolvedHeight > minHeight || manualComposerFilesDraft.length > 0);
}

function resetManualComposerTextHeight() {
  if (!manualComposerText) return;
  manualComposerText.style.height = "60px";
  manualComposerText.style.overflowY = "hidden";
  manualComposer?.classList.remove("expanded");
}

function renderManualComposer() {
  const chat = manualComposerActiveChat();
  const disabled = !chat || (chat.service_id || activeHomeServiceId) !== "telegram" || manualComposerSending;
  manualComposer.classList.toggle("disabled", !chat);
  manualComposerDrop.classList.toggle("drag-over", manualComposerDragDepth > 0);
  manualComposerText.disabled = disabled;
  manualComposerMediaButton.disabled = disabled;
  manualComposerFileButton.disabled = disabled;
  manualComposerSend.disabled = disabled || (!manualComposerText.value.trim() && manualComposerFilesDraft.length === 0);
  manualComposerSend.textContent = manualComposerSending ? "Sending..." : "Send";
  manualComposerHint.textContent = manualComposerSending ? "Sending as bot..." : manualComposerWarning(chat);
  manualComposerHint.hidden = !manualComposerHint.textContent;
  resizeManualComposerText();
  renderManualComposerFiles();
}

async function sendManualComposerMessage() {
  const chat = manualComposerActiveChat();
  if (!chat || manualComposerSending) return;
  const text = manualComposerText.value.trim();
  if (!text && !manualComposerFilesDraft.length) return;
  const form = new FormData();
  form.append("chat_id", activeChatId);
  form.append("bot_id", manualComposerBotId(chat));
  form.append("text", text);
  for (const item of manualComposerFilesDraft) {
    form.append("files", item.file, item.file.name);
    form.append("file_types", item.fileType);
  }

  manualComposerSending = true;
  renderManualComposer();
  try {
    const response = await fetch("/api/conversations/send", {
      method: "POST",
      body: form,
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    manualComposerText.value = "";
    resetManualComposerTextHeight();
    manualComposerFilesDraft = [];
    forceScrollMessagesToBottom = true;
    render();
  } catch (error) {
    updateStatus("error", `send failed · ${formatNow()}`);
    manualComposerHint.textContent = error.message || "Send failed.";
    manualComposerHint.hidden = false;
  } finally {
    manualComposerSending = false;
    renderManualComposer();
  }
}

async function deleteSelectedMessages(mode) {
  const indexes = [...selectedMessageIndexes]
    .sort((left, right) => left - right)
    .map((index) => displayIndexToHistoryIndex(index));
  if (!activeChatId || !indexes.length) return;

  try {
    const response = await fetch("/api/messages/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: activeChatId, indexes, mode }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    state = result.payload;
    if (!state.messages?.[activeChatId]) {
      activeChatId = null;
    }
    resetMessageSelection();
    render();
  } catch (error) {
    updateStatus("error", `delete failed · ${formatNow()}`);
    window.alert(error.message || "Delete failed.");
    console.error(error);
  }
}

function openDeleteSelectedMessagesChoice(turns) {
  const count = selectedMessageIndexes.size;
  if (!count || !activeChatId) return;

  const hasRecordedMessages = hasRecordedTelegramMessages(turns);
  openRoleChoice({
    title: "Delete selected messages?",
    copy: hasRecordedMessages
      ? `${count} messages selected. Choose whether to delete only local messages, or delete both local messages and the recorded Telegram messages.`
      : `${count} messages selected. This selection has no recorded Telegram messages, so only local deletion is available.`,
    confirmLabel: "Delete local messages",
    extraLabel: hasRecordedMessages ? "Delete local + TG messages" : "",
    cancelLabel: "Cancel",
    defaultAction: "cancel",
    danger: true,
    onConfirm: async () => {
      closeRoleChoice();
      await deleteSelectedMessages("local");
    },
    onExtra: hasRecordedMessages
      ? async () => {
          closeRoleChoice();
          await deleteSelectedMessages("telegram_recorded");
        }
      : null,
  });
}

function createSelectionToolbar(turns, chat = null) {
  chatHeaderActions.innerHTML = "";

  const actions = document.createElement("div");
  actions.className = "message-selection-actions";

  const jumpActions = document.createElement("div");
  jumpActions.className = "message-jump-actions";

  const topButton = document.createElement("button");
  topButton.type = "button";
  topButton.className = "message-jump-button";
  topButton.title = "Back to top";
  topButton.setAttribute("aria-label", "Back to top");
  topButton.innerHTML = '<span aria-hidden="true">↑</span>';
  topButton.addEventListener("click", scrollMessagesToTop);

  const bottomButton = document.createElement("button");
  bottomButton.type = "button";
  bottomButton.className = "message-jump-button";
  bottomButton.title = "Jump to bottom";
  bottomButton.setAttribute("aria-label", "Jump to bottom");
  bottomButton.innerHTML = '<span aria-hidden="true">↓</span>';
  bottomButton.addEventListener("click", scrollMessagesToBottom);

  jumpActions.append(topButton, bottomButton);
  updateJumpActionVisibility(jumpActions, topButton, bottomButton);

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = `message-selection-button ${messageSelectionMode ? "secondary" : "primary"}`;
  toggleButton.textContent = messageSelectionMode ? "Exit" : "Select messages";
  toggleButton.addEventListener("click", toggleMessageSelectionMode);

  if (messageSelectionMode) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "message-selection-button danger";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = selectedMessageIndexes.size === 0;
    deleteButton.addEventListener("click", () => openDeleteSelectedMessagesChoice(turns));

    const selectAllButton = document.createElement("button");
    selectAllButton.type = "button";
    selectAllButton.className = "message-selection-button secondary";
    selectAllButton.textContent = "Select all";
    selectAllButton.disabled = selectedMessageIndexes.size === turns.length;
    selectAllButton.addEventListener("click", () => selectAllMessages(turns));

    actions.append(deleteButton, selectAllButton, toggleButton, jumpActions);
  } else {
    actions.append(toggleButton, jumpActions);
  }

  chatHeaderActions.append(actions);
}

function clearChatHeader() {
  chatHeaderActions.innerHTML = "";
}

function renderMessages() {
  const turns = state.messages[activeChatId] || [];
  const messagePage = activeMessagePage(activeChatId);
  const messageStartIndex = Number(messagePage.start || 0);
  const isInitialChatRender = activeChatId !== lastRenderedChatId;
  if (isInitialChatRender) {
    resetMessageSelection();
    manualComposerFilesDraft = [];
    if (manualComposerText) {
      manualComposerText.value = "";
    }
  }
  renderManualComposer();
  syncMessageSelection(turns);
  const shouldAutoScroll =
    !preserveMessageScrollPosition && (
      forceScrollMessagesToBottom ||
      isInitialChatRender ||
      turns.length > lastRenderedTurnCount ||
      isNearBottom()
    );

  messages.innerHTML = "";

  if (!turns.length) {
    imageGalleryItems = [];
    closeImageViewer();
    clearChatHeader();
    const empty = document.createElement("div");
    empty.className = "empty";
    if (activeHomeServiceId === "lark") {
      const lineOne = document.createElement("div");
      lineOne.textContent = "Lark service is not configured yet.";
      const lineTwo = document.createElement("div");
      lineTwo.textContent = "Configure Lark before conversations can appear here.";
      const action = document.createElement("button");
      action.className = "empty-action";
      action.type = "button";
      action.disabled = true;
      action.textContent = "to be release";
      empty.append(lineOne, lineTwo, action);
      activeTitle.textContent = "Lark is not configured";
      activeMeta.textContent = "No Lark listener is available";
    } else {
      const lineOne = document.createElement("div");
      const activeBot = homeBots(activeHomeServiceId).find(([botId]) => botId === activeHomeBotId)?.[1];
      const activeBotName = activeBot ? ` ${botLabel(activeHomeBotId, activeBot)}` : "";
      lineOne.textContent = `Send a message to the Telegram bot${activeBotName}.`;
      const lineTwo = document.createElement("div");
      lineTwo.textContent = "The conversation will appear here automatically.";
      empty.append(lineOne, lineTwo);
      activeTitle.textContent = "No conversation selected";
      activeMeta.textContent = "Waiting for Telegram messages";
    }
    messages.append(empty);
    return;
  }

  const chat = state.chats.find((item) => item.id === activeChatId);
  imageGalleryItems = collectImageGallery(turns, chat, messageStartIndex);
  activeTitle.innerHTML = "";
  if (chat?.user_status) {
    activeTitle.append(createStatusPill(chat.user_status));
  }

  const titleText = document.createElement("span");
  titleText.className = "active-title-text";
  titleText.textContent = chat?.target_label || `Chat: ${activeChatId}`;
  activeTitle.append(titleText);

  if (chat?.uid || activeChatId) {
    const dot = document.createElement("span");
    dot.className = "meta-dot";
    dot.textContent = "·";
    const uid = document.createElement("span");
    uid.className = "active-title-uid";
    uid.textContent = chat?.uid || activeChatId;
    activeTitle.append(dot, uid);
  }

  const contextLabel = botContextLabel(chat);
  if (contextLabel) {
    const botLabelPill = document.createElement("span");
    botLabelPill.className = "bot-context-label";
    const dot = createBotStateDot(botContextState(chat));
    const label = document.createElement("span");
    label.textContent = contextLabel;
    botLabelPill.append(dot, label);
    activeTitle.append(botLabelPill);
  }
  activeMeta.innerHTML = "";
  activeMeta.className = "identity-line";
  createSelectionToolbar(turns, chat);

  if (messagePage.has_more) {
    const loadOlder = document.createElement("div");
    loadOlder.className = "load-older-messages";
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "load-older-button";
    loadButton.disabled = loadingOlderMessages;
    loadButton.textContent = loadingOlderMessages ? "Loading more messages..." : "Load more messages ...";
    loadButton.addEventListener("click", loadOlderMessages);
    loadOlder.append(loadButton);
    messages.append(loadOlder);
  }

  turns.forEach((turn, index) => {
    const historyIndex = displayIndexToHistoryIndex(index);
    if (shouldShowTimeDivider(turns[index - 1], turn)) {
      messages.append(createTimeDivider(turn.created_at));
    }

    const row = document.createElement("article");
    row.className = `message ${turn.role === "user" ? "user" : "assistant"}`;
    row.dataset.messageIndex = String(index);
    row.dataset.historyIndex = String(historyIndex);
    if (messageSelectionMode) {
      row.classList.add("selection-mode");
      if (selectedMessageIndexes.has(index)) {
        row.classList.add("selected");
      }
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const avatar = createMessageAvatar(turn, activeChatId, chat?.bot_id);
    const group = document.createElement("div");
    group.className = `message-bubble-group ${turn.role === "user" ? "user" : "assistant"}`;
    const contentWrap = document.createElement("div");
    contentWrap.className = `message-content ${turn.role === "user" ? "user" : "assistant"}`;

    const showSenderLabel = turn.role === "user" && isChannelConversation(chat, turn);

    const content = document.createElement("div");
    content.className = "content";
    content.textContent = turn.content || "";
    const attachmentsView = createAttachmentsView(turn, historyIndex);

    if (showSenderLabel) {
      const label = document.createElement("div");
      label.className = "label";
      const sender = document.createElement("span");
      sender.textContent = messageSenderName(turn, activeChatId);
      label.append(sender);
    bubble.append(label);
  }

  if (attachmentsView) {
    bubble.classList.add("has-attachments");
    bubble.append(attachmentsView);
  }
  if ((turn.content || "").trim() || !attachmentsView) {
    bubble.append(content);
  }
  const modelLabel = assistantModelLabel(turn);
  if (modelLabel) {
    bubble.classList.add("has-model-meta");
    const modelMeta = document.createElement("span");
    modelMeta.className = "message-model-meta";
    modelMeta.textContent = modelLabel;
    bubble.append(modelMeta);
  }
  if (turn.role === "user") {
      group.append(avatar, bubble);
    } else {
      group.append(bubble, avatar);
    }
    contentWrap.append(group);

    if (messageSelectionMode) {
      const rail = document.createElement("div");
      rail.className = "message-selection-rail";
      const selector = document.createElement("button");
      selector.type = "button";
      selector.className = "message-selector";
      selector.setAttribute("aria-pressed", String(selectedMessageIndexes.has(index)));
      selector.setAttribute("aria-label", selectedMessageIndexes.has(index) ? "Deselect message" : "Select message");
      selector.textContent = selectedMessageIndexes.has(index) ? "✓" : "";
      selector.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMessageSelection(index);
      });
      row.addEventListener("click", () => toggleMessageSelection(index));
      rail.append(selector);
      row.append(rail, contentWrap);
    } else {
      row.append(contentWrap);
    }
    messages.append(row);
  });

  lastRenderedChatId = activeChatId;
  lastRenderedTurnCount = turns.length;

  if (shouldAutoScroll) {
    scrollMessagesToBottom();
    forceScrollMessagesToBottom = false;
  }
  preserveMessageScrollPosition = false;

  requestAnimationFrame(updateMessageJumpActions);
}

messages.addEventListener("scroll", updateMessageJumpActions);

imageViewerClose?.addEventListener("click", closeImageViewer);
imageViewerPrevious?.addEventListener("click", () => moveImageViewer(-1));
imageViewerNext?.addEventListener("click", () => moveImageViewer(1));
imageViewerShowInChat?.addEventListener("click", showImageInChat);
imageViewerDelete?.addEventListener("click", openDeleteImageChoice);
imageViewer?.addEventListener("pointerdown", (event) => {
  const path = event.composedPath?.() || [];
  const isViewerControl = path.some((node) => node instanceof Element && node.matches("button, a, .image-viewer-title-block"));
  const isMedia = path.some((node) => node instanceof Element && node.matches(".image-viewer-image, .image-viewer-video"));
  if (!isViewerControl && !isMedia) {
    closeImageViewer();
  }
});

document.addEventListener("keydown", (event) => {
  if (!imageViewer || imageViewer.hidden) return;
  if (event.key === "Escape") {
    closeImageViewer();
    return;
  }
  if (event.key === "ArrowLeft") {
    moveImageViewer(-1);
    return;
  }
  if (event.key === "ArrowRight") {
    moveImageViewer(1);
  }
});

manualComposerText.addEventListener("input", renderManualComposer);
manualComposerText.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendManualComposerMessage();
  }
});
manualComposerMediaButton.addEventListener("click", () => manualComposerMediaInput.click());
manualComposerFileButton.addEventListener("click", () => manualComposerFileInput.click());
manualComposerMediaInput.addEventListener("change", () => {
  addManualComposerFiles(manualComposerMediaInput.files || [], "image_video");
  manualComposerMediaInput.value = "";
});
manualComposerFileInput.addEventListener("change", () => {
  addManualComposerFiles(manualComposerFileInput.files || [], "file");
  manualComposerFileInput.value = "";
});
manualComposerSend.addEventListener("click", sendManualComposerMessage);

manualComposerDrop.addEventListener("dragenter", (event) => {
  event.preventDefault();
  if (!manualComposerActiveChat()) return;
  manualComposerDragDepth += 1;
  renderManualComposer();
});
manualComposerDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
});
["dragleave", "drop"].forEach((eventName) => {
  manualComposerDrop.addEventListener(eventName, (event) => {
    event.preventDefault();
    manualComposerDragDepth = Math.max(0, manualComposerDragDepth - 1);
    if (eventName === "drop" && manualComposerActiveChat()) {
      const files = [...(event.dataTransfer?.files || [])];
      const media = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
      const documents = files.filter((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"));
      if (media.length) addManualComposerFiles(media, "image_video");
      if (documents.length) addManualComposerFiles(documents, "file");
    }
    renderManualComposer();
  });
});

function createSystemJump(position) {
  const container = document.createElement("div");
  container.className = `system-jump ${position}`;

  if (position === "top") {
    const copy = document.createElement("span");
    copy.className = "system-copy";
    copy.textContent = "Already at the top";

    const actions = document.createElement("div");
    actions.className = "system-actions";
    actions.append(createSystemAction("View latest", scrollMessagesToBottom));

    container.append(copy, actions);
  } else {
    const copy = document.createElement("span");
    copy.className = "system-copy";
    copy.textContent = "All content loaded";

    const actions = document.createElement("div");
    actions.className = "system-actions";
    actions.append(
      createSystemAction("Back to top", scrollMessagesToTop),
      createSystemAction("Refresh", loadConversations),
    );

    container.append(copy, actions);
  }

  return container;
}

function createSystemAction(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "system-action";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function render() {
  renderChatList();
  renderMessages();
  renderSettings();
}
