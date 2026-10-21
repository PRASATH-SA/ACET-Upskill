/**
 * API for end-to-end tests: a throwaway in-memory MongoDB replica set, the A.9 seed, and the
 * Express app on E2E_API_PORT (default 4100). Nothing touches the dev database.
 *
 *   node apps/api/scripts/e2e-server.js
 */
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = path.join(root, '.tmp');
mkdirSync(tmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;

const port = Number(process.env.E2E_API_PORT ?? 4100);
// One fixed data folder, wiped at start: Playwright kills this process without letting it
// clean up, and per-run temp folders would otherwise pile up (hundreds of MB each).
const dbPath = path.join(tmp, 'e2e-mongo');
rmSync(dbPath, { recursive: true, force: true });
mkdirSync(dbPath, { recursive: true });
const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ dbPath }],
});

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn',
  API_PORT: String(port),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5174',
  MONGO_URI: replSet.getUri('acet_e2e'),
  JWT_ACCESS_SECRET: 'e2e-access-secret-0123456789abcdef',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-0123456789abcdef',
  BCRYPT_ROUNDS: '4',
  // e2e journeys sign in many times from one IP.
  LOGIN_RATE_LIMIT_PER_MIN: '1000',
  API_RATE_LIMIT_PER_MIN: '100000',
  API_IP_RATE_LIMIT_PER_MIN: '100000',
  UPLOAD_DIR: path.join(tmp, 'e2e-uploads'),
  // AI jobs run in this process. CI uses the scripted mock model; set E2E_LLM=real to use the
  // provider from the environment (the manual "local-ai" run with Ollama, H1).
  AI_JOB_RUNNER: 'inline',
  ...(process.env.E2E_LLM === 'real' ? {} : { LLM_PROVIDER: 'mock' }),
});

const { loadEnv } = await import('../src/config/env.js');
const { connectMongo } = await import('../src/db/connect.js');
const { seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');

loadEnv();
await connectMongo(process.env.MONGO_URI);
const seeded = await seed();
{
  // A sandbox for the faculty journey (e2e/faculty.spec.js), which drafts a whole AI map from a
  // syllabus PDF. It gets an empty subject in its own syllabus version, with student09 as its
  // only student, so the seeded DBMS map the other specs count stays untouched.
  const { SyllabusVersion } = await import('../src/modules/org/model.js');
  const { Subject } = await import('../src/modules/syllabus/model.js');
  const { User } = await import('../src/modules/users/model.js');
  const version = await SyllabusVersion.create({
    university: seeded.version.university,
    regulation: seeded.version.regulation,
    branch: 'CSE (studio e2e)',
    academicYear: seeded.version.academicYear,
  });
  await Subject.create({
    syllabusVersionId: version._id,
    semester: 5,
    code: 'E2E01',
    name: 'Database Management Systems',
    facultyIds: [seeded.faculty[0]._id],
  });
  await User.updateOne(
    { email: 'student09@acet.test' },
    { $set: { syllabusVersionId: version._id } },
  );
}
if (process.env.E2E_LLM !== 'real') {
  const { scriptContentModel, scriptMapModel, scriptTutorModel } =
    await import('../test/mockModel.js');
  scriptMapModel();
  scriptContentModel();
  scriptTutorModel?.();
}
const server = createApp().listen(port, () => {
  process.stdout.write(`e2e api listening on ${port}\n`);
});

const stop = async () => {
  server.close();
  await replSet.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
