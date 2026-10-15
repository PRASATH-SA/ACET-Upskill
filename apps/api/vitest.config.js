import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Keep every temp file of the test run (in-memory MongoDB data, uploads, worker files) inside
// the repo's gitignored .tmp folder. Set here so all forked test workers inherit it.
const repoTmp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.tmp');
mkdirSync(repoTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = repoTmp;

export default defineConfig({
  cacheDir: path.join(repoTmp, 'vite-cache'),
  test: {
    globalSetup: ['./test/globalSetup.js'],
    setupFiles: ['./test/setup.js'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'forks',
    include: ['src/**/*.test.js', 'test/**/*.test.js'],
  },
});
