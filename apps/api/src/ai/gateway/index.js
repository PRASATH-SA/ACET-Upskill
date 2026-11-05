/**
 * The one AI gateway (A.7.1). Every model call in the codebase goes through here; nothing else
 * imports a provider. It adds the resilience rules (A.7.8), structured output with one repair
 * retry (A.7.3) and per-call observability (A.7.10).
 */
import { env } from '../../config/env.js';
import { logger as rootLogger } from '../../lib/logger.js';
import { resolveModels } from '../../modules/settings/service.js';
import { prompts } from '../prompts.js';
import { AIValidationError } from './errors.js';
import { MockProvider } from './providers/mock.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAICompatibleProvider } from './providers/openaiCompatible.js';
import { createResilience } from './resilience.js';

export { AIOfflineError, AIValidationError, AIProviderError } from './errors.js';
export { speech, setSpeech } from './speech.js';

/** Picks the provider from env (A1.1): switching servers needs zero code changes. */
export function createProvider(cfg) {
  switch (cfg.LLM_PROVIDER) {
    case 'ollama':
      return new OllamaProvider({ baseUrl: cfg.LLM_BASE_URL });
    case 'openai-compatible':
      return new OpenAICompatibleProvider({
        baseUrl: cfg.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
      });
    case 'mock':
      return new MockProvider({ chatModel: cfg.LLM_CHAT_MODEL, embedModel: cfg.LLM_EMBED_MODEL });
    default:
      throw new Error(`Unknown LLM_PROVIDER ${cfg.LLM_PROVIDER}`);
  }
}

/** Extracts JSON from a model reply, tolerating ```json fences and leading prose. */
export function parseJsonReply(content) {
  const text = String(content ?? '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    const start = candidate.search(/[[{]/);
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
    if (start !== -1 && end > start) {
      try {
        return { ok: true, value: JSON.parse(candidate.slice(start, end + 1)) };
      } catch {
        // fall through
      }
    }
    return { ok: false, error: 'Reply was not valid JSON' };
  }
}

