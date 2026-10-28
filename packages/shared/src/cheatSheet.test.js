import { describe, expect, it } from 'vitest';
import {
  buildCheatSheet,
  blocksOf,
  cheatPoster,
  clip,
  firstSentence,
  plainText,
  sectionsOf,
  titleParts,
  toPoint,
} from './cheatSheet.js';

const tenMark = [
  '## Definition',
  'The relational model, proposed by E. F. Codd in 1970, represents a database as a collection of relations. A relation is a table.',
  '',
  '## Terminology',
  '- **Relation:** a table, e.g. STUDENT.',
  '- **Tuple:** a row; one record.',
  '- **Attribute:** a named column.',
  '- **Domain:** the set of allowed values.',
  '- **Degree:** the number of attributes.',
  '',
  '## Properties of a relation',
  '1. Each cell holds an atomic value.',
  '2. No two tuples are identical.',
  '',
  '| a | b |',
  '|---|---|',
  '',
  '```sql',
  'SELECT * FROM student;',
  '```',
  '',
  '## Conclusion',
  'The relational model is the foundation of MySQL and PostgreSQL. More text here.',
].join('\n');

const page = {
  topic: {
    id: 't1',
    title: 'Relational Model',
    summary: 'Data as **tables** of rows and columns.',
    subject: { id: 's1', code: 'CS T53', name: 'DBMS' },
    unit: { id: 'u3', number: 3, title: 'Database Design' },
  },
  tenMark: { id: 'tm', body: tenMark },
  realWorld: { id: 'rw', body: '- **IRCTC:** a ticket is a tuple.\n- **UPI:** a transaction row.' },
  shortAnswers: [{ id: 'f1', question: 'What is a tuple?', answer: 'One **row** of a relation.' }],
  prerequisites: [{ id: 't0', title: 'Data Models' }],
  unlocks: [{ id: 't2', title: 'Keys' }],
  pyqs: [
    { id: 'p1', text: 'Explain…', marks: 10 },
    { id: 'p2', text: 'Define…', marks: 2 },
    { id: 'p3', text: 'Explain…', marks: 10 },
  ],
};

describe('cheat sheet helpers', () => {
  it('strips inline markdown', () => {
    expect(plainText('A **bold** _word_ with `code` and [a link](http://x).')).toBe(
      'A bold word with code and a link.',
    );
  });

  it('keeps snake_case names and multiplication', () => {
    expect(plainText('Use my_var_name and 2*3*4, not *this*.')).toBe(
      'Use my_var_name and 2*3*4, not this.',
    );
  });

  it('clips at a word boundary', () => {
    expect(clip('one two three four five', 14)).toBe('one two three…');
    expect(clip('short', 14)).toBe('short');
  });

  it('does not end the first sentence at initials', () => {
    expect(firstSentence('Proposed by E. F. Codd in 1970 at IBM. Then more.')).toBe(
      'Proposed by E. F. Codd in 1970 at IBM.',
    );
  });

  it('splits a bold term from its text', () => {
    expect(toPoint('**Tuple:** a row')).toEqual({ term: 'Tuple', text: 'a row' });
    expect(toPoint('**Key** – unique id')).toEqual({ term: 'Key', text: 'unique id' });
    expect(toPoint('plain *point*')).toEqual({ text: 'plain point' });
  });

  it('turns table rows into points and keeps code for code-only sections', () => {
    const md = [
      '### Arithmetic',
      '| Op | Meaning | Example |',
      '|---|---|---|',
      '| + | Addition | 10 + 5 |',
      '## if-else',
      '```python',
      'if mark >= 50:',
      '    print("Pass")',
      '```',
    ].join('\n');
    expect(sectionsOf(md)).toEqual([
      { heading: 'Arithmetic', points: [{ term: '+', text: 'Addition · 10 + 5' }] },
      { heading: 'if-else', points: [{ code: 'if mark >= 50:\n    print("Pass")' }] },
    ]);
  });

  it('prefers prose over code in a section, keeping the code for the syntax box', () => {
    const s = sectionsOf('## A\n```\n- not a point\n```\nThe block prints a value.');
    expect(s).toEqual([
      { heading: 'A', points: [{ text: 'The block prints a value.' }], code: '- not a point' },
    ]);
  });
});

describe('buildCheatSheet', () => {
  const sheet = buildCheatSheet(page);

  it('uses the summary as the big idea and keeps the definition beside it', () => {
    expect(sheet.bigIdea).toBe('Data as tables of rows and columns.');
    expect(sheet.definition).toMatch(/^The relational model, proposed by E\. F\. Codd/);
  });

  it('turns note sections into tiles, capped at four points each', () => {
    expect(sheet.tiles.map((t) => t.heading)).toEqual(['Terminology', 'Properties of a relation']);
    expect(sheet.tiles[0].points).toHaveLength(4);
    expect(sheet.tiles[0].points[0]).toEqual({ term: 'Relation', text: 'a table, e.g. STUDENT.' });
    expect(sheet.tiles[0].more).toBe(1);
  });

  it('collects the takeaway, recall, real world, links and exam radar', () => {
    expect(sheet.takeaway).toMatch(/^The relational model is the foundation/);
    expect(sheet.recall).toEqual([{ q: 'What is a tuple?', a: 'One row of a relation.' }]);
    expect(sheet.realWorld[0]).toEqual({ term: 'IRCTC', text: 'a ticket is a tuple.' });
    expect(sheet.buildsOn).toEqual(['Data Models']);
    expect(sheet.unlocks).toEqual(['Keys']);
    expect(sheet.exam).toEqual({ count: 3, marks: [2, 10] });
  });

  it('falls back to the easy explanation when there are no exam notes', () => {
    const s = buildCheatSheet({
      topic: { title: 'Cells', subject: { code: 'BOT', name: 'Biology' } },
      easy: {
        body: 'A cell is the smallest unit of life. It has parts.\n\n- **Nucleus:** the control centre',
      },
    });
    expect(s.bigIdea).toBe('A cell is the smallest unit of life.');
    expect(s.tiles[0].points).toContainEqual({ term: 'Nucleus', text: 'the control centre' });
    expect(s.unit).toBeNull();
    expect(s.exam).toBeNull();
  });

  it('returns null when nothing is published', () => {
    expect(buildCheatSheet({ topic: { title: 'Empty', subject: {} } })).toBeNull();
    expect(
      buildCheatSheet({ topic: { title: 'Only', summary: 'A line.', subject: {} } }),
    ).toBeNull();
    expect(buildCheatSheet(null)).toBeNull();
  });
});

