// URL-based transcription pipeline.
// Flow: validate URL → try yt-dlp captions → fall back to download audio + Whisper.
// Reuses src/self-contained-transcriber.js for the Whisper fallback path.

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { parseVtt, parseSrt, reflowToParagraphs, formatAsMarkdown } = require('./transcript-formatter');

const PLATFORM_PATTERNS = [
  { id: 'youtube', name: 'YouTube', pattern: /(?:youtube\.com|youtu\.be)/i },
  { id: 'tiktok', name: 'TikTok', pattern: /tiktok\.com/i },
  { id: 'x', name: 'X', pattern: /(?:twitter\.com|x\.com)/i },
  { id: 'instagram', name: 'Instagram', pattern: /instagram\.com/i },
  { id: 'vimeo', name: 'Vimeo', pattern: /vimeo\.com/i },
  { id: 'facebook', name: 'Facebook', pattern: /facebook\.com|fb\.watch/i },
  { id: 'twitch', name: 'Twitch', pattern: /twitch\.tv/i },
  { id: 'reddit', name: 'Reddit', pattern: /reddit\.com/i },
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc|^fd/i,
  /^localhost$/i,
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) return { id: p.id, name: p.name };
  }
  return { id: 'other', name: 'Other' };
}

function validateUrl(url) {
  if (typeof url !== 'string') throw new Error('URL must be a string');
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    throw new Error('Malformed URL', { cause: err });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Rejected protocol: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname.toLowerCase();
  for (const pat of PRIVATE_IP_PATTERNS) {
    if (pat.test(hostname)) throw new Error(`Rejected private/local host: ${hostname}`);
  }
  return { url, hostname, platform: detectPlatform(url) };
}

