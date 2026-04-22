// Streaming parsers: SSE (most providers), NDJSON (Ollama), Anthropic message format.

// SSE line parser — yields deltaText strings from OpenAI-compatible streams.
async function* parseSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line || !line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const delta =
          (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) ||
          (json.choices && json.choices[0] && json.choices[0].text) ||
          '';
        if (delta) yield delta;
      } catch (_err) {
        // malformed line — skip
      }
    }
  }
}

// Ollama NDJSON parser — one JSON object per line, field `message.content` carries delta.
async function* parseNDJSON(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        const delta = (json.message && json.message.content) || json.response || '';
        if (delta) yield delta;
        if (json.done) return;
      } catch (_err) {
        // skip
      }
    }
  }
}

// Anthropic message stream — events are SSE with `event: type\ndata: json\n\n` blocks.
// Extract content_block_delta.delta.text events.
async function* parseAnthropic(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      const trimmed = line.trim();
      if (!trimmed) {
        currentEvent = null;
        continue;
      }
      if (trimmed.startsWith('event:')) {
        currentEvent = trimmed.slice(6).trim();
        continue;
      }
      if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();
        if (currentEvent === 'content_block_delta') {
          try {
            const json = JSON.parse(payload);
            if (json.delta && json.delta.type === 'text_delta' && json.delta.text) {
              yield json.delta.text;
            }
          } catch (_err) {
            // skip
          }
        } else if (currentEvent === 'message_stop') {
          return;
        }
      }
    }
  }
}

function parserForFormat(format) {
  if (format === 'ndjson') return parseNDJSON;
  if (format === 'anthropic') return parseAnthropic;
  return parseSSE;
}

module.exports = {
  parseSSE,
  parseNDJSON,
  parseAnthropic,
  parserForFormat,
};
