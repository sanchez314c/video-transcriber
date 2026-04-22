// Universal API Provider Stack — LITE v2.0.0 — public API surface.
// Main-process module. Electron main loads this and exposes methods via IPC.

const { PROVIDERS, DEFAULT_PROVIDER_ID, listProviders, getProviderById } = require('./providers');
const { resolveKey, redactSettings, maskKey, isSensitiveField } = require('./key-resolver');
const anthropicOauth = require('./anthropic-oauth');
const settingsStore = require('./settings-store');
const { fetchModels, clearCache: clearModelCache } = require('./model-fetcher');
const { createChatCompletion } = require('./chat-completion');
const { testProvider } = require('./test-provider');

const SPEC_VERSION = '2.0.0-lite';

let currentSettings = null;
const listeners = new Set();

function init(electronApp) {
  settingsStore.init(electronApp);
  currentSettings = settingsStore.read();
  if (!currentSettings.defaultProviderId) {
    currentSettings.defaultProviderId = DEFAULT_PROVIDER_ID;
    settingsStore.write(currentSettings);
  }
  return currentSettings;
}

function getSettings() {
  if (!currentSettings) currentSettings = settingsStore.read();
  return currentSettings;
}

function getSettingsRedacted() {
  return redactSettings(getSettings());
}

function saveSettings(next) {
  const merged = settingsStore.write({ ...getSettings(), ...next });
  currentSettings = merged;
  clearModelCache();
  notifyChange();
  return redactSettings(merged);
}

function notifyChange() {
  for (const listener of listeners) {
    try {
      listener(getSettings());
    } catch (_err) {
      // swallow listener errors
    }
  }
}

function onConfigChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getActiveProvider() {
  return getSettings().defaultProviderId || DEFAULT_PROVIDER_ID;
}

function getActiveModel() {
  return getSettings().defaultModelId || null;
}

function getProviderKeys() {
  const s = getSettings();
  const result = {};
  for (const provider of PROVIDERS) {
    const keyData = resolveKey(provider.id, s);
    result[provider.id] = keyData
      ? { source: keyData.source, masked: maskKey(keyData.key), present: true }
      : { source: null, masked: null, present: false };
  }
  return result;
}

async function refreshEnvVars() {
  clearModelCache();
  anthropicOauth.clearCache();
  notifyChange();
  return getProviderKeys();
}

function getAboutInfo() {
  const providers = listProviders();
  const configured = providers.filter((p) => {
    const s = getSettings();
    return !!resolveKey(p.id, s);
  }).length;
  return {
    specVersion: SPEC_VERSION,
    providerTotal: providers.length,
    providerConfigured: configured,
    settingsPath: settingsStore.getSettingsPath(),
    oauthCredentialsPath: anthropicOauth.getCredentialsPath(),
    envVarSource: '~/.bashrc (inherited from shell)',
  };
}

module.exports = {
  init,
  SPEC_VERSION,
  getSettings,
  getSettingsRedacted,
  saveSettings,
  onConfigChange,
  getActiveProvider,
  getActiveModel,
  getProviderKeys,
  listProviders,
  getProviderById,
  fetchModels: (providerId, opts) => fetchModels(providerId, getSettings(), opts),
  createChatCompletion: (args) => createChatCompletion({ ...args, settings: getSettings() }),
  testProvider: (args) => testProvider({ ...args, settings: getSettings() }),
  refreshEnvVars,
  getAboutInfo,
  maskKey,
  isSensitiveField,
};
