import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Keep test databases and temp files inside the repo (.tmp is gitignored) instead of the
// system temp folder, which may be on a small or full system drive.
const repoTmp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.tmp');
mkdirSync(repoTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = repoTmp;

// A killed run leaves its database (~300 MB) and upload folders behind; on a nearly full drive
// that makes the next run's MongoDB fail to start. Remove leftovers older than two hours.
const STALE_MS = 2 * 60 * 60 * 1000;
for (const name of readdirSync(repoTmp)) {
  if (!/^(mongo-mem-|acet-uploads-)/.test(name)) continue;
  const full = path.join(repoTmp, name);
  try {
    if (Date.now() - statSync(full).mtimeMs > STALE_MS)
      rmSync(full, { recursive: true, force: true });
  } catch {
    // in use or already gone
  }
}

/**
 * Starts one in-memory MongoDB replica set for the whole test run (replica set so
 * transactions work). Each test file uses its own database name.
 */
let replSet;

export async function setup({ provide }) {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  provide('mongoUri', replSet.getUri());
}

export async function teardown() {
  await replSet?.stop();
}
