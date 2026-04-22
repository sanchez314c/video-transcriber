// Anthropic OAuth token resolution.
// Order: CLAUDE_CODE_OAUTH_TOKEN env > in-memory cache > ~/.claude/.credentials.json.
// Token is shared with the Claude Code CLI — end-users who have run `claude setup-token`
// have this file populated. No fallback for end-users without Claude Code.

const fs = require('fs');
const os = require('os');
const path = require('path');

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');

let cachedToken = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function resolveToken() {
  const envTok = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (envTok && envTok.trim()) {
    return { token: envTok.trim(), source: 'env' };
  }

  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL_MS) {
    return { token: cachedToken, source: 'cache' };
  }

  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
      const data = JSON.parse(raw);
      const tok = data && data.claudeAiOauth && data.claudeAiOauth.accessToken;
      if (tok && typeof tok === 'string' && tok.trim()) {
        cachedToken = tok.trim();
        cachedAt = now;
        return { token: cachedToken, source: 'credentials-file' };
      }
    }
  } catch (_err) {
    // Unreadable or malformed credentials file — fall through
  }

  return null;
}

function clearCache() {
  cachedToken = null;
  cachedAt = 0;
}

function getCredentialsPath() {
  return CREDENTIALS_PATH;
}

module.exports = {
  resolveToken,
  clearCache,
  getCredentialsPath,
};
