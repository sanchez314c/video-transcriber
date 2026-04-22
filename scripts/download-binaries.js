#!/usr/bin/env node
// Downloads yt-dlp binary for the current platform into resources/binaries/<platform>/.
// Runs automatically on `npm install` via the postinstall script.
// Idempotent: skips download if binary already exists and is executable.

const fs = require('fs');
const path = require('path');
const https = require('https');

const PLATFORM = process.platform;
const BINARIES = {
  linux: {
    dir: 'linux',
    name: 'yt-dlp',
    url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
  },
  darwin: {
    dir: 'macos',
    name: 'yt-dlp',
    url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
  },
  win32: {
    dir: 'win',
    name: 'yt-dlp.exe',
    url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  },
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'video-transcriber-installer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  const spec = BINARIES[PLATFORM];
  if (!spec) {
    console.warn('[download-binaries] Unsupported platform:', PLATFORM, '— skipping yt-dlp fetch');
    return;
  }

  const binDir = path.join(__dirname, '..', 'resources', 'binaries', spec.dir);
  const binPath = path.join(binDir, spec.name);

  fs.mkdirSync(binDir, { recursive: true });

  if (fs.existsSync(binPath)) {
    const stats = fs.statSync(binPath);
    if (stats.size > 1_000_000) {
      console.log('[download-binaries] yt-dlp already present at', binPath, '— skipping');
      return;
    }
  }

  console.log('[download-binaries] downloading yt-dlp for', PLATFORM, '→', binPath);
  try {
    await download(spec.url, binPath);
    if (PLATFORM !== 'win32') {
      fs.chmodSync(binPath, 0o755);
    }
    console.log('[download-binaries] yt-dlp installed:', binPath);
  } catch (err) {
    console.warn('[download-binaries] download failed:', err.message);
    console.warn('[download-binaries] app will fall back to system PATH lookup at runtime');
  }
}

main();
