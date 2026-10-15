/**
 * A4 "Ask why" tutor: grounded, streaming answers about one topic.
 *
 * Context (A4.2): the topic's PUBLISHED resources, chunks of the faculty's material for the
 * topic, and the prerequisite topics' published easy explanations. Nothing else is sent to
 * the model: no student data (A.7.9).
 */
import { createHash } from 'node:crypto';
import { STUDENT_VISIBLE_STATUS } from '@acet/shared';
import { env } from '../config/env.js';
import { Resource } from '../modules/content/model.js';
import { STUDENT_MAP_STATUSES, Topic, TopicLink } from '../modules/syllabus/model.js';
import { TutorQuestion } from '../modules/tutor/model.js';
import { gateway } from './gateway/index.js';
import { tokenize } from './text.js';
import { prompts } from './prompts.js';
import { retrieve } from './rag/retrieve.js';
import { cosine } from './rag/vectorStore.js';

const PUBLISHED = STUDENT_VISIBLE_STATUS;
export const TUTOR_TASK = 'tutor.answer';
const MAX_TURNS = 6;
const CONTEXT_BLOCKS = 6;
const CITATIONS = 3;

/** Where each source shows on the topic page, so citation chips can scroll there (F4). */
const SECTION = {
  curiosity: 'curiosity',
  easy: 'understand',
  video: 'understand',
  tenMark: 'prepare',
  realWorld: 'apply',
  workshop: 'apply',
};
const KIND_TITLE = {
  curiosity: 'Curiosity challenge',
  easy: 'In simple words',
  tenMark: '10-mark answer',
  realWorld: 'Real-world uses',
  workshop: 'Workshop brief',
};

// Deliberately small and explicit: this is a study tool, so anything outside study is refused.
const UNSAFE =
  /\b(suicid\w*|kill (my|him|her|them)self|self[- ]harm|bomb|weapon|explosive|porn\w*|nude|sex\w*|drugs?|ganja|hack (into|someone)|steal|cheat(ing)? in (the )?exam|leak(ed)? (question|paper))\b/i;

export const REFUSALS = {
  unsafe:
    "I can't help with that. I can only answer questions about this topic. If something is worrying you, please talk to your mentor or someone you trust.",
  offTopic: (title) =>
    `I can only answer questions about "${title}" from your faculty's material. Try asking how or why something in this topic works.`,
  noMaterial: (title, related) =>
    `Your faculty hasn't published material for "${title}" yet, so I can't answer from it.${related ? ` You could look at ${related} meanwhile.` : ''} Ask your faculty too.`,
};

export const askerHash = (userId) =>
  createHash('sha256')
    .update(`${env().JWT_REFRESH_SECRET}:tutor:${userId}`)
    .digest('hex')
    .slice(0, 32);

/** A4.3 per-student hourly limit, counted from the log. Returns minutes until a slot frees. */
export async function tutorQuota(userId, now = new Date()) {
  const limit = env().TUTOR_RATE_LIMIT_PER_HOUR;
  const since = new Date(now.getTime() - 3600_000);
  const recent = await TutorQuestion.find({
    askerHash: askerHash(userId),
    createdAt: { $gte: since },
  })
    .sort({ createdAt: 1 })
    .select('createdAt')
    .limit(limit)
    .lean();
  if (recent.length < limit) return { allowed: true, remaining: limit - recent.length };
  const freesAt = recent[0].createdAt.getTime() + 3600_000;
  return {
    allowed: false,
    retryInMinutes: Math.max(1, Math.ceil((freesAt - now.getTime()) / 60_000)),
  };
}

/** Splits markdown into paragraph passages (resources can be long). */
function passages(text, max = 900) {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
    .flatMap((p) =>
      p.length <= max ? [p] : (p.match(new RegExp(`[\\s\\S]{1,${max}}(\\s|$)`, 'g')) ?? [p]),
    );
}

/**
 * Collects candidate context: published resources of the topic, faculty material chunks and
 * prerequisite topics' published easy explanations. Each block knows how to cite itself.
 */
