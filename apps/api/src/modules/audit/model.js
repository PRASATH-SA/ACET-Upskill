import { mongoose, ObjectId, Schema } from '../../db/mongoose.js';

const auditLogSchema = new Schema(
  {
    actorId: { type: ObjectId, ref: 'User', index: true, default: null },
    action: { type: String, required: true, index: true },
    target: {
      type: { type: String, required: true },
      id: { type: String, default: null },
    },
    meta: { type: Schema.Types.Mixed, default: undefined },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);
auditLogSchema.index({ 'target.type': 1, 'target.id': 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
