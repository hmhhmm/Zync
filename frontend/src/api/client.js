/**
 * Zync backend client.
 *
 * Speaks the real FastAPI backend at /api/*. The dev server proxies /api to
 * http://localhost:8000 (see vite.config.js); in production, set
 * VITE_API_BASE_URL to the deployed backend origin.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Simple health check. Returns `{ status, service }` on success, null on failure.
 */
export async function checkHealth(signal) {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Upload a geological survey PDF. Returns the extracted deposit params or
 * throws on failure.
 */
export async function uploadGeologicalPdf(file, { signal } = {}) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload/pdf`, {
    method: 'POST',
    body: form,
    signal,
  });
  if (!res.ok) {
    const detail = await safeErrorDetail(res);
    throw new Error(detail || `PDF upload failed (${res.status})`);
  }
  return res.json();
}

/**
 * Run the known-answer validation suite.
 * @param {string[]|null} testIds - null runs all 5 tests
 */
export async function runValidation(testIds = null, { signal } = {}) {
  const res = await fetch(`${API_BASE}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_ids: testIds }),
    signal,
  });
  if (!res.ok) {
    const detail = await safeErrorDetail(res);
    throw new Error(detail || `Validation failed (${res.status})`);
  }
  return res.json();
}

/**
 * Run the 6-agent pipeline. Streams Server-Sent Events and invokes onEvent
 * for every parsed event object. Returns a promise that resolves once the
 * stream completes or [DONE] is received.
 *
 * @param {Object} body - PipelineRequest shape
 *   { deposit_profile: {...}, operator_name?: string, site_conditions?: object }
 * @param {Object} opts
 * @param {(event: object) => void} opts.onEvent - called per SSE frame
 * @param {AbortSignal} [opts.signal]
 */
export async function runPipeline(body, { onEvent, signal } = {}) {
  const res = await fetch(`${API_BASE}/api/pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = await safeErrorDetail(res);
    throw new Error(detail || `Pipeline request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
      if (payload === '[DONE]') return;

      try {
        const event = JSON.parse(payload);
        onEvent?.(event);
      } catch {
        // Ignore non-JSON heartbeats
      }
    }
  }
}

async function safeErrorDetail(res) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || null;
  } catch {
    return null;
  }
}
