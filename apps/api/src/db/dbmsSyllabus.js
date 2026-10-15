import { Subject, Topic, TopicLink, Unit } from '../modules/syllabus/model.js';

/**
 * The seeded DBMS subject (A.9): Unit 3 "Database Design" plus Indexing in Unit 4.
 * Shared by `npm run seed` and the tests so both use the same graph.
 */
export const DBMS_UNITS = [
  { number: 3, title: 'Database Design' },
  { number: 4, title: 'Storage and Indexing' },
];

export const DBMS_TOPICS = [
  {
    key: 'relational',
    unit: 3,
    title: 'Relational Model',
    summary: 'Data as relations (tables) of tuples and attributes.',
  },
  {
    key: 'keys',
    unit: 3,
    title: 'Keys',
    summary: 'Super, candidate, primary and foreign keys identify tuples and connect relations.',
  },
  {
    key: 'fd',
    unit: 3,
    title: 'Functional Dependency',
    summary: 'X → Y: the value of X decides the value of Y.',
  },
  {
    key: 'anomalies',
    unit: 3,
    title: 'Data Anomalies',
    summary: 'Insert, update and delete problems caused by redundant data.',
  },
  {
    key: 'normalization',
    unit: 3,
    title: 'Normalization',
    summary: 'Splitting relations to remove redundancy and anomalies.',
  },
  {
    key: 'nf123',
    unit: 3,
    title: '1NF/2NF/3NF',
    summary: 'Atomic values, no partial dependency, no transitive dependency.',
  },
  { key: 'bcnf', unit: 3, title: 'BCNF', summary: 'Every determinant is a candidate key.' },
  {
    key: 'indexing',
    unit: 4,
    title: 'Indexing',
    summary: 'Extra structures (B+ trees, hashing) that speed up lookups.',
  },
];

export const DBMS_LINKS = [
  {
    from: 'relational',
    to: 'keys',
    type: 'prerequisite',
    reason: 'Keys are defined on relations and their attributes.',
  },
  {
    from: 'relational',
    to: 'anomalies',
    type: 'prerequisite',
    reason: 'Anomalies appear in badly designed relations.',
  },
  {
    from: 'keys',
    to: 'fd',
    type: 'prerequisite',
    reason: 'A key is a set of attributes that functionally determines all others.',
  },
  {
    from: 'fd',
    to: 'normalization',
    type: 'prerequisite',
    reason: 'Normal forms are defined using functional dependencies.',
  },
  {
    from: 'anomalies',
    to: 'normalization',
    type: 'prerequisite',
    reason: 'Normalization exists to remove these anomalies.',
  },
  {
    from: 'normalization',
    to: 'nf123',
    type: 'prerequisite',
    reason: '1NF, 2NF and 3NF are the steps of normalization.',
  },
  { from: 'nf123', to: 'bcnf', type: 'prerequisite', reason: 'BCNF is a stricter version of 3NF.' },
  {
    from: 'keys',
    to: 'indexing',
    type: 'related',
    reason: 'Primary keys usually get an index automatically.',
  },
];

/**
 * Creates the DBMS subject with its units, topics and links.
 * @param {{ syllabusVersionId: unknown, facultyIds?: unknown[], status?: string, code?: string }} opts
 * @returns {Promise<{ subject: any, units: Record<number, any>, topics: Record<string, any>, links: any[] }>}
 */
export async function createDbmsSubject({
  syllabusVersionId,
  facultyIds = [],
  status = 'approved',
  code = 'CS T53',
}) {
  const subject = await Subject.create({
    syllabusVersionId,
    semester: 5,
    code,
    name: 'Database Management Systems',
    facultyIds,
  });
  const units = {};
  for (const u of DBMS_UNITS) units[u.number] = await Unit.create({ ...u, subjectId: subject._id });

  const topics = {};
  let col = 0;
  for (const [i, t] of DBMS_TOPICS.entries()) {
    topics[t.key] = await Topic.create({
      unitId: units[t.unit]._id,
      subjectId: subject._id,
      title: t.title,
      summary: t.summary,
      order: i,
      position: { x: 260 * col++, y: t.unit === 4 ? 220 : 0 },
      status,
    });
  }
  const links = await TopicLink.insertMany(
    DBMS_LINKS.map((l) => ({
      subjectId: subject._id,
      fromTopicId: topics[l.from]._id,
      toTopicId: topics[l.to]._id,
      type: l.type,
      reason: l.reason,
      status,
    })),
  );
  return { subject, units, topics, links };
}
