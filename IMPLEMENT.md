# IMPLEMENT — URL-to-Transcript Feature

**Created**: 2026-04-21
**Feature**: Paste URLs (X/TikTok/Instagram/YouTube/Vimeo/etc.) → yt-dlp downloads → extract captions (primary) or transcribe audio (fallback) → format as human-readable markdown → show + export in Neo-Noir queue UI.
**Scope**: Complete subtitle-first path this session. Audio-download + whisper fallback wired as interface stub (real whisper integration flagged for later — requires model + binary + GPL consideration).

---

## Architecture

### Runtime strategy

**Binary resolution order** (graceful degradation):
1. Bundled binary at `resources/binaries/<platform>/yt-dlp[.exe]` — shipped with app
2. System `PATH` lookup via `which yt-dlp` — power-user convenience
3. Error → UI shows "yt-dlp not found. Reinstall or place binary at ~/.local/bin/yt-dlp"

Same pattern for `ffmpeg`. For Linux dev session, PATH fallback fine. For distribution, bundled binary required.

### Transcript source priority

1. **Platform captions** — `yt-dlp --write-auto-subs --write-subs --sub-langs en --sub-format vtt/srt --skip-download`. Fast, free, often accurate. Works for ~70% of URLs (especially YouTube creator captions, auto-captions on recent uploads).
2. **Whisper fallback** — if no captions: `yt-dlp -x --audio-format wav -o <tmp>/%(id)s.%(ext)s <url>` → feed wav to transcriber. Today: stubbed interface that returns "real whisper binary not bundled — captions-only mode". User plugs in whisper.cpp later by editing `transcribeAudioFile()` at the documented hook point.

### Formatter pipeline (VTT/SRT → markdown)

Input: VTT or SRT cue list with timestamps.
Steps:
1. Strip timestamps, cue numbers, styling tags (`<c.colorXXX>`, `<i>`, etc.)
2. Deduplicate overlapping cues (yt-dlp auto-captions repeat lines for scroll effect)
3. Rejoin adjacent cues separated by whitespace only
4. Sentence-segment via regex: split on `[.!?]\s+` followed by capital
5. Paragraph breaks: every 4 sentences OR on explicit `\n\n` in source
6. Emit as markdown with YAML frontmatter: `source_url`, `platform`, `title`, `author`, `duration_seconds`, `captured_at`, `word_count`, `source_language`, `caption_type` (manual/auto/whisper)

### New IPC contract (grows from 11 to 14 wires)

| Channel | Type | Direction | Purpose |
|---------|------|-----------|---------|
| `validate-url` | invoke | renderer → main | Accept URL, return platform + metadata preview (title/thumb/duration/author) via `yt-dlp --dump-json --skip-download` |
| `transcribe-url` | invoke | renderer → main | Accept `{url, id}`, run full pipeline, emit `transcription-progress` events with `id` tag, return `{success, transcriptPath, transcript}` |
| `export-transcript` | invoke | renderer → main | Accept `{content, filename, format}`, show save dialog, write file |

Existing `transcription-progress` event channel reused — payload gains optional `id` field to route progress to the right queue card.

---

## File Changes

### New files

**`resources/binaries/linux/yt-dlp`** — 2.3MB standalone Python binary, downloaded from github.com/yt-dlp/yt-dlp releases. Executable bit set. `.gitignore` updated to track binaries (override `*.bin` rule if present).

**`resources/binaries/macos/yt-dlp`** — same, macOS variant.

**`resources/binaries/win/yt-dlp.exe`** — same, Windows variant.

**`src/url-transcriber.js`** — new module. Exports `UrlTranscriber` class with methods:
- `async resolveBinary(name)` → path to yt-dlp/ffmpeg (bundled first, PATH fallback)
- `async validateUrl(url)` → metadata object
- `async downloadCaptions(url, tmpDir)` → path to .vtt or null
- `async downloadAudio(url, tmpDir)` → path to .wav or null
- `async transcribeAudioFile(wavPath)` → text string (STUB until whisper bundled)
- `async processUrl(url, outputDir, progressCallback)` → full pipeline orchestrator

**`src/transcript-formatter.js`** — new module. Exports:
- `parseVtt(vttText)` → `[{start, end, text}]` cue array
- `parseSrt(srtText)` → same shape
- `reflowToParagraphs(cues, options)` → clean text with paragraph breaks
- `formatAsMarkdown(text, metadata)` → markdown with YAML frontmatter

**`src/url-patterns.js`** — new module (or added to `src/constants.js`). Platform regex + display metadata:
```js
PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: '#ff0000', pattern: /youtube\.com|youtu\.be/ },
  { id: 'tiktok', name: 'TikTok', color: '#ff0050', pattern: /tiktok\.com/ },
  { id: 'x', name: 'X', color: '#ffffff', pattern: /(twitter\.com|x\.com)/ },
  { id: 'instagram', name: 'Instagram', color: '#e1306c', pattern: /instagram\.com/ },
  { id: 'vimeo', name: 'Vimeo', color: '#1ab7ea', pattern: /vimeo\.com/ },
  { id: 'unknown', name: 'Other', color: '#14b8a6', pattern: /./ }
]
```

### Modified files

