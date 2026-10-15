import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Browsers live in <repo>/.cache (gitignored) unless the machine sets its own path.
// Install them with: npm run e2e:install
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(import.meta.dirname, '.cache/ms-playwright');

/**
 * End-to-end tests (F2 onwards, H1). Starts a seeded throwaway API (in-memory MongoDB) on :4100
 * and a Vite dev server on :5174 that proxies /api to it. Run: npm run e2e
 */
const API_PORT = 4100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'node apps/api/scripts/e2e-server.js',
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { E2E_API_PORT: String(API_PORT), WEB_ORIGIN: `http://localhost:${WEB_PORT}` },
    },
    {
      command: `npm run dev -w @acet/web -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
