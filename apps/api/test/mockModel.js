import { gateway } from '../src/ai/gateway/index.js';

/**
 * Scripted answers for the mock LLM (A1: no real model in tests or e2e). Deterministic, derived
 * from the prompt text, so pipeline orchestration and saving can be checked end to end.
 */
const mock = () => gateway().provider;
const userText = (req) => req.messages.at(-1).content;
const between = (text, start, end) => text.split(start)[1]?.split(end)[0] ?? '';

/**
 * Deterministic stand-in for the model on the map tasks:
 * topics = the comma-separated phrases of the unit text; prerequisites chain them in order
 * plus one weak back-link that forms a cycle; cross-unit links join each unit's first topic
 * to the next unit's first topic.
 */
export function scriptMapModel() {
  mock().on('syllabus.topics', (req) => {
    const text = between(userText(req), '"""\n', '\n"""');
    const titles = text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      topics: titles.map((t) => ({
        title: t,
        summary: `${t} in database systems.`,
        subtopics:
          t === 'Normalization'
            ? [{ title: 'Lossless Decomposition', summary: 'Splitting without losing data.' }]
            : [],
      })),
    };
  });
  mock().on('syllabus.prereqs', (req) => {
    const n = (between(userText(req), 'Topics:\n', '\n\nA link').match(/^\d+\./gm) ?? []).length;
    const links = [];
    for (let i = 1; i < n; i++)
      links.push({
        from: i,
        to: i + 1,
        reason: `Topic ${i} comes before ${i + 1}.`,
        confidence: 0.9,
      });
    if (n >= 3)
      links.push({
        from: n,
        to: 1,
        reason: 'A weak back-link that makes a cycle.',
        confidence: 0.1,
      });
    links.push({ from: 1, to: 1, reason: 'Self links must be dropped.', confidence: 0.9 });
    links.push({ from: 1, to: 99, reason: 'Unknown numbers must be dropped.', confidence: 0.9 });
    return { links };
  });
  mock().on('syllabus.crossLinks', (req) => {
    const lines = between(userText(req), 'Topics (with their unit):\n', '\n\nFind').split('\n');
    const firstOfUnit = new Map();
    lines.forEach((l, i) => {
      const unit = l.match(/\[Unit (\d+)\]/)?.[1];
      if (unit && !firstOfUnit.has(unit)) firstOfUnit.set(unit, i + 1);
    });
    const firsts = [...firstOfUnit.values()];
    return {
      links: firsts.slice(1).map((to, i) => ({
        from: firsts[i],
        to,
        reason: 'These units build on each other.',
        confidence: 0.7,
      })),
    };
  });
}

/** A fresh subject with no topics, owned by the fixture's faculty. */
/** Scripted content answers, all grounded in the Normalization notes. */
export function scriptContentModel({ selfCheckAgrees = true } = {}) {
  mock()
    .on('topic.easy', {
      text: 'Normalization means splitting one big table into smaller tables so that each fact is stored only once and nothing gets out of sync.',
      analogy: 'Like keeping one master attendance register instead of copies in every classroom.',
    })
    .on('topic.tenMark', {
      definition: 'Normalization organises tables to reduce redundancy.',
      need: 'Redundant data causes update, insertion and deletion anomalies.',
      points: [
        { heading: '1NF', text: 'Atomic values and no repeating groups.' },
        { heading: '2NF', text: 'No partial dependency on a composite key.' },
        { heading: '3NF', text: 'No transitive dependency between non-key attributes.' },
      ],
      example:
        'Split Student(Roll, Name, Dept, HOD) into Student(Roll, Name, Dept) and Dept(Dept, HOD).',
      advantages: ['Less redundancy', 'No anomalies'],
      conclusion: 'Normalization keeps data consistent through lossless decomposition.',
    })
    .on('topic.flashcards', (_req, n) => ({
      cards: Array.from({ length: 5 }, (_, i) => ({
        front: `Flashcard question ${n}-${i} about normal forms?`,
        back: `Answer ${n}-${i}.`,
      })),
    }))
    .on('topic.mcqs', (_req, n) => ({
      questions: Array.from({ length: 5 }, (_, i) => ({
        stem: `Question ${n}-${i}: which normal form removes partial dependency?`,
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctIndex: 1,
        explanation: '2NF removes partial dependency.',
        optionExplanations: [
          'Atomic values only.',
          'Correct.',
          'Transitive dependency.',
          'Stricter than 3NF.',
        ],
        difficulty: 'medium',
      })),
    }))
    .on('mcq.selfCheck', (req) => ({
      answerIndex: selfCheckAgrees || !userText(req).includes('-0:') ? 1 : 2,
    }))
    .on('topic.curiosity', {
      title: 'The address that would not update',
      scenario:
        'A college office stores each student address in five different registers. A student moves house.',
      question: 'What goes wrong?',
      options: [
        'Nothing',
        'Some registers keep the old address',
        'The student gets two roll numbers',
      ],
      correctIndex: 1,
      explanation: 'Storing a fact many times causes update anomalies.',
      optionExplanations: ['Copies drift apart.', 'Yes: an update anomaly.', 'Unrelated.'],
    })
    .on('topic.realWorld', {
      uses: [
        'Banking systems keep one customer record.',
        'Railway reservation stores trains once.',
        'College ERP keeps one student table.',
      ],
      workshop: {
        title: 'Normalise a mess sheet',
        brief:
          '1. Take the sample mess-bill sheet. 2. List its functional dependencies. 3. Split it into 3NF tables.',
        deliverable: 'A PDF with your tables and dependencies.',
      },
    });
}
