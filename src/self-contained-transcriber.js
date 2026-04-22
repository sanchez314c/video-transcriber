// Real transcription engine: ffmpeg extracts audio → whisper.cpp transcribes.
// Replaces the previous simulation that wrote dummy WAV headers and returned placeholder text.

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { VIDEO_EXTENSIONS } = require('./constants');
const { parseVtt, reflowToParagraphs, formatAsMarkdown } = require('./transcript-formatter');

const WHISPER_MODELS = {
  tiny: 'ggml-tiny.en.bin',
  base: 'ggml-base.en.bin',
  small: 'ggml-small.en.bin',
  medium: 'ggml-medium.en.bin',
  large: 'ggml-large-v3.bin',
};

// Resolve a bundled binary first, then fall back to system PATH.
// Used by the main process; the paths differ between dev (src tree) and packaged (resources).
function resolveBinary(name, appRoot) {
  const platformDir = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'win' : 'linux';
  const exe = process.platform === 'win32' ? `${name}.exe` : name;

  const candidates = [
    path.join(appRoot, 'resources', 'binaries', platformDir, exe),
    path.join(process.resourcesPath || '', 'binaries', platformDir, exe),
    path.join(appRoot, 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp', 'build', 'bin', exe),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_e) {
      // ignore
    }
  }

  return exe;
}

function resolveFfmpeg(appRoot) {
  try {
    const ffmpegStaticPath = require('ffmpeg-static');
    if (ffmpegStaticPath && fs.existsSync(ffmpegStaticPath)) return ffmpegStaticPath;
  } catch (_e) {
    // ffmpeg-static not installed or not resolvable in this context
  }
  return resolveBinary('ffmpeg', appRoot);
}

function resolveWhisperCli(appRoot) {
  return resolveBinary('whisper-cli', appRoot);
}

