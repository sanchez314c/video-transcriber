// testProvider — ping endpoint with minimal payload, measure latency, classify errors.
// TestResult: { ok, ms, httpStatus?, errorClass?, errorMessage?, timestamp }

const { getProviderById } = require('./providers');
const { resolveKey } = require('./key-resolver');

const TEST_TIMEOUT_MS = 15_000;
const COOLDOWN_MS = 2_000;
const lastTestAt = new Map();

function classifyError(err, status) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  if (status && status >= 500) return 'server';
  if (err && err.name === 'AbortError') return 'timeout';
  if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('fetch'))) return 'offline';
  return 'unknown';
}

function buildHeaders(provider, key) {
  const headers = { 'Content-Type': 'application/json' };
  if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);
  if (provider.authHeader && key) {
    headers[provider.authHeader] = provider.authPrefix ? `${provider.authPrefix}${key}` : key;
  }
  return headers;
}

function buildPingBody(provider, modelId) {
  const messages = [{ role: 'user', content: 'ping' }];

  if (provider.streamFormat === 'anthropic') {
    return {
      model: modelId,
      messages,
      [provider.tokenField]: 5,
      stream: false,
    };
  }

  if (provider.id === 'ollama') {
    return {
      model: modelId,
      messages,
      stream: false,
      options: { [provider.tokenField]: 5, temperature: 0 },
    };
  }

  return {
    model: modelId,
    messages,
    [provider.tokenField]: 5,
    stream: false,
  };
}

async function testProvider({ providerId, modelId, settings }) {
  const timestamp = Date.now();
  const provider = getProviderById(providerId);
  if (!provider) {
    return { ok: false, ms: 0, errorClass: 'unknown', errorMessage: `Unknown provider: ${providerId}`, timestamp };
  }
  if (!modelId) {
    return { ok: false, ms: 0, errorClass: 'unknown', errorMessage: 'Test model not selected', timestamp };
  }

  const lastAt = lastTestAt.get(providerId) || 0;
  const waitMs = lastAt + COOLDOWN_MS - Date.now();
  if (waitMs > 0) {
    return { ok: false, ms: 0, errorClass: 'rate', errorMessage: `Cooldown: retry in ${Math.ceil(waitMs / 1000)}s`, timestamp };
  }
  lastTestAt.set(providerId, Date.now());

  const keyData = resolveKey(providerId, settings);
  if (!keyData && provider.authHeader) {
    return { ok: false, ms: 0, errorClass: 'auth', errorMessage: `No credential configured for ${provider.displayName}`, timestamp };
  }

  const baseUrl =
    (settings && settings.providers && settings.providers[providerId] && settings.providers[providerId].baseUrl) ||
    provider.baseUrl;
  const url = baseUrl + provider.chatPath;
  const headers = buildHeaders(provider, keyData ? keyData.key : null);
  const body = buildPingBody(provider, modelId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  const startedAt = Date.now();
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      ms: Date.now() - startedAt,
      errorClass: classifyError(err, null),
      errorMessage: err.message || String(err),
      timestamp,
    };
  } finally {
    clearTimeout(timer);
  }

  const ms = Date.now() - startedAt;
  if (response.ok) {
    return { ok: true, ms, httpStatus: response.status, timestamp };
  }

  const text = await response.text().catch(() => '');
  return {
    ok: false,
    ms,
    httpStatus: response.status,
    errorClass: classifyError(null, response.status),
    errorMessage: text.slice(0, 300),
    timestamp,
  };
}

module.exports = {
  testProvider,
  TEST_TIMEOUT_MS,
  COOLDOWN_MS,
};
