import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import { loadEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/connect.js';
import { logger } from './lib/logger.js';
import { createApp } from './app.js';
import { closePythonSandbox } from './modules/codelab/pySandbox.js';
import { closeSandbox } from './modules/codelab/sandbox.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file: rely on the real environment.
}

/** API_WORKERS: 1 (default) = one process; 0 = one per CPU core; n = n processes (H1). */
function workerCount(cfg) {
  return cfg.API_WORKERS === 0 ? availableParallelism() : cfg.API_WORKERS;
}

async function serve(cfg) {
  await connectMongo(cfg.MONGO_URI);
  const app = createApp();
  const server = app.listen(cfg.API_PORT, () => {
    logger.info({ port: cfg.API_PORT, pid: process.pid }, 'api listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await closeSandbox();
    await closePythonSandbox();
    await disconnectMongo();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

async function main() {
  const cfg = loadEnv();
  const n = workerCount(cfg);
  if (n <= 1 || !cluster.isPrimary) return serve(cfg);

  // Primary: fork workers that share the port, and replace any that crash.
  logger.info({ workers: n }, 'starting api cluster');
  for (let i = 0; i < n; i++) cluster.fork();
  let stopping = false;
  cluster.on('exit', (worker, code, signal) => {
    if (stopping) return;
    logger.warn({ pid: worker.process.pid, code, signal }, 'api worker exited; restarting');
    cluster.fork();
  });
  const stop = () => {
    stopping = true;
    for (const w of Object.values(cluster.workers)) w?.process.kill('SIGTERM');
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  logger.fatal({ err }, 'api failed to start');
  process.exit(1);
});
