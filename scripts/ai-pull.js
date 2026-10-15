/**
 * npm run ai:pull — downloads LLM_CHAT_MODEL and LLM_EMBED_MODEL into Ollama (Phase 0).
 * Reads settings from the environment, falling back to apps/api/.env, then the A.3 defaults.
 * Only works with LLM_PROVIDER=ollama; other local servers manage models themselves.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, 'apps', 'api', '.env');
const fileEnv = {};
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*([^#]*?)\s*(#.*)?$/.exec(line);
    if (m) fileEnv[m[1]] = m[2];
  }
}
const get = (k, d) => process.env[k] ?? fileEnv[k] ?? d;

const provider = get('LLM_PROVIDER', 'ollama');
const baseUrl = get('LLM_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
const models = [
  get('LLM_CHAT_MODEL', 'qwen2.5:7b-instruct'),
  get('LLM_EMBED_MODEL', 'nomic-embed-text'),
];

if (provider !== 'ollama') {
  console.log(
    `LLM_PROVIDER is "${provider}". Load these models in that server yourself: ${models.join(', ')}`,
  );
  process.exit(0);
}

async function pull(model) {
  console.log(`Pulling ${model} from ${baseUrl} …`);
  const res = await fetch(`${baseUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama returned ${res.status} for ${model}`);
  const decoder = new TextDecoder();
  let buffer = '';
  let lastLine = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.error) throw new Error(msg.error);
      const pct = msg.total ? ` ${Math.floor(((msg.completed ?? 0) / msg.total) * 100)}%` : '';
      const text = `  ${msg.status}${pct}`;
      if (text !== lastLine) {
        process.stdout.write(`\r${text.padEnd(60)}`);
        lastLine = text;
      }
    }
  }
  process.stdout.write('\n');
}

try {
  for (const m of models) await pull(m);
  const tags = await (await fetch(`${baseUrl}/api/tags`)).json();
  console.log('Models now in Ollama:', tags.models.map((m) => m.name).join(', '));
} catch (err) {
  console.error(`ai:pull failed: ${err.message}`);
  console.error(
    `Is Ollama running at ${baseUrl}? Start it with "ollama serve" or "docker compose up ollama".`,
  );
  process.exit(1);
}
