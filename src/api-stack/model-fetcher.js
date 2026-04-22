// Dynamic model fetching per provider. Session-cached. Normalizes to common shape.
// NormalizedModel: { id, displayName, contextLength?, capabilities? }

const { getProviderById } = require('./providers');
const { resolveKey } = require('./key-resolver');

const cache = new Map();

function buildHeaders(provider, key) {
  const headers = { Accept: 'application/json' };
  if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);
  if (provider.authHeader && key) {
    headers[provider.authHeader] = provider.authPrefix ? `${provider.authPrefix}${key}` : key;
  }
  return headers;
}

function normalizeOpenAI(payload) {
  const data = (payload && payload.data) || [];
  return data
    .map((m) => {
      const id = m.id || m.name || '';
      if (!id) return null;
      return {
        id,
        displayName: id,
        contextLength: m.context_length || m.context_window || null,
        capabilities: null,
      };
    })
    .filter(Boolean);
}

function normalizeOllama(payload) {
  const models = (payload && payload.models) || [];
  return models
    .map((m) => {
      const id = m.name || m.model || '';
      if (!id) return null;
      return {
        id,
        displayName: id,
        contextLength: m.details && m.details.parameter_size ? null : null,
        capabilities: m.details ? m.details.family : null,
      };
    })
    .filter(Boolean);
}

function normalizeAnthropic(payload) {
  const data = (payload && payload.data) || [];
  return data
    .map((m) => {
      const id = m.id || '';
      if (!id) return null;
      return {
        id,
        displayName: m.display_name || id,
        contextLength: null,
        capabilities: null,
      };
    })
    .filter(Boolean);
}

function normalizeByFormat(provider, payload) {
  if (provider.id === 'ollama') return normalizeOllama(payload);
  if (provider.streamFormat === 'anthropic') return normalizeAnthropic(payload);
  return normalizeOpenAI(payload);
}

async function fetchModels(providerId, settings, { force = false } = {}) {
  const provider = getProviderById(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  const cacheKey = providerId;
  if (!force && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.fetchedAt < 5 * 60 * 1000) return cached.models;
  }

  const keyData = resolveKey(providerId, settings);
  if (!keyData && provider.authHeader) {
    throw new Error(`No credential configured for ${provider.displayName}`);
  }

  const baseUrl = (settings && settings.providers && settings.providers[providerId] && settings.providers[providerId].baseUrl) || provider.baseUrl;
  const url = baseUrl + provider.modelsPath;
  const headers = buildHeaders(provider, keyData ? keyData.key : null);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${provider.displayName} /models returned ${response.status}`);
    }
    const payload = await response.json();
    const models = normalizeByFormat(provider, payload);
    models.sort((a, b) => a.displayName.localeCompare(b.displayName));
    cache.set(cacheKey, { models, fetchedAt: Date.now() });
    return models;
  } finally {
    clearTimeout(timeout);
  }
}

function clearCache(providerId) {
  if (providerId) {
    cache.delete(providerId);
  } else {
    cache.clear();
  }
}

module.exports = {
  fetchModels,
  clearCache,
  normalizeOpenAI,
  normalizeOllama,
  normalizeAnthropic,
};
