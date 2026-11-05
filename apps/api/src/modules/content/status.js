import { canTransition, questionPublishProblem } from '@acet/shared';
import { withTransaction } from '../../db/connect.js';
import { canWriteSubject } from '../../lib/access.js';
import { AppError, forbidden, notFound } from '../../lib/errors.js';
import { auditMany } from '../audit/service.js';
import { Pyq } from '../exam/model.js';
import { Rubric } from '../explain/model.js';
import { CodeChallenge } from '../codelab/model.js';
import { SubjectOverview } from '../overview/model.js';
import { Subject } from '../syllabus/model.js';
import { Flashcard, Question, Resource } from './model.js';

/**
 * The one place content status changes (B3.4): draft → inReview → approved → published,
 * plus back to draft. Only faculty assigned to the subject may approve or publish (A.7.5).
 */
export const CONTENT_MODELS = {
  resource: Resource,
  flashcard: Flashcard,
  question: Question,
  pyq: Pyq,
  rubric: Rubric,
  challenge: CodeChallenge,
  overview: SubjectOverview,
};

/** Extra fields read per type to check publish rules. */
const PUBLISH_FIELDS = { question: ' type options explanation optionExplanations' };

/**
 * Steps needed to move from `from` to `to`, following only allowed transitions.
 * "publish" from draft goes draft → approved → published. Returns null if impossible.
 * @param {string} from
 * @param {string} to
 * @returns {string[] | null}
 */
export function transitionPath(from, to) {
  if (from === to) return [];
  if (canTransition(from, to)) return [to];
  if (
    to === 'published' &&
    (from === 'draft' || from === 'inReview') &&
    canTransition(from, 'approved')
  ) {
    return ['approved', 'published'];
  }
  return null;
}

const REVIEW_ACTIONS = { approve: 'approved', publish: 'published' };

/**
 * May `user` move an item of this subject to `to`? Approve/publish needs the owning faculty;
 * draft/inReview needs write access (owning faculty or admin).
 */
function assertMayMove(user, subject, to) {
  if (to === 'approved' || to === 'published') {
    const owner = user.role === 'faculty' && canWriteSubject(user, subject);
    if (!owner)
      throw forbidden('Only faculty assigned to this subject can approve or publish content');
  } else if (!canWriteSubject(user, subject)) {
    throw forbidden('You do not have access to this subject');
  }
}

/**
 * Applies a status change or rejection to many items atomically. Validates every item first;
 * if any item fails, nothing is written and a 422 lists the failures.
 * @param {import('../../middleware/auth.js').AuthUser} user
 * @param {{ type: keyof typeof CONTENT_MODELS, id: string }[]} items
 * @param {{ to?: string, reject?: boolean, reason?: string }} change
 */
export async function changeStatus(user, items, { to, reject = false, reason }) {
  const loaded = [];
  const failures = [];
  const subjects = new Map();

  for (const item of items) {
    const Model = CONTENT_MODELS[item.type];
    const doc = await Model.findById(item.id)
      .select(`status subjectId source${PUBLISH_FIELDS[item.type] ?? ''}`)
      .lean();
    if (!doc) {
      failures.push({ ...item, message: 'not found' });
      continue;
    }
    const sid = String(doc.subjectId);
    if (!subjects.has(sid)) subjects.set(sid, await Subject.findById(sid).lean());
    const subject = subjects.get(sid);
    try {
      if (!subject) throw notFound('Subject');
      assertMayMove(user, subject, reject ? 'draft' : to);
    } catch (err) {
      failures.push({ ...item, message: err.message });
      continue;
    }
    const path = reject
      ? doc.status === 'draft'
        ? []
        : ['draft']
      : transitionPath(doc.status, to);
    if (!path) {
      failures.push({ ...item, message: `cannot move from ${doc.status} to ${to}` });
      continue;
    }
    // Feature 1: every quiz answer a student can pick must come with an explanation.
    if (item.type === 'question' && doc.type === 'mcq' && path.includes('published')) {
      const problem = questionPublishProblem(doc);
      if (problem) {
        failures.push({ ...item, message: problem });
        continue;
      }
    }
    loaded.push({ ...item, from: doc.status, path, source: doc.source });
  }

  if (failures.length) {
    const allForbidden = failures.every((f) => /approve or publish|access/.test(f.message));
    throw new AppError(
      allForbidden ? 'FORBIDDEN' : 'UNPROCESSABLE',
      'Some items could not be updated; nothing was changed',
      { failures },
    );
  }

  const now = new Date();
  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    for (const it of loaded) {
      const final = reject ? 'draft' : (it.path[it.path.length - 1] ?? it.from);
      const set = { status: final };
      const unset = {};
      if (reject) {
        Object.assign(set, { rejectedAt: now, rejectedBy: user.id, rejectReason: reason ?? '' });
      } else {
        unset.rejectedAt = 1;
        unset.rejectedBy = 1;
        unset.rejectReason = 1;
        if (it.path.includes('approved'))
          Object.assign(set, { approvedBy: user.id, approvedAt: now });
        if (it.path.includes('published'))
          Object.assign(set, {
            publishedAt: now,
            ...(it.from === 'approved' ? {} : { approvedBy: user.id, approvedAt: now }),
          });
      }
      await CONTENT_MODELS[it.type].updateOne(
        { _id: it.id },
        { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        opts,
      );
    }
    await auditMany(
      loaded.map((it) => ({
        actorId: user.id,
        action: reject ? 'content.reject' : 'content.status',
        target: { type: it.type, id: it.id },
        meta: {
          from: it.from,
          to: reject ? 'draft' : to,
          source: it.source,
          ...(reason ? { reason } : {}),
        },
      })),
      session,
    );
  });
  return {
    updated: loaded.length,
    items: loaded.map((it) => ({
      type: it.type,
      id: it.id,
      from: it.from,
      to: reject ? 'draft' : to,
    })),
  };
}

/** Maps a review-queue action to a status change. */
export function reviewAction(user, { action, items, reason }) {
  if (action === 'reject') return changeStatus(user, items, { reject: true, reason });
  return changeStatus(user, items, { to: REVIEW_ACTIONS[action] });
}
