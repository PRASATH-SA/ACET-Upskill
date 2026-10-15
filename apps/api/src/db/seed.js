/**
 * npm run seed (A.9): 1 admin, 2 faculty, 1 mentor, 10 students, the CSE Sem 5 syllabus version,
 * and the DBMS subject (Unit 3 Database Design + Indexing in Unit 4) with links.
 * Also publishes demo content for "Normalization" so the student flow can be tried at once.
 *
 *   npm run seed            refuses to run if users already exist
 *   npm run seed -- --reset drops the database first (never allowed in production)
 */
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { hashPassword } from '../modules/auth/service.js';
import { Flashcard, Question, Resource } from '../modules/content/model.js';
import { Pyq } from '../modules/exam/model.js';
import { Department, SyllabusVersion } from '../modules/org/model.js';
import { CourseOutcome, TopicCO } from '../modules/outcomes/model.js';
import { User } from '../modules/users/model.js';
import { Workshop } from '../modules/workshops/model.js';
import { connectMongo, disconnectMongo } from './connect.js';
import { createDbmsSubject } from './dbmsSyllabus.js';

export const SEED_PASSWORD = 'Acet@2025';
const DOMAIN = 'acet.test';

export async function seed() {
  const dept = await Department.create({ name: 'Computer Science and Engineering', code: 'CSE' });
  const version = await SyllabusVersion.create({
    university: 'Pondicherry University',
    regulation: 'R2023',
    branch: 'CSE',
    academicYear: '2025-26',
    isActive: true,
  });
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const base = { passwordHash, departmentId: dept._id };

  const admin = await User.create({
    ...base,
    name: 'HOD CSE',
    email: `admin@${DOMAIN}`,
    role: 'admin',
  });
  const faculty1 = await User.create({
    ...base,
    name: 'Dr. Meena R',
    email: `faculty1@${DOMAIN}`,
    role: 'faculty',
  });
  const faculty2 = await User.create({
    ...base,
    name: 'Mr. Arun K',
    email: `faculty2@${DOMAIN}`,
    role: 'faculty',
  });
  const mentor = await User.create({
    ...base,
    name: 'Ms. Kavitha S',
    email: `mentor@${DOMAIN}`,
    role: 'mentor',
  });
  const studentNames = [
    'Aarthi',
    'Bharath',
    'Charan',
    'Divya',
    'Ezhil',
    'Farhan',
    'Gayathri',
    'Hari',
    'Ishwarya',
    'Jagan',
  ];
  const students = await User.insertMany(
    studentNames.map((name, i) => ({
      ...base,
      name,
      email: `student${String(i + 1).padStart(2, '0')}@${DOMAIN}`,
      role: 'student',
      batch: '2023-27',
      syllabusVersionId: version._id,
      mentorId: mentor._id,
    })),
  );

  const { subject, topics } = await createDbmsSubject({
    syllabusVersionId: version._id,
    facultyIds: [faculty1._id, faculty2._id],
    status: 'approved',
  });

  // Demo content for Normalization, published by faculty1.
  const now = new Date();
  const pub = {
    topicId: topics.normalization._id,
    subjectId: subject._id,
    status: 'published',
    source: 'faculty',
    createdBy: faculty1._id,
    approvedBy: faculty1._id,
    approvedAt: now,
    publishedAt: now,
  };
  await Resource.insertMany([
    {
      ...pub,
      kind: 'curiosity',
      body: 'Your hostel keeps one big register: student name, room, warden phone and mess fee on every line. The warden changes phone number. How many lines must be edited?',
    },
    {
      ...pub,
      kind: 'easy',
      body: 'Normalization means **keeping each fact in one place**. Instead of one huge table that repeats the same details again and again, we split it into smaller tables linked by keys.\n\nThink of a school notebook: you write a friend’s phone number once in the contacts page, not on every page where you mention them. If the number changes, you fix it once.',
    },
    {
      ...pub,
      kind: 'tenMark',
      body: '## Definition\nNormalization is the process of organising the attributes of relations to reduce redundancy and remove insertion, update and deletion anomalies, using functional dependencies.\n\n## Need\n- Redundant data wastes storage.\n- Redundancy causes anomalies.\n\n## Explanation\n1. **1NF** – atomic values, no repeating groups.\n2. **2NF** – 1NF and no partial dependency on a composite key.\n3. **3NF** – 2NF and no transitive dependency.\n4. **BCNF** – every determinant is a candidate key.\n\n## Example\nSTUDENT(RegNo, Name, Dept, HOD): Dept → HOD is transitive, so split into STUDENT(RegNo, Name, Dept) and DEPT(Dept, HOD).\n\n## Advantages\n- Less redundancy, consistent data, easier maintenance.\n\n## Conclusion\nNormalization gives a clean schema; designers may denormalize later for performance.',
    },
    {
      ...pub,
      kind: 'realWorld',
      body: '- Bank customer and account tables are kept separate so an address change is one update.\n- College ERP keeps student, course and enrolment tables apart.\n- E-commerce stores products once and references them from orders.',
    },
  ]);
  await Flashcard.insertMany([
    {
      ...pub,
      front: 'What is normalization?',
      back: 'Organising relations to reduce redundancy and remove anomalies, using functional dependencies.',
    },
    {
      ...pub,
      front: 'What does 2NF remove?',
      back: 'Partial dependencies on part of a composite key.',
    },
    {
      ...pub,
      front: 'What does 3NF remove?',
      back: 'Transitive dependencies between non-key attributes.',
    },
    {
      ...pub,
      front: 'Name the three anomalies.',
      back: 'Insertion, update and deletion anomalies.',
    },
    {
      ...pub,
      front: 'When is a relation in BCNF?',
      back: 'When every determinant is a candidate key.',
    },
  ]);
  const mcq = (stem, options, correctIndex, explanation, optionExplanations) => ({
    ...pub,
    type: 'mcq',
    stem,
    options,
    correctIndex,
    explanation,
    optionExplanations,
    difficulty: 'medium',
  });
  await Question.insertMany([
    mcq(
      'Which normal form removes transitive dependencies?',
      ['1NF', '2NF', '3NF', 'BCNF'],
      2,
      '3NF requires no non-key attribute to depend on another non-key attribute.',
      [
        '1NF is about atomic values.',
        '2NF removes partial dependencies.',
        'Correct.',
        'BCNF is stricter but 3NF is the one defined by transitive dependency.',
      ],
    ),
    mcq(
      'Updating a department’s HOD in many rows is an example of…',
      ['Insertion anomaly', 'Update anomaly', 'Deletion anomaly', 'No anomaly'],
      1,
      'The same fact is stored many times, so one change needs many updates.',
      [
        'Insertion anomaly is about not being able to add data.',
        'Correct.',
        'Deletion anomaly loses data unintentionally.',
        'Repeating data is the anomaly.',
      ],
    ),
    mcq(
      'A relation with a repeating group violates…',
      ['1NF', '2NF', '3NF', 'BCNF'],
      0,
      '1NF requires atomic values with no repeating groups.',
      [
        'Correct.',
        '2NF assumes 1NF already holds.',
        '3NF assumes 2NF already holds.',
        'BCNF assumes 3NF already holds.',
      ],
    ),
    mcq(
      'Partial dependency can exist only when the primary key is…',
      ['A single attribute', 'Composite', 'A foreign key', 'Null'],
      1,
      'Only a composite key has a "part" for an attribute to depend on.',
      [
        'A single-attribute key has no proper part.',
        'Correct.',
        'Foreign keys are not what 2NF talks about.',
        'Primary keys cannot be null.',
      ],
    ),
    mcq(
      'Normalization is defined mainly using…',
      ['Indexes', 'Functional dependencies', 'Triggers', 'Views'],
      1,
      'Normal forms are stated in terms of functional dependencies.',
      [
        'Indexes affect speed, not normal forms.',
        'Correct.',
        'Triggers are procedural code.',
        'Views are virtual tables.',
      ],
    ),
  ]);
  await Question.create({
    ...pub,
    type: 'curiosity',
    stem: 'The warden changed phone number. The hostel register repeats it on 300 lines. What is the smartest fix?',
    options: [
      'Edit all 300 lines',
      'Keep the phone number once in a Warden table',
      'Stop storing phone numbers',
    ],
    correctIndex: 1,
    explanation: 'Store each fact once and link to it: that is the idea behind normalization.',
  });

  const pyqBase = {
    subjectId: subject._id,
    status: 'published',
    source: 'faculty',
    createdBy: faculty1._id,
  };
  const year = (y, m = 4) => new Date(Date.UTC(y, m, 10));
  const thisYear = now.getUTCFullYear();
  await Pyq.insertMany([
    {
      ...pyqBase,
      text: 'Explain 1NF, 2NF and 3NF with suitable examples.',
      marks: 16,
      examDate: year(thisYear - 1),
      topicIds: [topics.normalization._id, topics.nf123._id],
    },
    {
      ...pyqBase,
      text: 'What is normalization? Why is it needed?',
      marks: 2,
      examDate: year(thisYear - 2, 10),
      topicIds: [topics.normalization._id],
    },
    {
      ...pyqBase,
      text: 'Discuss insertion, deletion and update anomalies with an example.',
      marks: 8,
      examDate: year(thisYear - 3),
      topicIds: [topics.anomalies._id, topics.normalization._id],
    },
    {
      ...pyqBase,
      text: 'Define BCNF. How is it different from 3NF?',
      marks: 8,
      examDate: year(thisYear - 1, 10),
      topicIds: [topics.bcnf._id],
    },
    {
      ...pyqBase,
      text: 'Explain B+ tree indexing.',
      marks: 16,
      examDate: year(thisYear - 2),
      topicIds: [topics.indexing._id],
    },
  ]);
  await Workshop.create({
    topicId: topics.normalization._id,
    subjectId: subject._id,
    brief:
      'Take the hostel mess billing sheet (student, room, meal plan, warden, fee) and normalize it to 3NF. Submit the final tables with their keys.',
    dueAt: new Date(now.getTime() + 14 * 86_400_000),
    createdBy: faculty1._id,
  });

  const co1 = await CourseOutcome.create({
    subjectId: subject._id,
    code: 'CO1',
    text: 'Explain the relational model and the role of keys.',
    poMappings: [
      { po: 'PO1', level: 3 },
      { po: 'PO2', level: 2 },
    ],
  });
  const co2 = await CourseOutcome.create({
    subjectId: subject._id,
    code: 'CO2',
    text: 'Apply normalization to design relational schemas free of anomalies.',
    poMappings: [
      { po: 'PO2', level: 3 },
      { po: 'PO3', level: 2 },
    ],
  });
  await TopicCO.insertMany([
    { coId: co1._id, topicId: topics.relational._id },
    { coId: co1._id, topicId: topics.keys._id },
    ...['fd', 'anomalies', 'normalization', 'nf123', 'bcnf'].map((k) => ({
      coId: co2._id,
      topicId: topics[k]._id,
    })),
  ]);

  return { admin, faculty: [faculty1, faculty2], mentor, students, subject, version };
}

