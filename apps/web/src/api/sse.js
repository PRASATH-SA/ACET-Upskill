/**
 * Server-Sent Events over fetch (A.3 streaming). EventSource can't send an Authorization
 * header or a POST body, so this reads the `text/event-stream` body directly.
 * Used by the tutor (POST /ai/tutor/ask) and AI job progress (GET /ai/jobs/:id/events).
 */
import { API_BASE, ApiError, getAccessToken, refreshSession } from './client';

/** Splits an SSE byte stream into { event, data } messages. Exported for tests. */
export function createSseParser(onMessage) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      let event = 'message';
      const data = [];
      for (const line of part.split(/\r?\n/)) {
        if (line.startsWith(':')) continue; // comment / keep-alive
        const idx = line.indexOf(':');
        const field = idx === -1 ? line : line.slice(0, idx);
        const value = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '');
        if (field === 'event') event = value;
        else if (field === 'data') data.push(value);
      }
      if (!data.length) continue;
      const raw = data.join('\n');
      let parsed = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Plain-text data stays a string.
      }
      onMessage({ event, data: parsed });
    }
  };
}

/**
 * Opens an SSE stream and calls `onEvent({ event, data })` per message until it ends.
 * Resolves when the server closes the stream; rejects with ApiError on an HTTP error.
 * @param {string} path
 * @param {{ method?: string, body?: unknown, onEvent: (m: {event: string, data: any}) => void, signal?: AbortSignal }} opts
 */
export async function streamSse(path, { method = 'GET', body, onEvent, signal }) {
  const open = () =>
    fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'text/event-stream',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await open();
  if (res.status === 401 && (await refreshSession())) res = await open();
  if (!res.ok) {
    let err = {};
    try {
      err = (await res.json()).error ?? {};
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(
      res.status,
      err.code ?? 'INTERNAL',
      err.message ?? `HTTP ${res.status}`,
      err.details,
    );
  }

  const parse = createSseParser(onEvent);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parse(decoder.decode(value, { stream: true }));
  }
  parse('\n\n');
}
