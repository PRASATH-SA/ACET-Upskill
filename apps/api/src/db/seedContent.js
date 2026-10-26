/**
 * Publishes the demo content of the seeded subjects (DBMS: dbmsContent.js, PSPP: psppContent.js,
 * Biology: biologyContent.js): video, easy explanation, 10-mark answer, real-world examples, curiosity hook, flashcards, MCQs,
 * code-lab problems and the subject overview. Idempotent: a topic only gets the kinds it does not
 * have yet, so faculty edits are never overwritten.
 *
 *   npm run seed:content        fills gaps in an existing database (no users are touched). It also
 *                               adds the PSPP and Biology subjects to every syllabus version
 *                               that has DBMS.
 */
import { pathToFileURL } from 'node:url';
import { loadEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { CodeChallenge } from '../modules/codelab/model.js';
import { Flashcard, Question, Resource } from '../modules/content/model.js';
import { SubjectOverview } from '../modules/overview/model.js';
import { Subject, Topic, Unit } from '../modules/syllabus/model.js';
import { BIOLOGY_CONTENT, BIOLOGY_OVERVIEW } from './biologyContent.js';
import { BIOLOGY_SUBJECT, BIOLOGY_TOPICS, createBiologySubject } from './biologySyllabus.js';
import { connectMongo, disconnectMongo } from './connect.js';
import { ensureLabs } from './labSeed.js';
import { DBMS_CONTENT, DBMS_OVERVIEW } from './dbmsContent.js';
import { DBMS_TOPICS } from './dbmsSyllabus.js';
import { PSPP_CONTENT, PSPP_OVERVIEW } from './psppContent.js';
import { createPsppSubject, PSPP_SUBJECT, PSPP_TOPICS } from './psppSyllabus.js';

const RESOURCE_KINDS = ['video', 'curiosity', 'easy', 'tenMark', 'realWorld'];

/** Content packs by subject. `language` is the code lab default for the subject. */
export const CONTENT_PACKS = {
  dbms: { topics: DBMS_TOPICS, content: DBMS_CONTENT, overview: DBMS_OVERVIEW, language: 'sql' },
  pspp: { topics: PSPP_TOPICS, content: PSPP_CONTENT, overview: PSPP_OVERVIEW, language: 'python' },
  biology: {
    topics: BIOLOGY_TOPICS,
    content: BIOLOGY_CONTENT,
    overview: BIOLOGY_OVERVIEW,
    language: null,
  },
};

/**
 * @param {{ subjectId: unknown, facultyId: unknown, pack: keyof typeof CONTENT_PACKS, now?: Date }} opts
 * @returns {Promise<Record<string, number>>} how many items of each type were added
 */
export async function seedSubjectContent({ subjectId, facultyId, pack, now = new Date() }) {
  const p = CONTENT_PACKS[pack];
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
    const { units: byNumber, ...rest } = p.overview;
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

  for (const def of p.topics) {
    const topic = byTitle.get(def.title);
    const content = p.content[def.key];
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
    if (content.challenges?.length && !(await CodeChallenge.exists({ topicId: topic._id }))) {
      await CodeChallenge.insertMany(
        content.challenges.map((c, i) => ({ ...pub, language: p.language, order: i, ...c })),
      );
      added.challenges += content.challenges.length;
    }
  }
  return added;
}

/** Kept for callers from before PSPP existed. */
export const seedDbmsContent = (opts) => seedSubjectContent({ ...opts, pack: 'dbms' });

/** Subjects that seed:content adds next to DBMS, with the content pack each one uses. */
const EXTRA_SUBJECTS = [
  { def: PSPP_SUBJECT, create: createPsppSubject, pack: 'pspp' },
  { def: BIOLOGY_SUBJECT, create: createBiologySubject, pack: 'biology' },
];

/**
 * Adds a seeded subject (units, topics, links) to a syllabus version if it is missing.
 * @returns {Promise<{ subject: any, created: boolean }>}
 */
async function ensureSubject({ def, create }, { syllabusVersionId, facultyIds }) {
  const existing = await Subject.findOne({ syllabusVersionId, code: def.code });
  if (existing) return { subject: existing, created: false };
  const { subject } = await create({ syllabusVersionId, facultyIds });
  return { subject, created: true };
}

export const ensurePsppSubject = (opts) => ensureSubject(EXTRA_SUBJECTS[0], opts);
export const ensureBiologySubject = (opts) => ensureSubject(EXTRA_SUBJECTS[1], opts);

async function main() {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // no .env
  }
  const cfg = loadEnv();
  await connectMongo(cfg.MONGO_URI, { retries: 3 });
  try {
    const dbms = await Subject.find({ name: 'Database Management Systems' }).lean();
    if (!dbms.length) throw new Error('No DBMS subject found. Run "npm run seed" first.');
    const todo = [];
    for (const s of dbms) {
      if (!s.facultyIds?.length) {
        logger.warn({ subject: s.code }, 'subject has no faculty; skipped');
        continue;
      }
      todo.push({ subject: s, pack: 'dbms' });
      for (const extra of EXTRA_SUBJECTS) {
        const { subject, created } = await ensureSubject(extra, {
          syllabusVersionId: s.syllabusVersionId,
          facultyIds: s.facultyIds,
        });
        if (created) process.stdout.write(`Created ${extra.def.code} ${extra.def.name}\n`);
        if (!todo.some((t) => String(t.subject._id) === String(subject._id)))
          todo.push({ subject, pack: extra.pack });
      }
    }
    for (const { subject: s, pack } of todo) {
      const added = await seedSubjectContent({
        subjectId: s._id,
        facultyId: s.facultyIds[0],
        pack,
      });
      process.stdout.write(`${s.code} ${s.name}: added ${JSON.stringify(added)}\n`);
    }
    // Labs come last: their experiments link the code-lab problems seeded above (ADR 0012).
    for (const s of dbms) {
      if (!s.facultyIds?.length) continue;
      for (const l of await ensureLabs(s.syllabusVersionId, s.facultyIds[0]))
        if (l.created)
          process.stdout.write(
            `Created lab ${l.def.code} ${l.def.name}: ${l.experiments} experiments\n`,
          );
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
