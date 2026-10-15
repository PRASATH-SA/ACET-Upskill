import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiEnvSchema } from '../../config/env.js';
import { PromptRegistry, parseFrontMatter, renderTemplate } from '../prompts.js';
import { AIOfflineError, AIValidationError } from './errors.js';
import { createGateway, createProvider, parseJsonReply } from './index.js';
import { MockProvider, fakeEmbedding, sampleFromSchema } from './providers/mock.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAICompatibleProvider } from './providers/openaiCompatible.js';
import { CircuitBreaker, createResilience } from './resilience.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) =>
  readFileSync(path.resolve(here, '../../../test/fixtures/llm', name), 'utf8');
const quietLogger = { child: () => quietLogger, info: () => {}, warn: () => {} };

/** A fetch double that records requests and replays one recorded response per call. */
function recordedFetch(...bodies) {
  const calls = [];
  const fn = vi.fn(async (url, init) => {
    calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(init.body) : undefined });
    const body = bodies[Math.min(calls.length - 1, bodies.length - 1)];
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  });
  fn.calls = calls;
  return fn;
}

describe('OllamaProvider contract (recorded fixtures)', () => {
  it('chat sends /api/chat with the JSON schema as `format` and parses usage', async () => {
    const f = recordedFetch(fixture('ollama-chat.json'));
    const p = new OllamaProvider({ baseUrl: 'http://ollama:11434/', fetchImpl: f });
    const schema = { type: 'object', properties: { text: { type: 'string' } } };
    const out = await p.chat({
      model: 'qwen2.5:7b-instruct',
      messages: [{ role: 'user', content: 'hi' }],
      schema,
      temperature: 0.2,
      maxTokens: 300,
    });
    expect(f.calls[0].url).toBe('http://ollama:11434/api/chat');
    expect(f.calls[0].body).toMatchObject({
      model: 'qwen2.5:7b-instruct',
      stream: false,
      format: schema,
      options: { temperature: 0.2, num_predict: 300 },
    });
    expect(JSON.parse(out.content)).toEqual({ text: 'Normalization removes redundancy.' });
    expect(out.usage).toEqual({ promptTokens: 182, completionTokens: 24 });
  });

  it('embed uses /api/embed with batched input; listModels reads /api/tags', async () => {
    const f = recordedFetch(fixture('ollama-embed.json'), fixture('ollama-tags.json'));
    const p = new OllamaProvider({ baseUrl: 'http://ollama:11434', fetchImpl: f });
    const e = await p.embed({ model: 'nomic-embed-text', texts: ['a', 'b'] });
    expect(f.calls[0]).toMatchObject({
      url: 'http://ollama:11434/api/embed',
      body: { model: 'nomic-embed-text', input: ['a', 'b'] },
    });
    expect(e.embeddings).toHaveLength(2);
    expect(await p.listModels()).toEqual(['qwen2.5:7b-instruct', 'nomic-embed-text:latest']);
    expect(f.calls[1]).toMatchObject({ url: 'http://ollama:11434/api/tags', method: 'GET' });
  });

  it('streams NDJSON tokens', async () => {
    const f = recordedFetch(fixture('ollama-chat-stream.ndjson'));
    const p = new OllamaProvider({ baseUrl: 'http://ollama:11434', fetchImpl: f });
    const parts = [];
    for await (const part of p.chatStream({ model: 'm', messages: [] })) parts.push(part);
    expect(
      parts
        .filter((x) => x.token)
        .map((x) => x.token)
        .join(''),
    ).toBe('Each fact once.');
    expect(parts.at(-1)).toMatchObject({ done: true, usage: { completionTokens: 4 } });
  });
});

