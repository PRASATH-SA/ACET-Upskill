/**
 * Text cleaning and chunking (A2.1): split on headings and paragraphs first, then pack into
 * ~500–800-token chunks with an 80-token overlap. Tokens are estimated (≈ 1.3 per word),
 * which is close enough for budgeting a local model's context window.
 */

export const CHUNK_TARGET_TOKENS = 600;
export const CHUNK_MAX_TOKENS = 800;
export const CHUNK_OVERLAP_TOKENS = 80;

export const estimateTokens = (text) => Math.ceil((String(text).match(/\S+/g)?.length ?? 0) * 1.3);

/** Normalises PDF-extracted text: joins hyphenated line breaks, drops page numbers and noise. */
export function cleanText(raw) {
  return String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/­/g, '') // soft hyphens
    .replace(/(\w)-\n(\w)/g, '$1$2') // "normal-\nization" → "normalization"
    .replace(/^\s*(page\s*)?\d+\s*(of\s*\d+)?\s*$/gim, '') // bare page numbers
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A short line in Title Case / numbered / ALL CAPS / markdown "#" reads as a heading. */
export function isHeading(line) {
  const l = line.trim();
  if (!l || l.length > 90 || /[.,;:]$/.test(l)) return false;
  if (/^#{1,6}\s/.test(l)) return true;
  if (/^(unit|chapter|module|section)\s+[\divxl]+\b/i.test(l)) return true;
  if (/^\d+(\.\d+)*\.?\s+\S/.test(l) && l.split(/\s+/).length <= 10) return true;
  const words = l.split(/\s+/);
  const letters = l.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase() && words.length <= 8) return true;
  // Title Case: "First Normal Form", "Advantages of Indexing" (small words may stay lower case).
  const SMALL = new Set(['a', 'an', 'and', 'of', 'the', 'in', 'on', 'for', 'to', 'vs', 'with']);
  return (
    words.length <= 8 &&
    letters.length >= 4 &&
    /^[A-Z0-9]/.test(words[0]) &&
    words.every((w) => SMALL.has(w) || /^[A-Z0-9(]/.test(w))
  );
}

/** Splits cleaned text into sections: [{ heading, paragraphs[] }]. */
export function sections(text) {
  const out = [];
  let current = { heading: '', paragraphs: [] };
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    if (isHeading(lines[0])) {
      if (current.heading || current.paragraphs.length) out.push(current);
      current = { heading: lines[0].replace(/^#+\s*/, '').trim(), paragraphs: [] };
      lines.shift();
    }
    if (lines.length) current.paragraphs.push(lines.join(' '));
  }
  if (current.heading || current.paragraphs.length) out.push(current);
  return out;
}

/** Splits an over-long paragraph on sentence boundaries. */
function splitLong(paragraph, maxTokens) {
  if (estimateTokens(paragraph) <= maxTokens) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph];
  const parts = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && estimateTokens(buf + s) > maxTokens) {
      parts.push(buf.trim());
      buf = '';
    }
    // A single sentence longer than the limit is cut by words.
    if (estimateTokens(s) > maxTokens) {
      const words = s.split(/\s+/);
      const per = Math.floor(maxTokens / 1.3);
      for (let i = 0; i < words.length; i += per) parts.push(words.slice(i, i + per).join(' '));
      continue;
    }
    buf += s;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** The last ~`tokens` worth of words of a text, used as overlap for the next chunk. */
function tail(text, tokens) {
  const words = text.split(/\s+/);
  return words.slice(Math.max(0, words.length - Math.floor(tokens / 1.3))).join(' ');
}

/**
 * @param {string} raw  extracted material text
 * @returns {{ index: number, heading: string, text: string, tokenCount: number }[]}
 */
export function chunkText(
  raw,
  { target = CHUNK_TARGET_TOKENS, max = CHUNK_MAX_TOKENS, overlap = CHUNK_OVERLAP_TOKENS } = {},
) {
  const chunks = [];
  let buf = [];
  let heading = '';
  let bufTokens = 0;
  // True once the buffer holds text that isn't just the overlap carried from the last chunk.
  let fresh = false;

  const flush = (carryOver = true) => {
    if (!fresh) return;
    const text = buf.join('\n\n').trim();
    if (text) chunks.push({ heading, text, tokenCount: estimateTokens(text) });
    const carry = carryOver && overlap > 0 ? tail(text, overlap) : '';
    buf = carry ? [carry] : [];
    bufTokens = estimateTokens(carry);
    fresh = false;
  };

  for (const section of sections(cleanText(raw))) {
    if (section.heading) {
      // Each heading starts a new chunk, without overlap, so chunks stay on one topic.
      flush(false);
      buf = [section.heading];
      bufTokens = estimateTokens(section.heading);
      heading = section.heading;
      fresh = false; // a heading alone is not worth a chunk
    }
    for (const para of section.paragraphs) {
      for (const piece of splitLong(para, max - overlap)) {
        const t = estimateTokens(piece);
        if (fresh && (bufTokens + t > max || bufTokens >= target)) flush();
        buf.push(piece);
        bufTokens += t;
        fresh = true;
      }
    }
  }
  flush(false);
  return chunks.map((c, index) => ({ index, ...c }));
}