**`src/main.js`** — Add 3 IPC handlers (`validate-url`, `transcribe-url`, `export-transcript`) with full input validation (URL format check, SSRF protection — must be http/https, no localhost/private IPs, no file://). Track per-URL transcription state in a `Map<id, abortController>` so `stop-transcription` can cancel individual URLs.

**`src/preload.js`** — Expose 3 new methods on `electronAPI`:
- `validateUrl(url)`
- `transcribeUrl(payload)`
- `exportTranscript(payload)`

**`src/renderer.js`** — Input mode toggle logic, URL textarea handling, queue card render function, platform detection, per-card state machine (queued → validating → downloading → transcribing → formatting → done/error), expand-preview handler, export-button handlers.

**`src/index.html`** — New markup:
- Mode toggle pills above existing folder input
- URL textarea (hidden by default, shown when mode=urls)
- "Add to Queue" button
- Queue container `<div id="url-queue">` for card rendering

**`src/styles.css`** — Neo-Noir styles for:
- `.mode-toggle` pill group with sliding indicator
- `.url-input-section` (hidden via `hidden` attribute or `.hidden` class)
- `.queue-card` — glass panel card row, 80px thumbnail, metadata stack, status chip, teal progress bar
- `.platform-chip` — circular monogram tag, colored per platform
- `.state-chip` — animated pulse on active state

**`src/constants.js`** — Add `URL_VALID_PROTOCOLS`, `SUPPORTED_PLATFORMS`, `TRANSCRIPT_EXPORT_FORMATS`.

**`package.json`** — Bump version `1.0.0` → `1.1.0`. Add electron-builder `extraResources` config to include `resources/binaries/<platform>/*` in packaged app.

### Doc updates

- `WIRE_AUDIT.md` — add 3 new channels, update count to 14
- `CHANGELOG.md` — `[1.1.0] - 2026-04-21 - Added URL-based transcription via yt-dlp`
- `PRD.md` — new feature section
- `README.md` — mention URL support in features list
- `CLAUDE.md` — update IPC channel list

---

## Security

- **URL validation**: whitelist protocols `http:` `https:` only. Reject `file:`, `javascript:`, `data:`, `ftp:`.
- **SSRF**: parse URL, reject private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, ::1, fc00::/7).
- **Command injection**: NEVER string-interpolate URL into shell. Use `child_process.spawn(binary, [flags, url])` with array args.
- **Temp dir**: use `crypto.randomBytes(6).toString('hex')` suffix like existing audio path pattern.
- **Output path**: confine to user-selected output dir OR show save dialog for each export; reject `..` traversal.
- **Binary execute**: verify SHA256 of bundled binary on first use (optional hardening, skip this session).

---

## Testing / Validation

1. `node -c` syntax check all new + modified JS files
2. `npx eslint src/` clean (0 errors)
3. Manual smoke test (User-run):
   - Launch app
   - Toggle to URL mode
   - Paste known YouTube URL with captions → verify queue card appears, metadata populates, captions download, transcript renders, export to markdown works
   - Paste URL without captions → verify fallback stub shows "captions-only mode" message cleanly
   - Paste malformed URL → verify rejection without crash
   - Toggle back to Folder mode → verify original flow still works (regression check)

---

## Execution Order

1. Download 3 platform binaries → resources/binaries/<platform>/ (parallel fetch)
2. Write `src/transcript-formatter.js` (pure functions, easiest to unit-test mentally)
3. Write `src/url-transcriber.js` (uses spawn, requires formatter)
4. Write `src/url-patterns.js` (or extend constants.js)
5. Update `src/main.js` — add 3 IPC handlers, wire URL pipeline
6. Update `src/preload.js` — expose 3 methods
7. Update `src/index.html` — mode toggle + URL section + queue container
8. Update `src/styles.css` — new component styles
9. Update `src/renderer.js` — mode toggle logic, queue rendering, per-card handlers
10. Update `src/constants.js` — new constants
11. Update `package.json` — version bump, extraResources
12. Syntax + ESLint validation
13. Update docs (PRD, CHANGELOG, WIRE_AUDIT, CLAUDE.md, README)
14. Kill old app PID 1331083, relaunch for User smoke test

---

## Known Tradeoffs / Future Work

- **Whisper integration deferred**: `transcribeAudioFile()` stubbed with clear hook point at the exact code location where `whisper.cpp` binary spawn call goes. Follow-up work: ship `whisper.cpp` binary + `ggml-base.en.bin` model (~141MB) per platform, update the stub to spawn it with `-m <model> -f <audio> --output-txt`.
- **Cookie bridge**: Private IG / age-gated X content requires auth cookies. Reuse Brave cookie bridge pattern documented in `~/.claude/projects/-home-heathen-admin/memory/reference_brave_cookie_bridge.md` — add toggle in UI "Use Brave cookies" → appends `--cookies-from-browser brave` to yt-dlp args. Not in this session.
- **Binary size**: Adding yt-dlp × 3 platforms = +7MB. Adding ffmpeg × 3 = +150MB. Adding whisper.cpp + model × 3 = +450MB. AppImage goes ~80MB → potentially 700MB fully-loaded. For this session: yt-dlp bundled, ffmpeg + whisper rely on PATH / stub.
- **Rate limits**: yt-dlp hits platform rate limits with enough requests. Not handling backoff this session — single-request flow, User controls pace.
- **ToS disclaimer**: Portfolio use, not commercial. Skip for now. If published, add modal on first URL use: "You are responsible for compliance with each platform's terms of service."

END OF LINE.
