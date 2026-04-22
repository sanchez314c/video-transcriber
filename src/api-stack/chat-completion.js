// createChatCompletion — streaming text from any of the 17 providers.
// Returns AsyncIterable<string> of text deltas.

const { getProviderById } = require('./providers');
const { resolveKey } = require('./key-resolver');
const { parserForFormat } = require('./streaming');

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

function buildHeaders(provider, key) {
  const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
  if (provider.extraHeaders) Object.assign(headers, provider.extraHeaders);
  if (provider.authHeader && key) {
    headers[provider.authHeader] = provider.authPrefix ? `${provider.authPrefix}${key}` : key;
  }
  return headers;
}

function buildBody(provider, modelId, messages, opts) {
  const temperature = opts.temperature != null ? opts.temperature : DEFAULT_TEMPERATURE;
  const maxTokens = opts.maxTokens != null ? opts.maxTokens : DEFAULT_MAX_TOKENS;

  if (provider.streamFormat === 'anthropic') {
    const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
    const nonSystem = messages.filter((m) => m.role !== 'system');
    const body = {
      model: modelId,
      messages: nonSystem,
      [provider.tokenField]: maxTokens,
      temperature,
      stream: true,
    };
    if (systemMessages.length) body.system = systemMessages.join('\n\n');
    if (opts.stopSequences) body[provider.stopField] = opts.stopSequences;
    return body;
  }

  if (provider.id === 'ollama') {
    return {
      model: modelId,
      messages,
      stream: true,
      options: {
        temperature,
        [provider.tokenField]: maxTokens,
        ...(opts.stopSequences ? { [provider.stopField]: opts.stopSequences } : {}),
      },
    };
  }

  const body = {
    model: modelId,
    messages,
    temperature,
    [provider.tokenField]: maxTokens,
    stream: true,
  };
  if (opts.stopSequences) body[provider.stopField] = opts.stopSequences;
  return body;
}

async function* createChatCompletion({ providerId, modelId, messages, settings, opts = {} }) {
  const provider = getProviderById(providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!modelId) throw new Error('modelId is required');
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }

  const keyData = resolveKey(providerId, settings);
  if (!keyData && provider.authHeader) {
    throw new Error(`No credential configured for ${provider.displayName}`);
  }

  const baseUrl =
    (settings && settings.providers && settings.providers[providerId] && settings.providers[providerId].baseUrl) ||
    provider.baseUrl;
  const url = baseUrl + provider.chatPath;
  const headers = buildHeaders(provider, keyData ? keyData.key : null);
  const body = buildBody(provider, modelId, messages, opts);

  const controller = new AbortController();
  const timeout = opts.timeoutMs != null ? opts.timeoutMs : 120_000;
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${provider.displayName} chat returned ${response.status}: ${text.slice(0, 300)}`);
  }

  const parser = parserForFormat(provider.streamFormat);
  for await (const chunk of parser(response)) {
    yield chunk;
  }
}

module.exports = {
  createChatCompletion,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
};
