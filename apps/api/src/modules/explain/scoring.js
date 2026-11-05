/**
 * Turns the model's marking into a trustworthy score (feature 13). Pure functions, unit-tested.
 *
 * - Every rubric criterion gets exactly one score, clamped to its points.
 * - Credit needs evidence: the quote must really appear in the student's answer (after ignoring
 *   case and punctuation). Credit without a real quote is removed and the answer is flagged,
 *   so a teacher can restore it. A small model's invented quote never passes a student.
 * - Some answers are sent to the teacher for a spot-check: a random share, plus every answer
 *   the AI was less sure about.
 */

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** True when `quote` appears in `answer`, ignoring case, punctuation and spacing. */
export function quoteFound(quote, answer) {
  const q = norm(quote);
  return q.length > 0 && norm(answer).includes(q);
}

export const wordCount = (s) => norm(s).split(' ').filter(Boolean).length;

/**
 * @param {{ criteria: { id: string, points: number }[], passScore: number }} rubric
 * @param {string} answer  the student's text or transcript
 * @param {{ perCriterion: { criterionId: string, score: number, evidence: string, missing: string }[], feedback: string }} out
 * @param {{ attempts?: number, spotRate?: number, random?: () => number }} [opts]
 */
export function scoreAnswer(
  rubric,
  answer,
  out,
  { attempts = 1, spotRate = 0.1, random = Math.random } = {},
) {
  const byId = new Map(out.perCriterion.map((p) => [p.criterionId, p]));
  const reasons = [];
  let removedCredit = false;
  let skipped = false;

  const perCriterion = rubric.criteria.map((c) => {
    const p = byId.get(c.id);
    if (!p) {
      skipped = true;
      return { criterionId: c.id, score: 0, evidence: '', missing: 'Not assessed by the AI.' };
    }
    let score = Math.max(0, Math.min(c.points, Math.round(p.score)));
    let evidence = p.evidence?.trim() ?? '';
    if (evidence && !quoteFound(evidence, answer)) evidence = '';
    if (score > 0 && !evidence) {
      score = 0;
      removedCredit = true;
    }
    return { criterionId: c.id, score, evidence, missing: p.missing?.trim() ?? '' };
  });

  const total = perCriterion.reduce((n, p) => n + p.score, 0);
  const passed = total >= rubric.passScore;

  if (random() < spotRate) reasons.push('random sample');
  if (Math.abs(total - rubric.passScore) <= 1) reasons.push('near the pass mark');
  if (attempts > 1) reasons.push('AI needed a retry');
  if (wordCount(answer) < 20) reasons.push('very short answer');
  if (removedCredit) reasons.push('AI credit without a quote was removed');
  if (skipped) reasons.push('AI skipped a criterion');

  return { total, passed, perCriterion, feedback: out.feedback.trim(), reasons };
}

/** Rubric lines for the prompt: id, points, what earns them and the key ideas. */
export function formatCriteria(criteria) {
  return criteria
    .map(
      (c) =>
        `- id: ${c.id} | points: ${c.points} | earns points: ${c.text}` +
        (c.keyIdeas?.length ? ` | ideas that count: ${c.keyIdeas.join('; ')}` : ''),
    )
    .join('\n');
}
