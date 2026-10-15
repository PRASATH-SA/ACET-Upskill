/**
 * Deterministic fake LLM for tests, CI and e2e (A1.8: "mock providers, no real LLM in CI").
 * Never used in production (env validation refuses LLM_PROVIDER=mock there).
 *
 * - chat(): a scripted handler for the task if one is registered, otherwise a minimal object
 *   that satisfies the requested JSON schema.
 * - embed(): bag-of-words hashing, so texts that share words get similar vectors.
 * - `offline = true` makes every call fail like a stopped server.
 */

export const MOCK_EMBED_DIM = 64;

const STOPWORDS = new Set(
  'a an and are as at be by do does for from how in is it of on or that the this to was we what when where which why with you your'.split(
    ' ',
  ),
);

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, '')); // crude stemming: "tables" ≈ "table"
}

function hash(word) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic unit vector from the words of `text`. */
export function fakeEmbedding(text, dim = MOCK_EMBED_DIM) {
  const v = new Array(dim).fill(0);
  for (const w of tokenize(text)) {
    const h = hash(w);
    v[h % dim] += h & 1 ? 1 : -1;
    v[(h >>> 8) % dim] += 0.5;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/** A minimal value that satisfies a (draft-07 subset) JSON schema. */
export function sampleFromSchema(schema, path = 'value') {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf || schema.oneOf)
    return sampleFromSchema((schema.anyOf ?? schema.oneOf)[0], path);
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  switch (type) {
    case 'object': {
      const out = {};
      const props = schema.properties ?? {};
      for (const key of schema.required ?? Object.keys(props)) {
        out[key] = sampleFromSchema(props[key], key);
      }
      return out;
    }
    case 'array': {
      const n = Math.max(schema.minItems ?? 1, 1);
      return Array.from({ length: n }, (_, i) =>
        sampleFromSchema(schema.items, `${path} ${i + 1}`),
      );
    }
    case 'integer':
    case 'number': {
      const min = schema.minimum ?? 0;
      return schema.maximum !== undefined ? Math.min(min, schema.maximum) : min;
    }
    case 'boolean':
      return false;
    case 'string': {
      const base = `Mock ${path}`;
      const min = schema.minLength ?? 0;
      const s = base.length >= min ? base : base.padEnd(min, ' .');
      return schema.maxLength ? s.slice(0, schema.maxLength) : s;
    }
    default:
      return null;
  }
}

export class MockProvider {
  constructor({ chatModel = 'mock-chat', embedModel = 'mock-embed' } = {}) {
    this.name = 'mock';
    this.models = [chatModel, embedModel];
    this.offline = false;
    /** task → (request) => object | string. Tests and e2e fixtures register these. */
    this.handlers = new Map();
    /** Every chat request, for assertions. */
    this.calls = [];
    this.embedModelOverride = null;
  }

  /** Registers a scripted answer for a task. A function receives the request. */
  on(task, handler) {
    this.handlers.set(task, handler);
    return this;
  }

  reset() {
    this.handlers.clear();
    this.calls = [];
    this.offline = false;
  }

  #checkOnline() {
    if (this.offline) {
      const err = new TypeError('fetch failed');
      err.cause = { code: 'ECONNREFUSED' };
      throw err;
    }
  }

  async chat(req) {
    this.#checkOnline();
    this.calls.push(req);
    const handler = this.handlers.get(req.task);
    let out;
    if (handler)
      out = typeof handler === 'function' ? await handler(req, this.calls.length) : handler;
    else if (req.schema) out = sampleFromSchema(req.schema);
    else out = 'Mock answer.';
    return {
      content: typeof out === 'string' ? out : JSON.stringify(out),
      model: req.model,
      usage: { promptTokens: 10, completionTokens: 20 },
    };
  }

  async *chatStream(req) {
    this.#checkOnline();
    this.calls.push(req);
    const handler = this.handlers.get(req.task);
    const text = handler
      ? String(typeof handler === 'function' ? await handler(req, this.calls.length) : handler)
      : 'Mock answer from the provided context.';
    for (const piece of text.match(/\S+\s*/g) ?? []) yield { token: piece };
    yield { done: true, usage: { promptTokens: 10, completionTokens: 20 } };
  }

  async embed({ texts, model }) {
    this.#checkOnline();
    return {
      embeddings: texts.map((t) => fakeEmbedding(t)),
      model: this.embedModelOverride ?? model,
    };
  }

  async listModels() {
    this.#checkOnline();
    return [...this.models];
  }
}