const formatIssues = (issues) =>
  issues
    .slice(0, 12)
    .map((i) => `- ${i.path?.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('\n');

/**
 * @param {object} deps
 * @param {object} deps.provider           an LLMProvider
 * @param {() => Promise<{chatModel: string, embedModel: string}> | {chatModel: string, embedModel: string}} deps.models
 * @param {number} deps.timeoutMs
 * @param {number} deps.concurrency
 * @param {object} [deps.logger]
 * @param {object} [deps.registry]         prompt registry
 */
export function createGateway({
  provider,
  models,
  timeoutMs,
  concurrency,
  logger = rootLogger,
  registry,
}) {
  const res = createResilience({ concurrency, timeoutMs });
  const reg = () => registry ?? prompts();
  const log = logger.child({ component: 'ai-gateway' });

  async function chat({
    task = 'adhoc',
    promptVersion,
    messages,
    schema,
    temperature,
    maxTokens,
    signal,
  }) {
    const { chatModel } = await models();
    const started = Date.now();
    try {
      const out = await res.run(
        (s) =>
          provider.chat({
            task,
            model: chatModel,
            messages,
            schema,
            schemaName: task,
            temperature,
            maxTokens,
            signal: s,
          }),
        { signal },
      );
      log.info(
        {
          task,
          model: out.model,
          promptVersion,
          latencyMs: Date.now() - started,
          promptTokens: out.usage?.promptTokens,
          completionTokens: out.usage?.completionTokens,
        },
        'llm chat',
      );
      return { ...out, latencyMs: Date.now() - started };
    } catch (err) {
      log.warn(
        {
          task,
          model: chatModel,
          promptVersion,
          latencyMs: Date.now() - started,
          err: err.message,
        },
        'llm chat failed',
      );
      throw err;
    }
  }

  /** Streams tokens (tutor). Concurrency-limited and breaker-guarded like chat. */
  async function* chatStream({
    task = 'adhoc',
    promptVersion,
    messages,
    temperature,
    maxTokens,
    signal,
  }) {
    const { chatModel } = await models();
    const started = Date.now();
    res.breaker.before();
    // The stream holds a concurrency slot until it finishes.
    let release;
    const slot = new Promise((r) => (release = r));
    let startStream;
    const ready = new Promise((r) => (startStream = r));
    const job = res.limit(async () => {
      startStream();
      await slot;
    });
    await ready;
    let tokens = 0;
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      const s = signal ? AbortSignal.any([signal, timeout]) : timeout;
      for await (const part of provider.chatStream({
        task,
        model: chatModel,
        messages,
        temperature,
        maxTokens,
        signal: s,
      })) {
        if (part.token) tokens += 1;
        yield part;
      }
      res.breaker.success();
      log.info(
        {
          task,
          model: chatModel,
          promptVersion,
          latencyMs: Date.now() - started,
          streamedChunks: tokens,
        },
        'llm stream',
      );
    } catch (err) {
      if (!signal?.aborted) res.breaker.failure();
      log.warn({ task, model: chatModel, promptVersion, err: err.message }, 'llm stream failed');
      throw err;
    } finally {
      release();
      await job;
    }
  }

  async function embed(texts, { signal } = {}) {
    const { embedModel } = await models();
    const started = Date.now();
    const out = await res.run((s) => provider.embed({ model: embedModel, texts, signal: s }), {
      signal,
    });
    log.info(
      { task: 'embed', model: embedModel, count: texts.length, latencyMs: Date.now() - started },
      'llm embed',
    );
    // Report the configured name so chunks match the model setting exactly (A2.2).
    return { embeddings: out.embeddings, model: embedModel };
  }

  /**
   * A1.2: render the prompt, ask for JSON matching its schema, validate with zod, and make
   * exactly one repair attempt that sends the errors back. Never returns unvalidated data.
   * @template T
   * @param {string} task
   * @param {Record<string, unknown>} input
   * @param {import('zod').ZodType<T>} zodSchema
   * @param {{ version?: number, signal?: AbortSignal }} [opts]
   * @returns {Promise<{ data: T, meta: { task: string, model: string, promptVersion: number, latencyMs: number, attempts: number } }>}
   */
  async function generateStructured(task, input, zodSchema, opts = {}) {
    const { prompt, messages } = reg().render(task, input, opts.version);
    const started = Date.now();
    let convo = messages;
    let lastRaw = '';
    let lastIssues = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const out = await chat({
        task,
        promptVersion: prompt.version,
        messages: convo,
        schema: prompt.schema ?? undefined,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        signal: opts.signal,
      });
      lastRaw = out.content;
      const parsed = parseJsonReply(out.content);
      const result = parsed.ok ? zodSchema.safeParse(parsed.value) : null;
      const valid = Boolean(result?.success);
      log.info(
        { task, promptVersion: prompt.version, attempt, valid },
        'llm structured validation',
      );
      if (valid) {
        return {
          data: result.data,
          meta: {
            task,
            model: out.model,
            promptVersion: prompt.version,
            latencyMs: Date.now() - started,
            attempts: attempt,
          },
        };
      }
      lastIssues = parsed.ok ? result.error.issues : [{ path: [], message: parsed.error }];
      convo = [
        ...messages,
        { role: 'assistant', content: out.content },
        {
          role: 'user',
          content: `Your JSON did not match the required schema. Problems:\n${formatIssues(lastIssues)}\nReturn only the corrected JSON object. No other text.`,
        },
      ];
    }
    throw new AIValidationError(task, lastIssues, lastRaw.slice(0, 2000));
  }

  /** A1.5: provider reachability and whether the configured models are pulled. */
  async function health() {
    const { chatModel, embedModel } = await models();
    const base = { provider: provider.name, chatModel, embedModel, circuit: res.breaker.state() };
    try {
      const names = await provider.listModels({
        signal: AbortSignal.timeout(Math.min(timeoutMs, 5000)),
      });
      const has = (m) => names.some((n) => n === m || n === `${m}:latest` || `${n}:latest` === m);
      res.breaker.success();
      return {
        ...base,
        reachable: true,
        models: names,
        chatModelPulled: has(chatModel),
        embedModelPulled: has(embedModel),
        modelsPulled: has(chatModel) && has(embedModel),
      };
    } catch (err) {
      return { ...base, reachable: false, models: [], modelsPulled: false, error: err.message };
    }
  }

  return {
    provider,
    chat,
    chatStream,
    embed,
    generateStructured,
    health,
    breaker: res.breaker,
    models,
  };
}

let current;
let modelResolver;

/** Test helper: force the model names (overrides the A5 settings). */
export function setModelResolver(fn) {
  modelResolver = fn;
}

/**
 * The process-wide gateway, built from env on first use. Model names come from the A5
 * admin setting when one is saved (cached a few seconds), else from env, so a model change
 * applies to new calls and jobs without a restart.
 */
export function gateway() {
  if (!current) {
    const cfg = env();
    current = createGateway({
      provider: createProvider(cfg),
      models: async () => (await modelResolver?.()) ?? resolveModels(),
      timeoutMs: cfg.LLM_TIMEOUT_MS,
      concurrency: cfg.LLM_MAX_CONCURRENCY,
    });
  }
  return current;
}

/** Test helper: replace (or reset with undefined) the gateway. */
export function setGateway(g) {
  current = g;
}
