import { COLLECTIONS } from '@acet/shared';
import { mongoose, ref, Schema } from '../../db/mongoose.js';

/**
 * One student's watch record for one uploaded video (feature 3). `buckets[i]` counts how many
 * times the student played seconds [i*10, i*10+10): 0 = skipped, 2+ = rewatched. The teacher
 * video coach (feature 12) aggregates these across a class.
 */
const videoProgressSchema = new Schema(
  {
    userId: ref('User'),
    resourceId: ref('Resource'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    lastPositionSec: { type: Number, default: 0 },
    maxPositionSec: { type: Number, default: 0 },
    buckets: { type: [Number], default: [] },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: COLLECTIONS.videoProgress },
);
videoProgressSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
export const VideoProgress = mongoose.model('VideoProgress', videoProgressSchema);