describe('blocksOf', () => {
  const md = [
    '## Mechanism',
    'Enzymes bind a substrate at the active site. They lower the activation energy. Extra text.',
    '1. **Binding:** substrate fits the active site.',
    '2. **Complex:** enzyme–substrate complex forms.',
    '- **Replication (lytic cycle):** attachment → penetration → replication → release.',
    '## Formulas',
    '- **Transitivity:** if X → Y and Y → Z then X → Z.',
    'Gene expression: transcription (DNA → mRNA) and translation (mRNA → protein).',
    '## Types',
    '| Type | Units | Example |',
    '|---|---|---|',
    '| Sucrose | Glucose + fructose | Sugarcane |',
    '```python',
    'if x:',
    '    pass',
    '```',
  ].join('\n');
  const [mech, formulas, types] = blocksOf(md);

  it('keeps paragraphs, numbered steps and arrow chains as their own blocks', () => {
    expect(mech.blocks.map((b) => b.type)).toEqual(['text', 'steps', 'flow']);
    expect(mech.blocks[0].text).toBe(
      'Enzymes bind a substrate at the active site. They lower the activation energy.',
    );
    expect(mech.blocks[1].items[0]).toEqual({
      term: 'Binding',
      text: 'substrate fits the active site.',
    });
    expect(mech.blocks[2]).toEqual({
      type: 'flow',
      label: 'Replication (lytic cycle)',
      items: ['attachment', 'penetration', 'replication', 'release'],
      more: 0,
    });
  });

  it('does not draw formulas or bracketed arrows as flowcharts', () => {
    expect(formulas.blocks.map((b) => b.type)).toEqual(['bullets', 'text']);
  });

  it('keeps tables with their header, and code', () => {
    expect(types.blocks[0]).toEqual({
      type: 'table',
      head: ['Type', 'Units', 'Example'],
      items: [['Sucrose', 'Glucose + fructose', 'Sugarcane']],
      more: 0,
    });
    expect(types.blocks[1]).toEqual({ type: 'code', lang: 'python', code: 'if x:\n    pass' });
  });
});

describe('cheatPoster', () => {
  const notes = [
    '## Introduction',
    'Biosensors were first built by Leland C. Clark in 1962. They are used in glucose meters.',
    '## Classification',
    '| Type | Signal | Example |',
    '|---|---|---|',
    '| Optical | Colour | Pregnancy test |',
    '## Components',
    'Analyte → Bioreceptor → Transducer → Display.',
    '## Conclusion',
    'Biosensors join biology and electronics. They power smart health devices.',
  ].join('\n');
  const poster = cheatPoster(buildCheatSheet({ ...page, tenMark: { id: 'tm', body: notes } }));
  const cards = poster.rows.flat();

  it('splits the title into its key words and the rest', () => {
    expect(titleParts('Cell Division: Mitosis and Meiosis')).toEqual({
      key: 'Cell Division',
      rest: ': Mitosis and Meiosis',
    });
    expect(titleParts('Cell Biology in Engineering')).toEqual({
      key: 'Cell Biology',
      rest: ' in Engineering',
    });
    expect(titleParts('Carbohydrates')).toEqual({ key: 'Carbohydrates', rest: '' });
  });

  it('has a title bar with marks, unit and exam pills', () => {
    expect(poster).toMatchObject({ titleKey: 'Relational Model', marks: 10, badge: 'Unit 3' });
    expect(poster.tag).toBe('Asked 3× · 2 & 10 marks');
  });

  it('numbers the cards: intro, sections, key points, real world, conclusion', () => {
    expect(cards.map((c) => c.heading)).toEqual([
      'Introduction',
      'Classification',
      'Components',
      'Key points to remember',
      'In the real world',
      'Conclusion',
    ]);
    expect(cards.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(cards[0].blocks[0].items.map((p) => p.text)).toEqual([
      'Data as tables of rows and columns.',
      'Biosensors were first built by Leland C. Clark in 1962.',
      'They are used in glucose meters.',
    ]);
    expect(cards[2].blocks[0].type).toBe('flow');
    expect(cards[5]).toMatchObject({ kind: 'conclusion', color: 'pink' });
    expect(cards[5].blocks[0].items).toHaveLength(2);
  });

  it('makes cards with wide tables span two columns and packs rows of four', () => {
    expect(cards[1].span).toBe(2);
    expect(poster.rows.map((r) => r.reduce((n, c) => n + c.span, 0))).toEqual([4, 3]);
    expect(cheatPoster(null)).toBeNull();
  });
});
