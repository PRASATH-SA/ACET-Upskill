import { mongoose, ObjectId, Schema } from '../../db/mongoose.js';

/**
 * Refresh tokens are opaque random strings; only a SHA-256 hash is stored so a database
 * leak cannot be replayed. Tokens in one login session share a familyId so reuse of a
 * rotated token revokes the whole family.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
    userAgent: String,
  },
  { timestamps: true },
);
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
