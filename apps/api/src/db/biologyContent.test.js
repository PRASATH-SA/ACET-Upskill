import { describe, expect, it } from 'vitest';
import { BIOLOGY_CONTENT, BIOLOGY_OVERVIEW } from './biologyContent.js';
import { BIOLOGY_COS, BIOLOGY_LINKS, BIOLOGY_TOPICS, BIOLOGY_UNITS } from './biologySyllabus.js';

describe('Biology content pack (BOT26105)', () => {
  const keys = BIOLOGY_TOPICS.map((t) => t.key);

  it('has full content for every topic and nothing else', () => {
    expect(Object.keys(BIOLOGY_CONTENT).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      const c = BIOLOGY_CONTENT[key];
      expect(c.video?.url, key).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
      for (const kind of ['curiosity', 'easy', 'tenMark', 'realWorld'])
        expect(c[kind]?.length, `${key}.${kind}`).toBeGreaterThan(50);
      expect(c.flashcards, key).toHaveLength(5);
      expect(c.mcqs, key).toHaveLength(5);
      const q = c.curiosityQuestion;
      expect(q.correctIndex, key).toBeLessThan(q.options.length);
    }
  });

  it('has valid MCQs: answer in range and one explanation per option', () => {
    for (const key of keys)
      for (const m of BIOLOGY_CONTENT[key].mcqs) {
        expect(m.options.length, m.stem).toBeGreaterThanOrEqual(3);
        expect(m.correctIndex, m.stem).toBeLessThan(m.options.length);
        expect(m.optionExplanations, m.stem).toHaveLength(m.options.length);
        expect(['easy', 'medium', 'hard']).toContain(m.difficulty);
      }
  });

  it('links, course outcomes and the overview refer to real topics and units', () => {
    for (const l of BIOLOGY_LINKS) {
      expect(keys).toContain(l.from);
      expect(keys).toContain(l.to);
    }
    for (const co of BIOLOGY_COS) for (const k of co.topics) expect(keys).toContain(k);
    expect(Object.keys(BIOLOGY_OVERVIEW.units).map(Number)).toEqual(
      BIOLOGY_UNITS.map((u) => u.number),
    );
  });
});