describe('OpenAICompatibleProvider contract (recorded fixtures)', () => {
  it('chat sends /v1/chat/completions with response_format json_schema', async () => {
    const f = recordedFetch(fixture('openai-chat.json'));
    const p = new OpenAICompatibleProvider({ baseUrl: 'http://localhost:1234', fetchImpl: f });
    const schema = { type: 'object', properties: { text: { type: 'string' } } };
    const out = await p.chat({
      model: 'qwen2.5-7b-instruct',
      messages: [],
      schema,
      schemaName: 'topic.easy',
      temperature: 0.3,
    });
    expect(f.calls[0].url).toBe('http://localhost:1234/v1/chat/completions');
    expect(f.calls[0].body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'topic_easy', schema, strict: true },
    });
    expect(out.usage).toEqual({ promptTokens: 175, completionTokens: 22 });
  });

  it('accepts a base URL that already ends in /v1, sorts embeddings by index, lists models', async () => {
    const f = recordedFetch(fixture('openai-embed.json'), fixture('openai-models.json'));
    const p = new OpenAICompatibleProvider({ baseUrl: 'http://localhost:8080/v1/', fetchImpl: f });
    const e = await p.embed({ model: 'nomic', texts: ['a', 'b'] });
    expect(f.calls[0].url).toBe('http://localhost:8080/v1/embeddings');
    expect(e.embeddings[0]).toEqual([0.1, -0.2, 0.3]);
    expect(await p.listModels()).toEqual([
      'qwen2.5-7b-instruct',
      'text-embedding-nomic-embed-text-v1.5',
    ]);
  });

  it('streams SSE deltas until [DONE]', async () => {
    const f = recordedFetch(fixture('openai-chat-stream.sse'));
    const p = new OpenAICompatibleProvider({ baseUrl: 'http://localhost:1234', fetchImpl: f });
    const parts = [];
    for await (const part of p.chatStream({ model: 'm', messages: [] })) parts.push(part);
    expect(
      parts
        .filter((x) => x.token)
        .map((x) => x.token)
        .join(''),
    ).toBe('Each fact once.');
    expect(parts.at(-1)).toMatchObject({ done: true, usage: { promptTokens: 80 } });
  });
});

describe('provider switching (A1 acceptance)', () => {
  const base = {
    NODE_ENV: 'test',
    WEB_ORIGIN: 'http://localhost:5173',
    MONGO_URI: 'mongodb://x',
    JWT_ACCESS_SECRET: 'a'.repeat(20),
    JWT_REFRESH_SECRET: 'b'.repeat(20),
  };
  it('picks the adapter from LLM_PROVIDER with no code changes', () => {
    const ollama = createProvider(ApiEnvSchema.parse({ ...base, LLM_PROVIDER: 'ollama' }));
    const lm = createProvider(
      ApiEnvSchema.parse({
        ...base,
        LLM_PROVIDER: 'openai-compatible',
        LLM_BASE_URL: 'http://localhost:1234',
      }),
    );
    expect(ollama).toBeInstanceOf(OllamaProvider);
    expect(lm).toBeInstanceOf(OpenAICompatibleProvider);
    expect(lm.baseUrl).toBe('http://localhost:1234/v1');
  });

  it('refuses the mock provider in production', () => {
    expect(
      ApiEnvSchema.safeParse({ ...base, NODE_ENV: 'production', LLM_PROVIDER: 'mock' }).success,
    ).toBe(false);
  });
});

function promptDir() {
  const dir = mkdtempSync(path.join(path.resolve(here, '../../../../../.tmp'), 'prompts-'));
  writeFileSync(
    path.join(dir, 'demo.easy.v1.md'),
    '---\ntask: demo.easy\nversion: 1\ninputs: [topic]\noutputSchema: demo.easy.v1.schema.json\ntemperature: 0.2\n---\nYou explain things.\n---user---\nExplain {{topic}}.\n',
  );
  writeFileSync(
    path.join(dir, 'demo.easy.v1.schema.json'),
    JSON.stringify({
      type: 'object',
      required: ['text'],
      properties: { text: { type: 'string', minLength: 5 } },
    }),
  );
  writeFileSync(
    path.join(dir, 'demo.easy.v2.md'),
    '---\ntask: demo.easy\nversion: 2\ninputs: [topic]\noutputSchema: demo.easy.v1.schema.json\n---\nExplain {{topic}} simply.\n',
  );
  return dir;
}