async function candidates(topic, question) {
  const [resources, prereqLinks] = await Promise.all([
    Resource.find({
      topicId: topic._id,
      status: PUBLISHED,
      kind: { $in: Object.keys(KIND_TITLE) },
    }).lean(),
    TopicLink.find({
      toTopicId: topic._id,
      type: 'prerequisite',
      status: { $in: STUDENT_MAP_STATUSES },
    }).lean(),
  ]);
  const prereqTopics = await Topic.find({
    _id: { $in: prereqLinks.map((l) => l.fromTopicId) },
    status: { $in: STUDENT_MAP_STATUSES },
  })
    .select('title')
    .lean();
  const prereqEasy = await Resource.find({
    topicId: { $in: prereqTopics.map((t) => t._id) },
    kind: 'easy',
    status: PUBLISHED,
  }).lean();
  const prereqTitle = new Map(prereqTopics.map((t) => [String(t._id), t.title]));

  const blocks = [];
  for (const r of resources) {
    for (const p of passages(r.body)) {
      blocks.push({
        text: p,
        cite: {
          kind: 'resource',
          id: String(r._id),
          title: r.title || KIND_TITLE[r.kind],
          section: SECTION[r.kind],
        },
      });
    }
  }
  for (const r of prereqEasy) {
    const t = prereqTitle.get(String(r.topicId));
    for (const p of passages(r.body)) {
      blocks.push({
        text: p,
        cite: {
          kind: 'prerequisite',
          id: String(r._id),
          topicId: String(r.topicId),
          title: `${t}: in simple words`,
          section: null,
        },
      });
    }
  }
  // Faculty material for this topic (retrieved by meaning, current embedding model only).
  let chunkHits = [];
  try {
    // No score floor here: prepareContext decides what counts as grounding.
    chunkHits = (await retrieve({ query: question, topicId: String(topic._id), k: 4, minScore: 0 }))
      .chunks;
  } catch {
    chunkHits = [];
  }
  return { blocks, chunkHits, related: prereqTopics.map((t) => t.title) };
}

/**
 * Picks the grounding context and decides refusals before any model call.
 * @returns {Promise<{ refusal?: string, reason?: string, context: object[], related: string[] }>}
 */
export async function prepareContext(topic, question) {
  if (UNSAFE.test(question))
    return { refusal: REFUSALS.unsafe, reason: 'unsafe', context: [], related: [] };

  const { blocks, chunkHits, related } = await candidates(topic, question);
  const texts = [question, `${topic.title}. ${topic.summary ?? ''}`, ...blocks.map((b) => b.text)];
  const { embeddings } = await gateway().embed(texts);
  const [q, topicVec, ...blockVecs] = embeddings;
  const scored = blocks.map((b, i) => ({ ...b, score: cosine(q, blockVecs[i]) }));
  for (const c of chunkHits) {
    scored.push({
      text: c.text,
      score: c.score,
      cite: {
        kind: 'chunk',
        id: c.id,
        title: c.heading ? `Faculty notes: ${c.heading}` : 'Faculty notes',
        section: null,
      },
    });
  }
  scored.sort((a, b) => b.score - a.score);

  // Off-topic: low similarity to the topic AND to every passage, and no shared words.
  const relevance = Math.max(cosine(q, topicVec), scored[0]?.score ?? 0);
  const vocabulary = new Set(
    tokenize(
      [
        topic.title,
        topic.summary,
        ...blocks.map((b) => b.text),
        ...chunkHits.map((c) => c.text),
      ].join(' '),
    ),
  );
  const overlap = tokenize(question).filter((w) => vocabulary.has(w)).length;
  if (relevance < env().TUTOR_MIN_RELEVANCE && overlap === 0) {
    return { refusal: REFUSALS.offTopic(topic.title), reason: 'offTopic', context: [], related };
  }

  const context = scored
    .filter((s) => s.score >= env().TUTOR_MIN_PASSAGE_SCORE)
    .slice(0, CONTEXT_BLOCKS);
  if (!context.length && !blocks.length && !chunkHits.length) {
    return {
      refusal: REFUSALS.noMaterial(topic.title, related[0]),
      reason: 'noMaterial',
      context: [],
      related,
    };
  }
  // On topic but nothing matched closely: still give the model the best passages it has.
  return {
    context: context.length ? context : scored.slice(0, 3),
    related,
    grounded: context.length > 0,
  };
}

