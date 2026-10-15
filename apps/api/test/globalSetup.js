import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Keep test databases and temp files inside the repo (.tmp is gitignored) instead of the
// system temp folder, which may be on a small or full system drive.
const repoTmp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.tmp');
mkdirSync(repoTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = repoTmp;

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