describe('prompt registry (A1.3)', () => {
  it('parses front-matter and renders {{variables}}; missing inputs are an error', () => {
    const { meta, body } = parseFrontMatter(
      '---\ntask: a.b\nversion: 3\ninputs: [x, y]\ntemperature: 0.2  # low\n---\nHi {{x}}',
    );
    expect(meta).toEqual({ task: 'a.b', version: 3, inputs: ['x', 'y'], temperature: 0.2 });
    expect(renderTemplate(body, { x: 'there', y: 1 }, ['x', 'y'])).toBe('Hi there');
    expect(() => renderTemplate(body, { y: 1 }, ['x', 'y'])).toThrow(/missing: x/);
  });

  it('loads every version, defaults to the latest, and splits system and user parts', () => {
    const reg = new PromptRegistry(promptDir());
    expect(reg.get('demo.easy').version).toBe(2);
    const { prompt, messages } = reg.render('demo.easy', { topic: 'BCNF' }, 1);
    expect(prompt.temperature).toBe(0.2);
    expect(messages).toEqual([
      { role: 'system', content: 'You explain things.' },
      { role: 'user', content: 'Explain BCNF.' },
    ]);
  });

  it('loads the real prompts folder', () => {
    const reg = new PromptRegistry(path.resolve(here, '../../../../../prompts'));
    expect(reg.tasks().every((t) => !t.startsWith('_'))).toBe(true);
  });
});

describe('generateStructured (A1.2)', () => {
  const schema = z.object({ text: z.string().min(5) });
  const build = (provider) =>
    createGateway({
      provider,
      models: () => ({ chatModel: 'chat-m', embedModel: 'embed-m' }),
      timeoutMs: 1000,
      concurrency: 2,
      logger: quietLogger,
      registry: new PromptRegistry(promptDir()),
    });

  it('returns validated data with model, prompt version, latency and attempts', async () => {
    const mock = new MockProvider().on('demo.easy', { text: 'Keep one fact in one place.' });
    const out = await build(mock).generateStructured(
      'demo.easy',
      { topic: 'Normalization' },
      schema,
      { version: 1 },
    );
    expect(out.data).toEqual({ text: 'Keep one fact in one place.' });
    expect(out.meta).toMatchObject({
      task: 'demo.easy',
      model: 'chat-m',
      promptVersion: 1,
      attempts: 1,
    });
    // The JSON schema from prompts/ is sent with the request.
    expect(mock.calls[0].schema.required).toEqual(['text']);
    expect(mock.calls[0].temperature).toBe(0.2);
  });

  it('invalid JSON triggers exactly one repair attempt that carries the errors, then succeeds', async () => {
    const mock = new MockProvider().on('demo.easy', (_req, n) =>
      n === 1 ? 'Sure! here it is: {text:' : { text: 'Fixed answer here.' },
    );
    const out = await build(mock).generateStructured('demo.easy', { topic: 'x' }, schema);
    expect(out.meta.attempts).toBe(2);
    expect(mock.calls).toHaveLength(2);
    const repair = mock.calls[1].messages.at(-1).content;
    expect(repair).toMatch(/did not match the required schema/);
    expect(repair).toMatch(/not valid JSON/);
  });

  it('fails with a typed AIValidationError after one failed repair, never returning bad data', async () => {
    const mock = new MockProvider().on('demo.easy', { text: 'no' });
    const err = await build(mock)
      .generateStructured('demo.easy', { topic: 'x' }, schema)
      .catch((e) => e);
    expect(err).toBeInstanceOf(AIValidationError);
    expect(err.code).toBe('AI_VALIDATION_FAILED');
    expect(err.details.issues[0].path).toEqual(['text']);
    expect(mock.calls).toHaveLength(2);
  });

  it('extracts JSON from fenced replies', () => {
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ ok: true, value: { a: 1 } });
    expect(parseJsonReply('Here: {"a":2} thanks')).toEqual({ ok: true, value: { a: 2 } });
    expect(parseJsonReply('nope').ok).toBe(false);
  });
});

