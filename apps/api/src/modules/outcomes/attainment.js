/**
 * CO–PO attainment (B5.5). Pure functions so the numbers can be checked by hand in tests.
 *
 * Per student, per CO: score = correct / answered over the student's LATEST attempt of each
 * question on the CO's topics. A student "attains" the CO when score ≥ threshold (%).
 * CO attainment % = students attaining / students who answered at least one CO question.
 * CO level (NBA-style): 3 if ≥ 70 %, 2 if ≥ 60 %, 1 if ≥ 50 %, otherwise 0.
 * PO attainment = Σ(CO level × correlation) / Σ(correlation) over COs mapped to that PO.
 */
export const LEVEL_BANDS = Object.freeze([
  { level: 3, minPercent: 70 },
  { level: 2, minPercent: 60 },
  { level: 1, minPercent: 50 },
]);

export function attainmentLevel(percent) {
  if (percent === null) return null;
  return LEVEL_BANDS.find((b) => percent >= b.minPercent)?.level ?? 0;
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {object} input
 * @param {{ id: string, code: string, text: string, poMappings: {po:string, level:number}[] }[]} input.cos
 * @param {Map<string, string[]>} input.coTopics CO id → topic ids
 * @param {{ userId: string, topicId: string, questionId: string, correct: boolean, answeredAt: Date }[]} input.attempts
 * @param {number} input.threshold percent, e.g. 60
 */
export function computeAttainment({ cos, coTopics, attempts, threshold }) {
  // Latest attempt per (student, question).
  const latest = new Map();
  for (const a of attempts) {
    const key = `${a.userId}:${a.questionId}`;
    const prev = latest.get(key);
    if (!prev || new Date(a.answeredAt) > new Date(prev.answeredAt)) latest.set(key, a);
  }
  const latestList = [...latest.values()];

  const coRows = cos.map((co) => {
    const topics = new Set(coTopics.get(co.id) ?? []);
    const perStudent = new Map();
    for (const a of latestList) {
      if (!topics.has(a.topicId)) continue;
      const s = perStudent.get(a.userId) ?? { answered: 0, correct: 0 };
      s.answered += 1;
      if (a.correct) s.correct += 1;
      perStudent.set(a.userId, s);
    }
    const studentsAssessed = perStudent.size;
    const studentsAttained = [...perStudent.values()].filter(
      (s) => (s.correct / s.answered) * 100 >= threshold,
    ).length;
    const percent = studentsAssessed ? round1((studentsAttained / studentsAssessed) * 100) : null;
    return {
      coId: co.id,
      code: co.code,
      text: co.text,
      topicCount: topics.size,
      studentsAssessed,
      studentsAttained,
      attainmentPercent: percent,
      level: attainmentLevel(percent),
      poMappings: co.poMappings ?? [],
    };
  });

  const poTotals = new Map();
  for (const row of coRows) {
    if (row.level === null) continue;
    for (const m of row.poMappings) {
      const t = poTotals.get(m.po) ?? { weighted: 0, weight: 0 };
      t.weighted += row.level * m.level;
      t.weight += m.level;
      poTotals.set(m.po, t);
    }
  }
  const poRows = [...poTotals.entries()]
    .map(([po, t]) => ({ po, attainment: round2(t.weighted / t.weight) }))
    .sort((a, b) => a.po.localeCompare(b.po, 'en', { numeric: true }));

  return { threshold, cos: coRows, pos: poRows };
}

/** CSV export of an attainment report. */
export function attainmentCsv(report, subject) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    `Subject,${esc(`${subject.code} ${subject.name}`)}`,
    `Threshold %,${report.threshold}`,
    '',
    'CO,Statement,Topics,Students assessed,Students attained,Attainment %,Level,PO mapping',
    ...report.cos.map((c) =>
      [
        c.code,
        c.text,
        c.topicCount,
        c.studentsAssessed,
        c.studentsAttained,
        c.attainmentPercent ?? '',
        c.level ?? '',
        c.poMappings.map((m) => `${m.po}:${m.level}`).join(' '),
      ]
        .map(esc)
        .join(','),
    ),
    '',
    'PO,Attainment (0-3)',
    ...report.pos.map((p) => `${p.po},${p.attainment}`),
  ];
  return lines.join('\n') + '\n';
}