/**
 * Streams an answer. Calls `send(event, data)` with `token` events and a final `done`.
 * The caller handles the HTTP side (SSE) and access checks.
 */
export async function answer({ user, topic, question, history = [], send, signal }) {
  const started = Date.now();
  const log = {
    topicId: topic._id,
    subjectId: topic.subjectId,
    question: question.slice(0, 2000),
    askerHash: askerHash(user.id),
  };
  const prep = await prepareContext(topic, question);

  if (prep.refusal) {
    for (const piece of prep.refusal.match(/\S+\s*/g) ?? []) send('token', { text: piece });
    send('done', { grounded: false, refused: true, reason: prep.reason, citations: [] });
    await TutorQuestion.create({
      ...log,
      refused: true,
      refusalReason: prep.reason,
      latencyMs: Date.now() - started,
    });
    return;
  }

  const { prompt, messages } = prompts().render(TUTOR_TASK, {
    topicTitle: topic.title,
    context: prep.context.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n'),
    question,
    relatedTopics: prep.related.length ? prep.related.join(', ') : 'the earlier topics on the map',
  });
  // Up to 6 earlier turns, between the instructions and the new question.
  const turns = history
    .slice(-MAX_TURNS * 2)
    .map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }));
  const convo = [messages[0], ...turns, messages[messages.length - 1]];

  let text = '';
  for await (const part of gateway().chatStream({
    task: TUTOR_TASK,
    promptVersion: prompt.version,
    messages: convo,
    temperature: prompt.temperature,
    maxTokens: prompt.maxTokens,
    signal,
  })) {
    if (part.token) {
      text += part.token;
      send('token', { text: part.token });
    }
  }

  const declined = /does not cover that|not (in|covered by) (the|your faculty's) material/i.test(
    text,
  );
  const grounded = Boolean(prep.grounded) && !declined;
  const seen = new Set();
  const citations = grounded
    ? prep.context
        .map((c) => c.cite)
        .filter((c) => (seen.has(c.id) ? false : seen.add(c.id)))
        .slice(0, CITATIONS)
    : [];
  send('done', { grounded, refused: false, citations });

  const { embedModel } = await gateway().models();
  let embedding;
  try {
    embedding = (await gateway().embed([question])).embeddings[0];
  } catch {
    embedding = undefined; // the log is still useful without clustering
  }
  await TutorQuestion.create({
    ...log,
    grounded,
    latencyMs: Date.now() - started,
    model: (await gateway().models()).chatModel,
    promptVersion: `${TUTOR_TASK}.v${prompt.version}`,
    citationCount: citations.length,
    embedding,
    embedModel,
  });
}

/**
 * A4.5: the subject's tutor questions grouped by meaning (greedy clustering on embeddings).
 * Shows faculty what students keep asking, and what the material doesn't answer.
 */
export async function commonQuestions(subjectId, { days = 60, threshold = 0.8, limit = 20 } = {}) {
  const { embedModel } = await gateway().models();
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await TutorQuestion.find({ subjectId, refused: false, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  const titles = new Map(
    (
      await Topic.find({ _id: { $in: [...new Set(rows.map((r) => String(r.topicId)))] } })
        .select('title')
        .lean()
    ).map((t) => [String(t._id), t.title]),
  );
  const clusters = [];
  for (const r of rows) {
    const usable = r.embedding?.length && r.embedModel === embedModel;
    let home = null;
    if (usable) {
      for (const c of clusters) {
        if (c.vec && cosine(c.vec, r.embedding) >= threshold) {
          home = c;
          break;
        }
      }
    }
    if (!home) {
      home = { vec: usable ? r.embedding : null, rows: [] };
      clusters.push(home);
    }
    home.rows.push(r);
  }
  return {
    clusters: clusters
      .sort((a, b) => b.rows.length - a.rows.length)
      .slice(0, limit)
      .map((c, i) => ({
        id: `c${i + 1}`,
        representative: c.rows[c.rows.length - 1].question,
        count: c.rows.length,
        notGrounded: c.rows.filter((r) => !r.grounded).length,
        topicId: String(c.rows[0].topicId),
        topicTitle: titles.get(String(c.rows[0].topicId)) ?? '',
        examples: [...new Set(c.rows.map((r) => r.question))].slice(0, 6),
      })),
    total: rows.length,
  };
}
