import { notFound } from '../../lib/errors.js';
import { clean, oid } from '../../db/mongoose.js';
import { Notification } from './model.js';

/**
 * Notifies each user once per (type, refId): users who already have this notification are
 * skipped, so publishing again only reaches newly added students.
 * @returns {Promise<number>} how many users were newly notified
 */
export async function notifyUsers(userIds, { type, title, body = '', link = null, refId = null }) {
  if (!userIds.length) return 0;
  const res = await Notification.bulkWrite(
    userIds.map((userId) => ({
      updateOne: {
        filter: { userId: oid(String(userId)), type, refId: refId ? oid(String(refId)) : null },
        update: { $setOnInsert: { title, body, link } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return res.upsertedCount;
}

/** Re-sends a notification (marks it unread and refreshes the text), e.g. scores released twice. */
export async function renotifyUsers(
  userIds,
  { type, title, body = '', link = null, refId = null },
) {
  if (!userIds.length) return 0;
  const res = await Notification.bulkWrite(
    userIds.map((userId) => ({
      updateOne: {
        filter: { userId: oid(String(userId)), type, refId: refId ? oid(String(refId)) : null },
        update: { $set: { title, body, link, readAt: null } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return res.upsertedCount + res.modifiedCount;
}

export async function removeNotificationsFor(refId) {
  await Notification.deleteMany({ refId: oid(String(refId)) });
}

/** GET /notifications → { items, unread } for the signed-in user only. */
export async function listNotifications(user, { limit }) {
  const [items, unread] = await Promise.all([
    Notification.find({ userId: user.id }).sort({ updatedAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ userId: user.id, readAt: null }),
  ]);
  return {
    items: items.map(({ userId: _u, ...n }) => ({
      ...clean(n),
      refId: n.refId ? String(n.refId) : null,
    })),
    unread,
  };
}

export async function markRead(user, id) {
  const n = await Notification.findOneAndUpdate(
    { _id: id, userId: user.id },
    { $set: { readAt: new Date() } },
    { new: true, timestamps: false },
  ).lean();
  if (!n) throw notFound('Notification');
  return { id: String(n._id), readAt: n.readAt };
}

export async function markAllRead(user) {
  const res = await Notification.updateMany(
    { userId: user.id, readAt: null },
    { $set: { readAt: new Date() } },
    { timestamps: false },
  );
  return { updated: res.modifiedCount };
}
