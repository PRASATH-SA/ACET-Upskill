import { NOTIFICATION_TYPES } from '@acet/shared';
import { mongoose, ObjectId, ref, Schema } from '../../db/mongoose.js';

const notificationSchema = new Schema(
  {
    userId: ref('User'),
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    /** In-app path the bell opens, e.g. /forms/:id. */
    link: { type: String, default: null },
    /** What the notification is about (a form id). One notification per user, type and ref. */
    refId: { type: ObjectId, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, updatedAt: -1 });
notificationSchema.index({ userId: 1, type: 1, refId: 1 }, { unique: true });
export const Notification = mongoose.model('Notification', notificationSchema);