function resolveModelPath(model, appRoot) {
  const modelFile = WHISPER_MODELS[model] || WHISPER_MODELS.base;
  const candidates = [
    path.join(appRoot, 'models', modelFile),
    path.join(process.resourcesPath || '', 'models', modelFile),
    path.join(appRoot, 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp', 'models', modelFile),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

class SelfContainedTranscriber {
  constructor(options = {}) {
    this.onProgress = null;
    this.isTranscribing = false;
    this.currentProcess = null;
    this.appRoot = options.appRoot || process.cwd();
  }

  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  log(message, type = 'info') {
    if (this.onProgress) {
      this.onProgress({ type, message });
    }
  }

  async checkDependencies() {
    const ffmpegPath = resolveFfmpeg(this.appRoot);
    const whisperPath = resolveWhisperCli(this.appRoot);

    const ffmpegOk = await this._probeBinary(ffmpegPath, ['-version']);
    const whisperOk = await this._probeBinary(whisperPath, ['--help']);

    return {
      ffmpeg: ffmpegOk,
      whisper: whisperOk,
      model: !!resolveModelPath('base', this.appRoot),
      ffmpegPath,
      whisperPath,
    };
  }

  _probeBinary(binary, args) {
    return new Promise((resolve) => {
      const proc = spawn(binary, args, { stdio: 'ignore' });
      proc.on('error', () => resolve(false));
      proc.on('exit', (code) => resolve(code === 0 || code === 1));
    });
  }

  async extractAudio(videoPath, audioPath) {
    const ffmpegPath = resolveFfmpeg(this.appRoot);
    this.log(`Extracting audio from ${path.basename(videoPath)}...`, 'info');

    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', videoPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        audioPath,
      ];
      const proc = spawn(ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)));
      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited ${code}: ${stderr.split('\n').slice(-5).join(' ')}`));
        }
      });
      this.currentProcess = proc;
    });
    this.currentProcess = null;

    this.log('Audio extraction complete', 'success');
    return true;
  }

  async transcribeAudio(audioPath, model = 'base') {
    const whisperPath = resolveWhisperCli(this.appRoot);
    const modelPath = resolveModelPath(model, this.appRoot);

    if (!modelPath) {
      throw new Error(
        `Whisper model '${model}' not found. Download via: cd models && curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_MODELS[model] || WHISPER_MODELS.base}`,
      );
    }

    this.log(`Transcribing with ${model} model...`, 'info');

    const outputBase = path.join(
      path.dirname(audioPath),
      path.basename(audioPath, path.extname(audioPath)),
    );

    return new Promise((resolve, reject) => {
      const args = [
        '-m', modelPath,
        '-f', audioPath,
        '-ovtt',
        '-of', outputBase,
        '-l', 'auto',
        '-t', String(Math.max(1, Math.floor(os.cpus().length / 2))),
        '-pp',
      ];

      const proc = spawn(whisperPath, args);
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        const progressMatch = text.match(/progress\s*=\s*(\d+)%/);
        if (progressMatch) {
          this.log(`Transcription progress: ${progressMatch[1]}%`, 'info');
        }
      });

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        const progressMatch = text.match(/progress\s*=\s*(\d+)%/);
        if (progressMatch) {
          this.log(`Transcription progress: ${progressMatch[1]}%`, 'info');
        }
      });

      proc.on('error', (err) => reject(new Error(`whisper-cli spawn failed: ${err.message}`)));
      proc.on('exit', async (code) => {
        this.currentProcess = null;
        if (code !== 0) {
          return reject(new Error(`whisper-cli exited ${code}: ${stderr.split('\n').slice(-5).join(' ')}`));
        }
        const vttPath = `${outputBase}.vtt`;
        try {
          const vttText = await fs.readFile(vttPath, 'utf8');
          await fs.unlink(vttPath).catch(() => {});
          resolve(vttText);
        } catch (readErr) {
          reject(new Error(`Failed to read transcript output: ${readErr.message}`));
        }
      });

      this.currentProcess = proc;
    });
  }

  async processVideo(videoPath, outputDir, model = 'base') {
    const videoName = path.parse(videoPath).name;
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const audioPath = path.join(os.tmpdir(), `vt_audio_${randomSuffix}.wav`);
    const transcriptPath = path.join(outputDir, `${videoName}.md`);

    try {
      this.log(`Processing: ${path.basename(videoPath)}`, 'info');

      await this.extractAudio(videoPath, audioPath);

      const vttText = await this.transcribeAudio(audioPath, model);
      if (!vttText) {
        throw new Error('Transcription returned empty result');
      }

      const cues = parseVtt(vttText);
      if (cues.length === 0) {
        throw new Error('Whisper produced empty VTT — audio may be silent or corrupted');
      }
      const body = reflowToParagraphs(cues);
      const duration = cues[cues.length - 1].end;
      const markdown = formatAsMarkdown(body, {
        title: videoName,
        sourceUrl: videoPath,
        platform: 'local-file',
        author: '',
        durationSeconds: Math.round(duration),
        language: 'en',
        captionType: `whisper-${model}`,
      });
      await fs.writeFile(transcriptPath, markdown, 'utf8');
      this.log(`Transcript saved: ${path.basename(transcriptPath)}`, 'success');

      try {
        await fs.unlink(audioPath);
      } catch (cleanupError) {
        this.log(`Warning: Could not clean up temp audio: ${cleanupError.message}`, 'warning');
      }

      return transcriptPath;
    } catch (error) {
      try {
        await fs.unlink(audioPath);
      } catch (_cleanupError) {
        // ignore
      }
      throw error;
    }
  }

  async processFolder(folderPath, model = 'base') {
    try {
      const files = await fs.readdir(folderPath);
      const videoFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return VIDEO_EXTENSIONS.includes(ext);
      });

      if (videoFiles.length === 0) {
        this.log('No video files found in folder', 'warning');
        return { processed: 0, failed: 0, results: [] };
      }

      this.log(`Found ${videoFiles.length} video files to process`, 'info');
      this.log(`Using ${model} model for transcription`, 'info');

      const results = [];
      let processed = 0;
      let failed = 0;

      for (let i = 0; i < videoFiles.length; i++) {
        if (!this.isTranscribing) {
          this.log('Processing stopped by user', 'warning');
          break;
        }

        const videoFile = videoFiles[i];
        const videoPath = path.join(folderPath, videoFile);

        try {
          this.log(`[${i + 1}/${videoFiles.length}] Processing: ${videoFile}`, 'info');

          const transcriptPath = await this.processVideo(videoPath, folderPath, model);
          results.push({ file: videoFile, transcriptPath, success: true });
          processed++;
        } catch (error) {
          this.log(`Failed to process ${videoFile}: ${error.message}`, 'error');
          results.push({ file: videoFile, error: error.message, success: false });
          failed++;
        }
      }

      this.log(`Batch complete: ${processed} processed, ${failed} failed`, 'success');
      return { processed, failed, results };
    } catch (error) {
      this.log(`Folder processing error: ${error.message}`, 'error');
      throw error;
    }
  }

  stop() {
    this.isTranscribing = false;
    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGTERM');
      } catch (_e) {
        // ignore
      }
      this.currentProcess = null;
    }
  }
}

module.exports = SelfContainedTranscriber;
module.exports.SelfContainedTranscriber = SelfContainedTranscriber;
module.exports.resolveBinary = resolveBinary;
module.exports.resolveFfmpeg = resolveFfmpeg;
module.exports.resolveWhisperCli = resolveWhisperCli;
module.exports.resolveModelPath = resolveModelPath;
module.exports.WHISPER_MODELS = WHISPER_MODELS;
