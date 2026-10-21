/**
 * Explain-it-back (feature 13): a student speaks for up to 30 seconds or writes three lines;
 * the AI scores it against the teacher's published rubric; teachers spot-check flagged answers
 * and their score replaces the AI's. Proof of learning, not proof of watching.
 */
import {
  EXPLAIN_LIMITS,
  ExplainTextSchema,
  ExplainVoiceFieldsSchema,
  STUDENT_VISIBLE_STATUS,
} from '@acet/shared';
import { env } from '../../config/env.js';
import { oid } from '../../db/mongoose.js';
import { AIOfflineError } from '../../ai/gateway/errors.js';
import { gateway } from '../../ai/gateway/index.js';
import { speech } from '../../ai/gateway/speech.js';
import { EXPLAIN_SCORE_JOB } from '../../ai/pipelines/explain.js';
import { facultySubjectIds, loadSubject, loadTopic } from '../../lib/access.js';
import { AppError, badRequest, forbidden, notFound } from '../../lib/errors.js';
import { signMediaUrl } from '../../lib/media.js';
import { storage } from '../../lib/storage.js';
import { AUDIO_TYPES, detectFileType } from '../../lib/upload.js';
import { createJob } from '../ai/jobs.js';
import { audit } from '../audit/service.js';
import { User } from '../users/model.js';
import { Explanation, Rubric } from './model.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Final score: the teacher's spot-check when there is one, else the AI estimate. */
export const finalScore = (ex) =>
  ex.spotCheck?.checkedAt ? ex.spotCheck.score : (ex.ai?.total ?? null);

/** The student's view of an attempt. Never includes the scorer's key ideas. */
export function explanationView(ex, { staff = false } = {}) {
  const r = ex.rubricSnapshot ?? {};
  const score = finalScore(ex);
  const view = {
    id: String(ex._id),
    topicId: String(ex.topicId),
    mode: ex.mode,
    status: ex.status,
    error: ex.status === 'failed' ? ex.error : undefined,
    jobId: ex.jobId ? String(ex.jobId) : null,
    answer: ex.mode === 'voice' ? ex.transcript : ex.text,
    durationSec: ex.durationSec ?? null,
    hasAudio: Boolean(ex.audioKey),
    createdAt: ex.createdAt,
    rubric: {
      prompt: r.prompt,
      maxScore: r.maxScore,
      passScore: r.passScore,
      criteria: (r.criteria ?? []).map((c) => ({ id: c.id, text: c.text, points: c.points })),
    },
    score,
    passed: score === null ? null : score >= r.passScore,
    ai:
      ex.ai?.total !== undefined
        ? {
            total: ex.ai.total,
            perCriterion: ex.ai.perCriterion,
            feedback: ex.ai.feedback,
          }
        : null,
    teacherChecked: Boolean(ex.spotCheck?.checkedAt),
    teacher: ex.spotCheck?.checkedAt
      ? {
          agree: ex.spotCheck.agree,
          score: ex.spotCheck.score,
          perCriterion: ex.spotCheck.perCriterion,
          note: ex.spotCheck.note,
        }
      : null,
  };
  if (staff) {
    view.userId = String(ex.userId);
    view.flagged = Boolean(ex.spotCheck?.flagged);
    view.flagReasons = ex.spotCheck?.reasons ?? [];
    view.aiMeta = ex.ai
      ? { model: ex.ai.model, promptVersion: ex.ai.promptVersion, sttModel: ex.ai.sttModel }
      : null;
    view.rubric.criteria = (r.criteria ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      points: c.points,
      keyIdeas: c.keyIdeas,
    }));
  }
  return view;
}

async function publishedRubric(topicId) {
  return Rubric.findOne({ topicId, status: STUDENT_VISIBLE_STATUS })
    .sort({ publishedAt: -1 })
    .lean();
}

