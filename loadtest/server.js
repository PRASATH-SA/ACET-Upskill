/**
 * H1 load-test target: an API on a throwaway in-memory MongoDB with the A.9 seed plus
 * LOAD_STUDENTS extra students, each with 40 flashcards due for revision. Writes the access
 * tokens and ids the load generator needs to LOAD_FIXTURE (JSON), then serves.
 *
 *   node loadtest/server.js            (used by loadtest/run.js and the k6 script)
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cluster from 'node:cluster';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// LOAD_WORKERS > 1: the primary prepares the database; workers share the port (like API_WORKERS).
if (cluster.isWorker) {
  const { loadEnv } = await import('../apps/api/src/config/env.js');
  const { connectMongo } = await import('../apps/api/src/db/connect.js');
  const { createApp } = await import('../apps/api/src/app.js');
  loadEnv();
  await connectMongo(process.env.MONGO_URI);
  createApp().listen(Number(process.env.LOAD_API_PORT ?? 4200));
  await new Promise(() => {}); // keep serving
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(root, '.tmp');
mkdirSync(tmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;

const port = Number(process.env.LOAD_API_PORT ?? 4200);
const students = Number(process.env.LOAD_STUDENTS ?? 500);
const fixture = process.env.LOAD_FIXTURE ?? path.join(tmp, 'load-fixture.json');
const dbPath = path.join(tmp, 'load-mongo');
rmSync(dbPath, { recursive: true, force: true });
mkdirSync(dbPath, { recursive: true });
const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ dbPath }],
});

Object.assign(process.env, {
  NODE_ENV: 'production',
  LOG_LEVEL: 'warn',
  WEB_ORIGIN: 'http://localhost:5173',
  MONGO_URI: replSet.getUri('acet_load'),
  JWT_ACCESS_SECRET: 'load-access-secret-0123456789abcdef',
  JWT_REFRESH_SECRET: 'load-refresh-secret-0123456789abcdef',
  // Tokens are minted below; the access token outlives the run.
  JWT_ACCESS_TTL: '2h',
  BCRYPT_ROUNDS: '4',
  UPLOAD_DIR: path.join(tmp, 'load-uploads'),
  // Every virtual user comes from 127.0.0.1, like a campus behind one NAT address.
  API_IP_RATE_LIMIT_PER_MIN: '1000000',
  LLM_PROVIDER: 'ollama',
  AI_JOB_RUNNER: 'inline',
});

const { loadEnv } = await import('../apps/api/src/config/env.js');
const { connectMongo } = await import('../apps/api/src/db/connect.js');
const { seed } = await import('../apps/api/src/db/seed.js');
const { createApp } = await import('../apps/api/src/app.js');
const { signAccessToken } = await import('../apps/api/src/modules/auth/tokens.js');
const { User } = await import('../apps/api/src/modules/users/model.js');
const { Flashcard, Question } = await import('../apps/api/src/modules/content/model.js');
const { Review } = await import('../apps/api/src/modules/practice/model.js');
const { default: mongoose } = await import('mongoose');

loadEnv();
await connectMongo(process.env.MONGO_URI);
await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
const s = await seed();

const t0 = Date.now();
const passwordHash = s.students[0].passwordHash;
const users = await User.insertMany(
  Array.from({ length: students }, (_, i) => ({
    name: `Load Student ${i + 1}`,
    email: `load${i + 1}@acet.test`,
    role: 'student',
    passwordHash,
    departmentId: s.students[0].departmentId,
    syllabusVersionId: s.version._id,
    batch: '2023-27',
  })),
);
const cards = await Flashcard.find({ subjectId: s.subject._id, status: 'published' })
  .select('_id topicId')
  .lean();
const due = new Date(Date.now() - 60_000);
for (let i = 0; i < users.length; i += 50) {
  await Review.insertMany(
    users.slice(i, i + 50).flatMap((u) =>
      cards.map((c) => ({
        userId: u._id,
        itemType: 'flashcard',
        itemId: c._id,
        topicId: c.topicId,
        subjectId: s.subject._id,
        due,
      })),
    ),
  );
}
const questions = await Question.find({
  subjectId: s.subject._id,
  type: 'mcq',
  status: 'published',
})
  .select('_id topicId options')
  .lean();
const quizzes = {};
for (const q of questions) {
  const k = String(q.topicId);
  (quizzes[k] ??= []).push({ questionId: String(q._id), options: q.options.length });
}

writeFileSync(
  fixture,
  JSON.stringify({
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    subjectId: String(s.subject._id),
    faculty: signAccessToken(String(s.faculty[0]._id), 'faculty').token,
    students: users.map((u) => signAccessToken(String(u._id), 'student').token),
    quizzes,
  }),
);
// LOAD_PROFILE_MS=15000 writes a CPU profile of the first N ms under load to .tmp/load.cpuprofile.
if (process.env.LOAD_PROFILE_MS) {
  const { Session } = await import('node:inspector/promises');
  const session = new Session();
  session.connect();
  await session.post('Profiler.enable');
  await session.post('Profiler.start');
  setTimeout(async () => {
    const { profile } = await session.post('Profiler.stop');
    writeFileSync(path.join(tmp, 'load.cpuprofile'), JSON.stringify(profile));
    process.stdout.write('cpu profile written\n');
  }, Number(process.env.LOAD_PROFILE_MS));
}

const workers = Number(process.env.LOAD_WORKERS ?? 1);
const ready = `load api listening on ${port}: ${users.length} students, ${cards.length} due cards each, ${workers} process(es) (${Date.now() - t0} ms)\n`;
if (workers > 1) {
  let up = 0;
  cluster.on('listening', () => {
    if (++up === workers) process.stdout.write(ready);
  });
  for (let i = 0; i < workers; i++) cluster.fork({ ...process.env, LOAD_API_PORT: String(port) });
} else {
  createApp().listen(port, () => process.stdout.write(ready));
}

const stop = async () => {
  await replSet.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
