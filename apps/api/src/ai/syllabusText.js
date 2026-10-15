/**
 * Splits a syllabus PDF's text into units (A3.1 step a). Deterministic, so no model call is
 * spent on it. Handles "UNIT I", "UNIT - II", "Unit 3:", "UNIT-IV DATABASE DESIGN" and
 * "MODULE 2". Text with no unit markers becomes a single unit.
 */
import { cleanText, estimateTokens } from './rag/chunk.js';

const ROMAN = { i: 1, v: 5, x: 10, l: 50 };

export function romanToInt(s) {
  let total = 0;
  const chars = s.toLowerCase().split('');
  for (let i = 0; i < chars.length; i++) {
    const v = ROMAN[chars[i]];
    const next = ROMAN[chars[i + 1]] ?? 0;
    if (!v) return NaN;
    total += v < next ? -v : v;
  }
  return total;
}

const UNIT_RE = /^\s*(?:unit|module)\s*[-–:.]?\s*([ivxl]+|\d{1,2})\b\s*[-–:.)]?\s*(.*)$/i;
/** End matter after the last unit: never part of a unit's topics. */
const END_RE =
  /^\s*(text\s*books?|reference\s*books?|references?|course\s+outcomes?|outcomes?|total\s*[:-]?\s*\d+\s*(hours?|periods?)|e-?resources?|web\s*references?|suggested\s+readings?)\b/i;

/**
 * @param {string} raw
 * @returns {{ number: number, title: string, text: string }[]}
 */
export function splitUnits(raw) {
  const lines = cleanText(raw).split('\n');
  const units = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(UNIT_RE);
    if (m) {
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : romanToInt(m[1]);
      if (Number.isFinite(n) && n > 0 && n <= 20) {
        let title = m[2].replace(/\s+\d+\s*(hours?|hrs?|periods?)\.?\s*$/i, '').trim();
        // "UNIT III" alone on a line: the title is the next non-empty line.
        if (!title && lines[i + 1]?.trim() && !UNIT_RE.test(lines[i + 1])) {
          title = lines[i + 1].trim();
          i += 1;
        }
        current = { number: n, title: title || `Unit ${n}`, lines: [] };
        units.push(current);
        continue;
      }
    }
    if (current && END_RE.test(lines[i])) current = null;
    if (current) current.lines.push(lines[i]);
  }
  if (!units.length) return [{ number: 1, title: 'Unit 1', text: cleanText(raw) }];
  // A unit number repeated (e.g. a table of contents) keeps the longest body.
  const byNumber = new Map();
  for (const u of units) {
    const text = u.lines.join('\n').trim();
    const prev = byNumber.get(u.number);
    if (!prev || text.length > prev.text.length)
      byNumber.set(u.number, { number: u.number, title: u.title, text });
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

/** Splits a long unit body into parts that fit the model's context (map step of map-reduce). */
export function splitForContext(text, maxTokens = 1800) {
  if (estimateTokens(text) <= maxTokens) return [text];
  const parts = [];
  let buf = [];
  let tokens = 0;
  for (const para of text.split(/\n+/)) {
    const t = estimateTokens(para);
    if (buf.length && tokens + t > maxTokens) {
      parts.push(buf.join('\n'));
      buf = [];
      tokens = 0;
    }
    buf.push(para);
    tokens += t;
  }
  if (buf.length) parts.push(buf.join('\n'));
  return parts;
}
