import { expect, test } from '@playwright/test';
import { login } from './helpers.js';

/**
 * F7 PWA acceptance against the production build (vite preview, port 5175): the app is
 * installable (manifest + service worker) and opens /learn offline with an offline banner.
 */
test.use({ baseURL: 'http://localhost:5175' });

test('installable: manifest with icons and an active service worker', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/learn' });
  const sizes = manifest.icons.map((i) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const i of manifest.icons) expect((await request.get(i.src)).ok()).toBe(true);

  await page.goto('/login');
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active);
  });
  expect(sw).toBe(true);
});

test('opens /learn offline with a clear offline banner @mobile', async ({ page, context }) => {
  await login(page, 'student02@acet.test');
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Let the service worker cache this page's API responses.
  await page.reload();
  await expect(
    page.getByRole('link', { name: /Database Management Systems/ }).first(),
  ).toBeVisible();

  // Service-worker fetches are only covered because playwright.config.js turns on
  // PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS; dropping every request makes sure.
  await context.setOffline(true);
  await context.route('**/*', (route) => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByText(/You are offline/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Database Management Systems/ }).first(),
  ).toBeVisible();
  await context.unrouteAll();
  await context.setOffline(false);
});
