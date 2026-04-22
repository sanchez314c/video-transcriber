const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { SelfContainedTranscriber } = require('./self-contained-transcriber');
const { UrlTranscriber } = require('./url-transcriber');
const { VIDEO_EXTENSIONS } = require('./constants');
const apiStack = require('./api-stack');

// Enable live reload for development
if (process.argv.includes('--dev')) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
  });
}

class VideoTranscriberApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
    const appRoot = path.join(__dirname, '..');
    this.transcriber = new SelfContainedTranscriber({ appRoot });
    this.urlTranscriber = new UrlTranscriber({ appRoot, whisperTranscriber: this.transcriber });
    this.isTranscribing = false;
    this.activeUrlJobs = new Map();
  }

  createWindow() {
    // Neo-Noir Glass Monitor — frameless, transparent, floating window
    const isMac = process.platform === 'darwin';

    this.mainWindow = new BrowserWindow({
      width: 920,
      height: 860,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: true,
      roundedCorners: true,
      ...(isMac ? { titleBarStyle: 'hiddenInset' } : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false, // Required: preload.js uses require() for fs-extra, child_process
        // NEVER set experimentalFeatures: true — breaks contextBridge IPC on Linux
      },
      show: false,
      icon: path.join(__dirname, '..', 'resources', 'icons', 'icon.png'),
    });

    // Load the app
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.isTranscribing = false;
    });
  }

  setupIPC() {
    // Window control IPC handlers
    ipcMain.handle('window-minimize', () => {
      if (this.mainWindow) this.mainWindow.minimize();
    });

    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow) {
        this.mainWindow.isMaximized() ? this.mainWindow.unmaximize() : this.mainWindow.maximize();
      }
    });

    ipcMain.handle('window-close', () => {
      if (this.mainWindow) this.mainWindow.close();
    });

    // Select folder dialog
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // Check dependencies (self-contained)
    ipcMain.handle('check-dependencies', async () => {
      try {
        const dependencies = await this.transcriber.checkDependencies();
        return dependencies;
      } catch (error) {
        console.error('Failed to check dependencies:', error);
        return { ffmpeg: false, whisper: false, python: false };
      }
    });

    // Scan folder for video files
    ipcMain.handle('scan-folder', async (event, folderPath) => {
      // Validate input
      if (typeof folderPath !== 'string') {
        throw new Error('Invalid folder path: must be a string');
      }
      if (!path.isAbsolute(folderPath)) {
        throw new Error('Invalid folder path: must be absolute');
      }
      if (folderPath.includes('..')) {
        throw new Error('Invalid folder path: path traversal not allowed');
      }

      // Validate path exists and is a directory
      try {
        const stat = await fs.stat(folderPath);
        if (!stat.isDirectory()) {
          throw new Error('Invalid folder path: not a directory');
        }
      } catch (error) {
        throw new Error('Invalid folder path: ' + error.message, { cause: error });
      }

      const files = [];

      try {
        const dirents = await fs.readdir(folderPath, { withFileTypes: true });

        for (const dirent of dirents) {
          if (dirent.isFile()) {
            const ext = path.extname(dirent.name).toLowerCase();
            if (VIDEO_EXTENSIONS.includes(ext)) {
              files.push(dirent.name);
            }
          }
        }
      } catch (error) {
        console.error('Error scanning folder:', error);
      }

      return files;
    });

    // Start transcription process (self-contained)
    ipcMain.handle('start-transcription', async (event, options) => {
      if (!options || typeof options !== 'object') {
        throw new Error('Invalid options: must be an object');
      }
      const { folderPath, model } = options;

      if (typeof folderPath !== 'string' || !path.isAbsolute(folderPath)) {
        throw new Error('Invalid folder path: must be an absolute path string');
      }
      if (folderPath.includes('..')) {
        throw new Error('Invalid folder path: path traversal not allowed');
      }
      const validModels = ['tiny', 'base', 'small', 'medium', 'large'];
      if (typeof model !== 'string' || !validModels.includes(model)) {
        throw new Error('Invalid model: must be one of ' + validModels.join(', '));
      }

      if (this.isTranscribing) {
        throw new Error('Transcription already in progress');
      }

      try {
        this.isTranscribing = true;

        // Set up progress callback — guard against window being closed mid-transcription
        this.transcriber.setProgressCallback((data) => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('transcription-progress', {
              type: 'stdout',
              message: data.message,
            });
          }
        });

        this.transcriber.isTranscribing = true;

        // Process the folder
        const result = await this.transcriber.processFolder(folderPath, model);

        return {
          success: true,
          output: `Processed ${result.processed} files, ${result.failed} failed`,
          result,
        };
      } catch (error) {
        throw new Error(error.message, { cause: error });
      } finally {
        this.isTranscribing = false;
      }
    });

    // Stop transcription process
    ipcMain.handle('stop-transcription', async () => {
      if (this.isTranscribing) {
        this.isTranscribing = false;
        this.transcriber.stop();
        return true;
      }
      return false;
    });

    // Open external links — validate URL to prevent protocol abuse
    ipcMain.handle('open-external', async (event, url) => {
      if (typeof url !== 'string') return;
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        console.error('open-external: invalid URL rejected:', url);
        return;
      }
      const allowedProtocols = ['https:', 'http:', 'mailto:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        console.error('open-external: blocked non-http protocol:', parsed.protocol);
        return;
      }
      await shell.openExternal(url);
    });

    // Get app version
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // ── API Stack LITE ─────────────────────────────────────────────────
    ipcMain.handle('api-stack:list-providers', () => apiStack.listProviders());

    ipcMain.handle('api-stack:get-settings', () => ({
      settings: apiStack.getSettingsRedacted(),
      keys: apiStack.getProviderKeys(),
    }));

    ipcMain.handle('api-stack:save-settings', (_event, payload) => {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid settings payload');
      }
      const merged = apiStack.saveSettings(payload);
      return { settings: merged, keys: apiStack.getProviderKeys() };
    });

    ipcMain.handle('api-stack:fetch-models', async (_event, { providerId, force } = {}) => {
      if (typeof providerId !== 'string') throw new Error('providerId required');
      return apiStack.fetchModels(providerId, { force: !!force });
    });

    ipcMain.handle('api-stack:test-provider', async (_event, { providerId, modelId } = {}) => {
      if (typeof providerId !== 'string') throw new Error('providerId required');
      if (typeof modelId !== 'string') throw new Error('modelId required');
      return apiStack.testProvider({ providerId, modelId });
    });

    ipcMain.handle('api-stack:chat-completion', async (event, { providerId, modelId, messages, opts, requestId } = {}) => {
      if (typeof providerId !== 'string') throw new Error('providerId required');
      if (typeof modelId !== 'string') throw new Error('modelId required');
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('messages must be a non-empty array');
      }
      const rid = typeof requestId === 'string' ? requestId : `rid_${Date.now()}`;
      const wc = event.sender;
      try {
        for await (const delta of apiStack.createChatCompletion({ providerId, modelId, messages, opts: opts || {} })) {
          if (wc.isDestroyed()) return { requestId: rid, aborted: true };
          wc.send('api-stack:chat-delta', { requestId: rid, delta });
        }
        if (!wc.isDestroyed()) {
          wc.send('api-stack:chat-end', { requestId: rid, ok: true });
        }
        return { requestId: rid, ok: true };
      } catch (err) {
        if (!wc.isDestroyed()) {
          wc.send('api-stack:chat-end', { requestId: rid, ok: false, error: err.message });
        }
        throw err;
      }
    });

    ipcMain.handle('api-stack:refresh-env-vars', async () => apiStack.refreshEnvVars());

    ipcMain.handle('api-stack:get-about-info', () => apiStack.getAboutInfo());

    // ── URL Transcription ──────────────────────────────────────────────
    ipcMain.handle('validate-url', async (_event, url) => {
      if (typeof url !== 'string') throw new Error('URL must be a string');
      return this.urlTranscriber.validateUrl(url);
    });

    ipcMain.handle('transcribe-url', async (event, payload) => {
      if (!payload || typeof payload !== 'object') throw new Error('payload required');
      const { url, id, model = 'base', outputDir } = payload;
      if (typeof url !== 'string') throw new Error('url required');
      if (typeof id !== 'string') throw new Error('id required');
      if (typeof outputDir !== 'string' || !path.isAbsolute(outputDir)) {
        throw new Error('outputDir must be an absolute path');
      }
      const validModels = ['tiny', 'base', 'small', 'medium', 'large'];
      if (!validModels.includes(model)) throw new Error(`invalid model: ${model}`);

      const wc = event.sender;
      this.urlTranscriber.setProgressCallback((progress) => {
        if (!wc.isDestroyed()) {
          wc.send('url-transcription-progress', { ...progress, id });
        }
      });

      this.activeUrlJobs.set(id, { startedAt: Date.now() });
      try {
        const result = await this.urlTranscriber.processUrl(url, outputDir, { id, model });
        this.activeUrlJobs.delete(id);
        if (!wc.isDestroyed()) {
          wc.send('url-transcription-complete', { id, ...result });
        }
        return result;
      } catch (err) {
        this.activeUrlJobs.delete(id);
        if (!wc.isDestroyed()) {
          wc.send('url-transcription-complete', { id, success: false, error: err.message });
        }
        throw err;
      }
    });

    ipcMain.handle('export-transcript', async (_event, payload) => {
      if (!payload || typeof payload !== 'object') throw new Error('payload required');
      const { content, suggestedFilename, format = 'md', targetPath } = payload;
      if (typeof content !== 'string' || !content) throw new Error('content required');

      if (typeof targetPath === 'string' && targetPath) {
        if (!path.isAbsolute(targetPath)) throw new Error('targetPath must be absolute');
        if (targetPath.includes('..')) throw new Error('targetPath contains traversal');
        await fs.writeFile(targetPath, content, 'utf8');
        return { saved: true, path: targetPath };
      }

      const filters = format === 'txt'
        ? [{ name: 'Plain Text', extensions: ['txt'] }]
        : [{ name: 'Markdown', extensions: ['md'] }];
      const result = await dialog.showSaveDialog(this.mainWindow, {
        title: 'Export Transcript',
        defaultPath: (suggestedFilename || 'transcript') + '.' + (format === 'txt' ? 'txt' : 'md'),
        filters,
      });
      if (result.canceled || !result.filePath) return { saved: false };
      await fs.writeFile(result.filePath, content, 'utf8');
      return { saved: true, path: result.filePath };
    });
  }

  init() {
    // Linux: transparency and sandbox compatibility flags
    // Use disable-gpu-compositing NOT disable-gpu (full GPU disable breaks rendering)
    if (process.platform === 'linux') {
      app.commandLine.appendSwitch('no-sandbox');
      app.commandLine.appendSwitch('enable-transparent-visuals');
      app.commandLine.appendSwitch('disable-gpu-compositing');
    }

    // Handle app ready
    app.whenReady().then(() => {
      apiStack.init(app);
      this.createWindow();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    // Handle all windows closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        try {
          const parsed = new URL(url);
          if (['https:', 'http:'].includes(parsed.protocol)) {
            shell.openExternal(url);
          }
        } catch {
          // Malformed URL — deny silently
        }
        return { action: 'deny' };
      });
    });
  }
}

// Initialize the app
const videoTranscriberApp = new VideoTranscriberApp();
videoTranscriberApp.init();

// Prevent unhandled promise rejections and uncaught exceptions from crashing silently
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't crash on recoverable errors, but log them
  // For EPIPE and similar, exiting is appropriate
  if (error.code === 'EPIPE') {
    process.exit(0);
  }
});
