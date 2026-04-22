class VideoTranscriberUI {
  constructor() {
    this.currentFolder = null;
    this.urlOutputDir = null;
    this.isProcessing = false;
    this.videoFiles = [];
    this.mode = 'folder';
    this.urlJobs = new Map();

    this.init();
  }

  async init() {
    this.setupWindowControls();
    this.setupAboutModal();
    this.setupEventListeners();
    this.setupProgressListener();
    this.setupModeToggle();
    this.setupUrlMode();

    await this.checkDependencies();
    await this.loadAppVersion();

    this.log('Application initialized', 'info');
  }

  setupModeToggle() {
    const pills = document.querySelectorAll('.mode-pill');
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.mode = pill.dataset.mode;
        pills.forEach((p) => {
          const active = p.dataset.mode === this.mode;
          p.classList.toggle('active', active);
          p.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const folderPanel = document.getElementById('folder-panel');
        const urlPanel = document.getElementById('url-panel');
        folderPanel.hidden = this.mode !== 'folder';
        urlPanel.hidden = this.mode !== 'urls';
        this.updateStartButton();
      });
    });
  }

  setupUrlMode() {
    const urlBrowse = document.getElementById('url-browse-btn');
    const urlInput = document.getElementById('url-input');
    const urlOutputField = document.getElementById('url-output-dir');

    urlBrowse.addEventListener('click', async () => {
      const dir = await window.electronAPI.selectFolder();
      if (dir) {
        this.urlOutputDir = dir;
        urlOutputField.value = dir;
        this.updateStartButton();
      }
    });

    urlInput.addEventListener('input', () => this.updateStartButtonState());

    window.electronAPI.onUrlTranscriptionProgress((data) => {
      this.onUrlProgress(data);
    });
    window.electronAPI.onUrlTranscriptionComplete((data) => {
      this.onUrlComplete(data);
    });
  }

  async runUrl(url) {
    const id = 'job_' + Date.now().toString(36);
    this.activeUrlJob = { id, url, transcript: null, path: null };
    const model = document.getElementById('model-select').value || 'base';
    this.log(`URL: ${url}`, 'info');
    this.setProgress(5, 'Validating URL…');
    await window.electronAPI.transcribeUrl({
      url,
      id,
      model,
      outputDir: this.urlOutputDir,
    });
  }

  onUrlProgress(data) {
    if (!this.activeUrlJob || data.id !== this.activeUrlJob.id) return;
    const message = data.message || '';
    let pct = null;
    const m = message.match(/(\d+\.?\d*)%/);
    if (m) pct = Math.min(95, parseFloat(m[1]));
    this.log(message, data.type || 'info');
    this.setProgress(pct != null ? pct : 50, message.slice(0, 80));
  }

  async onUrlComplete(data) {
    if (!this.activeUrlJob || data.id !== this.activeUrlJob.id) return;
    if (!data.success) {
      this.log(`URL transcription failed: ${data.error}`, 'error');
      this.setProgress(0, 'Failed');
      return;
    }
    this.activeUrlJob.transcript = data.transcript;
    this.activeUrlJob.path = data.transcriptPath;
    this.activeUrlJob.metadata = data.metadata;
    this.log(`Raw transcript saved: ${data.transcriptPath}`, 'success');
    this.setProgress(70, 'Polishing with AI…');

    const polished = await this.polishIfEnabled(data.transcript);
    if (polished) {
      const polishedPath = data.transcriptPath.replace(/\.md$/i, '.polished.md');
      await window.electronAPI.exportTranscript({
        content: polished,
        suggestedFilename: null,
        format: 'md',
        targetPath: polishedPath,
      });
      this.log(`Polished transcript saved: ${polishedPath}`, 'success');
    }
    this.setProgress(100, 'Done');
  }

  async polishIfEnabled(rawTranscript) {
    if (!window.aiStack) {
      this.log('AI Stack not available — skipping polish', 'warning');
      return null;
    }
    let settings;
    try {
      const resp = await window.aiStack.getSettings();
      settings = resp.settings;
    } catch (err) {
      this.log(`Polish skipped — could not load AI settings: ${err.message}`, 'warning');
      return null;
    }
    const providerId = settings.defaultProviderId;
    const modelId = settings.defaultModelId;
    if (!providerId || !modelId) {
      this.log('Polish skipped — no default provider/model set (open AI Providers modal).', 'warning');
      return null;
    }
    const systemPrompt =
      'You polish machine-generated transcripts into readable prose. Preserve all facts, names, numbers, and quotes verbatim. Fix punctuation, capitalization, and obvious transcription errors. Break into topical paragraphs with short descriptive headings when helpful. Keep the original language. Return only the polished transcript in markdown — no meta commentary, no preamble.';

    return new Promise((resolve) => {
      const requestId = 'polish_' + this.activeUrlJob.id;
      let accumulated = '';
      window.aiStack.removeChatListeners();
      window.aiStack.onChatDelta((msg) => {
        if (msg.requestId !== requestId) return;
        accumulated += msg.delta;
      });
      window.aiStack.onChatEnd((msg) => {
        if (msg.requestId !== requestId) return;
        if (msg.ok) {
          this.log(`Polish complete (${providerId}/${modelId})`, 'success');
          resolve(accumulated);
        } else {
          this.log(`Polish failed: ${msg.error}`, 'error');
          resolve(null);
        }
      });
      window.aiStack
        .chatCompletion({
          providerId,
          modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawTranscript },
          ],
          requestId,
        })
        .catch((err) => {
          this.log(`Polish error: ${err.message}`, 'error');
          resolve(null);
        });
    });
  }

  // ── WINDOW CONTROLS ──────────────────────────────────────────
  setupWindowControls() {
    document.getElementById('btn-minimize').addEventListener('click', () => {
      window.electronAPI.windowMinimize();
    });
    document.getElementById('btn-maximize').addEventListener('click', () => {
      window.electronAPI.windowMaximize();
    });
    document.getElementById('btn-close').addEventListener('click', () => {
      window.electronAPI.windowClose();
    });
  }

  // ── ABOUT MODAL ───────────────────────────────────────────────
  setupAboutModal() {
    const overlay = document.getElementById('aboutOverlay');
    const closeBtn = document.getElementById('about-close-btn');
    const aboutBtn = document.getElementById('about-btn');
    const githubLink = document.getElementById('aboutGithubLink');

    // Open
    aboutBtn.addEventListener('click', () => {
      overlay.classList.add('active');
    });

    // Close via X button
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    // Close on overlay click (not modal content)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.classList.remove('active');
      }
    });

    // GitHub link — open in external browser with protocol validation
    githubLink.addEventListener('click', (e) => {
      e.preventDefault();
      const url = 'https://github.com/sanchez314c/video-transcriber';
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    });
  }

  // ── EVENT LISTENERS ───────────────────────────────────────────
  setupEventListeners() {
    // Browse button
    document.getElementById('browse-button').addEventListener('click', async () => {
      await this.selectFolder();
    });

    // Start button
    document.getElementById('start-button').addEventListener('click', async () => {
      await this.startTranscription();
    });

    // Stop button
    document.getElementById('stop-button').addEventListener('click', async () => {
      await this.stopTranscription();
    });

    // Clear output button
    document.getElementById('clear-output').addEventListener('click', () => {
      this.clearOutput();
    });

    // Save log button
    document.getElementById('save-log').addEventListener('click', () => {
      this.saveLog();
    });

    // Model selection change
    document.getElementById('model-select').addEventListener('change', (e) => {
      this.log(`Selected model: ${e.target.value}`, 'info');
    });
  }

  setupProgressListener() {
    window.electronAPI.onTranscriptionProgress((_event, data) => {
      const { type, message } = data;

      if (type === 'stdout') {
        this.log(message, 'info');
      } else if (type === 'stderr') {
        this.log(message, 'error');
      }

      this.updateProgress(message);
    });
  }

  async selectFolder() {
    try {
      const folderPath = await window.electronAPI.selectFolder();

      if (folderPath) {
        this.currentFolder = folderPath;
        document.getElementById('folder-input').value = folderPath;

        this.log(`Selected folder: ${folderPath}`, 'info');

        // Scan for video files
        await this.scanFolder(folderPath);

        // Enable start button if we have files
        this.updateStartButton();
      }
    } catch (error) {
      this.log(`Error selecting folder: ${error.message}`, 'error');
    }
  }

  async scanFolder(folderPath) {
    try {
      const videoFiles = await window.electronAPI.scanFolder(folderPath);
      this.videoFiles = videoFiles;

      const fileCountElement = document.getElementById('file-count');

      if (videoFiles.length > 0) {
        fileCountElement.textContent = `Found ${videoFiles.length} video file${videoFiles.length === 1 ? '' : 's'}`;
        this.log(`Found ${videoFiles.length} video files:`, 'success');
        videoFiles.forEach((file) => {
          this.log(`  - ${file}`, 'info');
        });
      } else {
        fileCountElement.textContent = 'No video files found in selected folder';
        this.log('No video files found in selected folder', 'warning');
      }

      // Update status bar file count
      this.updateStatusFileCount(videoFiles.length);
    } catch (error) {
      this.log(`Error scanning folder: ${error.message}`, 'error');
    }
  }

  async checkDependencies() {
    try {
      const dependencies = await window.electronAPI.checkDependencies();
      const statusElement = document.getElementById('dependency-status');
      const statusDot = document.getElementById('status-dot');

      const checks = [
        { name: 'FFmpeg', status: dependencies.ffmpeg },
        { name: 'Whisper', status: dependencies.whisper },
        { name: 'Model', status: dependencies.model },
      ];

      const allOk = checks.every((check) => check.status);

      if (allOk) {
        statusElement.textContent = 'Status: Ready';
        statusDot.className = 'status-indicator online';
        this.log('All dependencies found', 'success');
      } else {
        const missing = checks.filter((check) => !check.status).map((check) => check.name);
        statusElement.textContent = `Missing: ${missing.join(', ')}`;
        statusDot.className = 'status-indicator error';

        this.log('Dependency check results:', 'warning');
        checks.forEach((check) => {
          this.log(
            `  ${check.status ? '\u2713' : '\u2717'} ${check.name}`,
            check.status ? 'success' : 'error'
          );
        });

        if (!dependencies.ffmpeg)
          this.log('FFmpeg binary not found (bundled via ffmpeg-static)', 'error');
        if (!dependencies.whisper)
          this.log('whisper-cli binary not found — run `npm install` to build whisper.cpp', 'error');
        if (!dependencies.model)
          this.log(
            'Whisper model missing — place ggml-base.en.bin at models/ or node_modules/nodejs-whisper/cpp/whisper.cpp/models/',
            'error',
          );
      }

      this.dependenciesOk = allOk;
      this.updateStartButton();
    } catch (error) {
      this.log(`Error checking dependencies: ${error.message}`, 'error');
    }
  }

  async loadAppVersion() {
    try {
      const version = await window.electronAPI.getAppVersion();
      document.getElementById('app-version').textContent = `v${version}`;
      // Also update the about modal version
      const aboutVersion = document.querySelector('.about-version');
      if (aboutVersion) aboutVersion.textContent = `v${version}`;
    } catch (error) {
      console.error('Error loading app version:', error);
    }
  }

  updateStatusFileCount(count) {
    const el = document.getElementById('status-file-count');
    if (el) {
      el.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    }
  }

  updateStartButton() {
    const startButton = document.getElementById('start-button');
    if (!startButton) return;
    if (this.isProcessing || !this.dependenciesOk) {
      startButton.disabled = true;
      return;
    }
    if (this.mode === 'urls') {
      const urlInput = document.getElementById('url-input');
      const url = (urlInput && urlInput.value.trim()) || '';
      startButton.disabled = !url || !this.urlOutputDir;
    } else {
      startButton.disabled = !this.currentFolder || !this.videoFiles || this.videoFiles.length === 0;
    }
  }

  async startTranscription() {
    if (this.isProcessing) return;

    if (this.mode === 'urls') {
      await this.startUrlTranscription();
      return;
    }

    try {
      this.isProcessing = true;
      this.updateUIForProcessing(true);

      const model = document.getElementById('model-select').value;
      const options = {
        folderPath: this.currentFolder,
        model: model,
      };

      this.log(`Starting transcription with ${model} model...`, 'info');
      this.log(`Processing ${this.videoFiles.length} video files`, 'info');

      this.setProgress(0, 'Starting transcription...');
      this.showProgressBar(true);

      await window.electronAPI.startTranscription(options);

      this.log('All transcriptions completed successfully!', 'success');
      this.setProgress(100, 'Transcription completed');
    } catch (error) {
      this.log(`Error during transcription: ${error.error || error.message}`, 'error');
      this.setProgress(0, 'Transcription failed');
    } finally {
      this.isProcessing = false;
      this.updateUIForProcessing(false);
      this.showProgressBar(false);
    }
  }

  async startUrlTranscription() {
    const urlInput = document.getElementById('url-input');
    const url = (urlInput.value || '').trim();
    if (!url) {
      this.log('Enter a URL first', 'error');
      return;
    }
    if (!this.urlOutputDir) {
      this.log('Select an output folder first', 'error');
      return;
    }
    try {
      this.isProcessing = true;
      this.updateUIForProcessing(true);
      this.setProgress(0, 'Starting URL transcription...');
      this.showProgressBar(true);
      await this.runUrl(url);
      urlInput.value = '';
    } catch (err) {
      this.log(`URL transcription error: ${err.message}`, 'error');
    } finally {
      this.isProcessing = false;
      this.updateUIForProcessing(false);
      this.showProgressBar(false);
      this.updateStartButton();
    }
  }

  async stopTranscription() {
    try {
      const stopped = await window.electronAPI.stopTranscription();

      if (stopped) {
        this.log('Transcription stopped by user', 'warning');
        this.setProgress(0, 'Transcription stopped');
        this.isProcessing = false;
        this.updateUIForProcessing(false);
        this.showProgressBar(false);
      }
    } catch (error) {
      this.log(`Error stopping transcription: ${error.message}`, 'error');
    }
  }

  updateUIForProcessing(processing) {
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');

    if (processing) {
      startButton.style.display = 'none';
      stopButton.style.display = 'flex';
    } else {
      startButton.style.display = 'flex';
      stopButton.style.display = 'none';
      this.updateStartButton();
    }
  }

  showProgressBar(show) {
    const progressBar = document.getElementById('progress-bar');

    if (show) {
      progressBar.classList.add('indeterminate');
    } else {
      progressBar.classList.remove('indeterminate');
      progressBar.style.width = '0%';
    }
  }

  setProgress(percentage, text) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (percentage > 0) {
      progressBar.classList.remove('indeterminate');
      progressBar.style.width = `${percentage}%`;
    }

    progressText.textContent = text;
  }

  updateProgress(message) {
    if (message.includes('Processing:') && message.includes('[') && message.includes('/')) {
      const match = message.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        const percentage = Math.round((current / total) * 100);
        this.setProgress(percentage, `Processing file ${current} of ${total}`);
      }
    }
  }

  log(message, type = 'info') {
    const outputContent = document.getElementById('output-content');
    const timestamp = new Date().toLocaleTimeString();

    const logEntry = document.createElement('div');
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
    const outputContent = document.getElementById('output-content');
    outputContent.innerHTML = '';
    this.log('Output log cleared', 'info');
  }

  saveLog() {
    const outputContent = document.getElementById('output-content');
    const logText = outputContent.textContent;

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `video-transcriber-log-${new Date().toISOString().replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    this.log('Log saved successfully', 'success');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VideoTranscriberUI();
});
