#!/usr/bin/env node
/**
 * H1 load test without k6: starts loadtest/server.js, then runs LOAD_VUS virtual students for
 * LOAD_DURATION_S seconds. Each student loops: submit a quiz, then rate revision cards, with
 * LOAD_THINK_MS between actions. One faculty user polls subject insights every 2 s.
 * Prints p50/p95/p99 per endpoint and exits 1 if a target p95 is 500 ms or more.
 *
 *   npm run load                     # 500 students, 60 s
 *   LOAD_VUS=200 LOAD_DURATION_S=30 npm run load
 *
 * The same scenario for k6 is in loadtest/k6/students.js.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VUS = Number(process.env.LOAD_VUS ?? 500);
const DURATION_S = Number(process.env.LOAD_DURATION_S ?? 60);
const THINK_MS = Number(process.env.LOAD_THINK_MS ?? 1000);
const TARGET_P95_MS = 500;
const fixturePath = path.join(root, '.tmp', 'load-fixture.json');

// Node's fetch keeps connections alive and does not cap connections per origin.

// ---------- start the target ----------
rmSync(fixturePath, { force: true });
const nodeArgs = (process.env.LOAD_NODE_ARGS ?? '').split(' ').filter(Boolean);
const server = spawn(process.execPath, [...nodeArgs, path.join(root, 'loadtest', 'server.js')], {
  // Like production with API_WORKERS: several API processes share the port.
  env: {
    ...process.env,
    LOAD_STUDENTS: String(VUS),
    LOAD_FIXTURE: fixturePath,
    LOAD_WORKERS: process.env.LOAD_WORKERS ?? '8',
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const stopServer = () => server.kill('SIGTERM');
process.on('exit', stopServer);
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('load server did not start in 180 s')), 180_000);
  server.stdout.on('data', (d) => {
    process.stdout.write(d);
    if (String(d).includes('listening')) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on('exit', (code) => reject(new Error(`load server exited (${code})`)));
});
if (!existsSync(fixturePath)) throw new Error('no fixture written');
const fx = JSON.parse(readFileSync(fixturePath, 'utf8'));

// ---------- metrics ----------
const samples = new Map(); // name -> number[]
const errors = new Map(); // name -> count
const errorKinds = new Map(); // "name: status code" -> count
const record = (name, ms, ok, kind) => {
  if (!samples.has(name)) samples.set(name, []);
  samples.get(name).push(ms);
  if (!ok) {
    errors.set(name, (errors.get(name) ?? 0) + 1);
    const k = `${name}: ${kind}`;
    errorKinds.set(k, (errorKinds.get(k) ?? 0) + 1);
  }
};
async function call(name, token, method, url, body) {
  const t0 = performance.now();
  let res;
  try {
    res = await fetch(`${fx.baseUrl}${url}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    record(name, performance.now() - t0, res.ok, `${res.status} ${json?.error?.code ?? ''}`);
    return res.ok ? json.data : null;
  } catch (err) {
    record(name, performance.now() - t0, false, err.cause?.code ?? err.message);
    return null;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => THINK_MS * (0.5 + Math.random());
const pct = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

// ---------- scenario ----------
const topicIds = Object.keys(fx.quizzes);
const end = Date.now() + DURATION_S * 1000;

async function student(token, i) {
  await sleep(Math.random() * 2000); // ramp up over 2 s
  let queue = [];
  let n = i;
  while (Date.now() < end) {
    const topicId = topicIds[n++ % topicIds.length];
    const answers = fx.quizzes[topicId].map((q) => ({
      questionId: q.questionId,
      selectedIndex: Math.floor(Math.random() * q.options),
    }));
    await call('quiz submit', token, 'POST', '/quiz/submit', { topicId, answers });
    await sleep(jitter());
    if (!queue.length) {
      const today = await call('revision today', token, 'GET', '/revision/today');
      queue = (today?.groups ?? []).flatMap((g) => g.items.map((it) => it.reviewId)).slice(0, 20);
      await sleep(jitter());
    }
    for (let k = 0; k < 3 && queue.length && Date.now() < end; k++) {
      const rating = ['again', 'hard', 'good', 'easy'][Math.floor(Math.random() * 4)];
      await call('revision rate', token, 'POST', `/revision/${queue.shift()}/rate`, { rating });
      await sleep(jitter());
    }
  }
}

async function faculty() {
  while (Date.now() < end) {
    await call('insights', fx.faculty, 'GET', `/subjects/${fx.subjectId}/insights`);
    await sleep(2000);
  }
}

console.log(`\nRunning ${VUS} students for ${DURATION_S} s (think time ~${THINK_MS} ms)…`);
const started = Date.now();
await Promise.all([...fx.students.map((t, i) => student(t, i)), faculty()]);
const seconds = (Date.now() - started) / 1000;

// ---------- report ----------
let failed = false;
const rows = [];
for (const [name, list] of samples) {
  const sorted = [...list].sort((a, b) => a - b);
  const p95 = pct(sorted, 95);
  const target = ['quiz submit', 'revision rate'].includes(name);
  if (target && p95 >= TARGET_P95_MS) failed = true;
  rows.push({
    endpoint: name,
    requests: list.length,
    'req/s': (list.length / seconds).toFixed(1),
    errors: errors.get(name) ?? 0,
    'p50 ms': pct(sorted, 50).toFixed(0),
    'p95 ms': p95.toFixed(0),
    'p99 ms': pct(sorted, 99).toFixed(0),
    target: target ? `< ${TARGET_P95_MS} ms ${p95 < TARGET_P95_MS ? 'PASS' : 'FAIL'}` : '',
  });
}
console.table(rows);
if (errorKinds.size) console.log('Errors:', Object.fromEntries(errorKinds));
const totalErrors = [...errors.values()].reduce((a, b) => a + b, 0);
if (totalErrors) failed = true;
console.log(failed ? 'LOAD TEST FAILED' : 'LOAD TEST PASSED');
stopServer();
process.exit(failed ? 1 : 0);
