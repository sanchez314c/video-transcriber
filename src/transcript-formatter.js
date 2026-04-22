// Transcript formatter: VTT/SRT cue lists → human-readable paragraphed text + markdown.
// Pure functions, no I/O. Used by src/url-transcriber.js.

const SENTENCE_PUNCT = /([.!?])\s+(?=[A-Z"'(])/g;
const STYLE_TAG = /<[^>]+>/g;
const TIMESTAMP_INLINE = /<\d{2}:\d{2}:\d{2}\.\d{3}>/g;

// Parse VTT (WebVTT) text into cue array: [{start, end, text}].
// Accepts both with and without WEBVTT header, handles NOTE blocks.
function parseVtt(vttText) {
  const cues = [];
  if (!vttText || typeof vttText !== 'string') return cues;

  const lines = vttText.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  // Skip header and NOTE blocks
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === 'WEBVTT' || line.startsWith('WEBVTT ')) {
      i++;
      continue;
    }
    if (line === 'NOTE' || line.startsWith('NOTE ')) {
      while (i < lines.length && lines[i].trim() !== '') i++;
      continue;
    }
    if (line === '') {
      i++;
      continue;
    }
    break;
  }

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length) break;

    // Optional cue identifier line (skip if it's not a timestamp)
    if (!lines[i].includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) {
      i++;
    }

    const timingLine = lines[i];
    if (!timingLine || !timingLine.includes('-->')) {
      i++;
      continue;
    }
    const timingMatch = timingLine.match(
      /^\s*(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{1,2}:\d{2}\.\d{3})/,
    );
    if (!timingMatch) {
      i++;
      continue;
    }
    const start = vttTimeToSeconds(timingMatch[1]);
    const end = vttTimeToSeconds(timingMatch[2]);
    i++;

    const textLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }
    const text = textLines.join(' ').replace(TIMESTAMP_INLINE, '').replace(STYLE_TAG, '').trim();
    if (text) cues.push({ start, end, text });
  }

  return cues;
}

function vttTimeToSeconds(t) {
  const parts = t.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  }
  return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
}

// Parse SRT into same cue shape.
function parseSrt(srtText) {
  const cues = [];
  if (!srtText || typeof srtText !== 'string') return cues;

  const blocks = srtText.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length < 2) continue;

    let timingIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) timingIdx = 1;
    const timing = lines[timingIdx];
    if (!timing || !timing.includes('-->')) continue;

    const m = timing.match(
      /^(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/,
    );
    if (!m) continue;

    const start = srtTimeToSeconds(m[1]);
    const end = srtTimeToSeconds(m[2]);
    const text = lines
      .slice(timingIdx + 1)
      .join(' ')
      .replace(STYLE_TAG, '')
      .trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

function srtTimeToSeconds(t) {
  const norm = t.replace(',', '.');
  const parts = norm.split(':');
  return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
}

// De-duplicate overlapping cues (YouTube auto-captions repeat lines for scrolling effect).
// Keeps the longest variant at each timestamp range.
function dedupeCues(cues) {
  if (cues.length === 0) return cues;
  const out = [cues[0]];
  for (let i = 1; i < cues.length; i++) {
    const prev = out[out.length - 1];
    const curr = cues[i];
    if (curr.text.startsWith(prev.text) && curr.start < prev.end + 0.2) {
      out[out.length - 1] = curr;
      continue;
    }
    if (prev.text.endsWith(curr.text) && curr.start < prev.end + 0.2) {
      continue;
    }
    out.push(curr);
  }
  return out;
}

// Join cue texts, split into sentences, group into paragraphs of ~4 sentences.
function reflowToParagraphs(cues, options = {}) {
  const sentencesPerParagraph = options.sentencesPerParagraph || 4;
  const clean = dedupeCues(cues);
  const joined = clean
    .map((c) => c.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!joined) return '';

  const withBreaks = joined.replace(SENTENCE_PUNCT, '$1\n');
  const sentences = withBreaks
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(i, i + sentencesPerParagraph).join(' '));
  }
  return paragraphs.join('\n\n');
}

// Build a markdown document with YAML frontmatter + reflowed body.
function formatAsMarkdown(text, metadata = {}) {
  const fm = {
    source_url: metadata.sourceUrl || '',
    platform: metadata.platform || 'unknown',
    title: metadata.title || 'Untitled',
    author: metadata.author || 'Unknown',
    duration_seconds: metadata.durationSeconds || 0,
    captured_at: metadata.capturedAt || new Date().toISOString(),
    source_language: metadata.language || 'en',
    caption_type: metadata.captionType || 'unknown',
    word_count: text.split(/\s+/).filter(Boolean).length,
  };

  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${typeof v === 'string' && (v.includes(':') || v.includes('#')) ? JSON.stringify(v) : v}`)
    .join('\n');

  return `---\n${yaml}\n---\n\n# ${fm.title}\n\n${text}\n`;
}

module.exports = {
  parseVtt,
  parseSrt,
  dedupeCues,
  reflowToParagraphs,
  formatAsMarkdown,
  vttTimeToSeconds,
  srtTimeToSeconds,
};
