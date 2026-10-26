import { CodeChallenge } from '../modules/codelab/model.js';
import { LabExperiment } from '../modules/labs/model.js';
import { Subject, Topic, Unit } from '../modules/syllabus/model.js';

/**
 * The seeded practical subjects (ADR 0012): one lab per theory subject that has code-lab
 * problems. Each topic of the theory roadmap with published problems becomes one published
 * experiment that links them. The lab codes follow the university's T(heory)/P(ractical)
 * pattern; the HOD can rename them in Admin → Syllabus.
 */
export const LAB_DEFS = [
  { theoryCode: 'CSC26103', code: 'CSC26P03', name: 'Python Programming Lab', lang: 'Python' },
  { theoryCode: 'CS T53', code: 'CS P53', name: 'Database Management Systems Lab', lang: 'SQL' },
];

/**
 * Adds the lab for `theory` (a subject document) if it is missing, with its experiments.
 * @returns {Promise<{ subject: any, created: boolean, experiments: number }>}
 */
export async function ensureLab(theory, def, facultyId) {
  const existing = await Subject.findOne({
    syllabusVersionId: theory.syllabusVersionId,
    code: def.code,
  });
  if (existing) return { subject: existing, created: false, experiments: 0 };
  const subject = await Subject.create({
    syllabusVersionId: theory.syllabusVersionId,
    semester: theory.semester,
    code: def.code,
    name: def.name,
    facultyIds: theory.facultyIds,
    kind: 'practical',
    theorySubjectId: theory._id,
  });

  const units = await Unit.find({ subjectId: theory._id }).sort({ number: 1 }).lean();
  const unitRank = new Map(units.map((u, i) => [String(u._id), i]));
  const topics = (await Topic.find({ subjectId: theory._id }).lean()).sort(
    (a, b) => unitRank.get(String(a.unitId)) - unitRank.get(String(b.unitId)) || a.order - b.order,
  );
  const now = new Date();
  let number = 0;
  const docs = [];
  for (const topic of topics) {
    const problems = await CodeChallenge.find({ topicId: topic._id, status: 'published' })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    if (!problems.length) continue;
    number += 1;
    docs.push({
      subjectId: subject._id,
      topicId: topic._id,
      number,
      title: topic.title,
      aim: `To write and test ${def.lang} programs on ${topic.title.toLowerCase()}.`,
      procedure: [
        'Solve each linked problem in the code lab until every test passes:',
        '',
        ...problems.map((p, i) => `${i + 1}. ${p.title}`),
        '',
        'Write the program and its output in your lab record.',
      ].join('\n'),
      challengeIds: problems.map((p) => p._id),
      status: 'published',
      source: 'faculty',
      createdBy: facultyId,
      approvedBy: facultyId,
      approvedAt: now,
      publishedAt: now,
    });
  }
  if (docs.length) await LabExperiment.insertMany(docs);
  return { subject, created: true, experiments: docs.length };
}

/** Adds every LAB_DEFS lab whose theory subject exists in the syllabus version. */
export async function ensureLabs(syllabusVersionId, facultyId) {
  const results = [];
  for (const def of LAB_DEFS) {
    const theory = await Subject.findOne({ syllabusVersionId, code: def.theoryCode }).lean();
    if (theory) results.push({ def, ...(await ensureLab(theory, def, facultyId)) });
  }
  return results;
}
