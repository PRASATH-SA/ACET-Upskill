import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Like the API tests: temp files go to <repo>/.tmp, not a system drive that may be full.
const repoTmp = path.resolve(import.meta.dirname, '../../.tmp');
mkdirSync(repoTmp, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = repoTmp;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    // Tests mock relative /api/v1 URLs; a developer's apps/web/.env must not change that.
    env: { VITE_API_BASE_URL: '/api/v1' },
  },
});
