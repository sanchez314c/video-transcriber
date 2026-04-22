// Key resolution: settings override > env var > empty.
// Sensitive field masking for UI display.

const { getProviderById } = require('./providers');
const anthropicOauth = require('./anthropic-oauth');

const SENSITIVE_FIELD_RE = /api.?key|token$|password|secret|bearer/i;

function resolveKey(providerId, settings) {
  const provider = getProviderById(providerId);
  if (!provider) return null;

  const override = settings && settings.providers && settings.providers[providerId];
  if (override && override.apiKey && override.apiKey.trim()) {
    return { key: override.apiKey.trim(), source: 'settings' };
  }

  if (provider.type === 'subscription' && providerId === 'anthropic-auth') {
    const oauth = anthropicOauth.resolveToken();
    if (oauth) return { key: oauth.token, source: oauth.source };
    return null;
  }

  const envVal = process.env[provider.envVarName];
  if (envVal && envVal.trim()) {
    return { key: envVal.trim(), source: 'env' };
  }

  return null;
}

function maskKey(value) {
  if (!value || typeof value !== 'string') return '';
  if (value.length <= 8) return '•'.repeat(value.length);
  return value.slice(0, 4) + '•'.repeat(Math.min(20, value.length - 8)) + value.slice(-4);
}

function isSensitiveField(fieldName) {
  return SENSITIVE_FIELD_RE.test(fieldName || '');
}

function redactSettings(settings) {
  if (!settings) return settings;
  const cloned = JSON.parse(JSON.stringify(settings));
  if (cloned.providers) {
    for (const [id, cfg] of Object.entries(cloned.providers)) {
      if (cfg && typeof cfg === 'object') {
        if (cfg.apiKey) cfg.apiKey = maskKey(cfg.apiKey);
        if (cfg.oauthToken) cfg.oauthToken = maskKey(cfg.oauthToken);
      }
      cloned.providers[id] = cfg;
    }
  }
  return cloned;
}

module.exports = {
  resolveKey,
  maskKey,
  isSensitiveField,
  redactSettings,
};