/** GET /topics/:id/explain — the published prompt, whether voice is on, and my recent attempts. */
export async function explainHome(user, topicId) {
  await loadTopic(user, topicId, 'read');
  const rubric = await publishedRubric(topicId);
  const mine =
    user.role === 'student'
      ? await Explanation.find({ userId: user.id, topicId }).sort({ createdAt: -1 }).limit(5).lean()
      : [];
  const best = mine.reduce((b, ex) => Math.max(b, finalScore(ex) ?? -1), -1);
  return {
    rubric: rubric
      ? {
          rubricId: String(rubric._id),
          prompt: rubric.prompt,
          criteria: rubric.criteria.map((c) => ({ id: c.id, text: c.text, points: c.points })),
          maxScore: rubric.maxScore,
          passScore: rubric.passScore,
        }
      : null,
    voiceEnabled: speech().enabled,
    limits: EXPLAIN_LIMITS,
    attempts: mine.map((ex) => explanationView(ex)),
    passed: rubric ? best >= rubric.passScore : false,
  };
}

async function sniffAudio(buffer) {
  const type = await detectFileType(buffer);
  const mime = type && AUDIO_TYPES[type.ext];
  if (!mime) throw badRequest('Unsupported recording format. Record again in the app.');
  return mime;
}

/**
 * POST /topics/:id/explanations — text (JSON) or voice (multipart `audio` + `durationSec`).
 * Creates the attempt and a scoring job; returns 202 { explanationId, jobId }.
 */
export async function submitExplanation(user, topicId, body, file, now = new Date()) {
  if (user.role !== 'student') throw forbidden('Only students submit explanations');
  const { topic } = await loadTopic(user, topicId, 'read');
  const rubric = await publishedRubric(topicId);
  if (!rubric) throw new AppError('UNPROCESSABLE', 'Your teacher has not set this up yet');
  if (gateway().breaker.isOpen)
    throw new AIOfflineError('AI service offline. Try again in a minute.');

  const recent = await Explanation.countDocuments({
    userId: user.id,
    topicId,
    createdAt: { $gte: new Date(now.getTime() - DAY_MS) },
  });
  if (recent >= EXPLAIN_LIMITS.maxPerDay)
    throw new AppError(
      'RATE_LIMITED',
      `You can try ${EXPLAIN_LIMITS.maxPerDay} times a day. Come back tomorrow.`,
    );

  const doc = {
    userId: user.id,
    topicId: topic._id,
    subjectId: topic.subjectId,
    rubricId: rubric._id,
    rubricSnapshot: {
      prompt: rubric.prompt,
      criteria: rubric.criteria,
      maxScore: rubric.maxScore,
      passScore: rubric.passScore,
    },
  };
  if (file) {
    if (!speech().enabled)
      throw new AIOfflineError('Voice answers are not available. Write your answer instead.');
    const { durationSec } = ExplainVoiceFieldsSchema.parse(body ?? {});
    if (file.size > EXPLAIN_LIMITS.maxAudioBytes)
      throw new AppError('PAYLOAD_TOO_LARGE', 'The recording is too long');
    const audioMime = await sniffAudio(file.buffer);
    const ext = audioMime === 'audio/mp4' ? 'm4a' : audioMime.split('/')[1].replace('mpeg', 'mp3');
    Object.assign(doc, {
      mode: 'voice',
      durationSec,
      audioMime,
      audioKey: await storage().save(file.buffer, { folder: 'audio', ext }),
    });
  } else {
    const { text } = ExplainTextSchema.parse(body ?? {});
    Object.assign(doc, { mode: 'text', text });
  }

  const ex = await Explanation.create(doc);
  const job = await createJob({
    type: EXPLAIN_SCORE_JOB,
    input: { explanationId: String(ex._id) },
    createdBy: user.id,
    subjectId: topic.subjectId,
    topicId: topic._id,
  });
  await Explanation.updateOne({ _id: ex._id }, { $set: { jobId: job._id } });
  return { explanationId: String(ex._id), jobId: String(job._id) };
}

/** Owner, or staff who can write the subject. Returns { ex, staff }. */
async function loadExplanation(user, id) {
  const ex = await Explanation.findById(id).lean();
  if (!ex) throw notFound('Explanation');
  if (String(ex.userId) === user.id) return { ex, staff: false };
  if (user.role === 'faculty' || user.role === 'admin') {
    await loadSubject(user, String(ex.subjectId), 'write');
    return { ex, staff: true };
  }
  throw notFound('Explanation');
}

export async function getExplanation(user, id) {
  const { ex, staff } = await loadExplanation(user, id);
  return explanationView(ex, { staff });
}

