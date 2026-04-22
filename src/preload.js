const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // Folder operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),

  // Dependency checking
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),

  // Transcription operations
  startTranscription: (options) => ipcRenderer.invoke('start-transcription', options),
  stopTranscription: () => ipcRenderer.invoke('stop-transcription'),

  // Progress updates
  onTranscriptionProgress: (callback) => ipcRenderer.on('transcription-progress', callback),

  // URL transcription
  validateUrl: (url) => ipcRenderer.invoke('validate-url', url),
  transcribeUrl: (payload) => ipcRenderer.invoke('transcribe-url', payload),
  onUrlTranscriptionProgress: (cb) =>
    ipcRenderer.on('url-transcription-progress', (_e, data) => cb(data)),
  onUrlTranscriptionComplete: (cb) =>
    ipcRenderer.on('url-transcription-complete', (_e, data) => cb(data)),
  removeUrlTranscriptionListeners: () => {
    ipcRenderer.removeAllListeners('url-transcription-progress');
    ipcRenderer.removeAllListeners('url-transcription-complete');
  },

  // Export
  exportTranscript: (payload) => ipcRenderer.invoke('export-transcript', payload),

  // Utility functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});

// API Stack LITE — universal provider surface for in-app AI features (polish, chat, etc.).
contextBridge.exposeInMainWorld('aiStack', {
  listProviders: () => ipcRenderer.invoke('api-stack:list-providers'),
  getSettings: () => ipcRenderer.invoke('api-stack:get-settings'),
  saveSettings: (payload) => ipcRenderer.invoke('api-stack:save-settings', payload),
  fetchModels: (providerId, opts) => ipcRenderer.invoke('api-stack:fetch-models', { providerId, ...(opts || {}) }),
  testProvider: (providerId, modelId) => ipcRenderer.invoke('api-stack:test-provider', { providerId, modelId }),
  chatCompletion: (payload) => ipcRenderer.invoke('api-stack:chat-completion', payload),
  refreshEnvVars: () => ipcRenderer.invoke('api-stack:refresh-env-vars'),
  getAboutInfo: () => ipcRenderer.invoke('api-stack:get-about-info'),
  onChatDelta: (callback) => ipcRenderer.on('api-stack:chat-delta', (_e, data) => callback(data)),
  onChatEnd: (callback) => ipcRenderer.on('api-stack:chat-end', (_e, data) => callback(data)),
  removeChatListeners: () => {
    ipcRenderer.removeAllListeners('api-stack:chat-delta');
    ipcRenderer.removeAllListeners('api-stack:chat-end');
  },
});
