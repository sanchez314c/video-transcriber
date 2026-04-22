// Provider settings persistence. Stored as plain JSON in Electron userData dir.
// LITE does not encrypt (desktop app, local-only, no sync). Keys live here when pasted in UI.

const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  defaultProviderId: 'zai',
  defaultModelId: null,
  providers: {},
};

let userDataDir = null;
let settingsPath = null;

function init(electronApp) {
  if (electronApp && typeof electronApp.getPath === 'function') {
    userDataDir = electronApp.getPath('userData');
  } else {
    userDataDir = path.join(require('os').homedir(), '.config', 'video-transcriber');
  }
  settingsPath = path.join(userDataDir, 'ai-stack-settings.json');
  return settingsPath;
}

function read() {
  if (!settingsPath) init();
  try {
    if (!fs.existsSync(settingsPath)) return { ...DEFAULT_SETTINGS };
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      providers: { ...DEFAULT_SETTINGS.providers, ...(parsed.providers || {}) },
    };
  } catch (_err) {
    return { ...DEFAULT_SETTINGS };
  }
}

function write(settings) {
  if (!settingsPath) init();
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  const normalized = {
    ...DEFAULT_SETTINGS,
    ...settings,
    providers: { ...(settings.providers || {}) },
  };
  fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

function getSettingsPath() {
  if (!settingsPath) init();
  return settingsPath;
}

module.exports = {
  init,
  read,
  write,
  getSettingsPath,
  DEFAULT_SETTINGS,
};
