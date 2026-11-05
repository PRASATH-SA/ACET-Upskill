import mongoose from 'mongoose';
import { logger } from '../lib/logger.js';

let replicaSet = false;

/** Connects to MongoDB, retrying with exponential backoff (A.3 / Phase 0). */
export async function connectMongo(uri, { retries = 10, baseDelayMs = 500 } = {}) {
  mongoose.set('strictQuery', true);
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      await detectReplicaSet();
      logger.info({ replicaSet }, 'mongo connected');
      return mongoose;
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 10_000);
      logger.warn({ attempt, delay, err: err.message }, 'mongo connect failed, retrying');
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function detectReplicaSet() {
  const db = mongoose.connection.db;
  if (!db) return;
  const hello = await db.admin().command({ hello: 1 });
  replicaSet = Boolean(hello.setName) || hello.msg === 'isdbgrid';
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

/** 'ok' when connected, otherwise the readable connection state. */
export function mongoStatus() {
  const states = {
    0: 'disconnected',
    1: 'ok',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
}

/**
 * Runs `fn` inside a transaction when MongoDB is a replica set (required for transactions).
 * On a standalone server it runs without a session and logs a warning once.
 */
let warned = false;
export async function withTransaction(fn) {
  if (!replicaSet) {
    if (!warned) {
      logger.warn('MongoDB is not a replica set; multi-document writes run without a transaction');
      warned = true;
    }
    return fn(null);
  }
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
