# Implementation Plan & Feature Backlog

## Current State (as of 2026-03-14)

The app is fully functional at the UI and workflow layer. The window, folder selection, file scanning, model dropdown, progress reporting, log panel, and batch orchestration all work.

The transcription backend is currently **simulated**:
- `self-contained-transcriber.js` creates a dummy WAV header instead of extracting real audio
- Transcription returns placeholder text after a timed progress simulation
- The dependency check always reports all dependencies as available

The app accurately represents the complete workflow — it just needs the real transcription engine swapped in.

---

## Priority 1: Real Transcription Backend

The design intent is a fully self-contained app — no user-installed Python required. Two viable paths:

### Option A: Bundled Native Binaries (recommended)

Bundle pre-compiled FFmpeg and Whisper.cpp binaries per platform in the `binaries/` folder.

```
binaries/
├── mac/
│   ├── ffmpeg
│   └── whisper
├── win/
│   ├── ffmpeg.exe
│   └── whisper.exe
└── linux/
    ├── ffmpeg
    └── whisper
```

In `self-contained-transcriber.js`, replace the `setTimeout` stubs with real `child_process.spawn` calls:

```js
const platform = process.platform;
const ext = platform === 'win32' ? '.exe' : '';
const ffmpegPath = path.join(__dirname, '..', 'binaries', platform, `ffmpeg${ext}`);
const whisperPath = path.join(__dirname, '..', 'binaries', platform, `whisper${ext}`);
```

Call FFmpeg to extract 16kHz mono WAV, then call Whisper with the model flag and parse stdout for the transcript.

### Option B: WebAssembly (transcription-engine.js path)

`transcription-engine.js` already loads FFmpeg as WASM via `@ffmpeg/ffmpeg`. The transcription stub there could be replaced with a WASM build of Whisper.cpp.

Resources:
- whisper.cpp WASM build: https://github.com/ggerganov/whisper.cpp
- whisper-node: https://github.com/ariym/whisper-node (wraps whisper.cpp binaries for Node)

### Option C: System Python + Whisper (simplest)

Keep the self-contained approach aside and just call the user's system Python:

```js
spawn('python3', ['-m', 'whisper', audioPath, '--model', model, '--output_format', 'txt'])
```

Dependency check would then actually verify `python3 -c "import whisper"` and `ffmpeg --version`.

---

## Priority 2: Real Dependency Checking

The `checkDependencies()` method in `self-contained-transcriber.js` currently hardcodes `true` for everything. Once a real backend is chosen:

For native binary path: check that the bundled binaries exist and are executable.
For Python path: actually spawn the checks and report what's missing.

The UI already handles the missing-dependency state correctly — it shows a red dot and lists missing items. Just need real data flowing in.

---

## Priority 3: Output Format Options

Currently transcripts save as `.txt` only. Whisper natively supports multiple formats. Add a format selector to the UI:

- TXT (plain text)
- SRT (subtitles with timestamps)
- VTT (WebVTT)
- JSON (full Whisper output with word timestamps)

Pass the chosen format as part of `options` in `start-transcription`.

---

## Priority 4: Language Selection

Whisper supports `--language` flag to skip auto-detection and run faster. Add a language dropdown next to the model selector. Default to `auto`.

---

## Priority 5: Per-File Progress

The current progress bar tracks files-complete-of-total at the folder level. A secondary progress indicator showing within-file Whisper progress would improve UX for large files. Whisper.cpp outputs timestamps to stderr that can be parsed.

---

## Priority 6: Drag and Drop

The UI doesn't currently support drag-and-drop folder input. The renderer could listen for `dragover` and `drop` events on the folder input area and call `electronAPI.scanFolder()` with the dropped path.

---

## Known Issues

- `transcription-engine.js` is imported nowhere — it exists as an alternate engine design but is not wired up. Either wire it in or document it clearly as a future integration point.
- The `set-theme` and `get-theme` IPC handlers are exposed in `preload.js` but not registered in `main.js`. Theme is permanently dark (Neo-Noir), so this is benign, but the unused handlers should be cleaned up.
- README references `build-release-run.sh` which does not exist in the repo. Should be removed or replaced with the actual run scripts.
- Electron version in `package.json` is `^28.0.0` but the README badge says `39.0.0`. Badge is wrong — the actual installed version is 28.
