import { logger } from '../../lib/logger.js';
import { AuditLog } from './model.js';

/** Writes one audit log entry. Failures are logged, never thrown, so auditing cannot break a request. */
export async function audit(entry, session) {
  try {
    await AuditLog.create(
      [
        {
          ...entry,
          target: { type: entry.target.type, id: entry.target.id ?? null },
          at: new Date(),
        },
      ],
      session ? { session } : {},
    );
  } catch (err) {
    logger.error({ err, action: entry.action }, 'failed to write audit log');
  }
}

export async function auditMany(entries, session) {
  if (entries.length === 0) return;
  const at = new Date();
  await AuditLog.insertMany(
    entries.map((e) => ({ ...e, target: { type: e.target.type, id: e.target.id ?? null }, at })),
    session ? { session } : {},
  );
}
