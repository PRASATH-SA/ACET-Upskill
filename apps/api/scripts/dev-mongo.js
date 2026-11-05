/**
 * npm run db:dev — a local MongoDB for development without Docker.
 * Starts a single-node replica set (so transactions work) on port 27017 and keeps its data
 * in <repo>/.data/mongo between runs. Uses the MongoDB binary from mongodb-memory-server.
 *
 * Use this MONGO_URI with it:
 *   mongodb://127.0.0.1:27017/acet_skillup?replicaSet=rs0
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dbPath = path.join(root, '.data', 'mongo');
mkdirSync(dbPath, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = path.join(root, '.tmp');
mkdirSync(process.env.TEMP, { recursive: true });

const port = Number(process.env.DEV_MONGO_PORT ?? 27017);
const replSet = await MongoMemoryReplSet.create({
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ port, dbPath, ip: '127.0.0.1' }],
});
const uri = `mongodb://127.0.0.1:${port}/acet_skillup?replicaSet=rs0`;
process.stdout.write(
  `Dev MongoDB running.\n  MONGO_URI=${uri}\n  data: ${dbPath}\nPress Ctrl+C to stop.\n`,
);

const stop = async () => {
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
