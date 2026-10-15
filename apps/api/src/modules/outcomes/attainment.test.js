import { describe, expect, it } from 'vitest';
import { attainmentCsv, attainmentLevel, computeAttainment } from './attainment.js';

/**
 * Hand calculation (threshold 60 %):
 *   CO1 = topics t1, t2.  CO2 = topic t3.
 *   A: q1 ✓, q2 ✗ then ✓ (latest counts), q3 ✗  → CO1 2/3 = 66.7 % ✓ ; q4 ✗ → CO2 0 % ✗
 *   B: q1 ✗, q3 ✓                               → CO1 1/2 = 50 %  ✗ ; q4 ✓ → CO2 100 % ✓
 *   C: (no CO1 questions)                        → not assessed    ; q4 ✓ → CO2 100 % ✓
 *   CO1: 1 of 2 assessed attain → 50 %   → level 1
 *   CO2: 2 of 3 assessed attain → 66.7 % → level 2
 *   PO1 (CO1:3, CO2:2) = (1×3 + 2×2) / (3 + 2) = 1.4
 *   PO2 (CO1:1)        = (1×1) / 1             = 1
 */
const t = (d) => new Date(`2026-02-${String(d).padStart(2, '0')}T10:00:00Z`);
const attempts = [
  { userId: 'A', topicId: 't1', questionId: 'q1', correct: true, answeredAt: t(1) },
  { userId: 'A', topicId: 't1', questionId: 'q2', correct: false, answeredAt: t(1) },
  { userId: 'A', topicId: 't1', questionId: 'q2', correct: true, answeredAt: t(5) },
  { userId: 'A', topicId: 't2', questionId: 'q3', correct: false, answeredAt: t(2) },
  { userId: 'A', topicId: 't3', questionId: 'q4', correct: false, answeredAt: t(2) },
  { userId: 'B', topicId: 't1', questionId: 'q1', correct: false, answeredAt: t(3) },
  { userId: 'B', topicId: 't2', questionId: 'q3', correct: true, answeredAt: t(3) },
  { userId: 'B', topicId: 't3', questionId: 'q4', correct: true, answeredAt: t(3) },
  { userId: 'C', topicId: 't3', questionId: 'q4', correct: true, answeredAt: t(4) },
  { userId: 'C', topicId: 'tX', questionId: 'q9', correct: false, answeredAt: t(4) }, // topic not in any CO
];
const cos = [
  {
    id: 'co1',
    code: 'CO1',
    text: 'Design relations',
    poMappings: [
      { po: 'PO1', level: 3 },
      { po: 'PO2', level: 1 },
    ],
  },
  { id: 'co2', code: 'CO2', text: 'Normalize schemas', poMappings: [{ po: 'PO1', level: 2 }] },
  { id: 'co3', code: 'CO3', text: 'Unmapped CO', poMappings: [{ po: 'PO3', level: 3 }] },
];
const coTopics = new Map([
  ['co1', ['t1', 't2']],
  ['co2', ['t3']],
  ['co3', []],
]);

describe('CO–PO attainment', () => {
  const report = computeAttainment({ cos, coTopics, attempts, threshold: 60 });

  it('matches the hand calculation for COs', () => {
    expect(report.cos[0]).toMatchObject({
      code: 'CO1',
      studentsAssessed: 2,
      studentsAttained: 1,
      attainmentPercent: 50,
      level: 1,
    });
    expect(report.cos[1]).toMatchObject({
      code: 'CO2',
      studentsAssessed: 3,
      studentsAttained: 2,
      attainmentPercent: 66.7,
      level: 2,
    });
    expect(report.cos[2]).toMatchObject({
      code: 'CO3',
      studentsAssessed: 0,
      attainmentPercent: null,
      level: null,
    });
  });

  it('matches the hand calculation for POs and skips unassessed COs', () => {
    expect(report.pos).toEqual([
      { po: 'PO1', attainment: 1.4 },
      { po: 'PO2', attainment: 1 },
    ]);
  });

  it('uses the configurable threshold', () => {
    const lenient = computeAttainment({ cos, coTopics, attempts, threshold: 50 });
    expect(lenient.cos[0]).toMatchObject({ studentsAttained: 2, attainmentPercent: 100, level: 3 });
  });

  it('maps percentages to levels', () => {
    expect([
      attainmentLevel(70),
      attainmentLevel(69.9),
      attainmentLevel(60),
      attainmentLevel(50),
      attainmentLevel(49.9),
      attainmentLevel(null),
    ]).toEqual([3, 2, 2, 1, 0, null]);
  });

  it('exports CSV with escaped fields', () => {
    const csv = attainmentCsv(report, { code: 'CS T53', name: 'DBMS, Part "A"' });
    expect(csv).toContain('Subject,"CS T53 DBMS, Part ""A"""');
    expect(csv).toContain('CO1,Design relations,2,2,1,50,1,PO1:3 PO2:1');
    expect(csv).toContain('PO1,1.4');
  });
});