function resolveYtDlp(appRoot) {
  const platformDir = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'win' : 'linux';
  const exe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const candidates = [
    path.join(appRoot, 'resources', 'binaries', platformDir, exe),
    path.join(process.resourcesPath || '', 'binaries', platformDir, exe),
    path.join(os.homedir(), '.local', 'bin', 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch (_e) {
      // ignore
    }
  }
  return exe;
}

function spawnYtDlp(ytDlpPath, args, { log } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytDlpPath, args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (log) {
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          const m = line.match(/(\d+\.?\d*)%/);
          if (m) log(`yt-dlp: ${m[1]}%`, 'info');
        }
      }
    });
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn failed: ${err.message}`)));
    proc.on('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`yt-dlp exited ${code}: ${stderr.split('\n').slice(-5).join(' ')}`));
    });
  });
}

async function fetchMetadata(url, { appRoot, log } = {}) {
  const ytDlpPath = resolveYtDlp(appRoot);
  const args = [
    url,
    '--dump-json',
    '--skip-download',
    '--no-playlist',
    '--no-warnings',
  ];
  const { stdout } = await spawnYtDlp(ytDlpPath, args, { log });
  try {
    const data = JSON.parse(stdout.trim().split('\n').pop());
    return {
      id: data.id,
      title: data.title || data.id,
      uploader: data.uploader || data.channel || data.creator || '',
      description: (data.description || '').slice(0, 1000),
      duration: data.duration || 0,
      thumbnail: data.thumbnail || null,
      webpage_url: data.webpage_url || url,
      ext: data.ext,
      subtitles: data.subtitles || {},
      automatic_captions: data.automatic_captions || {},
      original_url: url,
    };
  } catch (err) {
    throw new Error(`Failed to parse yt-dlp metadata: ${err.message}`, { cause: err });
  }
}

async function downloadCaptions(url, workDir, { appRoot, log, language = 'en' } = {}) {
  const ytDlpPath = resolveYtDlp(appRoot);
  const args = [
    url,
    '--write-subs',
    '--write-auto-subs',
    '--sub-langs', language,
    '--sub-format', 'vtt/srt/best',
    '--skip-download',
    '--no-playlist',
    '--no-warnings',
    '-o', path.join(workDir, '%(id)s.%(ext)s'),
  ];
  await spawnYtDlp(ytDlpPath, args, { log });

  const files = await fs.readdir(workDir);
  const vttFile = files.find((f) => f.endsWith('.vtt'));
  const srtFile = files.find((f) => f.endsWith('.srt'));
  if (vttFile) {
    const content = await fs.readFile(path.join(workDir, vttFile), 'utf8');
    return { format: 'vtt', content, language: language };
  }
  if (srtFile) {
    const content = await fs.readFile(path.join(workDir, srtFile), 'utf8');
    return { format: 'srt', content, language: language };
  }
  return null;
}

async function downloadAudio(url, workDir, { appRoot, log } = {}) {
  const ytDlpPath = resolveYtDlp(appRoot);
  const outputTemplate = path.join(workDir, '%(id)s.%(ext)s');
  const args = [
    url,
    '-x',
    '--audio-format', 'wav',
    '--audio-quality', '0',
    '--postprocessor-args', 'ffmpeg:-ar 16000 -ac 1',
    '--no-playlist',
    '--no-warnings',
    '-o', outputTemplate,
  ];
  await spawnYtDlp(ytDlpPath, args, { log });

  const files = await fs.readdir(workDir);
  const wavFile = files.find((f) => f.endsWith('.wav'));
  if (!wavFile) throw new Error('yt-dlp audio extraction produced no .wav file');
  return path.join(workDir, wavFile);
}

class UrlTranscriber {
  constructor(options = {}) {
    this.appRoot = options.appRoot || process.cwd();
    this.whisperTranscriber = options.whisperTranscriber || null;
    this.onProgress = null;
    this.currentId = null;
  }

  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  log(message, type = 'info', id = this.currentId) {
    if (this.onProgress) this.onProgress({ type, message, id });
  }

  async validateUrl(url) {
    const check = validateUrl(url);
    try {
      const meta = await fetchMetadata(url, { appRoot: this.appRoot });
      return {
        ...check,
        metadata: {
          id: meta.id,
          title: meta.title,
          uploader: meta.uploader,
          duration: meta.duration,
          thumbnail: meta.thumbnail,
          hasSubtitles: Object.keys(meta.subtitles).length > 0,
          hasAutoCaptions: Object.keys(meta.automatic_captions).length > 0,
          webpage_url: meta.webpage_url,
        },
      };
    } catch (err) {
      return { ...check, metadata: null, metadataError: err.message };
    }
  }

  async processUrl(url, outputDir, { id, model = 'base', language = 'en' } = {}) {
    this.currentId = id || `url_${crypto.randomBytes(4).toString('hex')}`;
    validateUrl(url);

    const suffix = crypto.randomBytes(6).toString('hex');
    const workDir = path.join(os.tmpdir(), `vt_url_${suffix}`);
    await fs.ensureDir(workDir);

    try {
      this.log(`Fetching metadata…`, 'info');
      const meta = await fetchMetadata(url, { appRoot: this.appRoot, log: (m, t) => this.log(m, t) });
      const platform = detectPlatform(url);
      const safeName = (meta.title || meta.id || 'transcript').replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 120);
      const transcriptPath = path.join(outputDir, `${safeName}.md`);

      // Attempt captions first
      let captionType = 'captions';
      let body = '';
      let cues = null;
      this.log(`Attempting caption download (${platform.name})…`, 'info');
      try {
        const captions = await downloadCaptions(url, workDir, {
          appRoot: this.appRoot,
          log: (m, t) => this.log(m, t),
          language,
        });
        if (captions) {
          cues = captions.format === 'vtt' ? parseVtt(captions.content) : parseSrt(captions.content);
          if (cues.length > 0) {
            body = reflowToParagraphs(cues);
            this.log(`Captions found (${cues.length} cues) — using them.`, 'success');
          } else {
            this.log('Captions downloaded but parsed empty — falling back to Whisper', 'warning');
          }
        } else {
          this.log('No captions available — falling back to Whisper', 'warning');
        }
      } catch (err) {
        this.log(`Caption download failed: ${err.message} — falling back to Whisper`, 'warning');
      }

      // Whisper fallback
      if (!body) {
        if (!this.whisperTranscriber) {
          throw new Error('Whisper transcriber unavailable — cannot fall back');
        }
        captionType = `whisper-${model}`;
        this.log(`Downloading audio for Whisper transcription…`, 'info');
        const audioPath = await downloadAudio(url, workDir, {
          appRoot: this.appRoot,
          log: (m, t) => this.log(m, t),
        });

        this.log(`Running Whisper on downloaded audio…`, 'info');
        const whisperVtt = await this.whisperTranscriber.transcribeAudio(audioPath, model);
        const whisperCues = parseVtt(whisperVtt);
        if (whisperCues.length === 0) {
          throw new Error('Whisper produced empty output');
        }
        cues = whisperCues;
        body = reflowToParagraphs(whisperCues);
      }

      const markdown = formatAsMarkdown(body, {
        title: meta.title,
        sourceUrl: url,
        platform: platform.id,
        author: meta.uploader,
        durationSeconds: meta.duration || (cues && cues.length ? Math.round(cues[cues.length - 1].end) : 0),
        language,
        captionType,
      });

      await fs.writeFile(transcriptPath, markdown, 'utf8');
      this.log(`Transcript saved: ${path.basename(transcriptPath)}`, 'success');

      return {
        success: true,
        transcriptPath,
        transcript: markdown,
        metadata: {
          id: meta.id,
          title: meta.title,
          uploader: meta.uploader,
          duration: meta.duration,
          thumbnail: meta.thumbnail,
          platform: platform.id,
          captionType,
          sourceUrl: url,
          wordCount: body.split(/\s+/).filter(Boolean).length,
        },
      };
    } finally {
      try {
        await fs.remove(workDir);
      } catch (_cleanup) {
        // ignore
      }
      this.currentId = null;
    }
  }
}

module.exports = UrlTranscriber;
module.exports.UrlTranscriber = UrlTranscriber;
module.exports.validateUrl = validateUrl;
module.exports.detectPlatform = detectPlatform;
module.exports.resolveYtDlp = resolveYtDlp;
module.exports.PLATFORM_PATTERNS = PLATFORM_PATTERNS;
