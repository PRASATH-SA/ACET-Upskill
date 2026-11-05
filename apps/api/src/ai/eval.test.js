import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const run = promisify(execFile);

describe('npm run ai:eval (A5)', () => {
  it('runs end to end with the mock model and writes a comparison table', async () => {
    const out = path.join(root, '.tmp', `ai-eval-test-${Date.now()}.md`);
    const { stdout } = await run(
      process.execPath,
      ['evals/run.js', '--mock', '--models', 'model-a,model-b', '--limit', '2', '--out', out],
      { cwd: root, env: { ...process.env, LLM_PROVIDER: 'mock' }, timeout: 60_000 },
    );
    expect(stdout).toMatch(/Evaluating model-a, model-b on 2 topics/);
    const md = readFileSync(out, 'utf8');
    expect(md).toMatch(/\| `model-a` \| 100% \| 0% \| 0% \| 100% \(10\)/);
    expect(md).toMatch(/\| `model-b` \|/);
    expect(md).toMatch(/mock model: checks the harness only/);
  }, 90_000);

  it('the golden dataset has at least 10 DBMS topics with faculty-style notes', () => {
    const d = JSON.parse(readFileSync(path.join(root, 'evals/dataset.json'), 'utf8'));
    expect(d.topics.length).toBeGreaterThanOrEqual(10);
    for (const t of d.topics) expect(t.notes.split(/\s+/).length).toBeGreaterThanOrEqual(140);
  });
});
