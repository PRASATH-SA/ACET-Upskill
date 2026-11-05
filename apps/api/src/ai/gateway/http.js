import { AIProviderError } from './errors.js';

/** POST/GET JSON to a provider. Non-2xx responses become AIProviderError with the body text. */
export async function requestJson(fetchImpl, url, { method = 'POST', body, signal, headers } = {}) {
  const res = await fetchImpl(url, {
    method,
    signal,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AIProviderError(
      res.status,
      `Model server responded ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return res.json();
}

/** Reads a streamed body line by line (NDJSON or SSE). */
export async function* readLines(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) yield line;
  }
  if (buffer.trim()) yield buffer;
}

export async function openStream(fetchImpl, url, { body, signal, headers } = {}) {
  const res = await fetchImpl(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AIProviderError(
      res.status,
      `Model server responded ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return res;
}
