#!/usr/bin/env node
/**
 * npm run ai:eval (A5): runs the A3 content tasks against the configured local model(s) on the
 * golden DBMS dataset and reports JSON validity, repair rate, MCQ self-check agreement,
 * grounding and latency. With two or more models it writes a comparison to docs/ai-eval.md.
 *
 *   npm run ai:eval                                   # the model in LLM_CHAT_MODEL
 *   npm run ai:eval -- --models qwen2.5:7b-instruct,llama3.1:8b
 *   npm run ai:eval -- --task topic.mcqs --limit 3    # one task, first 3 topics
 *   npm run ai:eval -- --mock                         # check the harness with the mock model
 *
 * Needs only the model server (no MongoDB). Provider and URL come from env as usual.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};

try {
  process.loadEnvFile?.(path.join(root, 'apps/api/.env'));
} catch {
  // No apps/api/.env: use the real environment.
}
// The eval needs only the LLM settings; fill the API's other required variables with placeholders.
Object.assign(process.env, {
  NODE_ENV:
    process.env.NODE_ENV === 'production' ? 'development' : (process.env.NODE_ENV ?? 'development'),
  LOG_LEVEL: flag('verbose') ? 'info' : 'warn',
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  MONGO_URI: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/unused',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'eval-placeholder-secret-1',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'eval-placeholder-secret-2',
  ...(flag('mock') ? { LLM_PROVIDER: 'mock' } : {}),
});

const { loadEnv } = await import('../apps/api/src/config/env.js');
const { createGateway, createProvider } = await import('../apps/api/src/ai/gateway/index.js');
const { AIOfflineError, AIValidationError } = await import('../apps/api/src/ai/gateway/errors.js');
const { PromptRegistry } = await import('../apps/api/src/ai/prompts.js');
const { tokenize } = await import('../apps/api/src/ai/text.js');
const S = await import('../apps/api/src/ai/schemas.js');

const cfg = loadEnv();
const dataset = JSON.parse(readFileSync(path.join(root, 'evals/dataset.json'), 'utf8'));
const topics = dataset.topics.slice(0, Number(flag('limit') ?? dataset.topics.length));
const models = String(flag('models') ?? cfg.LLM_CHAT_MODEL)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const registry = new PromptRegistry(path.join(root, 'prompts'));
const quiet = { child: () => quiet, info: () => {}, warn: () => {} };

/** Each task: how to build its input, its schema, and which output text to check for grounding. */
const TASKS = {
  'topic.easy': {
    schema: S.EasySchema,
    input: (t) => ({
      topicTitle: t.title,
      syllabusLine: t.syllabusLine,
      material: `[1] ${t.notes}`,
    }),
    texts: (d) => [d.text],
  },
  'topic.tenMark': {
    schema: S.TenMarkSchema,
    input: (t) => ({
      topicTitle: t.title,
      syllabusLine: t.syllabusLine,
      material: `[1] ${t.notes}`,
    }),
    texts: (d) => [d.definition, d.need, ...d.points.map((p) => p.text)],
  },
  'topic.flashcards': {
    schema: S.FlashcardsSchema,
    input: (t) => ({ topicTitle: t.title, material: `[1] ${t.notes}`, avoid: 'none' }),
    texts: (d) => d.cards.map((c) => c.back),
  },
  'topic.mcqs': {
    schema: S.McqsSchema,
    input: (t) => ({ topicTitle: t.title, material: `[1] ${t.notes}`, avoid: 'none' }),
    texts: (d) => d.questions.map((q) => q.explanation),
  },
};
const only = flag('task');
const taskNames = Object.keys(TASKS).filter((t) => !only || t === only);

/**
 * Grounded = at least 60% of the content words of a generated text appear in the notes.
 * A rough but model-independent check that drafts come from the faculty's material.
 */
function groundedShare(text, notes) {
  const vocab = new Set(tokenize(notes));
  const words = tokenize(text);
  if (!words.length) return 0;
  return words.filter((w) => vocab.has(w)).length / words.length;
}

