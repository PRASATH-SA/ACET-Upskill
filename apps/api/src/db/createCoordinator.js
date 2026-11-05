/**
 * npm run create:coordinator -- <email> [name]
 *
 * Creates the first Academic Coordinator (ADR 0011) in an existing database, or promotes an
 * existing user to coordinator. Only a coordinator can create another one through the app, so this
 * script is the way in. A new account gets a temporary password, printed once.
 */
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { EmailSchema } from '@acet/shared';
import { loadEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { hashPassword } from '../modules/auth/service.js';
import { User } from '../modules/users/model.js';
import { connectMongo, disconnectMongo } from './connect.js';

export async function createCoordinator(email, name = 'Academic Coordinator') {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'coordinator';
    existing.isActive = true;
    await existing.save();
    return { user: existing, promoted: true };
  }
  const temporaryPassword = `Acet-${randomBytes(6).toString('base64url')}9`;
  const user = await User.create({
    name,
    email,
    role: 'coordinator',
    passwordHash: await hashPassword(temporaryPassword),
  });
  return { user, temporaryPassword };
}

async function main() {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // no .env
  }
  const [rawEmail, ...nameParts] = process.argv.slice(2);
  const email = EmailSchema.safeParse(rawEmail ?? '');
  if (!email.success) throw new Error('Usage: npm run create:coordinator -- <email> [name]');
  const cfg = loadEnv();
  await connectMongo(cfg.MONGO_URI, { retries: 3 });
  try {
    const r = await createCoordinator(email.data, nameParts.join(' ') || undefined);
    process.stdout.write(
      r.promoted
        ? `${r.user.email} is now the Academic Coordinator (password unchanged).\n`
        : `Created Academic Coordinator ${r.user.email}\nTemporary password: ${r.temporaryPassword}\nChange it after signing in.\n`,
    );
  } finally {
    await disconnectMongo();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    logger.fatal({ err: err.message }, 'create:coordinator failed');
    process.exit(1);
  });
}