async function main() {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // no .env
  }
  const cfg = loadEnv();
  const reset = process.argv.includes('--reset');
  await connectMongo(cfg.MONGO_URI, { retries: 3 });
  try {
    if (reset) {
      if (cfg.NODE_ENV === 'production')
        throw new Error('Refusing to --reset a production database');
      await mongoose.connection.dropDatabase();
      logger.info('database dropped');
    } else if (await User.exists({})) {
      throw new Error(
        'Users already exist. Run "npm run seed -- --reset" to wipe and reseed (development only).',
      );
    }
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
    const r = await seed();
    const lines = [
      'Seed complete. All accounts use the password: ' + SEED_PASSWORD,
      `  admin    ${r.admin.email}`,
      `  faculty  ${r.faculty.map((f) => f.email).join(', ')}`,
      `  mentor   ${r.mentor.email}`,
      `  students ${r.students[0].email} … ${r.students[r.students.length - 1].email}`,
      `  subject  ${r.subject.code} ${r.subject.name} (${r.subject._id})`,
    ];
    process.stdout.write(lines.join('\n') + '\n');
  } finally {
    await disconnectMongo();
  }
}

// Run only when executed directly (tests import seed()).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    logger.fatal({ err: err.message }, 'seed failed');
    process.stderr.write(`Seed failed: ${err.message}\n`);
    process.exit(1);
  });
}