async function evalModel(model) {
  const provider = createProvider(cfg);
  if (cfg.LLM_PROVIDER === 'mock') {
    const { scriptContentModel } = await import('../apps/api/test/mockModel.js');
    scriptContentModel({ provider });
    provider.models.push(model);
  }
  const gw = createGateway({
    provider,
    models: () => ({ chatModel: model, embedModel: cfg.LLM_EMBED_MODEL }),
    timeoutMs: cfg.LLM_TIMEOUT_MS,
    concurrency: 1,
    logger: quiet,
    registry,
  });
  const health = await gw.health();
  if (!health.reachable)
    throw new AIOfflineError(`Model server unreachable at ${cfg.LLM_BASE_URL}: ${health.error}`);
  if (!health.models.some((m) => m === model || m === `${model}:latest`)) {
    throw new Error(`${model} is not pulled. Run: ollama pull ${model}`);
  }

  const stats = Object.fromEntries(
    taskNames.map((t) => [
      t,
      { calls: 0, firstTry: 0, repaired: 0, failed: 0, ms: 0, grounded: 0, texts: 0 },
    ]),
  );
  let mcqChecked = 0;
  let mcqAgreed = 0;
  for (const [i, topic] of topics.entries()) {
    process.stdout.write(`  [${model}] ${i + 1}/${topics.length} ${topic.title}\n`);
    for (const task of taskNames) {
      const spec = TASKS[task];
      const s = stats[task];
      s.calls += 1;
      const t0 = Date.now();
      try {
        const out = await gw.generateStructured(task, spec.input(topic), spec.schema);
        s.ms += Date.now() - t0;
        if (out.meta.attempts === 1) s.firstTry += 1;
        else s.repaired += 1;
        for (const text of spec.texts(out.data)) {
          s.texts += 1;
          if (groundedShare(text, topic.notes) >= 0.6) s.grounded += 1;
        }
        if (task === 'topic.mcqs') {
          for (const q of out.data.questions) {
            const check = await gw.generateStructured(
              'mcq.selfCheck',
              {
                material: `[1] ${topic.notes}`,
                question: q.stem,
                options: q.options.map((o, k) => `${k}. ${o}`).join('\n'),
              },
              S.SelfCheckSchema,
            );
            mcqChecked += 1;
            if (check.data.answerIndex === q.correctIndex) mcqAgreed += 1;
          }
        }
      } catch (err) {
        s.ms += Date.now() - t0;
        if (err instanceof AIValidationError) s.failed += 1;
        else throw err;
      }
    }
  }
  return { model, stats, mcq: { checked: mcqChecked, agreed: mcqAgreed } };
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const sec = (ms, n) => (n ? (ms / n / 1000).toFixed(1) : '–');

function summary(r) {
  const all = Object.values(r.stats).reduce(
    (acc, s) => {
      for (const k of Object.keys(acc)) acc[k] += s[k];
      return acc;
    },
    { calls: 0, firstTry: 0, repaired: 0, failed: 0, ms: 0, grounded: 0, texts: 0 },
  );
  return { ...all, mcq: r.mcq };
}

function toMarkdown(results) {
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const lines = [
    '# AI evaluation',
    '',
    `Generated by \`npm run ai:eval\` on ${when} UTC with provider \`${cfg.LLM_PROVIDER}\`` +
      ` (${cfg.LLM_PROVIDER === 'mock' ? 'mock model: checks the harness only, not a real model' : cfg.LLM_BASE_URL}).`,
    `Dataset: ${dataset.name}, ${topics.length} topics. Tasks: ${taskNames.join(', ')}.`,
    '',
    '| Model | Valid JSON first try | Repair needed | Failed after repair | MCQ self-check agreement | Grounded texts | Avg latency / call |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const r of results) {
    const s = summary(r);
    lines.push(
      `| \`${r.model}\` | ${pct(s.firstTry, s.calls)} | ${pct(s.repaired, s.calls)} | ${pct(s.failed, s.calls)} | ${pct(s.mcq.agreed, s.mcq.checked)} (${s.mcq.checked}) | ${pct(s.grounded, s.texts)} | ${sec(s.ms, s.calls)} s |`,
    );
  }
  lines.push('', '## Per task', '');
  for (const r of results) {
    lines.push(
      `### \`${r.model}\``,
      '',
      '| Task | Calls | First try | Repaired | Failed | Grounded | Avg latency |',
      '|---|---|---|---|---|---|---|',
    );
    for (const [task, s] of Object.entries(r.stats)) {
      lines.push(
        `| ${task} | ${s.calls} | ${pct(s.firstTry, s.calls)} | ${pct(s.repaired, s.calls)} | ${pct(s.failed, s.calls)} | ${pct(s.grounded, s.texts)} | ${sec(s.ms, s.calls)} s |`,
      );
    }
    lines.push('');
  }
  lines.push(
    '## How to read this',
    '',
    '- **Valid JSON first try**: the reply passed the zod schema without the repair retry (A.7.3).',
    '- **Repair needed / Failed**: one repair attempt was needed / still invalid after it (the job would fail).',
    '- **MCQ self-check agreement**: a second call, answering from the notes only, picked the stored correct option. Disagreements are flagged `needsAttention` in the review queue.',
    '- **Grounded texts**: generated texts where at least 60% of the content words appear in the faculty notes. Low values suggest the model adds outside knowledge.',
    '- **Latency** depends on hardware; CPU-only machines are several times slower than a GPU.',
    '',
  );
  return lines.join('\n');
}

console.log(`Evaluating ${models.join(', ')} on ${topics.length} topics (${taskNames.join(', ')})`);
const results = [];
try {
  for (const m of models) results.push(await evalModel(m));
} catch (err) {
  console.error(`\nEval stopped: ${err.message}`);
  process.exit(1);
}
const md = toMarkdown(results);
console.log(`\n${md}`);
const out = path.resolve(root, String(flag('out') ?? 'docs/ai-eval.md'));
if (models.length > 1 || flag('out') || flag('write')) {
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, md);
  console.log(`Wrote ${path.relative(root, out)}`);
}
