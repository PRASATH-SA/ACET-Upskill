/**
 * Speech-to-text through the AI gateway (A.7.1): the only code that talks to a speech model.
 * Voice answers are student data, so they go only to a LOCAL Whisper server (A.7.9), never a
 * cloud API. Any server with the OpenAI-compatible POST /v1/audio/transcriptions works
 * (whisper.cpp server, faster-whisper-server / speaches, LocalAI).
 *
 * STT_PROVIDER=none (the default) turns voice off; text answers keep working.
 */
import { env } from '../../config/env.js';
import { logger as rootLogger } from '../../lib/logger.js';
import { AIOfflineError, AIProviderError } from './errors.js';
import { createResilience } from './resilience.js';

export class MockSpeechProvider {
  constructor() {
    this.name = 'mock';
    this.offline = false;
    /** The transcript returned for every recording; tests set it. */
    this.transcript =
      'Normalization splits a big table into smaller tables so each fact is stored once.';
    this.calls = [];
  }

  async transcribe(req) {
    if (this.offline) {
      const err = new TypeError('fetch failed');
      err.cause = { code: 'ECONNREFUSED' };
      throw err;
    }
    this.calls.push({ size: req.buffer.length, mimeType: req.mimeType });
    return { text: this.transcript, model: req.model };
  }

  async ping() {
    if (this.offline) throw new TypeError('fetch failed');
  }
}

export class OpenAICompatibleSpeechProvider {
  constructor({ baseUrl, fetchImpl = fetch }) {
    this.name = 'openai-compatible';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetch = fetchImpl;
  }

  async transcribe({ buffer, mimeType, model, language, signal }) {
    const form = new FormData();
    const ext = mimeType?.split('/')[1]?.split(';')[0] ?? 'webm';
    form.set('file', new Blob([buffer], { type: mimeType }), `answer.${ext}`);
    form.set('model', model);
    form.set('language', language);
    form.set('response_format', 'json');
    form.set('temperature', '0');
    const res = await this.fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AIProviderError(
        res.status,
        `Speech server responded ${res.status}: ${text.slice(0, 300)}`,
      );
    }
    const data = await res.json();
    return { text: String(data.text ?? '').trim(), model };
  }

  /** Any HTTP answer means the server is up (servers differ in which paths they expose). */
  async ping({ signal }) {
    await this.fetch(this.baseUrl, { method: 'GET', signal });
  }
}

/**
 * @param {{ provider: object|null, model: string, language: string, timeoutMs: number, logger?: object }} deps
 */
export function createSpeech({ provider, model, language, timeoutMs, logger = rootLogger }) {
  const res = createResilience({ concurrency: 1, timeoutMs, retries: 1 });
  const log = logger.child({ component: 'ai-speech' });
  const enabled = Boolean(provider);

  /**
   * @param {{ buffer: Buffer, mimeType: string, signal?: AbortSignal }} input
   * @returns {Promise<{ text: string, model: string, latencyMs: number }>}
   */
  async function transcribe({ buffer, mimeType, signal }) {
    if (!enabled) throw new AIOfflineError('Voice answers are not set up on this server');
    const started = Date.now();
    try {
      const out = await res.run(
        (s) => provider.transcribe({ buffer, mimeType, model, language, signal: s }),
        { signal },
      );
      // Never log the transcript: it is student data (A.7.10).
      log.info(
        {
          task: 'stt',
          model,
          bytes: buffer.length,
          chars: out.text.length,
          latencyMs: Date.now() - started,
        },
        'stt transcribe',
      );
      return { ...out, latencyMs: Date.now() - started };
    } catch (err) {
      log.warn(
        { task: 'stt', model, latencyMs: Date.now() - started, err: err.message },
        'stt failed',
      );
      throw err;
    }
  }

  async function health() {
    const base = { enabled, provider: provider?.name ?? 'none', model: enabled ? model : null };
    if (!enabled) return { ...base, reachable: false };
    try {
      await provider.ping({ signal: AbortSignal.timeout(Math.min(timeoutMs, 3000)) });
      return { ...base, reachable: true };
    } catch (err) {
      return { ...base, reachable: false, error: err.message };
    }
  }

  return { enabled, provider, transcribe, health, breaker: res.breaker };
}

export function createSpeechProvider(cfg) {
  switch (cfg.STT_PROVIDER) {
    case 'openai-compatible':
      return new OpenAICompatibleSpeechProvider({ baseUrl: cfg.STT_BASE_URL });
    case 'mock':
      return new MockSpeechProvider();
    default:
      return null;
  }
}

let current;

/** The process-wide speech gateway, built from env on first use. */
export function speech() {
  if (!current) {
    const cfg = env();
    current = createSpeech({
      provider: createSpeechProvider(cfg),
      model: cfg.STT_MODEL,
      language: cfg.STT_LANGUAGE,
      timeoutMs: cfg.STT_TIMEOUT_MS,
    });
  }
  return current;
}

/** Test helper: replace (or reset with undefined) the speech gateway. */
export function setSpeech(s) {
  current = s;
}
