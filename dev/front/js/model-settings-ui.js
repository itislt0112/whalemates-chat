function modelProviderDisplayName(provider) {
  return {
    openai: "Open AI",
    claude: "Anthronic",
    ollama: "Ollama",
    deepseek: "DeepSeek",
  }[provider] || provider;
}

function providerDefaultBaseUrl(provider, mode = activeModelMode) {
  if (mode && mode.includes("cli")) return "";
  return {
    openai: "https://api.openai.com/v1",
    claude: "https://api.anthropic.com/v1",
    ollama: "http://127.0.0.1:11434",
    deepseek: "https://api.deepseek.com",
  }[provider] || "";
}

function modelProviders() {
  return state.settings?.models || {
    openai: {
      label: "OpenAI",
      active_mode: "codex_cli",
      modes: {
        codex_cli: { label: "Codex CLI", enabled: false, model: "", base_url: "", configured: false },
        api: { label: "OpenAI API", enabled: false, model: "", api_key: "", api_key_configured: false, configured: false, base_url: "" },
      },
    },
    claude: {
      label: "Claude",
      active_mode: "claude_code_cli",
      modes: {
        claude_code_cli: { label: "Claude Code CLI", enabled: false, model: "", base_url: "", configured: false },
        api: { label: "Anthropic API", enabled: false, model: "", api_key: "", api_key_configured: false, configured: false, base_url: "" },
      },
    },
    ollama: {
      label: "Ollama",
      active_mode: "api",
      modes: {
        api: {
          label: "Ollama API",
          enabled: false,
          model: "",
          configured: false,
          base_url: "http://127.0.0.1:11434",
        },
      },
    },
    deepseek: {
      label: "DeepSeek",
      active_mode: "api",
      modes: {
        api: {
          label: "DeepSeek API",
          enabled: false,
          model: "",
          api_key: "",
          api_key_configured: false,
          configured: false,
          base_url: "https://api.deepseek.com",
        },
      },
    },
  };
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

function modelRouteFromValue(value = "") {
  const [providerId = "", modeId = "", modelId = ""] = String(value).split("::");
  const option = enabledModelOptions().find((item) => modelRouteValue(item) === value);
  return {
    provider_id: providerId,
    mode_id: modeId,
    model_id: modelId,
    label: option?.label || modelId || modeId || providerId || "Model",
  };
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

function runtimeProfileOptionsForRoute(route = null) {
  const value = modelRouteValue(route || {});
  const option = enabledModelOptions().find((item) => modelRouteValue(item) === value);
  return option?.runtime_profiles?.length
    ? option.runtime_profiles
    : [{ id: "default", label: "Default" }];
}

function normalizeRuntimeProfile(profile = "default", route = null) {
  const value = String(profile || "default").toLowerCase();
  const options = runtimeProfileOptionsForRoute(route);
  return options.some((item) => item.id === value) ? value : "default";
}

function runtimeProfileLabel(profile = "default", route = null) {
  const normalized = normalizeRuntimeProfile(profile, route);
  return runtimeProfileOptionsForRoute(route).find((item) => item.id === normalized)?.label || "Default";
}

function modelRouteSearchText(option) {
  return [
    option.provider_label,
    option.provider_id,
    option.mode_label,
    option.mode_id,
    option.model_id,
    option.label,
  ].filter(Boolean).join(" ").toLowerCase();
}

function renderRuntimeProfileDropdown(
  route,
  selectedProfile,
  id,
  {
    includeInherit = false,
    kind = "service",
    serviceId = "telegram",
    botId = "",
  } = {},
) {
  const routeProfileOptions = runtimeProfileOptionsForRoute(route);
  const activeProfile = normalizeRuntimeProfile(selectedProfile, route);
  const triggerLabel = includeInherit && !selectedProfile
    ? "Inherit service profile"
    : runtimeProfileLabel(activeProfile, route);
  const open = activeModelRouteDropdown === id;
  return `
    <div class="model-route-dropdown runtime-profile-dropdown ${open ? "open" : ""}" data-runtime-profile-dropdown="${id}">
      <button
        class="model-route-trigger"
        type="button"
        data-runtime-profile-trigger="${id}"
        aria-haspopup="listbox"
        aria-expanded="${open}"
      >
        <span class="model-route-trigger-text">${triggerLabel}</span>
        <span class="model-route-caret" aria-hidden="true"></span>
      </button>
      <div class="model-route-menu runtime-profile-menu" role="listbox" ${open ? "" : "hidden"}>
        ${
          includeInherit
            ? `
              <button
                class="model-route-option ${!selectedProfile ? "active" : ""}"
                type="button"
                role="option"
                aria-selected="${!selectedProfile}"
                data-runtime-profile-option
                data-runtime-profile-kind="${kind}"
                data-runtime-profile-service="${serviceId}"
                data-runtime-profile-bot="${botId}"
                data-runtime-profile-value=""
              >
                <span>Inherit service profile</span>
              </button>
            `
            : ""
        }
        ${routeProfileOptions.map((profile) => `
          <button
            class="model-route-option ${selectedProfile && profile.id === activeProfile ? "active" : (!includeInherit && profile.id === activeProfile ? "active" : "")}"
            type="button"
            role="option"
            aria-selected="${profile.id === activeProfile}"
            data-runtime-profile-option
            data-runtime-profile-kind="${kind}"
            data-runtime-profile-service="${serviceId}"
            data-runtime-profile-bot="${botId}"
            data-runtime-profile-value="${profile.id}"
          >
            <span>${profile.label}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderModelRouteDropdown(
  route,
  id,
  {
    fallbackLabel = "Select Provider (Model)",
    includeInherit = false,
    kind = "service",
    serviceId = "telegram",
    botId = "",
  } = {},
) {
  const options = enabledModelOptions();
  const currentValue = modelRouteValue(route || {});
  if (!options.length && !includeInherit) {
    return `
      <div class="model-route-dropdown no-options" data-model-route-dropdown="${id}">
        <button class="model-route-trigger" type="button" disabled>
          <span class="model-route-trigger-text">No Enabled Provider</span>
          <span class="model-route-caret" aria-hidden="true"></span>
        </button>
      </div>
    `;
  }
  const searchValue = modelRouteFilters[id] || "";
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) return true;
    return modelRouteSearchText(option).includes(normalizedSearch);
  });
  const grouped = filteredOptions.reduce((acc, option) => {
    const key = option.provider_label || option.provider_id || "Provider";
    acc[key] = acc[key] || [];
    acc[key].push(option);
    return acc;
  }, {});
  const inheritMatches = includeInherit && (
    !normalizedSearch
    || "inherit service model".includes(normalizedSearch)
  );
  const triggerLabel = includeInherit && !route
    ? "Inherit service model"
    : modelRouteLabel(route, fallbackLabel);
  const open = activeModelRouteDropdown === id;
  return `
    <div class="model-route-dropdown ${open ? "open" : ""}" data-model-route-dropdown="${id}">
      <button
        class="model-route-trigger"
        type="button"
        data-model-route-trigger="${id}"
        aria-haspopup="listbox"
        aria-expanded="${open}"
      >
        <span class="model-route-trigger-text">${triggerLabel}</span>
        <span class="model-route-caret" aria-hidden="true"></span>
      </button>
      <div class="model-route-menu" role="listbox" ${open ? "" : "hidden"}>
        <input
          class="model-route-search"
          type="search"
          placeholder="Search provider or model"
          value="${searchValue}"
          data-model-route-search="${id}"
        />
        ${
          inheritMatches
            ? `
              <button
                class="model-route-option ${!route ? "active" : ""}"
                type="button"
                role="option"
                aria-selected="${!route}"
                data-model-route-option
                data-model-route-owner="${id}"
                data-model-route-kind="${kind}"
                data-model-route-service="${serviceId}"
                data-model-route-bot="${botId}"
                data-model-route-value=""
              >
                <span>Inherit service model</span>
              </button>
            `
            : ""
        }
        ${
          filteredOptions.length
            ? Object.entries(grouped)
              .map(([providerLabel, groupOptions]) => `
                <div class="model-route-group">
                  <div class="model-route-group-label">${providerLabel}</div>
                  ${groupOptions
                    .map((option) => {
                      const value = modelRouteValue(option);
                      const active = value === currentValue;
                      return `
                        <button
                          class="model-route-option ${active ? "active" : ""}"
                          type="button"
                          role="option"
                          aria-selected="${active}"
                          data-model-route-option
                          data-model-route-owner="${id}"
                          data-model-route-kind="${kind}"
                          data-model-route-service="${serviceId}"
                          data-model-route-bot="${botId}"
                          data-model-route-value="${value}"
                        >
                          <span>${option.label}</span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              `)
              .join("")
            : (
              inheritMatches
                ? ""
                : '<div class="model-route-empty">No provider or model matches your search.</div>'
            )
        }
      </div>
    </div>
  `;
}

function bindModelRouteDropdowns(scope = document) {
  scope.querySelectorAll("[data-model-route-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = trigger.dataset.modelRouteTrigger || "";
      activeModelRouteDropdown = activeModelRouteDropdown === id ? "" : id;
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
      if (activeModelRouteDropdown) {
        requestAnimationFrame(() => {
          document.querySelector(`[data-model-route-search="${activeModelRouteDropdown}"]`)?.focus();
        });
      }
    });
  });

  scope.querySelectorAll("[data-model-route-search]").forEach((search) => {
    search.addEventListener("click", (event) => event.stopPropagation());
    search.addEventListener("input", () => {
      const id = search.dataset.modelRouteSearch || "";
      modelRouteFilters[id] = search.value;
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
      requestAnimationFrame(() => {
        const nextSearch = document.querySelector(`[data-model-route-search="${id}"]`);
        nextSearch?.focus();
        nextSearch?.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      });
    });
  });

  scope.querySelectorAll("[data-model-route-option]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      const value = option.dataset.modelRouteValue || "";
      const kind = option.dataset.modelRouteKind || "service";
      const serviceId = option.dataset.modelRouteService || "telegram";
      const botId = option.dataset.modelRouteBot || "";
      activeModelRouteDropdown = "";
      modelRouteFilters[option.dataset.modelRouteOwner || ""] = "";
      if (kind === "bot") {
        updateServiceBot(serviceId, botId, { model_override: value ? modelRouteFromValue(value) : null });
        return;
      }
      const route = modelRouteFromValue(value);
      if (!route.provider_id || !route.mode_id) return;
      updateServiceConfig(serviceId, { model: route });
    });
  });

  scope.querySelectorAll("[data-runtime-profile-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = trigger.dataset.runtimeProfileTrigger || "";
      activeModelRouteDropdown = activeModelRouteDropdown === id ? "" : id;
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
    });
  });

  scope.querySelectorAll("[data-runtime-profile-option]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      const value = option.dataset.runtimeProfileValue || "";
      const kind = option.dataset.runtimeProfileKind || "service";
      const serviceId = option.dataset.runtimeProfileService || "telegram";
      const botId = option.dataset.runtimeProfileBot || "";
      activeModelRouteDropdown = "";
      if (kind === "bot") {
        updateServiceBot(serviceId, botId, { model_profile_override: value || null });
        return;
      }
      updateServiceConfig(serviceId, { model_profile: value || "default" });
    });
  });
}

function activeModelConfig() {
  const providers = modelProviders();
  if (!providers[activeModelProvider]) {
    activeModelProvider = "openai";
  }
  return providers[activeModelProvider] || providers.openai;
}

function modelModeEntries(provider, config) {
  const defaults = modelProviders()[provider]?.modes || {};
  return Object.entries(config?.modes || defaults);
}

function syncActiveModelMode() {
  const config = activeModelConfig();
  const modes = modelModeEntries(activeModelProvider, config);
  const preferred = config?.active_mode || modes[0]?.[0] || "";
  if (!modes.some(([mode]) => mode === activeModelMode)) {
    activeModelMode = preferred;
  }
}

function activeModelModeConfig() {
  syncActiveModelMode();
  const config = activeModelConfig();
  return config?.modes?.[activeModelMode] || modelModeEntries(activeModelProvider, config)[0]?.[1] || {};
}

function modelModeDraftKey(provider = activeModelProvider, mode = activeModelMode) {
  return `${provider}:${mode}`;
}

function createModelTestDraft(modeConfig = activeModelModeConfig(), overrides = {}) {
  const savedApiKey = hasSavedApiKey(modeConfig);
  const selectedModels = modeConfig.selected_models?.length
    ? [...modeConfig.selected_models]
    : modeConfig.model
      ? [modeConfig.model]
      : [];
  return {
    baseUrl: modeConfig.base_url || providerDefaultBaseUrl(activeModelProvider, activeModelMode),
    cliPath: modeConfig.cli_path || "",
    workingDirectory: modeConfig.working_directory || "",
    locked: savedApiKey,
    apiKey: "",
    displayApiKey: savedApiKey ? "••••••••••••••••" : "",
    result: "",
    status: "",
    reason: "",
    models: [],
    loadedThisSession: false,
    selectedModels,
    ...overrides,
  };
}

function activeModelTestDraft() {
  const stored = modelTestDrafts[modelModeDraftKey()];
  if (stored) return stored;
  return createModelTestDraft();
}

const MODEL_GROUPS = [
  { key: "recommended", label: "Recommended" },
  { key: "gpt", label: "GPT Models" },
  { key: "reasoning", label: "Reasoning" },
  { key: "claude", label: "Claude" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "image", label: "Image" },
  { key: "audio", label: "Audio / Speech" },
  { key: "embedding", label: "Embedding" },
  { key: "other", label: "Other" },
];

function classifyModelGroup(modelName) {
  const value = String(modelName || "").toLowerCase();
  if (
    /^gpt-5($|-)/.test(value)
    || /^gpt-4\.1($|-)/.test(value)
    || /^gpt-4o($|-)/.test(value)
    || value === "chat-latest"
    || /claude.*sonnet/.test(value)
    || value === "deepseek-chat"
  ) {
    return "recommended";
  }
  if (value.includes("embedding") || value.includes("embed") || value.includes("ada")) return "embedding";
  if (
    value.includes("whisper")
    || value.startsWith("tts")
    || value.includes("audio")
    || value.includes("speech")
    || value.includes("transcribe")
  ) {
    return "audio";
  }
  if (
    value.includes("dall-e")
    || value.includes("image")
    || value.includes("vision")
  ) {
    return "image";
  }
  if (value.startsWith("gpt-")) return "gpt";
  if (/^o\d/.test(value) || value.includes("reasoning")) return "reasoning";
  if (value.includes("claude")) return "claude";
  if (value.includes("deepseek")) return "deepseek";
  return "other";
}

function modelCommonPriority(modelName) {
  const value = String(modelName || "").toLowerCase();
  const priorities = [
    /^gpt-5($|-)/,
    /^gpt-4\.1($|-)/,
    /^gpt-4o($|-)/,
    /^chat-latest$/,
    /claude.*sonnet/,
    /^deepseek-chat$/,
  ];
  const index = priorities.findIndex((pattern) => pattern.test(value));
  return index === -1 ? priorities.length : index;
}

function modelDateScore(modelName) {
  const value = String(modelName || "");
  const compactDates = [...value.matchAll(/20\d{6}/g)].map((match) => Number(match[0]));
  const dashedDates = [...value.matchAll(/20\d{2}[-_.]?\d{2}[-_.]?\d{2}/g)]
    .map((match) => Number(match[0].replace(/\D/g, "")));
  return Math.max(0, ...compactDates, ...dashedDates);
}

function modelVersionScore(modelName) {
  const value = String(modelName || "").toLowerCase();
  const match = value.match(/(?:gpt-|claude-|deepseek-|^o)(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

function compareModelNames(a, b) {
  const commonDelta = modelCommonPriority(a) - modelCommonPriority(b);
  if (commonDelta) return commonDelta;

  const latestDelta = Number(String(b).toLowerCase().includes("latest"))
    - Number(String(a).toLowerCase().includes("latest"));
  if (latestDelta) return latestDelta;

  const dateDelta = modelDateScore(b) - modelDateScore(a);
  if (dateDelta) return dateDelta;

  const versionDelta = modelVersionScore(b) - modelVersionScore(a);
  if (versionDelta) return versionDelta;

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortModelOptions(models) {
  const unique = [...new Set(models || [])];
  return unique.sort((a, b) => {
    const groupDelta = MODEL_GROUPS.findIndex((group) => group.key === classifyModelGroup(a))
      - MODEL_GROUPS.findIndex((group) => group.key === classifyModelGroup(b));
    return groupDelta || compareModelNames(a, b);
  });
}

function modelOptionsForDraft(draft) {
  const available = [...new Set(draft.models || [])];
  return sortModelOptions(available);
}

function groupedModelOptions(options, draft) {
  const selectedSet = new Set(draft.selectedModels || []);
  const groups = [];
  const selectedItems = sortModelOptions(options.filter((item) => selectedSet.has(item)));
  if (selectedItems.length) {
    groups.push({ key: "selected", label: "Selected", items: selectedItems });
  }
  for (const group of MODEL_GROUPS) {
    const items = options.filter((item) => !selectedSet.has(item) && classifyModelGroup(item) === group.key);
    if (items.length) {
      groups.push({ ...group, items });
    }
  }
  return groups;
}

function renderModelOptionGroups(groups, draft) {
  if (!groups.length) return '<div class="target-item">No models match your search.</div>';
  return groups
    .map((group) => `
      <div class="model-select-group">
        <div class="model-select-group-label">${group.label}</div>
        ${group.items
          .map((modelName) => {
            const checked = draft.selectedModels?.includes(modelName);
            return `
              <label class="model-select-item ${checked ? "active" : ""}">
                <input class="model-select-checkbox" data-model-choice="${modelName}" type="checkbox" ${checked ? "checked" : ""} />
                <span>${modelName}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    `)
    .join("");
}

function modelToolbarSummary(draft) {
  const count = draft.selectedModels?.length || 0;
  const availableCount = draft.models?.length || 0;
  return `${count} models selected (${availableCount} avail.)`;
}

function selectedModelPreview(draft) {
  return [...new Set(draft.selectedModels || [])];
}

function invalidSelectedModels(draft) {
  if (!draft?.loadedThisSession) return [];
  const available = new Set(draft.models || []);
  if (!available.size) return [...new Set(draft.selectedModels || [])];
  return [...new Set((draft.selectedModels || []).filter((item) => !available.has(item)))];
}

function renderConnectionNote(message, status = "") {
  if (!message) return "";
  if (status === "testing") {
    return `
      <div class="settings-field-note testing">
        <span>Testing and loading ...</span>
      </div>
    `;
  }
  const noQuota = status === "no_quota";
  const noModels = status === "no_models";
  const error = status === "error";
  const connected = status === "connected" || (!noQuota && !noModels && !error && message.startsWith("Connected"));
  return `
    <div class="settings-field-note ${connected ? "connected" : ""} ${noQuota || noModels ? "warning" : ""} ${error ? "error" : ""}">
      ${connected ? '<span class="settings-note-dot connected" aria-hidden="true"></span>' : ""}
      ${noQuota || noModels ? '<span class="settings-note-dot warning" aria-hidden="true"></span>' : ""}
      ${error ? '<span class="settings-note-dot error" aria-hidden="true"></span>' : ""}
      <span>${message}</span>
      ${
        noQuota
          ? '<span class="settings-field-note-extra">This key connected successfully, but it cannot be used until quota or billing is available.</span>'
          : ""
      }
    </div>
  `;
}

function renderOllamaSetupHelp(draft) {
  if (!draft?.result || draft.status === "testing") return "";
  if (draft.status === "error") {
    return `
      <div class="ollama-help-card">
        <div>
          <strong>Ollama is not reachable.</strong>
          <span>Install Ollama, open it once, then run detection again. If it is already installed, check whether the Base URL is correct.</span>
        </div>
        <div class="ollama-help-actions">
          <a class="target-action secondary" href="https://ollama.com/download" target="_blank" rel="noreferrer">Install Ollama</a>
        </div>
      </div>
    `;
  }
  if (draft.status === "no_models") {
    return `
      <div class="ollama-help-card warning">
        <div>
          <strong>No local models found.</strong>
          <span>Browse models and install them locally, then run detection again.</span>
        </div>
        <div class="ollama-help-actions">
          <a class="target-action ollama-primary-link" href="https://ollama.com/library" target="_blank" rel="noreferrer">Browse models</a>
        </div>
      </div>
    `;
  }
  return "";
}

function renderLoadHint(modeConfig, draft, editing) {
  if (!editing) return "";
  if (!isLoadableModelMode(modeConfig)) return "";
  if (isApiModelMode(modeConfig) && !hasSavedApiKey(modeConfig)) return "";
  if (draft?.status === "testing") return "";
  if (draft?.result) return "";
  if (draft?.loadedThisSession) return "";
  return `
    <div class="settings-field-note testing">
      <span>Click the Load button to ${isLocalModelMode(modeConfig) ? "check Ollama and load local models" : "reload models"}.</span>
    </div>
  `;
}

function runMissingRequirementsMessage(values, modeConfig) {
  const missing = [];
  if (!String(values.baseUrl || "").trim()) missing.push("Base URL");
  if (isApiModelMode(modeConfig) && !hasSavedApiKey(modeConfig)) missing.push("API key");
  if (!(values.selectedModels || []).length) missing.push("at least one model");
  if (!missing.length) return "Still draft. Complete the required fields before running.";
  if (missing.length === 1) return `Still draft. Add ${missing[0]} before running.`;
  if (missing.length === 2) return `Still draft. Add ${missing[0]} and ${missing[1]} before running.`;
  return `Still draft. Add ${missing[0]}, ${missing[1]}, and ${missing[2]} before running.`;
}

function classifyRunFailureMessage(errorOrMessage = "") {
  const reason = typeof errorOrMessage === "object" && errorOrMessage !== null
    ? String(errorOrMessage.reason || "").trim()
    : "";
  if (reason === "base_url_unreachable") {
    if (activeModelProvider === "ollama") {
      return "Still draft. Ollama is not reachable. Make sure Ollama is installed and running.";
    }
    return "Still draft. Base URL is unreachable.";
  }
  if (reason === "api_key_invalid") {
    return "Still draft. API key is invalid.";
  }
  if (reason === "api_key_missing") {
    return "Still draft. Add API key before running.";
  }
  if (reason === "api_request_failed") {
    return "Still draft. API request failed.";
  }
  if (reason === "cli_not_found") {
    return `Still draft. ${activeModelProvider === "claude" ? "Claude Code CLI" : "Codex CLI"} is not installed or cannot run locally.`;
  }
  if (reason === "model_missing") {
    return "Still draft. Add a model name before running.";
  }

  const message = String(
    typeof errorOrMessage === "object" && errorOrMessage !== null
      ? errorOrMessage.message || ""
      : errorOrMessage || "",
  ).trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("name or service not known")
    || lower.includes("nodename nor servname provided")
    || lower.includes("failed to establish a new connection")
    || lower.includes("max retries exceeded")
    || lower.includes("connection refused")
    || lower.includes("timed out")
    || lower.includes("timeout")
  ) {
    return "Still draft. Base URL is unreachable.";
  }

  if (
    lower.includes("401")
    || lower.includes("403")
    || lower.includes("unauthorized")
    || lower.includes("forbidden")
    || lower.includes("invalid api key")
    || lower.includes("authentication")
    || lower.includes("incorrect api key")
  ) {
    return "Still draft. API key is invalid.";
  }

  if (
    lower.includes("500")
    || lower.includes("502")
    || lower.includes("503")
    || lower.includes("504")
    || lower.includes("server error")
    || lower.includes("bad gateway")
    || lower.includes("service unavailable")
  ) {
    return "Still draft. API request failed.";
  }

  if (lower.includes("missing api key")) {
    return "Still draft. Add API key before running.";
  }

  return `Still draft. API request failed${message ? `: ${message}` : "."}`;
}

function modelRunReason(modeConfig, draft, editing = false) {
  if (!isLoadableModelMode(modeConfig) && !isCliModelMode(modeConfig)) return "";
  const nextDraft = draft || {};
  if (editing && nextDraft.loadedThisSession && nextDraft.reason) {
    return String(nextDraft.reason || "").trim();
  }
  const runResult = lastModelRunResults[modelModeDraftKey(activeModelProvider, activeModelMode)] || {};
  return String(runResult.reason || "").trim();
}

function fieldErrorState(modeConfig, draft, editing = false) {
  const selectedModels = editing ? draft?.selectedModels || [] : modeConfig?.selected_models || [];
  const invalidSelected = invalidSelectedModels(draft);
  const reason = modelRunReason(modeConfig, draft, editing);
  const state = {
    baseUrl: false,
    apiKey: false,
    models: false,
  };

  if (editing) {
    const baseUrl = String(draft?.baseUrl || "").trim();
    const hasApiKey = Boolean(String(draft?.apiKey || "").trim() || draft?.displayApiKey || hasSavedApiKey(modeConfig));
    if (isCliModelMode(modeConfig)) {
      state.models = false;
    } else {
      if (!baseUrl) state.baseUrl = true;
      if (isApiModelMode(modeConfig) && !hasApiKey) state.apiKey = true;
      if (!selectedModels.length) state.models = true;
    }
  }

  if (reason === "base_url_unreachable") state.baseUrl = true;
  if (reason === "cli_not_found") state.baseUrl = true;
  if (!isCliModelMode(modeConfig) && reason === "model_missing") state.models = true;
  if (
    isApiModelMode(modeConfig)
    && (reason === "api_key_invalid" || reason === "api_key_missing" || reason === "api_request_failed" || reason === "no_quota")
  ) {
    state.apiKey = true;
  }
  if (isLocalModelMode(modeConfig) && reason === "api_request_failed") {
    state.baseUrl = true;
  }
  if (reason === "selected_models_unavailable" || invalidSelected.length) {
    state.models = true;
  }

  return state;
}

function isModelModeConfigured(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  if (isTerminalCliMode(modeConfig, provider, mode)) {
    return Boolean(modeConfig?.configured);
  }
  if ("api_key_configured" in modeConfig || "api_key" in modeConfig) {
    return Boolean(modeConfig?.base_url && modeConfig?.api_key_configured && modeConfig?.selected_models?.length);
  }
  if (isLocalModelMode(modeConfig, provider, mode)) {
    return Boolean(modeConfig?.base_url && modeConfig?.selected_models?.length && modeConfig?.configured);
  }
  return Boolean(modeConfig?.model || modeConfig?.selected_models?.length);
}

function isApiModelMode(modeConfig) {
  return "api_key_configured" in modeConfig || "api_key" in modeConfig;
}

function isLocalModelMode(_modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return provider === "ollama" && mode === "api";
}

function isCliModelMode(_modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return (provider === "openai" && mode === "codex_cli") || (provider === "claude" && mode === "claude_code_cli");
}

function isTerminalCliMode(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return isCliModelMode(modeConfig, provider, mode);
}

function isLoadableModelMode(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  return isApiModelMode(modeConfig) || isLocalModelMode(modeConfig, provider, mode);
}

function hasSavedApiKey(modeConfig) {
  return Boolean(modeConfig?.api_key_saved || modeConfig?.api_key_configured);
}

function isModelModeDraft(modeConfig, provider = activeModelProvider, mode = activeModelMode) {
  if (isTerminalCliMode(modeConfig, provider, mode)) {
    return !isModelModeConfigured(modeConfig, provider, mode);
  }
  if (!isLoadableModelMode(modeConfig, provider, mode)) return false;
  return Boolean(
    modeConfig?.base_url
    || (isApiModelMode(modeConfig) && hasSavedApiKey(modeConfig))
    || modeConfig?.selected_models?.length
    || modeConfig?.configured
  ) && !isModelModeConfigured(modeConfig, provider, mode);
}

function modelDraftIssues(modeConfig, draft, editing = false) {
  if (isCliModelMode(modeConfig)) {
    return [];
  }
  if (!isLoadableModelMode(modeConfig)) return [];
  const issues = [];
  const baseUrl = String(editing ? draft?.baseUrl || "" : modeConfig?.base_url || "").trim();
  const hasApiKey = editing
    ? Boolean(String(draft?.apiKey || "").trim() || draft?.displayApiKey || hasSavedApiKey(modeConfig))
    : hasSavedApiKey(modeConfig);
  const selectedModels = editing ? draft?.selectedModels || [] : modeConfig?.selected_models || [];

  if (!baseUrl) issues.push("missing Base URL");
  if (isApiModelMode(modeConfig) && !hasApiKey) issues.push("missing API key");
  if (!selectedModels.length) issues.push("no model selected");
  return issues;
}

function renderModelDraftBanner(modeConfig, draft, editing, status) {
  if (!editing) return "";
  if (!isLoadableModelMode(modeConfig) && !isCliModelMode(modeConfig)) return "";
  const issues = modelDraftIssues(modeConfig, draft, editing);
  if (!issues.length || status.key === "configured") return "";
  const issueText = issues.join(" · ");
  const bannerKey = modelModeDraftKey(activeModelProvider, activeModelMode);
  if (dismissedModelDraftBanners[bannerKey] === issueText) return "";
  const title = status.key === "draft" ? "Draft" : "Configuring";
  return `
    <div class="model-draft-banner ${status.key}">
      <strong>${title}</strong>
      <span>${issueText}</span>
      <button class="model-banner-dismiss" data-model-draft-dismiss="${activeModelMode}" type="button" aria-label="Dismiss message">×</button>
    </div>
  `;
}

function renderModelRunBanner(modeConfig, editing) {
  if (editing || isCliModelMode(modeConfig) || !isLoadableModelMode(modeConfig)) return "";
  const runResult = lastModelRunResults[modelModeDraftKey(activeModelProvider, activeModelMode)] || {};
  if (runResult.dismissed) return "";
  const message = String(runResult.message || "").trim();
  const reason = String(runResult.reason || "").trim();
  if (!message || !reason) return "";
  return `
    <div class="model-run-banner" data-model-run-banner>
      <span>${message} (<button class="settings-label-link subtle model-run-edit-link" data-model-run-edit="${activeModelMode}" type="button">Edit</button>)</span>
      <button class="model-run-dismiss" data-model-run-dismiss="${activeModelMode}" type="button" aria-label="Dismiss error">×</button>
    </div>
  `;
}

function renderSelectedModelsPanel(selectedModelItems, invalidSelected, editing) {
  return `
    <div class="model-selected-panel ${editing ? "" : "compact"}">
      <div class="model-selected-panel-head">
        <span class="model-selected-panel-title">Selected Models</span>
        <div class="model-selected-panel-actions">
          ${
            editing && invalidSelected.length
              ? '<button class="settings-label-link subtle model-selected-remove-old" id="modelSelectedRemoveOld" type="button">Remove old models</button>'
              : ""
          }
          ${
            selectedModelItems.length > 4
              ? `<button class="settings-label-link subtle model-selected-toggle" id="modelSelectedToggle" type="button">${modelSelectedListExpanded ? "Collapse" : "View all"}</button>`
              : ""
          }
        </div>
      </div>
      ${
        selectedModelItems.length
          ? `
            <div class="model-selected-chip-list ${modelSelectedListExpanded ? "expanded" : ""}">
              ${selectedModelItems
                .map((modelName) => {
                  const invalid = invalidSelected.includes(modelName);
                  return `
                    <span class="model-selected-chip ${invalid ? "invalid" : ""}" ${invalid ? 'title="This model is not available in the latest loaded list."' : ""}>
                      <span>${modelName}</span>
                      ${invalid ? '<span class="model-selected-chip-status">unavailable</span>' : ""}
                    </span>
                  `;
                })
                .join("")}
            </div>
          `
          : `<div class="model-selected-empty">${editing ? "0 model is selected" : "No model is selected yet..."}</div>`
      }
    </div>
  `;
}

function modelModeStatus(modeConfig, mode, editing) {
  const configured = isModelModeConfigured(modeConfig, activeModelProvider, mode);
  if (isLoadableModelMode(modeConfig, activeModelProvider, mode) || isCliModelMode(modeConfig, activeModelProvider, mode)) {
    if (editing) {
      return { key: "configuring", label: "Configuring", tone: "warning" };
    }
    if (configured) {
      return { key: "configured", label: "Configured", tone: "success" };
    }
    return { key: "draft", label: "Draft", tone: "warning" };
  }
  return configured
    ? { key: "configured", label: "Configured", tone: "success" }
    : { key: "draft", label: "Draft", tone: "warning" };
}

function renderOllamaConfiguration(providerEntries) {
  activeModelMode = "api";
  const activeConfig = activeModelConfig();
  const modeConfig = activeConfig?.modes?.api || {};
  const editing = editingModelMode === "api";
  const expanded = expandedModelMode === "api" || editing;
  const configured = isModelModeConfigured(modeConfig, "ollama", "api");
  const draft = isModelModeDraft(modeConfig, "ollama", "api");
  const status = modelModeStatus(modeConfig, "api", editing);
  const testDraft = activeModelTestDraft();
  const defaultBaseUrl = providerDefaultBaseUrl("ollama", "api");
  const currentBaseUrlValue = editing ? testDraft.baseUrl || "" : modeConfig.base_url || "";
  const selectedModelItems = selectedModelPreview(testDraft);
  const invalidSelected = invalidSelectedModels(testDraft);
  const trimmedModelSearch = modelPickerSearch.trim().toLowerCase();
  const allModelOptions = modelOptionsForDraft(testDraft);
  const modelOptions = allModelOptions.filter((item) =>
    !trimmedModelSearch || item.toLowerCase().includes(trimmedModelSearch),
  );
  const modelOptionGroups = groupedModelOptions(modelOptions, testDraft);
  const allVisibleSelected =
    modelOptions.length > 0 && modelOptions.every((item) => testDraft.selectedModels?.includes(item));
  const modelPickerBulkLabel = allVisibleSelected ? "Unselect all" : "Select all";
  const fieldErrors = fieldErrorState(modeConfig, testDraft, editing);

  settingsPlaceholder.innerHTML = `
    <h3>Model Configuration</h3>
    <p class="settings-subcopy model-configuration-subcopy">Configure AI provider connection and save settings locally.</p>
    <div class="service-scope">
      <div class="service-switcher">
        <div class="service-tabs model-provider-tabs" aria-label="Model provider tabs">
          ${providerEntries
            .map(([provider]) => `
              <button class="service-tab ${provider === activeModelProvider ? "active" : ""}" data-model-provider="${provider}" type="button">
                <span class="service-tab-main">${modelProviderDisplayName(provider)}</span>
              </button>
            `)
            .join("")}
        </div>
      </div>
      <section class="service-card model-config-card">
        <div class="model-mode-drawers" aria-label="Ollama local runtime">
          <section class="model-mode-drawer ${expanded ? "active" : ""}">
            <div class="model-mode-drawer-head">
              <button class="model-mode-drawer-toggle" data-model-mode-toggle="api" type="button" aria-expanded="${expanded}">
                <span class="model-mode-drawer-title-row">
                  <span class="model-mode-drawer-title">${modeConfig.label || "Ollama API"}</span>
                  <span class="target-label ${status.tone}">${status.label}</span>
                </span>
              </button>
              <div class="model-mode-drawer-actions">
                ${
                  configured
                    ? `
                      <button class="target-toggle model-mode-enable ${modeConfig.enabled ? "enabled" : ""}" data-model-mode-enable="api" type="button" aria-pressed="${modeConfig.enabled ? "true" : "false"}" aria-label="${modeConfig.enabled ? "Disable" : "Enable"} Ollama">
                        <span class="target-toggle-track" aria-hidden="true">
                          <span class="target-toggle-thumb"></span>
                        </span>
                      </button>
                    `
                    : ""
                }
                ${!editing ? '<button class="target-action secondary" data-model-mode-run="api" type="button">Run</button>' : ""}
                ${!editing ? '<button class="target-action secondary model-mode-edit-pill" data-model-mode-edit="api" type="button">Edit</button>' : ""}
                <button class="model-mode-caret-button" data-model-mode-toggle="api" type="button" aria-expanded="${expanded}" aria-label="${expanded ? "Collapse" : "Expand"} Ollama API">
                  <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                </button>
              </div>
            </div>
            ${
              expanded
                ? `
            <div class="model-mode-drawer-body">
              <form class="model-config-form" id="modelConfigForm">
                ${
                  editing
                    ? `
                      <button class="ollama-detect-button" id="modelLoadButton" type="button">
                        Run and detect Ollama locally
                      </button>
                    `
                    : ""
                }
                ${renderModelRunBanner(modeConfig, editing)}
                <div class="settings-field ${fieldErrors.baseUrl ? "has-error" : ""}">
                  <label class="settings-label" for="modelBaseUrlInput">Base URL</label>
                  ${
                    editing
                      ? `
                        ${testDraft.status === "no_models" ? renderConnectionNote("Base URL connected.", "connected") : testDraft.status === "error" ? "" : renderConnectionNote(testDraft.result, testDraft.status)}
                        ${testDraft.status !== "no_models" ? renderOllamaSetupHelp(testDraft) : ""}
                        <div class="settings-input-with-action">
                          <input class="settings-input" id="modelBaseUrlInput" name="baseUrl" autocomplete="off" placeholder="${defaultBaseUrl}" value="${currentBaseUrlValue}" />
                          <button class="settings-input-action compact light-action ${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "text-action" : "icon-only"}" id="modelBaseUrlAction" type="button" aria-label="${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "Restore default Base URL" : "Clear Base URL"}">
                            ${
                              !currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl
                                ? "Default"
                                : `
                                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M6 6L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path d="M14 6L6 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                  </svg>
                                `
                            }
                          </button>
                        </div>
                      `
                      : currentBaseUrlValue
                        ? `<div class="settings-empty-block filled">${currentBaseUrlValue}</div>`
                        : '<div class="settings-empty-block">No Base URL is added ...</div>'
                  }
                </div>
                <div class="settings-field ${fieldErrors.models ? "has-error" : ""}">
                  <div class="settings-label-row">
                    <label class="settings-label">Models</label>
                  </div>
                  ${editing && testDraft.status === "no_models" ? renderOllamaSetupHelp(testDraft) : ""}
                  <div class="model-picker">
                    ${renderSelectedModelsPanel(selectedModelItems, invalidSelected, editing)}
                    ${
                      editing && testDraft.loadedThisSession && testDraft.models?.length
                        ? `
                          <button class="model-picker-trigger ${modelPickerOpen ? "open" : ""}" id="modelPickerTrigger" type="button" aria-expanded="${modelPickerOpen ? "true" : "false"}">
                            <span class="model-picker-summary">Select models ...</span>
                            <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                          </button>
                          ${
                            modelPickerOpen
                              ? `
                                <div class="model-picker-menu">
                                  <input class="home-bot-search model-picker-search" id="modelPickerSearch" autocomplete="off" placeholder="Search model by name" />
                                  <div class="model-picker-toolbar">
                                    <span class="model-picker-toolbar-summary">${modelToolbarSummary(testDraft)}</span>
                                    <button class="settings-label-link subtle model-picker-bulk-action" id="modelPickerBulkAction" type="button">${modelPickerBulkLabel}</button>
                                  </div>
                                  <div class="model-select-list">
                                    ${
                                      modelOptions.length
                                        ? renderModelOptionGroups(modelOptionGroups, testDraft)
                                        : '<div class="target-item">No models match your search.</div>'
                                    }
                                  </div>
                                </div>
                              `
                              : ""
                          }
                        `
                        : ""
                    }
                  </div>
                </div>
                ${
                  editing
                    ? `
                      <div class="settings-actions model-config-actions">
                        <span class="settings-feedback" id="modelConfigFeedback"></span>
                        <div class="model-config-action-buttons">
                          ${(configured || draft) ? '<button class="target-action secondary" id="modelConfigCancel" type="button">Cancel</button>' : ""}
                          <button class="target-action" id="modelConfigSave" type="submit">Save</button>
                        </div>
                      </div>
                    `
                    : '<span class="settings-feedback sr-only" id="modelConfigFeedback"></span>'
                }
              </form>
            </div>
                `
                : ""
            }
          </section>
        </div>
      </section>
    </div>
  `;

  bindModelProviderTabs();

  settingsPlaceholder.querySelectorAll("[data-model-mode-toggle]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeModelMode = "api";
      expandedModelMode = expandedModelMode === "api" ? "" : "api";
      editingModelMode = "";
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      activeModelMode = "api";
      expandedModelMode = "api";
      const enterEdit = (nextModeConfig = modeConfig) => {
        modelTestDrafts[modelModeDraftKey("ollama", "api")] = createModelTestDraft(nextModeConfig, {
          status: "",
          result: "",
          reason: "",
          loadedThisSession: false,
        });
        editingModelMode = "api";
        expandedModelMode = "api";
        modelPickerOpen = false;
        modelPickerSearch = "";
        modelSelectedListExpanded = false;
        renderSettings();
      };

      if (configured) {
        openRoleChoice({
          title: "Edit configured model?",
          copy: "Ollama API will move back to Draft and be disabled before editing. You can run it again after updating the settings.",
          confirmLabel: "Continue to edit",
          cancelLabel: "Don't edit",
          defaultAction: "cancel",
          danger: true,
          onConfirm: async () => {
            closeRoleChoice();
            await saveModelConfiguration("ollama", "api", {
              model: modeConfig.model || (modeConfig.selected_models || [])[0] || "",
              baseUrl: modeConfig.base_url || defaultBaseUrl,
              apiKey: "",
              includeApiKey: false,
              selectedModels: [...(modeConfig.selected_models || [])],
              configured: false,
              enabled: false,
              resumeEnabledOnRun: false,
            });
            enterEdit(activeModelConfig()?.modes?.api || modeConfig);
          },
        });
        return;
      }

      enterEdit();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModelMode = "api";
      expandedModelMode = "api";
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = createModelTestDraft(modeConfig);
      editingModelMode = "api";
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = modelModeDraftKey("ollama", "api");
      lastModelRunResults[key] = {
        ...(lastModelRunResults[key] || {}),
        dismissed: true,
      };
      renderSettings();
    });
  });

  bindOllamaRunAndEnable(modeConfig);

  const form = settingsPlaceholder.querySelector("#modelConfigForm");
  if (!form) return;

  const saveButton = settingsPlaceholder.querySelector("#modelConfigSave");
  const cancelButton = settingsPlaceholder.querySelector("#modelConfigCancel");
  const baseUrlInput = settingsPlaceholder.querySelector("#modelBaseUrlInput");
  const baseUrlActionButton = settingsPlaceholder.querySelector("#modelBaseUrlAction");
  const modelLoadButton = settingsPlaceholder.querySelector("#modelLoadButton");
  const modelPickerTrigger = settingsPlaceholder.querySelector("#modelPickerTrigger");
  const modelPickerSearchInput = settingsPlaceholder.querySelector("#modelPickerSearch");
  const modelPickerBulkAction = settingsPlaceholder.querySelector("#modelPickerBulkAction");
  const feedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
  const setFeedback = (message = "", tone = "") => {
    if (!feedback) return;
    feedback.textContent = message;
    if (tone) feedback.dataset.tone = tone;
    else delete feedback.dataset.tone;
  };
  const collectValues = () => ({
    model: (activeModelTestDraft().selectedModels || [])[0] || "",
    apiKey: "",
    includeApiKey: false,
    baseUrl: String(new FormData(form).get("baseUrl") || "").trim(),
    selectedModels: [...(activeModelTestDraft().selectedModels || [])],
  });

  if (baseUrlActionButton && baseUrlInput) {
    baseUrlActionButton.addEventListener("click", () => {
      const currentValue = baseUrlInput.value.trim();
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        baseUrl: currentValue === defaultBaseUrl ? "" : defaultBaseUrl,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      renderSettings();
    });
  }

  if (baseUrlInput) {
    baseUrlInput.addEventListener("input", () => {
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        baseUrl: baseUrlInput.value,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
    });
  }

  if (modelLoadButton) {
    modelLoadButton.addEventListener("click", async () => {
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        result: "Testing and loading ...",
        status: "testing",
      };
      renderSettings();
      try {
        const result = await testModelConfiguration("ollama", "api", collectValues());
        const currentDraft = activeModelTestDraft();
        const models = result.models || [];
        modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
          ...currentDraft,
          result: result.message || "Connected.",
          status: result.status || "connected",
          models,
          loadedThisSession: result.status === "connected" || result.status === "no_models",
        };
        modelPickerOpen = Boolean(models.length);
        modelPickerSearch = "";
        modelSelectedListExpanded = false;
        renderSettings();
      } catch (error) {
        modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
          ...activeModelTestDraft(),
          result: error.message,
          status: "error",
          reason: error.reason || "api_request_failed",
          loadedThisSession: false,
        };
        renderSettings();
      }
    });
  }

  if (modelPickerSearchInput) {
    modelPickerSearchInput.value = modelPickerSearch;
    modelPickerSearchInput.addEventListener("input", () => {
      modelPickerSearch = modelPickerSearchInput.value;
      renderSettings();
    });
  }

  if (modelPickerTrigger) {
    modelPickerTrigger.addEventListener("click", () => {
      modelPickerOpen = !modelPickerOpen;
      if (!modelPickerOpen) modelPickerSearch = "";
      renderSettings();
    });
  }

  const modelSelectedToggle = settingsPlaceholder.querySelector("#modelSelectedToggle");
  if (modelSelectedToggle) {
    modelSelectedToggle.addEventListener("click", () => {
      modelSelectedListExpanded = !modelSelectedListExpanded;
      renderSettings();
    });
  }

  const modelSelectedRemoveOld = settingsPlaceholder.querySelector("#modelSelectedRemoveOld");
  if (modelSelectedRemoveOld) {
    modelSelectedRemoveOld.addEventListener("click", () => {
      const draft = activeModelTestDraft();
      const invalid = new Set(invalidSelectedModels(draft));
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...draft,
        selectedModels: (draft.selectedModels || []).filter((item) => !invalid.has(item)),
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      renderSettings();
    });
  }

  settingsPlaceholder.querySelectorAll("[data-model-choice]").forEach((input) => {
    input.addEventListener("change", () => {
      const currentSelected = new Set(activeModelTestDraft().selectedModels || []);
      if (input.checked) currentSelected.add(input.dataset.modelChoice);
      else currentSelected.delete(input.dataset.modelChoice);
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        selectedModels: [...currentSelected],
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      renderSettings();
    });
  });

  if (modelPickerBulkAction) {
    modelPickerBulkAction.addEventListener("click", () => {
      modelTestDrafts[modelModeDraftKey("ollama", "api")] = {
        ...activeModelTestDraft(),
        selectedModels: allVisibleSelected ? [] : [...modelOptions],
      };
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      renderSettings();
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      delete modelTestDrafts[modelModeDraftKey("ollama", "api")];
      editingModelMode = "";
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = collectValues();
    setFeedback("Saving...");
    if (saveButton) saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    try {
      await saveModelConfiguration("ollama", "api", {
        ...values,
        configured: false,
        enabled: false,
      });
      delete lastModelRunResults[modelModeDraftKey("ollama", "api")];
      delete modelTestDrafts[modelModeDraftKey("ollama", "api")];
      editingModelMode = "";
      setFeedback("Saved.", "success");
      renderSettings();
    } catch (error) {
      setFeedback(`Save failed: ${error.message}`, "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  });
}

function cliInstallUrl(provider) {
  return provider === "claude" ? "https://claude.ai/code" : "https://codex.com";
}

function renderCliHelp(draft) {
  if (!draft?.result || draft.status === "testing") return "";
  const reason = String(draft.reason || "").trim();
  if (reason !== "cli_not_found") return "";
  const label = activeModelProvider === "claude" ? "Claude Code CLI" : "Codex CLI";
  const action = activeModelProvider === "claude" ? "Install Claude Code" : "Install Codex";
  const guidance = activeModelProvider === "claude"
    ? "Install Claude Code or make sure the claude command can run locally, then run detection again."
    : "Install Codex or make sure Codex CLI can run locally, then run detection again.";
  return `
    <div class="ollama-help-card">
      <div>
        <strong>${label} is not reachable.</strong>
        <span>${guidance}</span>
      </div>
      <div class="ollama-help-actions">
        <a class="target-action secondary" href="${cliInstallUrl(activeModelProvider)}" target="_blank" rel="noreferrer">${action}</a>
      </div>
    </div>
  `;
}

function renderCliStatusCard(draft) {
  if (!draft?.result || draft.status === "testing") return "";
  const label = activeModelProvider === "claude" ? "Claude Code CLI" : "Codex CLI";
  if (draft.status === "connected") {
    const version = String(draft.result || "").match(/Version:\s*(.+)$/)?.[1] || "";
    return `
      <div class="cli-status-card success">
        <strong>${label} detected.</strong>
        ${version ? `<span>Version: ${version}</span>` : ""}
      </div>
    `;
  }
  return renderCliHelp(draft);
}

function renderCliModeFields(modeConfig, draft, editing, fieldErrors, status) {
  const label = activeModelProvider === "claude" ? "Claude Code" : "Codex CLI";
  return `
    ${renderModelRunBanner(modeConfig, false)}
    <button class="ollama-detect-button cli-detect-button" data-model-mode-run="${activeModelMode}" type="button">
      Run and detect ${label} locally
    </button>
    ${draft.status === "testing" ? renderConnectionNote(draft.result, draft.status) : ""}
    ${renderCliStatusCard(draft)}
  `;
}

function bindModelProviderTabs() {
  settingsPlaceholder.querySelectorAll("[data-model-provider]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeModelProvider = tab.dataset.modelProvider || "openai";
      activeModelMode = activeModelConfig().active_mode || "";
      expandedModelMode = "";
      editingModelMode = "";
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  });
}

function bindOllamaRunAndEnable(modeConfig) {
  const boundRunButtons = new Set();
  settingsPlaceholder.querySelectorAll("[data-model-mode-run]").forEach((button) => {
    if (boundRunButtons.has(button)) return;
    boundRunButtons.add(button);
    button.addEventListener("click", async () => {
      const selectedModels = [...(modeConfig.selected_models || [])];
      const savedValues = {
        model: modeConfig.model || selectedModels[0] || "",
        baseUrl: modeConfig.base_url || "",
        apiKey: "",
        includeApiKey: false,
        selectedModels,
      };
      const draftKey = modelModeDraftKey("ollama", "api");
      delete lastModelRunResults[draftKey];
      button.disabled = true;
      try {
        if (!savedValues.baseUrl || !selectedModels.length) {
          const missingMessage = runMissingRequirementsMessage(savedValues, modeConfig);
          lastModelRunResults[draftKey] = {
            reason: "required_fields_incomplete",
            message: missingMessage,
            dismissed: false,
          };
          await saveModelConfiguration("ollama", "api", {
            ...savedValues,
            configured: false,
            enabled: false,
            resumeEnabledOnRun: false,
          });
          renderSettings();
          return;
        }
        const result = await testModelConfiguration("ollama", "api", savedValues);
        const models = result.models || [];
        const invalidSelected = selectedModels.filter((item) => !models.includes(item));
        const validForConfigured = Boolean(savedValues.baseUrl && selectedModels.length && !invalidSelected.length && result.status === "connected");
        await saveModelConfiguration("ollama", "api", {
          ...savedValues,
          configured: validForConfigured,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.api || modeConfig, {
          result: result.message || "Connected.",
          status: result.status || "connected",
          reason: invalidSelected.length ? "selected_models_unavailable" : "",
          models,
          loadedThisSession: true,
          selectedModels,
        });
        if (validForConfigured) {
          delete lastModelRunResults[draftKey];
        } else {
          lastModelRunResults[draftKey] = {
            reason: invalidSelected.length ? "selected_models_unavailable" : "required_fields_incomplete",
            message: invalidSelected.length
              ? "Still draft. Remove old models that are no longer available."
              : "Still draft. Select at least one available local model before running.",
            dismissed: false,
          };
        }
        renderSettings();
      } catch (error) {
        const friendlyMessage = classifyRunFailureMessage(error);
        await saveModelConfiguration("ollama", "api", {
          ...savedValues,
          configured: false,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        lastModelRunResults[draftKey] = {
          reason: error.reason || "api_request_failed",
          message: friendlyMessage,
          dismissed: false,
        };
        renderSettings();
      } finally {
        button.disabled = false;
      }
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-enable]").forEach((toggle) => {
    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        await saveModelConfiguration("ollama", "api", {
          enabled: !modeConfig.enabled,
        });
        renderSettings();
      } finally {
        toggle.disabled = false;
      }
    });
  });
}

function renderModelConfiguration() {
  telegramSettings.hidden = true;
  serviceConfigSettings.hidden = true;
  settingsPlaceholder.hidden = false;
  const providers = modelProviders();
  const activeConfig = activeModelConfig();
  syncActiveModelMode();
  const activeModeConfig = activeModelModeConfig();
  const activeTestDraft = activeModelTestDraft();
  const isCliMode = activeModelMode.includes("cli");
  const inEditingFlow =
    editingModelMode === activeModelMode
    || (!isModelModeConfigured(activeModeConfig, activeModelProvider, activeModelMode) && Boolean(activeModelMode));
  const showModelSelector = !isCliMode
    && (isLoadableModelMode(activeModeConfig, activeModelProvider, activeModelMode)
      ? Boolean(activeModelMode)
      : inEditingFlow || isModelModeConfigured(activeModeConfig, activeModelProvider, activeModelMode));
  const allModelOptions = modelOptionsForDraft(activeTestDraft);
  const selectedModelItems = selectedModelPreview(activeTestDraft);
  const trimmedModelSearch = modelPickerSearch.trim().toLowerCase();
  const modelOptions = allModelOptions.filter((item) =>
    !trimmedModelSearch || item.toLowerCase().includes(trimmedModelSearch),
  );
  const modelOptionGroups = groupedModelOptions(modelOptions, activeTestDraft);
  const defaultBaseUrl = providerDefaultBaseUrl(activeModelProvider, activeModelMode);
  const currentBaseUrlValue = activeTestDraft.baseUrl || "";
  const invalidSelected = invalidSelectedModels(activeTestDraft);
  const fieldErrors = fieldErrorState(activeModeConfig, activeTestDraft, editingModelMode === activeModelMode);
  const allVisibleSelected =
    modelOptions.length > 0 && modelOptions.every((item) => activeTestDraft.selectedModels?.includes(item));
  const modelPickerBulkLabel = allVisibleSelected ? "Unselect all" : "Select all";
  const modeEntries = modelModeEntries(activeModelProvider, activeConfig);
  const noEnabledModelOptions = enabledModelOptions().length === 0;
  const providerEntries = [
    ["openai", providers.openai],
    ["claude", providers.claude],
    ["ollama", providers.ollama],
    ["deepseek", providers.deepseek],
  ];

  if (activeModelProvider === "ollama") {
    renderOllamaConfiguration(providerEntries);
    return;
  }

  settingsPlaceholder.innerHTML = `
    <h3>Model Configuration</h3>
    <p class="settings-subcopy model-configuration-subcopy">Configure AI provider connection and save settings locally.</p>
    <div class="service-scope">
      ${
        noEnabledModelOptions && activeModelProvider === "openai"
          ? `
            <div class="model-empty-error-box" role="alert">
              <strong>No Enabled AI Provider (Model) Enabled</strong>
              <span>You need to configure/run and enable at least 1 AI Provider (Model)</span>
            </div>
          `
          : ""
      }
      <div class="service-switcher">
        <div class="service-tabs model-provider-tabs" aria-label="Model provider tabs">
          ${providerEntries
            .map(([provider, config]) => {
              return `
                <button class="service-tab ${provider === activeModelProvider ? "active" : ""}" data-model-provider="${provider}" type="button">
                  <span class="service-tab-main">${modelProviderDisplayName(provider)}</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
      <section class="service-card model-config-card">
        <div class="model-mode-drawers" aria-label="Model connection modes">
          ${modeEntries
            .map(([mode, modeConfig]) => {
              const expanded = mode === expandedModelMode || editingModelMode === mode;
              const configured = isModelModeConfigured(modeConfig, activeModelProvider, mode);
              const draft = isModelModeDraft(modeConfig, activeModelProvider, mode);
              const editing = editingModelMode === mode;
              const apiMode = isApiModelMode(modeConfig);
              const cliMode = isCliModelMode(modeConfig, activeModelProvider, mode);
              const loadableMode = apiMode || isLocalModelMode(modeConfig, activeModelProvider, mode);
              const status = modelModeStatus(modeConfig, mode, editing);
              const showCancel = editing && (configured || draft) && !cliMode;
              const showRemove = apiMode && editing && activeTestDraft.loadedThisSession;
              const showEnableToggle = configured;
              const showEditButton = !cliMode && (loadableMode || configured || draft);
              const showRunButton = loadableMode && !editing;
              const showSaveButton = editing && !cliMode;
              const runButtonLabel = "Run";
              return `
                <section class="model-mode-drawer ${expanded ? "active" : ""} ${cliMode ? "cli-mode-drawer" : ""}">
                  <div class="model-mode-drawer-head">
                    <button class="model-mode-drawer-toggle" data-model-mode-toggle="${mode}" type="button" aria-expanded="${expanded}">
                      <span class="model-mode-drawer-title-row">
                        <span class="model-mode-drawer-title">${modeConfig.label}</span>
                        <span class="target-label ${status.tone}">${status.label}</span>
                      </span>
                    </button>
                    <div class="model-mode-drawer-actions">
                      ${
                        showEnableToggle
                          ? `
                            <button class="target-toggle model-mode-enable ${modeConfig.enabled ? "enabled" : ""}" data-model-mode-enable="${mode}" type="button" aria-pressed="${modeConfig.enabled ? "true" : "false"}" aria-label="${modeConfig.enabled ? "Disable" : "Enable"} ${modeConfig.label}">
                              <span class="target-toggle-track" aria-hidden="true">
                                <span class="target-toggle-thumb"></span>
                              </span>
                            </button>
                          `
                          : ""
                      }
                      ${
                        showRunButton
                          ? `
                            <button class="target-action secondary" data-model-mode-run="${mode}" type="button">${runButtonLabel}</button>
                          `
                          : ""
                      }
                      ${
                        showEditButton
                          ? `
                            <button class="target-action secondary model-mode-edit-pill" data-model-mode-edit="${mode}" type="button">Edit</button>
                          `
                          : ""
                      }
                      <button class="model-mode-caret-button" data-model-mode-toggle="${mode}" type="button" aria-expanded="${expanded}" aria-label="${expanded ? "Collapse" : "Expand"} ${modeConfig.label}">
                        <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  ${
                    expanded
                      ? `
                        <div class="model-mode-drawer-body ${cliMode ? "cli-mode-drawer-body" : ""}">
                          <form class="model-config-form ${cliMode ? "cli-mode-form" : ""}" id="modelConfigForm">
          ${isCliMode
            ? renderCliModeFields(activeModeConfig, activeTestDraft, editing, fieldErrors, status)
            : `
              ${renderModelDraftBanner(activeModeConfig, activeTestDraft, editing, status)}
              ${renderModelRunBanner(activeModeConfig, editing)}
              <div class="settings-field ${fieldErrors.baseUrl ? "has-error" : ""}">
                <label class="settings-label" for="modelBaseUrlInput">Base URL</label>
                ${
                  editing
                    ? `
                      <div class="settings-input-with-action">
                        <input class="settings-input" id="modelBaseUrlInput" name="baseUrl" autocomplete="off" placeholder="${providerDefaultBaseUrl(
                          activeModelProvider,
                          activeModelMode,
                        )}" value="${currentBaseUrlValue}" />
                        <button class="settings-input-action compact light-action ${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "text-action" : "icon-only"}" id="modelBaseUrlAction" type="button" aria-label="${!currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl ? "Restore default Base URL" : "Clear Base URL"}">
                          ${
                            !currentBaseUrlValue || currentBaseUrlValue !== defaultBaseUrl
                              ? "Default"
                              : `
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M6 6L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                  <path d="M14 6L6 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                              `
                          }
                        </button>
                      </div>
                      ${
                        editing && isLocalModelMode(activeModeConfig)
                          ? `
                            <div class="settings-inline-actions">
                              <button class="settings-input-action compact light-action" id="modelLoadButton" type="button">Load</button>
                            </div>
                            ${renderConnectionNote(activeTestDraft.result, activeTestDraft.status)}
                            ${renderLoadHint(activeModeConfig, activeTestDraft, editing)}
                          `
                          : ""
                      }
                    `
                    : currentBaseUrlValue
                      ? `<div class="settings-empty-block filled">${currentBaseUrlValue}</div>`
                      : '<div class="settings-empty-block">No Base URL is added ...</div>'
                }
              </div>
              ${
                "api_key" in activeModeConfig
                  ? `
                    <div class="settings-field ${fieldErrors.apiKey ? "has-error" : ""}">
                      <div class="settings-label-row">
                        <label class="settings-label" for="modelApiKeyInput">
                          API Key
                        </label>
                      </div>
                      ${
                        editing
                          ? `
                            <div class="settings-input-with-action ${activeTestDraft.locked ? "locked" : ""}">
                              <input class="settings-input" id="modelApiKeyInput" name="apiKey" type="password" autocomplete="off" placeholder="${
                              activeModeConfig.api_key_configured ? "Configured. Enter a new key to replace." : "Paste API key"
                            }" value="${activeTestDraft.locked ? (activeTestDraft.displayApiKey || "••••••••••••••••") : (activeTestDraft.apiKey || "")}" ${editing && !activeTestDraft.locked ? "" : "disabled"} />
                              ${
                                editing
                                  ? showRemove
                                    ? '<button class="settings-input-action danger compact" id="modelApiKeyRemove" type="button">Remove</button>'
                                    : !isCliMode
                                      ? '<button class="settings-input-action compact light-action" id="modelLoadButton" type="button">Load</button>'
                                    : ""
                                  : ""
                              }
                            </div>
                          `
                          : hasSavedApiKey(activeModeConfig)
                            ? '<div class="settings-empty-block filled">••••••••••••••••</div>'
                            : '<div class="settings-empty-block">No API Key is added ...</div>'
                      }
                      ${editing ? renderConnectionNote(activeTestDraft.result, activeTestDraft.status) : ""}
                      ${renderLoadHint(activeModeConfig, activeTestDraft, editing)}
                    </div>
                  `
                  : ""
              }
            `}
          ${
            showModelSelector
              ? `
                <div class="settings-field ${fieldErrors.models ? "has-error" : ""}">
                  <div class="settings-label-row">
                    <label class="settings-label" for="modelNameInput">${isCliMode ? "Model Name" : "Models"}</label>
                  </div>
                  ${
                    isCliMode
                      ? `
                        <input class="settings-input" id="modelNameInput" name="model" autocomplete="off" placeholder="${
                          activeModelProvider === "openai"
                            ? "gpt-4.1"
                            : activeModelProvider === "claude"
                              ? "claude-sonnet-4-20250514"
                              : activeModelProvider === "ollama"
                                ? "llama3.1"
                                : "deepseek-chat"
                        }" value="${activeModeConfig.model || ""}" ${editing ? "" : "disabled"} />
                      `
                      : `
                        <div class="model-picker">
                          ${
                            selectedModelItems.length || !isCliMode
                              ? `
                                <div class="model-selected-panel ${editing ? "" : "compact"}">
                                  <div class="model-selected-panel-head">
                                    <span class="model-selected-panel-title">Selected Models</span>
                                    <div class="model-selected-panel-actions">
                                      ${
                                        editing && invalidSelected.length
                                          ? '<button class="settings-label-link subtle model-selected-remove-old" id="modelSelectedRemoveOld" type="button">Remove old models</button>'
                                          : ""
                                      }
                                      ${
                                        selectedModelItems.length > 4
                                          ? `<button class="settings-label-link subtle model-selected-toggle" id="modelSelectedToggle" type="button">${modelSelectedListExpanded ? "Collapse" : "View all"}</button>`
                                          : ""
                                      }
                                    </div>
                                  </div>
                                  ${
                                    selectedModelItems.length
                                      ? `
                                        <div class="model-selected-chip-list ${modelSelectedListExpanded ? "expanded" : ""}">
                                          ${selectedModelItems
                                            .map((modelName) => {
                                              const invalid = invalidSelected.includes(modelName);
                                              return `
                                                <span class="model-selected-chip ${invalid ? "invalid" : ""}" ${invalid ? 'title="This model is not available in the latest loaded list."' : ""}>
                                                  <span>${modelName}</span>
                                                  ${invalid ? '<span class="model-selected-chip-status">unavailable</span>' : ""}
                                                </span>
                                              `;
                                            })
                                            .join("")}
                                        </div>
                                      `
                                      : `
                                        <div class="model-selected-empty">${
                                          editing
                                            ? "0 model is selected"
                                            : "No model is selected yet..."
                                        }</div>
                                      `
                                  }
                                </div>
                              `
                              : ""
                          }
                          ${
                            editing && activeTestDraft.loadedThisSession && activeTestDraft.models?.length
                              ? `
                                <button class="model-picker-trigger ${modelPickerOpen ? "open" : ""}" id="modelPickerTrigger" type="button" aria-expanded="${modelPickerOpen ? "true" : "false"}">
                                  <span class="model-picker-summary">Select models ...</span>
                                  <span class="model-mode-drawer-caret" aria-hidden="true"></span>
                                </button>
                                ${
                                  modelPickerOpen
                                    ? `
                                      <div class="model-picker-menu">
                                        <input class="home-bot-search model-picker-search" id="modelPickerSearch" autocomplete="off" placeholder="Search model by name" />
                                        <div class="model-picker-toolbar">
                                          <span class="model-picker-toolbar-summary">${modelToolbarSummary(activeTestDraft)}</span>
                                          <button class="settings-label-link subtle model-picker-bulk-action" id="modelPickerBulkAction" type="button">${modelPickerBulkLabel}</button>
                                        </div>
                                        ${
                                          activeTestDraft.models?.length
                                            ? `
                                              <div class="model-select-list">
                                                ${
                                                  modelOptions.length
                                                    ? renderModelOptionGroups(modelOptionGroups, activeTestDraft)
                                                    : '<div class="target-item">No models match your search.</div>'
                                                }
                                              </div>
                                            `
                                            : '<div class="target-item model-picker-empty">Click Load to fetch available models.</div>'
                                        }
                                      </div>
                                    `
                                    : ""
                                }
                              `
                              : ""
                          }
                        </div>
                      `
                  }
                </div>
              `
              : ""
          }
          ${
            showSaveButton || showCancel
              ? `
                <div class="settings-actions model-config-actions">
                  <span class="settings-feedback" id="modelConfigFeedback"></span>
                  <div class="model-config-action-buttons">
                    ${showCancel ? '<button class="target-action secondary" id="modelConfigCancel" type="button">Cancel</button>' : ""}
                    ${showSaveButton ? '<button class="target-action" id="modelConfigSave" type="submit">Save</button>' : ""}
                  </div>
                </div>
              `
              : '<span class="settings-feedback sr-only" id="modelConfigFeedback"></span>'
          }
                          </form>
                        </div>
                      `
                      : ""
                  }
                </section>
              `;
            })
            .join("")}
        </div>
      </section>
    </div>
  `;

  bindModelProviderTabs();

  settingsPlaceholder.querySelectorAll("[data-model-mode-toggle]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextMode = tab.dataset.modelModeToggle || "";
      activeModelMode = nextMode;
      if (expandedModelMode === nextMode) {
        expandedModelMode = "";
        editingModelMode = "";
      } else {
        expandedModelMode = nextMode;
        editingModelMode = "";
      }
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-edit]").forEach((tab) => {
    tab.addEventListener("click", async () => {
      activeModelMode = tab.dataset.modelModeEdit || "";
      expandedModelMode = activeModelMode;
      const modeConfig = activeModelConfig()?.modes?.[activeModelMode] || {};
      if (isCliModelMode(modeConfig, activeModelProvider, activeModelMode)) {
        return;
      }
      const enterEdit = (nextModeConfig = modeConfig, overrides = {}) => {
        modelTestDrafts[modelModeDraftKey(activeModelProvider, activeModelMode)] = createModelTestDraft(nextModeConfig, {
          status: "",
          result: "",
          reason: "",
          loadedThisSession: false,
          ...overrides,
        });
        editingModelMode = activeModelMode;
        expandedModelMode = activeModelMode;
        modelPickerOpen = false;
        modelPickerSearch = "";
        modelSelectedListExpanded = false;
        renderSettings();
      };

      if ((isApiModelMode(modeConfig) || isCliModelMode(modeConfig, activeModelProvider, activeModelMode)) && isModelModeConfigured(modeConfig, activeModelProvider, activeModelMode)) {
        openRoleChoice({
          title: "Edit configured model?",
          copy: `${modeConfig.label} will move back to Draft and be disabled before editing. You can run it again after updating the settings.`,
          confirmLabel: "Continue to edit",
          cancelLabel: "Don't edit",
          defaultAction: "cancel",
          danger: true,
          onConfirm: async () => {
            closeRoleChoice();
            try {
              const selectedModels = [...(modeConfig.selected_models || [])];
              const nextModel = modeConfig.model || selectedModels[0] || "";
              await saveModelConfiguration(activeModelProvider, activeModelMode, {
                model: nextModel,
                baseUrl: modeConfig.base_url || "",
                cliPath: modeConfig.cli_path || "",
                workingDirectory: modeConfig.working_directory || "",
                apiKey: "",
                includeApiKey: false,
                selectedModels,
                configured: false,
                enabled: false,
                resumeEnabledOnRun: false,
              });
              const nextModeConfig = activeModelConfig()?.modes?.[activeModelMode] || modeConfig;
              enterEdit(nextModeConfig, { status: "", result: "", reason: "" });
            } catch (error) {
              const feedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
              if (feedback) {
                feedback.textContent = `Edit failed: ${error.message}`;
                feedback.dataset.tone = "error";
              }
            }
          },
        });
        return;
      }

      enterEdit();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      activeModelMode = button.dataset.modelRunEdit || activeModelMode;
      expandedModelMode = activeModelMode;
      const modeConfig = activeModelConfig()?.modes?.[activeModelMode] || {};
      modelTestDrafts[modelModeDraftKey(activeModelProvider, activeModelMode)] = createModelTestDraft(modeConfig, {
        status: "",
        result: "",
        reason: "",
        loadedThisSession: false,
      });
      editingModelMode = activeModelMode;
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-run-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.modelRunDismiss || activeModelMode;
      const key = modelModeDraftKey(activeModelProvider, mode);
      lastModelRunResults[key] = {
        ...(lastModelRunResults[key] || {}),
        dismissed: true,
      };
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-draft-dismiss]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.modelDraftDismiss || activeModelMode;
      const modeConfig = activeModelConfig()?.modes?.[mode] || {};
      const draft = modelTestDrafts[modelModeDraftKey(activeModelProvider, mode)] || createModelTestDraft(modeConfig);
      const issues = modelDraftIssues(modeConfig, draft, true);
      dismissedModelDraftBanners[modelModeDraftKey(activeModelProvider, mode)] = issues.join(" · ");
      renderSettings();
    });
  });

  settingsPlaceholder.querySelectorAll("[data-model-mode-run]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mode = button.dataset.modelModeRun || "";
      activeModelMode = mode;
      expandedModelMode = mode;
      const providerConfig = activeModelConfig();
      const modeConfig = providerConfig?.modes?.[mode] || {};
      const selectedModels = [...(modeConfig.selected_models || [])];
      const savedValues = {
        model: isCliModelMode(modeConfig, activeModelProvider, mode) ? "" : modeConfig.model || selectedModels[0] || "",
        baseUrl: modeConfig.base_url || "",
        cliPath: modeConfig.cli_path || "",
        workingDirectory: modeConfig.working_directory || "",
        apiKey: "",
        includeApiKey: false,
        selectedModels,
      };
      if (isTerminalCliMode(modeConfig, activeModelProvider, mode)) {
        delete savedValues.cliPath;
        delete savedValues.workingDirectory;
      }
      const wasConfigured = isModelModeConfigured(modeConfig, activeModelProvider, mode);
      const draftKey = modelModeDraftKey(activeModelProvider, mode);
      if (isCliModelMode(modeConfig, activeModelProvider, mode)) {
        delete lastModelRunResults[draftKey];
        setFeedback("Running...");
        button.disabled = true;
        try {
          const result = await testModelConfiguration(activeModelProvider, mode, savedValues);
          await saveModelConfiguration(activeModelProvider, mode, {
            ...savedValues,
            configured: result.status === "connected",
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
            ...savedValues,
            result: result.message || "Connected.",
            status: result.status || "connected",
          });
          delete lastModelRunResults[draftKey];
          setFeedback("");
          renderSettings();
        } catch (error) {
          const friendlyMessage = classifyRunFailureMessage(error);
          await saveModelConfiguration(activeModelProvider, mode, {
            ...savedValues,
            configured: false,
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
            result: friendlyMessage,
            status: "error",
            reason: error.reason || "cli_not_found",
          });
          renderSettings();
        } finally {
          button.disabled = false;
        }
        return;
      }
      const missingRequirements =
        !savedValues.baseUrl
        || (isApiModelMode(modeConfig) && !hasSavedApiKey(modeConfig))
        || !selectedModels.length;

      delete lastModelRunResults[draftKey];
      setFeedback("Running...");
      button.disabled = true;
      try {
        if (missingRequirements) {
          const missingMessage = runMissingRequirementsMessage(savedValues, modeConfig);
          await saveModelConfiguration(activeModelProvider, mode, {
            model: savedValues.model,
            baseUrl: savedValues.baseUrl,
            apiKey: "",
            includeApiKey: false,
            selectedModels,
            configured: false,
            enabled: false,
            resumeEnabledOnRun: Boolean(modeConfig.resume_enabled_on_run),
          });
          modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
            selectedModels,
            reason: "required_fields_incomplete",
            result: missingMessage,
          });
          lastModelRunResults[draftKey] = {
            reason: "required_fields_incomplete",
            message: missingMessage,
            dismissed: false,
          };
          renderSettings();
          const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
          if (nextFeedback) {
            nextFeedback.textContent = "";
            delete nextFeedback.dataset.tone;
          }
          return;
        }

        const result = await testModelConfiguration(activeModelProvider, mode, savedValues);
        const models = result.models || [];
        modelTestDrafts[draftKey] = createModelTestDraft(modeConfig, {
          result: result.message || "Connected.",
          status: result.status || "connected",
          models,
          loadedThisSession: true,
          selectedModels,
        });

        const invalidSelected = selectedModels.filter((item) => !models.includes(item));
        const validForConfigured = Boolean(
          savedValues.baseUrl
          && (!isApiModelMode(modeConfig) || hasSavedApiKey(modeConfig))
          && selectedModels.length
          && !invalidSelected.length
          && result.status === "connected",
        );

        const nextTestReason = invalidSelected.length
          ? "selected_models_unavailable"
          : result.status === "no_quota"
            ? "no_quota"
            : validForConfigured
              ? ""
              : "required_fields_incomplete";
        await saveModelConfiguration(activeModelProvider, mode, {
          model: savedValues.model,
          baseUrl: savedValues.baseUrl,
          apiKey: "",
          includeApiKey: false,
          selectedModels,
          configured: validForConfigured,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        if (nextTestReason) {
          lastModelRunResults[draftKey] = {
            reason: nextTestReason,
            message: invalidSelected.length
              ? "Still draft. Remove old models that are no longer available."
              : result.status === "no_quota"
                ? "Still draft. This API key connected, but it has no available quota yet."
                : "Still draft. Complete Base URL, API key validation, and at least one valid model to finish setup.",
            dismissed: false,
          };
        } else {
          delete lastModelRunResults[draftKey];
        }

        modelTestDrafts[draftKey] = createModelTestDraft(activeModelConfig()?.modes?.[mode] || modeConfig, {
          result: result.message || "Connected.",
          status: result.status || "connected",
          reason: nextTestReason,
          models,
          loadedThisSession: true,
          selectedModels,
        });

        if (validForConfigured) {
          setFeedback("Configured. This model stays disabled until you enable it.", "success");
        } else if (invalidSelected.length) {
          setFeedback("Still draft. Remove old models that are no longer available.", "error");
        } else if (result.status === "no_quota") {
          setFeedback("Still draft. This API key connected, but it has no available quota yet.", "error");
        } else {
          setFeedback("Still draft. Complete Base URL, API key validation, and at least one valid model to finish setup.", "error");
        }
        renderSettings();
        const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
        if (nextFeedback) {
          nextFeedback.textContent = validForConfigured
            ? "Configured. This model stays disabled until you enable it."
            : "";
          if (validForConfigured) {
            nextFeedback.dataset.tone = "success";
          } else {
            delete nextFeedback.dataset.tone;
          }
        }
      } catch (error) {
        const friendlyMessage = classifyRunFailureMessage(error);
        modelTestDrafts[draftKey] = createModelTestDraft(modeConfig, {
          result: friendlyMessage,
          status: "error",
          reason: error.reason || "api_request_failed",
          loadedThisSession: false,
          selectedModels,
        });
        await saveModelConfiguration(activeModelProvider, mode, {
          model: savedValues.model,
          baseUrl: savedValues.baseUrl,
          apiKey: "",
          includeApiKey: false,
          selectedModels,
          configured: false,
          enabled: false,
          resumeEnabledOnRun: false,
        });
        lastModelRunResults[draftKey] = {
          reason: error.reason || "api_request_failed",
          message: friendlyMessage,
          dismissed: false,
        };
        renderSettings();
        const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
        if (nextFeedback) {
          nextFeedback.textContent = "";
          delete nextFeedback.dataset.tone;
        }
      } finally {
        button.disabled = false;
      }
    });
  });

  const feedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
  const setFeedback = (message = "", tone = "") => {
    if (!feedback) return;
    feedback.textContent = message;
    if (tone) {
      feedback.dataset.tone = tone;
    } else {
      delete feedback.dataset.tone;
    }
  };
  settingsPlaceholder.querySelectorAll("[data-model-mode-enable]").forEach((toggle) => {
    toggle.addEventListener("click", async () => {
      const mode = toggle.dataset.modelModeEnable || "";
      const providerConfig = activeModelConfig();
      const modeConfig = providerConfig?.modes?.[mode] || {};
      toggle.disabled = true;
      try {
        await saveModelConfiguration(activeModelProvider, mode, {
          enabled: !modeConfig.enabled,
        });
        renderSettings();
      } catch (error) {
        setFeedback(`Update failed: ${error.message}`, "error");
      } finally {
        toggle.disabled = false;
      }
    });
  });

  const form = settingsPlaceholder.querySelector("#modelConfigForm");
  if (!form) {
    return;
  }
  const saveButton = settingsPlaceholder.querySelector("#modelConfigSave");
  const cancelButton = settingsPlaceholder.querySelector("#modelConfigCancel");
  const apiKeyRemoveButton = settingsPlaceholder.querySelector("#modelApiKeyRemove");
  const apiKeyInput = settingsPlaceholder.querySelector("#modelApiKeyInput");
  const baseUrlInput = settingsPlaceholder.querySelector("#modelBaseUrlInput");
  const baseUrlActionButton = settingsPlaceholder.querySelector("#modelBaseUrlAction");
  const modelPickerTrigger = settingsPlaceholder.querySelector("#modelPickerTrigger");
  const modelPickerSearchInput = settingsPlaceholder.querySelector("#modelPickerSearch");
  const modelPickerBulkAction = settingsPlaceholder.querySelector("#modelPickerBulkAction");
  const modelLoadButton = settingsPlaceholder.querySelector("#modelLoadButton");
  const collectValues = () => {
    const formData = new FormData(form);
    const draft = activeModelTestDraft();
    const apiKeyValue = String(formData.get("apiKey") || "").trim();
    const values = {
      model: String(formData.get("model") || "").trim(),
      apiKey: apiKeyValue || draft.apiKey || "",
      includeApiKey: Boolean(apiKeyValue || draft.apiKey),
      baseUrl: String(formData.get("baseUrl") || "").trim(),
      selectedModels: [...(draft.selectedModels || [])],
    };
    if (formData.has("cliPath")) {
      values.cliPath = String(formData.get("cliPath") || "").trim();
    }
    if (formData.has("workingDirectory")) {
      values.workingDirectory = String(formData.get("workingDirectory") || "").trim();
    }
    return values;
  };

  if (apiKeyInput) {
    apiKeyInput.addEventListener("input", () => {
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        locked: false,
        apiKey: apiKeyInput.value,
        displayApiKey: "",
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
    });
  }

  if (baseUrlActionButton && baseUrlInput) {
    baseUrlActionButton.addEventListener("click", () => {
      const defaultUrl = providerDefaultBaseUrl(activeModelProvider, activeModelMode);
      const currentValue = baseUrlInput.value.trim();
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        baseUrl: currentValue === defaultUrl ? "" : defaultUrl,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
      const nextBaseUrlInput = settingsPlaceholder.querySelector("#modelBaseUrlInput");
      if (nextBaseUrlInput) {
        nextBaseUrlInput.focus();
        nextBaseUrlInput.setSelectionRange(nextBaseUrlInput.value.length, nextBaseUrlInput.value.length);
      }
    });
  }

  if (baseUrlInput) {
    baseUrlInput.addEventListener("input", () => {
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        baseUrl: baseUrlInput.value,
        result: "",
        status: "",
        models: [],
        loadedThisSession: false,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
    });
  }

  if (apiKeyRemoveButton) {
    apiKeyRemoveButton.addEventListener("click", () => {
      const modeConfig = activeModelModeConfig();
      const persistedMode = Boolean(
        modeConfig?.base_url
        || hasSavedApiKey(modeConfig)
        || modeConfig?.selected_models?.length
        || modeConfig?.configured,
      );
      openRoleChoice({
        title: "Remove API key?",
        copy: persistedMode
          ? `The saved API key and model selection for ${activeModeConfig.label} will be removed, and this mode will return to Draft.`
          : `The loaded API key and selected models for ${activeModeConfig.label} will be removed.`,
        confirmLabel: "Remove",
        cancelLabel: "Don't remove",
        defaultAction: "cancel",
        danger: true,
        onConfirm: async () => {
          closeRoleChoice();
          setFeedback("Removing...");
          apiKeyRemoveButton.disabled = true;
          if (saveButton) saveButton.disabled = true;
          if (cancelButton) cancelButton.disabled = true;
          try {
            if (persistedMode) {
              await saveModelConfiguration(activeModelProvider, activeModelMode, {
                model: "",
                apiKey: "",
                includeApiKey: true,
                baseUrl: collectValues().baseUrl,
                selectedModels: [],
                configured: false,
                enabled: false,
                resumeEnabledOnRun: false,
              });
              delete modelTestDrafts[modelModeDraftKey()];
              editingModelMode = "";
              modelPickerOpen = false;
              modelPickerSearch = "";
              modelSelectedListExpanded = false;
              setFeedback("Removed.", "success");
              renderSettings();
              const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
              if (nextFeedback) {
                nextFeedback.textContent = "Removed.";
                nextFeedback.dataset.tone = "success";
              }
            } else {
              modelTestDrafts[modelModeDraftKey()] = {
                ...createModelTestDraft(activeModelModeConfig()),
                locked: false,
                apiKey: "",
                displayApiKey: "",
                selectedModels: [],
              };
              modelPickerOpen = false;
              modelPickerSearch = "";
              modelSelectedListExpanded = false;
              setFeedback("Removed.", "success");
              renderSettings();
            }
          } catch (error) {
            setFeedback(`Remove failed: ${error.message}`, "error");
          } finally {
            apiKeyRemoveButton.disabled = false;
            if (saveButton) saveButton.disabled = false;
            if (cancelButton) cancelButton.disabled = false;
          }
        },
      });
    });
  }

  if (modelPickerSearchInput) {
    modelPickerSearchInput.value = modelPickerSearch;
    modelPickerSearchInput.addEventListener("input", () => {
      modelPickerSearch = modelPickerSearchInput.value;
      renderSettings();
    });
  }

  if (modelPickerTrigger) {
    modelPickerTrigger.addEventListener("click", () => {
      modelPickerOpen = !modelPickerOpen;
      if (!modelPickerOpen) {
        modelPickerSearch = "";
      }
      renderSettings();
    });
  }

  const modelSelectedToggle = settingsPlaceholder.querySelector("#modelSelectedToggle");
  if (modelSelectedToggle) {
    modelSelectedToggle.addEventListener("click", () => {
      modelSelectedListExpanded = !modelSelectedListExpanded;
      renderSettings();
    });
  }

  const modelSelectedRemoveOld = settingsPlaceholder.querySelector("#modelSelectedRemoveOld");
  if (modelSelectedRemoveOld) {
    modelSelectedRemoveOld.addEventListener("click", () => {
      const draft = activeModelTestDraft();
      const invalid = new Set(invalidSelectedModels(draft));
      modelTestDrafts[modelModeDraftKey()] = {
        ...draft,
        selectedModels: (draft.selectedModels || []).filter((item) => !invalid.has(item)),
      };
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
    });
  }

  settingsPlaceholder.querySelectorAll("[data-model-choice]").forEach((input) => {
    input.addEventListener("change", () => {
      const changedModel = input.dataset.modelChoice;
      const checked = input.checked;
      const currentSelected = new Set(activeModelTestDraft().selectedModels || []);
      if (checked) {
        currentSelected.add(changedModel);
      } else {
        currentSelected.delete(changedModel);
      }
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        selectedModels: [...currentSelected],
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
    });
  });

  if (modelPickerBulkAction) {
    modelPickerBulkAction.addEventListener("click", () => {
      const draft = activeModelTestDraft();
      const nextSelectedModels = allVisibleSelected ? [] : [...modelOptions];
      modelTestDrafts[modelModeDraftKey()] = {
        ...draft,
        selectedModels: nextSelectedModels,
      };
      delete dismissedModelDraftBanners[modelModeDraftKey()];
      delete lastModelRunResults[modelModeDraftKey()];
      renderSettings();
    });
  }

  const runApiTest = async () => {
    modelTestDrafts[modelModeDraftKey()] = {
      ...activeModelTestDraft(),
      result: "Testing and loading ...",
      status: "testing",
    };
    renderSettings();
    const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
    if (nextFeedback) {
      nextFeedback.textContent = "";
      delete nextFeedback.dataset.tone;
    }
    if (saveButton) saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    try {
      const values = collectValues();
      const result = await testModelConfiguration(activeModelProvider, activeModelMode, values);
      const currentDraft = activeModelTestDraft();
      const models = result.models || [];
      modelTestDrafts[modelModeDraftKey()] = {
        ...currentDraft,
        model: values.model,
        baseUrl: values.baseUrl,
        locked: Boolean(values.apiKey || currentDraft.displayApiKey || currentDraft.locked),
        apiKey: values.apiKey,
        displayApiKey:
          values.apiKey || currentDraft.displayApiKey ? "••••••••••••••••" : "",
        result: result.message || "Connected.",
        status: result.status || "connected",
        models,
        loadedThisSession: Boolean(models.length) || result.status === "connected" || result.status === "no_quota",
      };
      if ("cliPath" in values || "workingDirectory" in values) {
        modelTestDrafts[modelModeDraftKey()] = {
          ...modelTestDrafts[modelModeDraftKey()],
          cliPath: values.cliPath,
          workingDirectory: values.workingDirectory,
        };
      }
      modelPickerOpen = Boolean(models.length);
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
      const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
      if (nextFeedback) {
        nextFeedback.textContent = "";
        delete nextFeedback.dataset.tone;
      }
    } catch (error) {
      modelTestDrafts[modelModeDraftKey()] = {
        ...activeModelTestDraft(),
        result: `Test failed: ${error.message}`,
        status: "error",
        loadedThisSession: false,
      };
      renderSettings();
      setFeedback("");
    } finally {
      const nextSaveButton = settingsPlaceholder.querySelector("#modelConfigSave");
      const nextCancelButton = settingsPlaceholder.querySelector("#modelConfigCancel");
      if (nextSaveButton) nextSaveButton.disabled = false;
      if (nextCancelButton) nextCancelButton.disabled = false;
    }
  };

  if (modelLoadButton) {
    modelLoadButton.addEventListener("click", async () => {
      const modeConfig = activeModelModeConfig();
      if (isCliModelMode(modeConfig, activeModelProvider, activeModelMode)) {
        modelTestDrafts[modelModeDraftKey()] = {
          ...activeModelTestDraft(),
          result: "Testing local CLI ...",
          status: "testing",
        };
        renderSettings();
        const nextButton = settingsPlaceholder.querySelector("#modelLoadButton");
        if (nextButton) nextButton.disabled = true;
        try {
          const values = collectValues();
          const result = await testModelConfiguration(activeModelProvider, activeModelMode, values);
          await saveModelConfiguration(activeModelProvider, activeModelMode, {
            ...values,
            model: "",
            selectedModels: [],
            configured: result.status === "connected",
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[modelModeDraftKey()] = createModelTestDraft(activeModelConfig()?.modes?.[activeModelMode] || modeConfig, {
            result: result.message || "Connected.",
            status: result.status || "connected",
          });
          delete lastModelRunResults[modelModeDraftKey()];
          editingModelMode = "";
          setFeedback("Configured. This CLI mode stays disabled until you enable it.", "success");
          renderSettings();
        } catch (error) {
          await saveModelConfiguration(activeModelProvider, activeModelMode, {
            ...collectValues(),
            model: "",
            selectedModels: [],
            configured: false,
            enabled: false,
            resumeEnabledOnRun: false,
          });
          modelTestDrafts[modelModeDraftKey()] = {
            ...activeModelTestDraft(),
            result: `Test failed: ${error.message}`,
            status: "error",
            reason: error.reason || "cli_not_found",
          };
          renderSettings();
        }
        return;
      }
      await runApiTest();
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      delete modelTestDrafts[modelModeDraftKey()];
      editingModelMode = "";
      modelPickerOpen = false;
      modelPickerSearch = "";
      modelSelectedListExpanded = false;
      renderSettings();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = collectValues();
    setFeedback("Saving...");
    if (saveButton) saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    try {
      await saveModelConfiguration(activeModelProvider, activeModelMode, {
        ...values,
        model: isCliMode ? values.model : values.selectedModels[0],
        configured: false,
        enabled: false,
      });
      delete lastModelRunResults[modelModeDraftKey()];
      editingModelMode = "";
      delete modelTestDrafts[modelModeDraftKey()];
      const saveMessage = "Saved.";
      setFeedback(saveMessage, "success");
      renderSettings();
      const nextFeedback = settingsPlaceholder.querySelector("#modelConfigFeedback");
      if (nextFeedback) {
        nextFeedback.textContent = saveMessage;
        nextFeedback.dataset.tone = "success";
      }
    } catch (error) {
      setFeedback(`Save failed: ${error.message}`, "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  });
}
