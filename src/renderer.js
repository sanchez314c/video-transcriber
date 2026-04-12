class VideoTranscriberUI {
  constructor() {
    this.currentFolder = null;
    this.isProcessing = false;
    this.videoFiles = [];

    this.init();
  }

  async init() {
    this.setupWindowControls();
    this.setupAboutModal();
    this.setupEventListeners();
    this.setupProgressListener();

    await this.checkDependencies();
    await this.loadAppVersion();

    this.log("Application initialized", "info");
  }

  // ── WINDOW CONTROLS ──────────────────────────────────────────
  setupWindowControls() {
    document.getElementById("btn-minimize").addEventListener("click", () => {
      window.electronAPI.windowMinimize();
    });
    document.getElementById("btn-maximize").addEventListener("click", () => {
      window.electronAPI.windowMaximize();
    });
    document.getElementById("btn-close").addEventListener("click", () => {
      window.electronAPI.windowClose();
    });
  }

  // ── ABOUT MODAL ───────────────────────────────────────────────
  setupAboutModal() {
    const overlay = document.getElementById("aboutOverlay");
    const closeBtn = document.getElementById("about-close-btn");
    const aboutBtn = document.getElementById("about-btn");
    const githubLink = document.getElementById("aboutGithubLink");

    // Open
    aboutBtn.addEventListener("click", () => {
      overlay.classList.add("active");
    });

    // Close via X button
    closeBtn.addEventListener("click", () => {
      overlay.classList.remove("active");
    });

    // Close on overlay click (not modal content)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        overlay.classList.remove("active");
      }
    });

    // GitHub link — open in external browser with protocol validation
    githubLink.addEventListener("click", (e) => {
      e.preventDefault();
      const url = "https://github.com/sanchez314c/video-transcriber";
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
    });
  }

  // ── EVENT LISTENERS ───────────────────────────────────────────
  setupEventListeners() {
    // Browse button
    document
      .getElementById("browse-button")
      .addEventListener("click", async () => {
        await this.selectFolder();
      });

    // Start button
    document
      .getElementById("start-button")
      .addEventListener("click", async () => {
        await this.startTranscription();
      });

    // Stop button
    document
      .getElementById("stop-button")
      .addEventListener("click", async () => {
        await this.stopTranscription();
      });

    // Clear output button
    document.getElementById("clear-output").addEventListener("click", () => {
      this.clearOutput();
    });

    // Save log button
    document.getElementById("save-log").addEventListener("click", () => {
      this.saveLog();
    });

    // Model selection change
    document.getElementById("model-select").addEventListener("change", (e) => {
      this.log(`Selected model: ${e.target.value}`, "info");
    });
  }

  setupProgressListener() {
    window.electronAPI.onTranscriptionProgress((_event, data) => {
      const { type, message } = data;

      if (type === "stdout") {
        this.log(message, "info");
      } else if (type === "stderr") {
        this.log(message, "error");
      }

      this.updateProgress(message);
    });
  }

  async selectFolder() {
    try {
      const folderPath = await window.electronAPI.selectFolder();

      if (folderPath) {
        this.currentFolder = folderPath;
        document.getElementById("folder-input").value = folderPath;

        this.log(`Selected folder: ${folderPath}`, "info");

        // Scan for video files
        await this.scanFolder(folderPath);

        // Enable start button if we have files
        this.updateStartButton();
      }
    } catch (error) {
      this.log(`Error selecting folder: ${error.message}`, "error");
    }
  }

  async scanFolder(folderPath) {
    try {
      const videoFiles = await window.electronAPI.scanFolder(folderPath);
      this.videoFiles = videoFiles;

      const fileCountElement = document.getElementById("file-count");

      if (videoFiles.length > 0) {
        fileCountElement.textContent = `Found ${videoFiles.length} video file${videoFiles.length === 1 ? "" : "s"}`;
        this.log(`Found ${videoFiles.length} video files:`, "success");
        videoFiles.forEach((file) => {
          this.log(`  - ${file}`, "info");
        });
      } else {
        fileCountElement.textContent =
          "No video files found in selected folder";
        this.log("No video files found in selected folder", "warning");
      }

      // Update status bar file count
      this.updateStatusFileCount(videoFiles.length);
    } catch (error) {
      this.log(`Error scanning folder: ${error.message}`, "error");
    }
  }

  async checkDependencies() {
    try {
      const dependencies = await window.electronAPI.checkDependencies();
      const statusElement = document.getElementById("dependency-status");
      const statusDot = document.getElementById("status-dot");

      const checks = [
        { name: "Python", status: dependencies.python },
        { name: "FFmpeg", status: dependencies.ffmpeg },
        { name: "Whisper", status: dependencies.whisper },
      ];

      const allOk = checks.every((check) => check.status);

      if (allOk) {
        statusElement.textContent = "Status: Ready";
        statusDot.className = "status-indicator online";
        this.log("All dependencies found", "success");
      } else {
        const missing = checks
          .filter((check) => !check.status)
          .map((check) => check.name);
        statusElement.textContent = `Missing: ${missing.join(", ")}`;
        statusDot.className = "status-indicator error";

        this.log("Dependency check results:", "warning");
        checks.forEach((check) => {
          this.log(
            `  ${check.status ? "\u2713" : "\u2717"} ${check.name}`,
            check.status ? "success" : "error",
          );
        });

        if (!dependencies.python)
          this.log("Please install Python 3.x", "error");
        if (!dependencies.ffmpeg) this.log("Please install FFmpeg", "error");
        if (!dependencies.whisper)
          this.log(
            "Please install Whisper: pip install openai-whisper",
            "error",
          );
      }

      this.dependenciesOk = allOk;
      this.updateStartButton();
    } catch (error) {
      this.log(`Error checking dependencies: ${error.message}`, "error");
    }
  }

  async loadAppVersion() {
    try {
      const version = await window.electronAPI.getAppVersion();
      document.getElementById("app-version").textContent = `v${version}`;
      // Also update the about modal version
      const aboutVersion = document.querySelector(".about-version");
      if (aboutVersion) aboutVersion.textContent = `v${version}`;
    } catch (error) {
      console.error("Error loading app version:", error);
    }
  }

  updateStatusFileCount(count) {
    const el = document.getElementById("status-file-count");
    if (el) {
      el.textContent = `${count} file${count !== 1 ? "s" : ""}`;
    }
  }

  updateStartButton() {
    const startButton = document.getElementById("start-button");
    const canStart =
      this.currentFolder &&
      this.videoFiles &&
      this.videoFiles.length > 0 &&
      this.dependenciesOk &&
      !this.isProcessing;

    startButton.disabled = !canStart;
  }

  async startTranscription() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      this.updateUIForProcessing(true);

      const model = document.getElementById("model-select").value;
      const options = {
        folderPath: this.currentFolder,
        model: model,
      };

      this.log(`Starting transcription with ${model} model...`, "info");
      this.log(`Processing ${this.videoFiles.length} video files`, "info");

      this.setProgress(0, "Starting transcription...");
      this.showProgressBar(true);

      await window.electronAPI.startTranscription(options);

      this.log("All transcriptions completed successfully!", "success");
      this.setProgress(100, "Transcription completed");
    } catch (error) {
      this.log(
        `Error during transcription: ${error.error || error.message}`,
        "error",
      );
      this.setProgress(0, "Transcription failed");
    } finally {
      this.isProcessing = false;
      this.updateUIForProcessing(false);
      this.showProgressBar(false);
    }
  }

  async stopTranscription() {
    try {
      const stopped = await window.electronAPI.stopTranscription();

      if (stopped) {
        this.log("Transcription stopped by user", "warning");
        this.setProgress(0, "Transcription stopped");
        this.isProcessing = false;
        this.updateUIForProcessing(false);
        this.showProgressBar(false);
      }
    } catch (error) {
      this.log(`Error stopping transcription: ${error.message}`, "error");
    }
  }

  updateUIForProcessing(processing) {
    const startButton = document.getElementById("start-button");
    const stopButton = document.getElementById("stop-button");

    if (processing) {
      startButton.style.display = "none";
      stopButton.style.display = "flex";
    } else {
      startButton.style.display = "flex";
      stopButton.style.display = "none";
      this.updateStartButton();
    }
  }

  showProgressBar(show) {
    const progressBar = document.getElementById("progress-bar");

    if (show) {
      progressBar.classList.add("indeterminate");
    } else {
      progressBar.classList.remove("indeterminate");
      progressBar.style.width = "0%";
    }
  }

  setProgress(percentage, text) {
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");

    if (percentage > 0) {
      progressBar.classList.remove("indeterminate");
      progressBar.style.width = `${percentage}%`;
    }

    progressText.textContent = text;
  }

  updateProgress(message) {
    if (
      message.includes("Processing:") &&
      message.includes("[") &&
      message.includes("/")
    ) {
      const match = message.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        const percentage = Math.round((current / total) * 100);
        this.setProgress(percentage, `Processing file ${current} of ${total}`);
      }
    }
  }

  log(message, type = "info") {
    const outputContent = document.getElementById("output-content");
    const timestamp = new Date().toLocaleTimeString();

    const logEntry = document.createElement("div");
    logEntry.className = `log-message log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    outputContent.appendChild(logEntry);
    outputContent.scrollTop = outputContent.scrollHeight;

    // Limit log entries to prevent memory issues
    const maxEntries = 1000;
    const entries = outputContent.children;
    if (entries.length > maxEntries) {
      const excess = entries.length - maxEntries;
      const toRemove = Array.from(entries).slice(0, excess);
      toRemove.forEach((node) => node.remove());
    }
  }

  clearOutput() {
    const outputContent = document.getElementById("output-content");
    outputContent.innerHTML = "";
    this.log("Output log cleared", "info");
  }

  saveLog() {
    const outputContent = document.getElementById("output-content");
    const logText = outputContent.textContent;

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `video-transcriber-log-${new Date().toISOString().replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    this.log("Log saved successfully", "success");
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VideoTranscriberUI();
});
