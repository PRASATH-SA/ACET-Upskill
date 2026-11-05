import { gateway } from '../gateway/index.js';
import { estimateTokens } from '../rag/chunk.js';

/** Material budget per call: leaves room for instructions and output in an 8k context (A.7.7). */
export const MATERIAL_TOKEN_BUDGET = 2400;

/**
 * One structured generation inside a job: calls the gateway, records the prompt version on
 * the job, and returns the data plus the aiMeta fields every saved item needs.
 */
export async function generate(ctx, task, input, schema) {
  await ctx.checkCancelled();
  const { data, meta } = await gateway().generateStructured(task, input, schema);
  await ctx.recordPrompt({ task, promptVersion: meta.promptVersion, model: meta.model });
  return { data, meta, promptVersion: `${task}.v${meta.promptVersion}` };
}

/** "[1] Heading\ntext" blocks, cut to the token budget. Returns the text and the chunk ids used. */
export function formatMaterial(chunks, budget = MATERIAL_TOKEN_BUDGET) {
  const used = [];
  const parts = [];
  let tokens = 0;
  for (const c of chunks) {
    const block = `[${used.length + 1}] ${c.heading && !c.text.startsWith(c.heading) ? `${c.heading}\n` : ''}${c.text}`;
    const t = estimateTokens(block);
    if (used.length && tokens + t > budget) break;
    parts.push(block);
    used.push(String(c.id ?? c._id));
    tokens += t;
  }
  return { text: parts.join('\n\n'), chunkIds: used };
}

/** Lower-case, no numbering, no punctuation, singular-ish: for de-duplicating titles. */
export function normalizeTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/^\s*(\d+(\.\d+)*|[ivxlc]+)[.)]\s+/i, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+ ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w))
    .join(' ');
}

/** Builds the `aiMeta` object stored on every AI-created item (A.7.4, A.7.6). */
export const aiMeta = (gen, ctx, chunkIds) => ({
  model: gen.meta.model,
  promptVersion: gen.promptVersion,
  jobId: ctx.job._id,
  sourceChunkIds: chunkIds,
});