/** GET /explanations/:id/audio-url — a signed link to the recording (while it is kept). */
export async function audioUrl(user, id) {
  const { ex, staff } = await loadExplanation(user, id);
  if (!ex.audioKey) throw notFound('Recording');
  if (staff)
    await audit({
      actorId: user.id,
      action: 'explanation.listen',
      target: { type: 'explanation', id },
    });
  return signMediaUrl({ key: ex.audioKey, mimeType: ex.audioMime, userId: user.id });
}

/** GET /explanations — the teacher's queue: flagged (or all) scored answers in their subjects. */
export async function listExplanations(user, query) {
  let subjectIds;
  if (query.subjectId) {
    await loadSubject(user, query.subjectId, 'write');
    subjectIds = [query.subjectId];
  } else if (user.role !== 'admin') subjectIds = await facultySubjectIds(user.id);
  const filter = { status: 'scored' };
  if (subjectIds) filter.subjectId = { $in: subjectIds.map(oid) };
  if (query.topicId) filter.topicId = oid(query.topicId);
  if (query.flagged !== undefined) filter['spotCheck.flagged'] = query.flagged;
  if (query.checked !== undefined)
    filter['spotCheck.checkedAt'] = query.checked ? { $ne: null } : { $in: [null] };
  const [items, total] = await Promise.all([
    Explanation.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Explanation.countDocuments(filter),
  ]);
  const users = new Map(
    (
      await User.find({ _id: { $in: items.map((i) => i.userId) } })
        .select('name batch')
        .lean()
    ).map((u) => [String(u._id), u]),
  );
  return {
    items: items.map((ex) => ({
      ...explanationView(ex, { staff: true }),
      student: {
        name: users.get(String(ex.userId))?.name ?? 'Student',
        batch: users.get(String(ex.userId))?.batch ?? null,
      },
    })),
    total,
  };
}

/**
 * POST /explanations/:id/spot-check — the teacher agrees with the AI or gives per-criterion
 * scores. Only faculty of the subject; the teacher's score becomes the final score.
 */
export async function spotCheck(user, id, { agree, perCriterion, note }, now = new Date()) {
  if (user.role !== 'faculty') throw forbidden('Only the subject faculty can spot-check');
  const { ex } = await loadExplanation(user, id);
  if (ex.status !== 'scored') throw badRequest('Only scored answers can be checked');
  const criteria = ex.rubricSnapshot.criteria;
  let scores;
  if (agree) {
    scores = (ex.ai?.perCriterion ?? []).map((p) => ({
      criterionId: p.criterionId,
      score: p.score,
    }));
  } else {
    const given = new Map(perCriterion.map((p) => [p.criterionId, p.score]));
    for (const id of given.keys())
      if (!criteria.some((c) => c.id === id)) throw badRequest(`Unknown criterion ${id}`);
    scores = criteria.map((c) => {
      const s =
        given.get(c.id) ?? ex.ai?.perCriterion?.find((p) => p.criterionId === c.id)?.score ?? 0;
      if (s > c.points) throw badRequest(`${c.id} is out of ${c.points}`);
      return { criterionId: c.id, score: s };
    });
  }
  const score = scores.reduce((n, s) => n + s.score, 0);
  await Explanation.updateOne(
    { _id: ex._id },
    {
      $set: {
        'spotCheck.checkedBy': oid(user.id),
        'spotCheck.checkedAt': now,
        'spotCheck.agree': agree,
        'spotCheck.perCriterion': scores,
        'spotCheck.score': score,
        'spotCheck.note': note,
      },
    },
  );
  await audit({
    actorId: user.id,
    action: 'explanation.spotCheck',
    target: { type: 'explanation', id },
    meta: { agree, aiTotal: ex.ai?.total, score },
  });
  return getExplanation(user, id);
}

/**
 * Deletes voice recordings older than AUDIO_RETENTION_DAYS (transcripts stay).
 * Runs daily from the worker.
 * @returns {Promise<number>} recordings removed
 */
export async function purgeOldAudio({ now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - env().AUDIO_RETENTION_DAYS * DAY_MS);
  const old = await Explanation.find({ audioKey: { $ne: null }, createdAt: { $lt: cutoff } })
    .select('audioKey')
    .limit(1000)
    .lean();
  for (const ex of old) {
    await storage()
      .remove(ex.audioKey)
      .catch(() => {});
    await Explanation.updateOne({ _id: ex._id }, { $set: { audioKey: null, audioDeletedAt: now } });
  }
  return old.length;
}