describe('resilience (A1.4)', () => {
  it('retries network errors with backoff, but not other errors', async () => {
    const r = createResilience({ concurrency: 1, timeoutMs: 1000, retries: 2, baseDelayMs: 1 });
    let n = 0;
    const flaky = async () => {
      n += 1;
      if (n < 3)
        throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
      return 'ok';
    };
    await expect(r.run(flaky)).resolves.toBe('ok');
    expect(n).toBe(3);

    let m = 0;
    const bad = async () => {
      m += 1;
      throw new Error('400 bad request');
    };
    await expect(r.run(bad)).rejects.toThrow('400');
    expect(m).toBe(1);
  });

  it('turns a timeout into AIOfflineError without retrying', async () => {
    const r = createResilience({ concurrency: 1, timeoutMs: 20, retries: 2, baseDelayMs: 1 });
    let n = 0;
    const slow = (signal) =>
      new Promise((_, reject) => {
        n += 1;
        signal.addEventListener('abort', () => reject(signal.reason));
      });
    const err = await r.run(slow).catch((e) => e);
    expect(err).toBeInstanceOf(AIOfflineError);
    expect(err.details.reason).toBe('timeout');
    expect(n).toBe(1);
  });

  it('limits concurrency', async () => {
    const r = createResilience({ concurrency: 2, timeoutMs: 1000 });
    let active = 0;
    let peak = 0;
    const work = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((res) => setTimeout(res, 10));
      active -= 1;
    };
    await Promise.all(Array.from({ length: 6 }, () => r.run(work)));
    expect(peak).toBe(2);
  });

  it('opens the circuit after repeated failures and probes every 30 s', () => {
    let t = 0;
    const cb = new CircuitBreaker({ threshold: 3, probeMs: 30_000, now: () => t });
    cb.failure();
    cb.failure();
    expect(() => cb.before()).not.toThrow();
    cb.failure();
    expect(cb.isOpen).toBe(true);
    expect(() => cb.before()).toThrow(AIOfflineError);
    t = 30_000;
    expect(() => cb.before()).not.toThrow(); // one probe allowed
    expect(() => cb.before()).toThrow(AIOfflineError);
    cb.success();
    expect(cb.isOpen).toBe(false);
  });
});

describe('mock provider', () => {
  it('fills a JSON schema with valid sample data', () => {
    const s = {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'object',
            required: ['n', 'kind'],
            properties: { n: { type: 'integer', minimum: 1 }, kind: { enum: ['a', 'b'] } },
          },
        },
      },
    };
    expect(sampleFromSchema(s)).toEqual({
      items: [
        { n: 1, kind: 'a' },
        { n: 1, kind: 'a' },
      ],
    });
  });

  it('gives similar vectors to texts that share words', () => {
    const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    const q = fakeEmbedding('why do we split tables');
    const near = fakeEmbedding('Normalization splits large tables into smaller tables');
    const far = fakeEmbedding('B-tree index speeds up lookups on disk');
    expect(cos(q, near)).toBeGreaterThan(cos(q, far));
  });

  it('health reports unreachable when the server is down', async () => {
    const mock = new MockProvider();
    const g = createGateway({
      provider: mock,
      models: () => ({ chatModel: 'mock-chat', embedModel: 'mock-embed' }),
      timeoutMs: 100,
      concurrency: 1,
      logger: quietLogger,
    });
    expect(await g.health()).toMatchObject({
      provider: 'mock',
      reachable: true,
      modelsPulled: true,
    });
    mock.offline = true;
    expect(await g.health()).toMatchObject({ reachable: false, modelsPulled: false });
  });
});
