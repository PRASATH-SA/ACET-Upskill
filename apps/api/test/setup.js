import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { afterAll, beforeAll, inject } from 'vitest';
import { ApiEnvSchema, setEnv } from '../src/config/env.js';
import { connectMongo } from '../src/db/connect.js';
import { setStorage, LocalDiskStorage } from '../src/lib/storage.js';

const baseUri = inject('mongoUri');
const dbName = `test_${randomUUID().replace(/-/g, '')}`;
const uri = baseUri.replace(/\/(\?|$)/, `/${dbName}$1`);
const repoTmp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.tmp');
mkdirSync(repoTmp, { recursive: true });
const uploadDir = mkdtempSync(path.join(repoTmp, 'acet-uploads-'));

setEnv(
  ApiEnvSchema.parse({
    NODE_ENV: 'test',
    WEB_ORIGIN: 'http://localhost:5173',
    MONGO_URI: uri,
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789',
    JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789',
    BCRYPT_ROUNDS: '4',
    UPLOAD_DIR: uploadDir,
    API_RATE_LIMIT_PER_MIN: '100000',
  }),
);
setStorage(new LocalDiskStorage(uploadDir));

beforeAll(async () => {
  await connectMongo(uri, { retries: 3 });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  rmSync(uploadDir, { recursive: true, force: true });
});
