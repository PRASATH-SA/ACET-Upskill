/**
 * Video learning (feature 3): signed playback links, WebVTT captions, chapters and per-student
 * watch progress for uploaded topic videos. Students only ever reach published videos of
 * topics they can read; staff need write access to the subject.
 */
import { STUDENT_VISIBLE_STATUS, VIDEO_BUCKET_SEC } from '@acet/shared';
import { isStaff, loadSubject, loadTopic } from '../../lib/access.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { signMediaUrl } from '../../lib/media.js';
import { storage } from '../../lib/storage.js';
import { audit } from '../audit/service.js';
import { Resource } from '../content/model.js';
import { VideoProgress } from './model.js';

const PUBLISHED = STUDENT_VISIBLE_STATUS;
const MAX_CAPTION_BYTES = 512 * 1024;
/** Watching this share of a video's 10-second slices counts as completed. */
const COMPLETE_SHARE = 0.9;

/** Loads a video resource with the read (students) or write (staff editing) rules. */
async function loadVideo(user, id, mode = 'read') {
  const doc = await Resource.findById(id);
  if (!doc || doc.kind !== 'video') throw notFound('Video');
  await loadTopic(user, String(doc.topicId), 'read');
  if (mode === 'write' || isStaff(user)) await loadSubject(user, String(doc.subjectId), 'write');
  else if (doc.status !== PUBLISHED) throw notFound('Video');
  return doc;
}

/**
 * Converts SRT (or passes WebVTT through) to WebVTT. Throws when the file has no cues.
 * @param {string} raw
 */
export function toWebVtt(raw) {
  const text = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (!text.includes('-->')) throw badRequest('The caption file has no timed cues');
  if (/^WEBVTT/.test(text)) return `${text}\n`;
  const body = text.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${body}\n`;
}

/** GET /resources/:id/playback — signed, seekable links for the video and its captions. */
export async function playback(user, id) {
  const doc = await loadVideo(user, id);
  if (!doc.fileKey) throw notFound('Uploaded video');
  const sign = (key, mimeType) => signMediaUrl({ key, mimeType, userId: user.id });
  const video = sign(doc.fileKey, doc.mimeType);
  let resumeSec = 0;
  if (user.role === 'student') {
    const p = await VideoProgress.findOne({ userId: user.id, resourceId: doc._id }).lean();
    const nearEnd = doc.durationSec && p && p.lastPositionSec > doc.durationSec - 5;
    if (p && !nearEnd) resumeSec = p.lastPositionSec;
  }
  return {
    resourceId: String(doc._id),
    title: doc.title ?? null,
    url: video.url,
    expiresAt: video.expiresAt,
    mimeType: doc.mimeType,
    durationSec: doc.durationSec ?? null,
    chapters: doc.chapters ?? [],
    captions: (doc.captions ?? []).map((c) => ({
      lang: c.lang,
      label: c.label,
      url: sign(c.fileKey, 'text/vtt').url,
    })),
    resumeSec,
  };
}

/** POST /resources/:id/captions — add or replace the track for one language. */
export async function addCaption(user, id, { lang, label }, file) {
  const doc = await loadVideo(user, id, 'write');
  if (file.size > MAX_CAPTION_BYTES) throw badRequest('Caption files must be under 512 KB');
  const vtt = toWebVtt(file.buffer.toString('utf8'));
  const fileKey = await storage().save(Buffer.from(vtt, 'utf8'), {
    folder: 'captions',
    ext: 'vtt',
  });
  const old = (doc.captions ?? []).find((c) => c.lang === lang);
  if (old) await storage().remove(old.fileKey);
  doc.captions = [...(doc.captions ?? []).filter((c) => c.lang !== lang), { lang, label, fileKey }];
  await doc.save();
  await audit({
    actorId: user.id,
    action: 'resource.captions',
    target: { type: 'resource', id },
    meta: { lang },
  });
  return captionsView(doc);
}

const captionsView = (doc) => ({
  captions: (doc.captions ?? []).map((c) => ({ lang: c.lang, label: c.label })),
});

export async function removeCaption(user, id, lang) {
  const doc = await loadVideo(user, id, 'write');
  const old = (doc.captions ?? []).find((c) => c.lang === lang);
  if (!old) throw notFound('Caption track');
  await storage().remove(old.fileKey);
  doc.captions = doc.captions.filter((c) => c.lang !== lang);
  await doc.save();
  return captionsView(doc);
}

/** PUT /resources/:id/chapters — replaces the chapter list (already sorted by the schema). */
export async function setChapters(user, id, { chapters }) {
  const doc = await loadVideo(user, id, 'write');
  if (doc.durationSec && chapters.some((c) => c.startSec >= doc.durationSec))
    throw badRequest('A chapter starts after the end of the video');
  doc.chapters = chapters;
  await doc.save();
  return { chapters: doc.chapters };
}

/**
 * POST /resources/:id/progress — heartbeat from the student's player. Counts each 10-second
 * slice played (so skips and rewatches show up), and marks the video completed once 90% of
 * its slices were played or the player reports the end.
 */
export async function recordProgress(
  user,
  id,
  { positionSec, seenBuckets, ended },
  now = new Date(),
) {
  const doc = await loadVideo(user, id);
  if (user.role !== 'student') return { recorded: false };
  const total = doc.durationSec ? Math.ceil(doc.durationSec / VIDEO_BUCKET_SEC) : null;
  const seen = [...new Set(seenBuckets)].filter((b) => total === null || b < total);

  const p =
    (await VideoProgress.findOne({ userId: user.id, resourceId: doc._id })) ??
    new VideoProgress({
      userId: user.id,
      resourceId: doc._id,
      topicId: doc.topicId,
      subjectId: doc.subjectId,
    });
  const buckets = [...p.buckets];
  for (const b of seen) {
    while (buckets.length <= b) buckets.push(0);
    buckets[b] += 1;
  }
  p.buckets = buckets;
  p.lastPositionSec = positionSec;
  p.maxPositionSec = Math.max(p.maxPositionSec ?? 0, positionSec);
  const watched = buckets.filter((n) => n > 0).length;
  if (!p.completedAt && (ended || (total && watched >= Math.ceil(total * COMPLETE_SHARE))))
    p.completedAt = now;
  await p.save();
  return progressView(p, total);
}

const progressView = (p, total) => {
  const watched = (p?.buckets ?? []).filter((n) => n > 0).length;
  return {
    recorded: true,
    lastPositionSec: p?.lastPositionSec ?? 0,
    watchedPct: total ? Math.min(100, Math.round((watched / total) * 100)) : null,
    completed: Boolean(p?.completedAt),
  };
};

/** GET /resources/:id/progress/me */
export async function myProgress(user, id) {
  const doc = await loadVideo(user, id);
  const p = await VideoProgress.findOne({ userId: user.id, resourceId: doc._id }).lean();
  const total = doc.durationSec ? Math.ceil(doc.durationSec / VIDEO_BUCKET_SEC) : null;
  return progressView(p, total);
}
