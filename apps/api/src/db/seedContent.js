/**
 * Publishes the DBMS demo content (dbmsContent.js) into every DBMS subject: video, easy
 * explanation, 10-mark answer, real-world examples, curiosity hook, flashcards, MCQs and
 * code-lab problems. Idempotent: a topic only gets the kinds it does not have yet, so faculty
 * edits are never overwritten.
 *
 *   npm run seed:content        fills gaps in an existing database (no users are touched)
 */
import { pathToFileURL } from 'node:url';
import { loadEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { CodeChallenge } from '../modules/codelab/model.js';
import { Flashcard, Question, Resource } from '../modules/content/model.js';
import { SubjectOverview } from '../modules/overview/model.js';
import { Subject, Topic, Unit } from '../modules/syllabus/model.js';
import { connectMongo, disconnectMongo } from './connect.js';
import { DBMS_CONTENT, DBMS_OVERVIEW } from './dbmsContent.js';
import { DBMS_TOPICS } from './dbmsSyllabus.js';

const RESOURCE_KINDS = ['video', 'curiosity', 'easy', 'tenMark', 'realWorld'];

/**
 * @param {{ subjectId: import('mongoose').Types.ObjectId | string, facultyId: import('mongoose').Types.ObjectId | string, now?: Date }} opts
 * @returns {Promise<Record<string, number>>} how many items of each type were added
 */
export async function seedDbmsContent({ subjectId, facultyId, now = new Date() }) {
  const added = {
    resources: 0,
    flashcards: 0,
    mcqs: 0,
    curiosityQuestions: 0,
    challenges: 0,
    overview: 0,
  };
  if (!(await SubjectOverview.exists({ subjectId }))) {
    const units = await Unit.find({ subjectId }).select('number').lean();
    const { units: byNumber, ...rest } = DBMS_OVERVIEW;
    await SubjectOverview.create({
      ...rest,
      subjectId,
      units: units
        .filter((u) => byNumber[u.number])
        .map((u) => ({ unitId: u._id, ...byNumber[u.number] })),
      status: 'published',
      source: 'faculty',
      createdBy: facultyId,
      approvedBy: facultyId,
      approvedAt: now,
      publishedAt: now,
    });
    added.overview = 1;
  }
  const topics = await Topic.find({ subjectId }).select('title').lean();
  const byTitle = new Map(topics.map((t) => [t.title, t]));

  for (const def of DBMS_TOPICS) {
    const topic = byTitle.get(def.title);
    const content = DBMS_CONTENT[def.key];
    if (!topic || !content) continue;
    const pub = {
      topicId: topic._id,
      subjectId,
      status: 'published',
      source: 'faculty',
      createdBy: facultyId,
      approvedBy: facultyId,
      approvedAt: now,
      publishedAt: now,
    };

    const haveKinds = new Set(await Resource.distinct('kind', { topicId: topic._id }));
    const resources = RESOURCE_KINDS.filter((k) => content[k] && !haveKinds.has(k)).map((k) =>
      k === 'video'
        ? { ...pub, kind: 'video', title: content.video.title, url: content.video.url }
        : { ...pub, kind: k, body: content[k] },
    );
    if (resources.length) await Resource.insertMany(resources);
    added.resources += resources.length;

    if (content.flashcards && !(await Flashcard.exists({ topicId: topic._id }))) {
      await Flashcard.insertMany(
        content.flashcards.map(([front, back]) => ({ ...pub, front, back })),
      );
      added.flashcards += content.flashcards.length;
    }
    if (content.mcqs && !(await Question.exists({ topicId: topic._id, type: 'mcq' }))) {
      await Question.insertMany(content.mcqs.map((q) => ({ ...pub, type: 'mcq', ...q })));
      added.mcqs += content.mcqs.length;
    }
    if (
      content.curiosityQuestion &&
      !(await Question.exists({ topicId: topic._id, type: 'curiosity' }))
    ) {
      await Question.create({ ...pub, type: 'curiosity', ...content.curiosityQuestion });
      added.curiosityQuestions += 1;
    }
    if (content.challenges && !(await CodeChallenge.exists({ topicId: topic._id }))) {
      await CodeChallenge.insertMany(
        content.challenges.map((c, i) => ({ ...pub, language: 'sql', order: i, ...c })),
      );
      added.challenges += content.challenges.length;
    }
  }
  return added;
}

async function main() {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // no .env
  }
  const cfg = loadEnv();
  await connectMongo(cfg.MONGO_URI, { retries: 3 });
  try {
    const subjects = await Subject.find({ name: 'Database Management Systems' }).lean();
    if (!subjects.length) throw new Error('No DBMS subject found. Run "npm run seed" first.');
    for (const s of subjects) {
      const facultyId = s.facultyIds?.[0];
      if (!facultyId) {
        logger.warn({ subject: s.code }, 'subject has no faculty; skipped');
        continue;
      }
      const added = await seedDbmsContent({ subjectId: s._id, facultyId });
      process.stdout.write(`${s.code} ${s.name}: added ${JSON.stringify(added)}\n`);
    }
  } finally {
    await disconnectMongo();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    logger.fatal({ err }, 'seed:content failed');
    process.exit(1);
  });
}
