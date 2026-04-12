const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const { SelfContainedTranscriber } = require("./self-contained-transcriber");
const { VIDEO_EXTENSIONS } = require("./constants");

// Enable live reload for development
if (process.argv.includes("--dev")) {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "..", "node_modules", ".bin", "electron"),
    hardResetMethod: "exit",
  });
}

class VideoTranscriberApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.argv.includes("--dev");
    this.transcriber = new SelfContainedTranscriber();
    this.isTranscribing = false;
  }

  createWindow() {
    // Neo-Noir Glass Monitor — frameless, transparent, floating window
    const isMac = process.platform === "darwin";

    this.mainWindow = new BrowserWindow({
      width: 920,
      height: 860,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      resizable: true,
      roundedCorners: true,
      ...(isMac ? { titleBarStyle: "hiddenInset" } : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
        sandbox: false,
        // NEVER set experimentalFeatures: true — breaks contextBridge IPC on Linux
      },
      show: false,
      icon: path.join(__dirname, "..", "resources", "icons", "icon.png"),
    });

    // Load the app
    this.mainWindow.loadFile(path.join(__dirname, "index.html"));

    // Show window when ready
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
    });

    // Handle window closed
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
      this.isTranscribing = false;
    });
  }

  setupIPC() {
    // Window control IPC handlers
    ipcMain.handle("window-minimize", () => {
      if (this.mainWindow) this.mainWindow.minimize();
    });

    ipcMain.handle("window-maximize", () => {
      if (this.mainWindow) {
        this.mainWindow.isMaximized()
          ? this.mainWindow.unmaximize()
          : this.mainWindow.maximize();
      }
    });

    ipcMain.handle("window-close", () => {
      if (this.mainWindow) this.mainWindow.close();
    });

    // Select folder dialog
    ipcMain.handle("select-folder", async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ["openDirectory"],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // Check dependencies (self-contained)
    ipcMain.handle("check-dependencies", async () => {
      try {
        const dependencies = await this.transcriber.checkDependencies();
        return dependencies;
      } catch (error) {
        console.error("Failed to check dependencies:", error);
        return { ffmpeg: false, whisper: false, python: false };
      }
    });

    // Scan folder for video files
    ipcMain.handle("scan-folder", async (event, folderPath) => {
      // Validate input
      if (typeof folderPath !== "string") {
        throw new Error("Invalid folder path: must be a string");
      }
      if (!path.isAbsolute(folderPath)) {
        throw new Error("Invalid folder path: must be absolute");
      }
      if (folderPath.includes("..")) {
        throw new Error("Invalid folder path: path traversal not allowed");
      }

      // Validate path exists and is a directory
      try {
        const stat = await fs.stat(folderPath);
        if (!stat.isDirectory()) {
          throw new Error("Invalid folder path: not a directory");
        }
      } catch (error) {
        throw new Error("Invalid folder path: " + error.message);
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
        console.error("Error scanning folder:", error);
      }

      return files;
    });

    // Start transcription process (self-contained)
    ipcMain.handle("start-transcription", async (event, options) => {
      const { folderPath, model } = options;

      if (this.isTranscribing) {
        throw new Error("Transcription already in progress");
      }

      try {
        this.isTranscribing = true;

        // Set up progress callback — guard against window being closed mid-transcription
        this.transcriber.setProgressCallback((data) => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send("transcription-progress", {
              type: "stdout",
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
        throw new Error(error.message);
      } finally {
        this.isTranscribing = false;
      }
    });

    // Stop transcription process
    ipcMain.handle("stop-transcription", async () => {
      if (this.isTranscribing) {
        this.isTranscribing = false;
        this.transcriber.stop();
        return true;
      }
      return false;
    });

    // Open external links — validate URL to prevent protocol abuse
    ipcMain.handle("open-external", async (event, url) => {
      if (typeof url !== "string") return;
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        console.error("open-external: invalid URL rejected:", url);
        return;
      }
      const allowedProtocols = ["https:", "http:", "mailto:"];
      if (!allowedProtocols.includes(parsed.protocol)) {
        console.error(
          "open-external: blocked non-http protocol:",
          parsed.protocol,
        );
        return;
      }
      await shell.openExternal(url);
    });

    // Get app version
    ipcMain.handle("get-app-version", () => {
      return app.getVersion();
    });
  }

  init() {
    // Linux: transparency and sandbox compatibility flags
    // Use disable-gpu-compositing NOT disable-gpu (full GPU disable breaks rendering)
    if (process.platform === "linux") {
      app.commandLine.appendSwitch("no-sandbox");
      app.commandLine.appendSwitch("enable-transparent-visuals");
      app.commandLine.appendSwitch("disable-gpu-compositing");
    }

    // Handle app ready
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    // Handle all windows closed
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on("web-contents-created", (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        try {
          const parsed = new URL(url);
          if (["https:", "http:"].includes(parsed.protocol)) {
            shell.openExternal(url);
          }
        } catch {
          // Malformed URL — deny silently
        }
        return { action: "deny" };
      });
    });
  }
}

// Initialize the app
const videoTranscriberApp = new VideoTranscriberApp();
videoTranscriberApp.init();
