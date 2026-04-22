// AI Providers Modal — renderer controller.
// Renders 17 provider cards, handles test buttons, tab switching, defaults.
// Talks to window.aiStack (preload bridge) for all main-process calls.

(function () {
  const aiStack = window.aiStack;
  if (!aiStack) {
    console.error('[ai-modal] window.aiStack not available — preload failed to expose bridge');
    return;
  }

  const overlay = document.getElementById('aiOverlay');
  const openBtn = document.getElementById('ai-btn');
  const closeBtn = document.getElementById('ai-close-btn');
  const tabs = document.querySelectorAll('.ai-tab');
  const panels = document.querySelectorAll('.ai-tab-panel');
  const providerListEl = document.getElementById('ai-provider-list');
  const defaultProviderSelect = document.getElementById('ai-default-provider');
  const defaultModelSelect = document.getElementById('ai-default-model');
  const testAllBtn = document.getElementById('ai-test-all');

  const aboutEl = {
    spec: document.getElementById('ai-about-spec'),
    configured: document.getElementById('ai-about-configured'),
    total: document.getElementById('ai-about-total'),
    settings: document.getElementById('ai-about-settings'),
    oauth: document.getElementById('ai-about-oauth'),
    env: document.getElementById('ai-about-env'),
  };

  let providers = [];
  let settings = null;
  let keys = {};
  const modelCache = new Map();
  const testTimers = new Map();

  function open() {
    overlay.classList.add('is-open');
    refreshAll();
  }

  function close() {
    overlay.classList.remove('is-open');
  }

  function setTab(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    panels.forEach((p) => p.classList.toggle('active', p.id === `ai-panel-${name}`));
    if (name === 'about') refreshAbout();
  }

  async function refreshAll() {
    providers = await aiStack.listProviders();
    const payload = await aiStack.getSettings();
    settings = payload.settings;
    keys = payload.keys;
    renderDefaults();
    renderProviderList();
  }

  function renderDefaults() {
    defaultProviderSelect.innerHTML = '';
    const sortedProviders = [...providers].sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const p of sortedProviders) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.displayName;
      defaultProviderSelect.appendChild(opt);
    }
    defaultProviderSelect.value = settings.defaultProviderId || 'zai';

    defaultProviderSelect.onchange = () => {
      aiStack.saveSettings({ defaultProviderId: defaultProviderSelect.value }).then((resp) => {
        settings = resp.settings;
        keys = resp.keys;
        populateDefaultModelOptions();
      });
    };

    populateDefaultModelOptions();
  }

  async function populateDefaultModelOptions() {
    defaultModelSelect.innerHTML = '<option>Loading…</option>';
    const providerId = settings.defaultProviderId;
    try {
      const models = await loadModels(providerId);
      defaultModelSelect.innerHTML = '';
      if (!models.length) {
        const opt = document.createElement('option');
        opt.textContent = '(no models)';
        defaultModelSelect.appendChild(opt);
        return;
      }
      for (const m of models) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.displayName;
        defaultModelSelect.appendChild(opt);
      }
      if (settings.defaultModelId) defaultModelSelect.value = settings.defaultModelId;
      defaultModelSelect.onchange = () => {
        aiStack.saveSettings({ defaultModelId: defaultModelSelect.value }).then((resp) => {
          settings = resp.settings;
          keys = resp.keys;
        });
      };
    } catch (err) {
      defaultModelSelect.innerHTML = '';
      const opt = document.createElement('option');
      opt.textContent = `(error: ${err.message.slice(0, 60)})`;
      defaultModelSelect.appendChild(opt);
    }
  }

  async function loadModels(providerId, force = false) {
    if (!force && modelCache.has(providerId)) return modelCache.get(providerId);
    const models = await aiStack.fetchModels(providerId, { force });
    modelCache.set(providerId, models);
    return models;
  }

  function renderProviderList() {
    providerListEl.innerHTML = '';
    const sorted = [...providers].sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const provider of sorted) {
      providerListEl.appendChild(renderProviderCard(provider));
    }
  }

  function renderProviderCard(provider) {
    const s = (settings.providers && settings.providers[provider.id]) || {};
    const keyInfo = keys[provider.id] || { present: false, source: null, masked: null };

    const card = document.createElement('div');
    card.className = 'ai-provider-card';
    if (s.enabled !== false) card.classList.add('enabled');

    // Toggle
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'ai-provider-toggle';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = s.enabled !== false;
    toggleInput.onchange = () => {
      saveProviderConfig(provider.id, { enabled: toggleInput.checked });
      card.classList.toggle('enabled', toggleInput.checked);
    };
    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'slider';
    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(sliderSpan);
    card.appendChild(toggleLabel);

    // Name + platform label for subscription/local
    const nameEl = document.createElement('div');
    nameEl.className = 'ai-provider-name';
    nameEl.textContent = provider.displayName;
    card.appendChild(nameEl);

    // Status
    const statusEl = document.createElement('div');
    statusEl.className = 'ai-provider-status';
    if (keyInfo.present) {
      statusEl.textContent = `${keyInfo.source} • key set`;
      statusEl.classList.add('connected');
    } else {
      statusEl.textContent = 'no credential';
    }
    card.appendChild(statusEl);

    // Key row
    const keyRow = document.createElement('div');
    keyRow.className = 'ai-key-row';
    const keyLabel = provider.type === 'subscription' ? 'OAuth Token' : 'API Key';
    const keyInput = document.createElement('input');
    keyInput.className = 'ai-input';
    keyInput.type = 'password';
    keyInput.placeholder = keyInfo.present ? `${keyLabel} — sourced from ${keyInfo.source}` : `Paste ${keyLabel}`;
    keyInput.value = '';
    keyInput.dataset.revealed = 'false';

    const showBtn = document.createElement('button');
    showBtn.className = 'ai-key-mini';
    showBtn.textContent = 'Show';
    showBtn.type = 'button';
    showBtn.onclick = () => {
      const revealed = keyInput.dataset.revealed === 'true';
      keyInput.type = revealed ? 'password' : 'text';
      keyInput.dataset.revealed = revealed ? 'false' : 'true';
      showBtn.textContent = revealed ? 'Show' : 'Hide';
    };

    const clearBtn = document.createElement('button');
    clearBtn.className = 'ai-key-mini';
    clearBtn.textContent = 'Clear';
    clearBtn.type = 'button';
    clearBtn.onclick = async () => {
      keyInput.value = '';
      await saveProviderConfig(provider.id, { apiKey: '' });
      await refreshAll();
    };

    const saveBtn = document.createElement('button');
    saveBtn.className = 'ai-key-mini';
    saveBtn.textContent = 'Save';
    saveBtn.type = 'button';
    saveBtn.onclick = async () => {
      if (!keyInput.value.trim()) return;
      await saveProviderConfig(provider.id, { apiKey: keyInput.value.trim() });
      keyInput.value = '';
      await refreshAll();
    };

    keyRow.appendChild(keyInput);
    keyRow.appendChild(showBtn);
    keyRow.appendChild(clearBtn);
    keyRow.appendChild(saveBtn);
    card.appendChild(keyRow);

    // Base URL row
    const urlRow = document.createElement('div');
    urlRow.className = 'ai-url-row';
    const urlInput = document.createElement('input');
    urlInput.className = 'ai-input';
    urlInput.type = 'text';
    urlInput.placeholder = 'Base URL';
    urlInput.value = s.baseUrl || provider.baseUrl;
    urlInput.onchange = () => {
      saveProviderConfig(provider.id, { baseUrl: urlInput.value.trim() });
    };
    urlRow.appendChild(urlInput);
    card.appendChild(urlRow);

    // Test row
    const testRow = document.createElement('div');
    testRow.className = 'ai-test-row';
    const modelSelect = document.createElement('select');
    modelSelect.className = 'ai-select ai-test-model-select';
    modelSelect.innerHTML = '<option>Loading…</option>';
    const testBtn = document.createElement('button');
    testBtn.className = 'ai-btn';
    testBtn.textContent = 'Test';
    testBtn.type = 'button';
    testBtn.onclick = () => runTest(provider.id, modelSelect.value, testBtn);
    testRow.appendChild(modelSelect);
    testRow.appendChild(testBtn);
    card.appendChild(testRow);

    // Populate test model dropdown lazily when card is enabled + has key
    if (keyInfo.present || provider.type === 'local') {
      loadModels(provider.id)
        .then((models) => {
          modelSelect.innerHTML = '';
          if (!models.length) {
            const opt = document.createElement('option');
            opt.textContent = '(no models)';
            modelSelect.appendChild(opt);
            return;
          }
          for (const m of models) {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.displayName;
            modelSelect.appendChild(opt);
          }
          statusEl.textContent = `${keyInfo.source || 'local'} • ${models.length} models`;
          statusEl.classList.add('connected');
        })
        .catch((err) => {
          modelSelect.innerHTML = '';
          const opt = document.createElement('option');
          opt.textContent = '(fetch failed)';
          modelSelect.appendChild(opt);
          statusEl.textContent = err.message.slice(0, 30);
          statusEl.classList.remove('connected');
          statusEl.classList.add('error');
        });
    } else {
      modelSelect.innerHTML = '<option>(paste key to list models)</option>';
    }

    return card;
  }

  async function saveProviderConfig(providerId, patch) {
    const currentProviders = settings.providers || {};
    const current = currentProviders[providerId] || {};
    const updated = {
      ...settings,
      providers: { ...currentProviders, [providerId]: { ...current, ...patch } },
    };
    const resp = await aiStack.saveSettings(updated);
    settings = resp.settings;
    keys = resp.keys;
    modelCache.delete(providerId);
  }

  async function runTest(providerId, modelId, btn) {
    if (btn.disabled) return;
    if (!modelId || modelId.startsWith('(')) {
      setBtnState(btn, 'test-fail', '✗ No model');
      return;
    }
    if (testTimers.has(providerId)) clearTimeout(testTimers.get(providerId));
    btn.disabled = true;
    btn.classList.remove('test-ok', 'test-fail');
    btn.classList.add('testing');
    btn.textContent = 'Testing…';

    try {
      const result = await aiStack.testProvider(providerId, modelId);
      btn.classList.remove('testing');
      if (result.ok) {
        setBtnState(btn, 'test-ok', `✓ ${result.ms}ms`);
      } else {
        const err = result.errorClass ? result.errorClass.charAt(0).toUpperCase() + result.errorClass.slice(1) : 'Error';
        const tag = result.httpStatus ? `${result.httpStatus} ${err}` : err;
        setBtnState(btn, 'test-fail', `✗ ${tag}`);
      }
    } catch (err) {
      btn.classList.remove('testing');
      setBtnState(btn, 'test-fail', `✗ ${err.message.slice(0, 18)}`);
    } finally {
      btn.disabled = false;
      const t = setTimeout(() => {
        btn.textContent = 'Test';
        btn.classList.remove('test-ok', 'test-fail');
        testTimers.delete(providerId);
      }, 10_000);
      testTimers.set(providerId, t);
    }
  }

  function setBtnState(btn, cls, text) {
    btn.classList.remove('test-ok', 'test-fail', 'testing');
    btn.classList.add(cls);
    btn.textContent = text;
  }

  async function runTestAll() {
    const buttons = providerListEl.querySelectorAll('.ai-btn');
    const cards = providerListEl.querySelectorAll('.ai-provider-card');
    const tasks = [];
    cards.forEach((card, idx) => {
      const modelSelect = card.querySelector('.ai-test-model-select');
      const testBtn = buttons[idx];
      if (!modelSelect || !testBtn) return;
      const providerId = providers.find((p, i) => i === idx) ? [...providers].sort((a, b) => a.displayName.localeCompare(b.displayName))[idx].id : null;
      if (!providerId) return;
      tasks.push(runTest(providerId, modelSelect.value, testBtn));
    });
    await Promise.allSettled(tasks);
  }

  async function refreshAbout() {
    try {
      const info = await aiStack.getAboutInfo();
      aboutEl.spec.textContent = info.specVersion;
      aboutEl.configured.textContent = info.providerConfigured;
      aboutEl.total.textContent = info.providerTotal;
      aboutEl.settings.textContent = info.settingsPath;
      aboutEl.oauth.textContent = info.oauthCredentialsPath;
      aboutEl.env.textContent = info.envVarSource;
    } catch (err) {
      console.error('[ai-modal] about fetch failed', err);
    }
  }

  // About actions
  document.getElementById('ai-about-refresh-cache').onclick = async () => {
    modelCache.clear();
    await refreshAll();
  };
  document.getElementById('ai-about-rescan-env').onclick = async () => {
    await aiStack.refreshEnvVars();
    await refreshAll();
  };
  document.getElementById('ai-about-export').onclick = async () => {
    const payload = await aiStack.getSettings();
    const blob = new Blob([JSON.stringify(payload.settings, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ai-stack-settings.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };
  document.getElementById('ai-about-import').onclick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        await aiStack.saveSettings(parsed);
        await refreshAll();
      } catch (err) {
        alert('Invalid settings JSON: ' + err.message);
      }
    };
    input.click();
  };

  testAllBtn.onclick = runTestAll;
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
  });
  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
})();
