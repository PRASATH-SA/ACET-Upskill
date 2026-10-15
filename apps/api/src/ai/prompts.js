/**
 * Prompt registry (A.7.6, A1.3). Reads prompts/<task>.v<n>.md with a front-matter header and
 * renders `{{variable}}` placeholders. Code never concatenates prompt text.
 *
 * Front-matter keys: task, version, inputs ([a, b]), outputSchema (file), temperature,
 * maxTokens, system (optional one-line system message).
 * A file may hold a system part and a user part separated by a line `---user---`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const DEFAULT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../prompts',
);
const FILE_RE = /^(.+)\.v(\d+)\.md$/;

function parseScalar(raw) {
  const v = raw.trim().replace(/\s+#.*$/, '');
  if (v.startsWith('[') && v.endsWith(']')) {
    return v
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true' || v === 'false') return v === 'true';
  return v.replace(/^['"]|['"]$/g, '');
}

/** Splits `---\nkey: value\n---\nbody` into { meta, body }. */
export function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('Prompt file has no front-matter header');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = parseScalar(line.slice(idx + 1));
  }
  return { meta, body: m[2] };
}

/**
 * Replaces {{name}} with input values. Missing inputs are an error, so a prompt never goes
 * out with a hole in it. Objects and arrays are rendered as JSON.
 */
export function renderTemplate(template, input, declared = []) {
  const missing = declared.filter((k) => input[k] === undefined || input[k] === null);
  if (missing.length) throw new Error(`Prompt input missing: ${missing.join(', ')}`);
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
    if (!(key in input)) throw new Error(`Prompt uses {{${key}}} but it is not an input`);
    const v = input[key];
    return typeof v === 'string' ? v : JSON.stringify(v, null, 1);
  });
}

export class PromptRegistry {
  constructor(dir) {
    this.dir = dir;
    this.byTask = new Map();
    this.load();
  }

  load() {
    this.byTask.clear();
    for (const file of readdirSync(this.dir)) {
      const m = file.match(FILE_RE);
      if (!m || file.startsWith('_')) continue;
      const { meta, body } = parseFrontMatter(readFileSync(path.join(this.dir, file), 'utf8'));
      const task = meta.task ?? m[1];
      const version = Number(meta.version ?? m[2]);
      if (task !== m[1] || version !== Number(m[2])) {
        throw new Error(`${file}: front-matter task/version must match the file name`);
      }
      const schema = meta.outputSchema
        ? JSON.parse(readFileSync(path.join(this.dir, meta.outputSchema), 'utf8'))
        : null;
      const [system, user] = body.includes('---user---')
        ? body.split(/^---user---\s*$/m).map((s) => s.trim())
        : [meta.system ?? null, body.trim()];
      const entry = {
        task,
        version,
        inputs: meta.inputs ?? [],
        temperature: meta.temperature ?? 0.3,
        maxTokens: meta.maxTokens,
        schema,
        system,
        user,
        file,
      };
      if (!this.byTask.has(task)) this.byTask.set(task, new Map());
      this.byTask.get(task).set(version, entry);
    }
  }

  /** The prompt for a task: a given version, or the latest. */
  get(task, version) {
    const versions = this.byTask.get(task);
    if (!versions) throw new Error(`No prompt registered for task "${task}"`);
    const v = version ?? Math.max(...versions.keys());
    const entry = versions.get(v);
    if (!entry) throw new Error(`Prompt ${task} v${v} not found`);
    return entry;
  }

  tasks() {
    return [...this.byTask.keys()].sort();
  }

  /** Renders the chat messages for a task. */
  render(task, input, version) {
    const p = this.get(task, version);
    const messages = [];
    if (p.system) messages.push({ role: 'system', content: renderTemplate(p.system, input, []) });
    messages.push({ role: 'user', content: renderTemplate(p.user, input, p.inputs) });
    return { prompt: p, messages };
  }
}

let registry;

/** The process-wide registry (PROMPTS_DIR or <repo>/prompts). */
export function prompts() {
  if (!registry) registry = new PromptRegistry(env().PROMPTS_DIR ?? DEFAULT_DIR);
  return registry;
}

export function setPrompts(r) {
  registry = r;
}
