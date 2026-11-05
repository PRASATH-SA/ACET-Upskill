import { layoutMap } from '@acet/shared';
import { Subject, Topic, TopicLink, Unit } from '../modules/syllabus/model.js';

/**
 * The seeded PSPP subject (CSC26103, Problem Solving and Python Programming): Units 1 and 2 as
 * given in the faculty notes. Shared by `npm run seed`, `npm run seed:content` and the tests.
 */
export const PSPP_SUBJECT = {
  code: 'CSC26103',
  name: 'Problem Solving and Python Programming',
  semester: 1,
};

export const PSPP_UNITS = [
  { number: 1, title: 'Introduction to Python' },
  { number: 2, title: 'Decision Making and Looping' },
];

export const PSPP_TOPICS = [
  {
    key: 'intro',
    unit: 1,
    title: 'Introduction to Python',
    summary: 'What Python is, who made it, and how an interpreter differs from a compiler.',
  },
  {
    key: 'features',
    unit: 1,
    title: 'Features of Python',
    summary: 'Free, portable, interpreted, high-level and easy to read.',
  },
  {
    key: 'execution',
    unit: 1,
    title: 'Installation and Execution',
    summary: 'Installing Python and running code in interactive mode and script mode.',
  },
  {
    key: 'datatypes',
    unit: 1,
    title: 'Variables and Data Types',
    summary: 'Names that refer to values: int, float, complex, bool, str and the collections.',
  },
  {
    key: 'io',
    unit: 1,
    title: 'Input and Output Statements',
    summary: 'Reading data with input() and showing results with print().',
  },
  {
    key: 'operators',
    unit: 1,
    title: 'Operators and Expressions',
    summary: 'Arithmetic, comparison, logical, assignment, bitwise, membership and identity.',
  },
  {
    key: 'typeconv',
    unit: 1,
    title: 'Type Conversion',
    summary: 'Implicit conversion by Python and explicit casting with int(), float(), str().',
  },
  {
    key: 'conditionals',
    unit: 2,
    title: 'Conditional Statements',
    summary: 'Choosing what runs: if, if-else, if-elif-else and nested if.',
  },
  {
    key: 'whileloop',
    unit: 2,
    title: 'While Loop',
    summary: 'Repeating a block while a condition stays True (entry-controlled loop).',
  },
  {
    key: 'forloop',
    unit: 2,
    title: 'For Loop',
    summary: 'Repeating once for each item of a sequence, often with range().',
  },
  {
    key: 'nestedloops',
    unit: 2,
    title: 'Nested Loops',
    summary: 'A loop inside another loop: rows and columns, pairs and grids.',
  },
  {
    key: 'jumps',
    unit: 2,
    title: 'Break, Continue and Pass',
    summary: 'Leaving a loop early, skipping one iteration, or doing nothing as a placeholder.',
  },
  {
    key: 'patterns',
    unit: 2,
    title: 'Pattern Generation',
    summary: 'Printing star, number and alphabet patterns with nested loops.',
  },
  {
    key: 'problemsolving',
    unit: 2,
    title: 'Problem Solving Using Loops',
    summary: 'Sums, counts, factorials and primes: turning a problem into a loop.',
  },
];

export const PSPP_LINKS = [
  {
    from: 'intro',
    to: 'features',
    type: 'prerequisite',
    reason: 'The features make sense once you know what Python and an interpreter are.',
  },
  {
    from: 'intro',
    to: 'execution',
    type: 'prerequisite',
    reason: 'You run Python through its interpreter, in interactive or script mode.',
  },
  {
    from: 'execution',
    to: 'datatypes',
    type: 'prerequisite',
    reason: 'You need a place to run code before you can try variables and types.',
  },
  {
    from: 'datatypes',
    to: 'io',
    type: 'prerequisite',
    reason: 'input() always returns a str and print() displays values of any type.',
  },
  {
    from: 'datatypes',
    to: 'operators',
    type: 'prerequisite',
    reason: 'What an operator does depends on the types of its operands.',
  },
  {
    from: 'io',
    to: 'typeconv',
    type: 'prerequisite',
    reason: 'Numbers typed by the user arrive as strings and must be converted.',
  },
  {
    from: 'operators',
    to: 'typeconv',
    type: 'related',
    reason: 'Mixing int and float in an expression triggers implicit conversion.',
  },
  {
    from: 'operators',
    to: 'conditionals',
    type: 'prerequisite',
    reason: 'Conditions are built from comparison and logical operators.',
  },
  {
    from: 'conditionals',
    to: 'whileloop',
    type: 'prerequisite',
    reason: 'A while loop repeats as long as a condition is True.',
  },
  {
    from: 'datatypes',
    to: 'forloop',
    type: 'prerequisite',
    reason: 'A for loop walks through a sequence such as a string, list or range.',
  },
  {
    from: 'forloop',
    to: 'nestedloops',
    type: 'prerequisite',
    reason: 'A nested loop is a loop placed inside another loop.',
  },
  {
    from: 'whileloop',
    to: 'jumps',
    type: 'prerequisite',
    reason: 'break and continue change how a running loop behaves.',
  },
  {
    from: 'forloop',
    to: 'jumps',
    type: 'prerequisite',
    reason: 'break, continue and pass are used inside for loops too.',
  },
  {
    from: 'nestedloops',
    to: 'patterns',
    type: 'prerequisite',
    reason: 'Patterns use an outer loop for rows and an inner loop for columns.',
  },
  {
    from: 'io',
    to: 'patterns',
    type: 'related',
    reason: 'print(..., end=" ") keeps stars on the same line.',
  },
  {
    from: 'forloop',
    to: 'problemsolving',
    type: 'prerequisite',
    reason: 'Most loop problems repeat a step over a range of numbers.',
  },
  {
    from: 'jumps',
    to: 'problemsolving',
    type: 'related',
    reason: 'break stops a search as soon as the answer is found (e.g. a prime check).',
  },
  {
    from: 'typeconv',
    to: 'problemsolving',
    type: 'related',
    reason: 'Problems read numbers with int(input()) before looping over them.',
  },
];

/**
 * Creates the PSPP subject with its units, topics and links (idempotency is the caller's job).
 * @returns {Promise<{ subject: any, units: Record<number, any>, topics: Record<string, any>, links: any[] }>}
 */
export async function createPsppSubject({
  syllabusVersionId,
  facultyIds = [],
  status = 'approved',
}) {
  const subject = await Subject.create({ ...PSPP_SUBJECT, syllabusVersionId, facultyIds });
  const units = {};
  for (const u of PSPP_UNITS) units[u.number] = await Unit.create({ ...u, subjectId: subject._id });
  const positions = layoutMap(
    PSPP_TOPICS.map((t) => ({ id: t.key, unitId: String(t.unit) })),
    PSPP_LINKS.map((l) => ({ fromTopicId: l.from, toTopicId: l.to, type: l.type })),
    { unitOrder: PSPP_UNITS.map((u) => String(u.number)) },
  );
  const topics = {};
  for (const [i, t] of PSPP_TOPICS.entries()) {
    topics[t.key] = await Topic.create({
      unitId: units[t.unit]._id,
      subjectId: subject._id,
      title: t.title,
      summary: t.summary,
      order: i,
      position: positions[t.key],
      status,
    });
  }
  const links = await TopicLink.insertMany(
    PSPP_LINKS.map((l) => ({
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
