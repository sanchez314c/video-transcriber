const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { SelfContainedTranscriber } = require('./self-contained-transcriber');

// Enable live reload for development
if (process.argv.includes('--dev')) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

class VideoTranscriberApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
    this.transcriber = new SelfContainedTranscriber();
    this.isTranscribing = false;
  }

  createWindow() {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false,
      icon: path.join(__dirname, '..', 'assets', 'icon.png')
    });

    // Load the app
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.isTranscribing = false;
    });
  }

  setupIPC() {
    // Select folder dialog
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
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
      const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg'];
      const files = [];

      try {
        const dirents = await fs.readdir(folderPath, { withFileTypes: true });
        
        for (const dirent of dirents) {
          if (dirent.isFile()) {
            const ext = path.extname(dirent.name).toLowerCase();
            if (videoExtensions.includes(ext)) {
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
      const { folderPath, model } = options;
      
      if (this.isTranscribing) {
        throw new Error('Transcription already in progress');
      }
      
      try {
        this.isTranscribing = true;
        
        // Set up progress callback
        this.transcriber.setProgressCallback((data) => {
          this.mainWindow.webContents.send('transcription-progress', {
            type: 'stdout',
            message: data.message
          });
        });
        
        this.transcriber.isTranscribing = true;
        
        // Process the folder
        const result = await this.transcriber.processFolder(folderPath, model);
        
        return { 
          success: true, 
          output: `Processed ${result.processed} files, ${result.failed} failed`,
          result 
        };
        
      } catch (error) {
        throw { success: false, error: error.message };
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

    // Open external links
    ipcMain.handle('open-external', async (event, url) => {
      await shell.openExternal(url);
    });

    // Get app version
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });
  }

  init() {
    // Handle app ready
    app.whenReady().then(() => {
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
      contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      });
    });
  }
}

// Initialize the app
const videoTranscriberApp = new VideoTranscriberApp();
videoTranscriberApp.init();