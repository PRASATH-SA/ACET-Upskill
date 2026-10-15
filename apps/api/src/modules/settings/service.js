/**
 * A5 runtime AI settings: the admin can switch the chat and embedding models from the pulled
 * list. Env values are the defaults; a setting overrides them for NEW calls and jobs, with no
 * restart. Each process caches the setting for a few seconds, so the worker follows quickly.
 */
import { env } from '../../config/env.js';
import { mongoose, Schema } from '../../db/mongoose.js';
import { badRequest } from '../../lib/errors.js';
import { audit } from '../audit/service.js';

const SettingsSchema = new Schema(
  {
    _id: { type: String },
    chatModel: { type: String, default: null },
    embedModel: { type: String, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'settings' },
);
export const Settings = mongoose.models.Settings ?? mongoose.model('Settings', SettingsSchema);

const KEY = 'ai';
export const SETTINGS_CACHE_MS = 5000;
let cache = null;

export function clearSettingsCache() {
  cache = null;
}

/** Effective models: the admin setting if present, otherwise env. */
export async function resolveModels() {
  const now = Date.now();
  if (!cache || now - cache.at > SETTINGS_CACHE_MS) {
    let doc = null;
    try {
      if (mongoose.connection.readyState === 1) doc = await Settings.findById(KEY).lean();
    } catch {
      doc = null; // the database being unreachable must not break model calls
    }
    cache = { at: now, doc };
  }
  const cfg = env();
  return {
    chatModel: cache.doc?.chatModel || cfg.LLM_CHAT_MODEL,
    embedModel: cache.doc?.embedModel || cfg.LLM_EMBED_MODEL,
  };
}

export async function aiSettings() {
  const cfg = env();
  const doc = await Settings.findById(KEY).lean();
  const effective = await resolveModels();
  return {
    ...effective,
    overrides: { chatModel: doc?.chatModel ?? null, embedModel: doc?.embedModel ?? null },
    defaults: { chatModel: cfg.LLM_CHAT_MODEL, embedModel: cfg.LLM_EMBED_MODEL },
    provider: cfg.LLM_PROVIDER,
    updatedAt: doc?.updatedAt ?? null,
  };
}

/**
 * PUT /admin/ai/settings { chatModel?, embedModel? }. `null` returns to the env default.
 * Models must be in the provider's pulled list (A5.3).
 */
export async function updateAiSettings(user, input, pulledModels) {
  const has = (m) =>
    pulledModels.some((n) => n === m || n === `${m}:latest` || `${n}:latest` === m);
  for (const key of ['chatModel', 'embedModel']) {
    const v = input[key];
    if (v && !has(v))
      throw badRequest(`${v} is not pulled on the model server. Pull it first (npm run ai:pull).`);
  }
  const before = await resolveModels();
  const doc = await Settings.findByIdAndUpdate(
    KEY,
    {
      $set: {
        ...('chatModel' in input ? { chatModel: input.chatModel || null } : {}),
        ...('embedModel' in input ? { embedModel: input.embedModel || null } : {}),
        updatedBy: user.id,
      },
    },
    { upsert: true, new: true },
  ).lean();
  clearSettingsCache();
  const after = await resolveModels();
  await audit({
    actorId: user.id,
    action: 'ai.settings.update',
    target: { type: 'settings', id: KEY },
    meta: { before, after },
  });
  return { doc, before, after };
}
