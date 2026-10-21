import { CODE_LANGUAGES, COLLECTIONS } from '@acet/shared';
import { mongoose, ref, reviewFields, Schema } from '../../db/mongoose.js';

/**
 * A code-lab problem on one topic (LeetCode-style SQL practice). Goes through the normal
 * content review (draft → published). `solution`, `hiddenSql` and `checkSql` never reach students.
 */
const codeChallengeSchema = new Schema(
  {
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    title: { type: String, required: true, trim: true },
    prompt: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    language: { type: String, enum: CODE_LANGUAGES, default: 'sql' },
    setupSql: { type: String, required: true },
    hiddenSql: { type: String, default: '' },
    starterCode: { type: String, default: '' },
    solution: { type: String, required: true },
    checkSql: { type: String, default: '' },
    orderMatters: { type: Boolean, default: false },
    hints: { type: [String], default: [] },
    /** Display order within the topic. */
    order: { type: Number, default: 0 },
    ...reviewFields,
  },
  { timestamps: true, collection: COLLECTIONS.codeChallenges },
);
codeChallengeSchema.index({ topicId: 1, status: 1, order: 1 });
codeChallengeSchema.index({ subjectId: 1, status: 1 });
export const CodeChallenge = mongoose.model('CodeChallenge', codeChallengeSchema);

/** One graded submission. Runs are not stored. */
const codeSubmissionSchema = new Schema(
  {
    userId: ref('User'),
    challengeId: ref('CodeChallenge'),
    topicId: ref('Topic'),
    subjectId: ref('Subject'),
    code: { type: String, required: true },
    passed: { type: Boolean, required: true },
    /** Why it failed: 'error' | 'wrongAnswer' | 'hiddenTests' | 'timeout'. */
    verdict: { type: String, required: true },
    timeMs: Number,
  },
  { timestamps: true, collection: COLLECTIONS.codeSubmissions },
);
codeSubmissionSchema.index({ userId: 1, challengeId: 1, createdAt: -1 });
codeSubmissionSchema.index({ challengeId: 1, passed: 1 });
export const CodeSubmission = mongoose.model('CodeSubmission', codeSubmissionSchema);
