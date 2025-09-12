const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
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
  removeTranscriptionProgressListener: (callback) => ipcRenderer.removeListener('transcription-progress', callback),
  
  // Utility functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Theme management
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme')
});