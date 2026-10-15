import { loadEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/connect.js';
import { logger } from './lib/logger.js';
import { createApp } from './app.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file: rely on the real environment.
}

async function main() {
  const cfg = loadEnv();
  await connectMongo(cfg.MONGO_URI);
  const app = createApp();
  const server = app.listen(cfg.API_PORT, () => {
    logger.info({ port: cfg.API_PORT }, 'api listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await disconnectMongo();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'api failed to start');
  process.exit(1);
});
