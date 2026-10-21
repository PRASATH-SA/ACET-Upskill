import { expect, test } from '@playwright/test';
import { login, openSubjectPath } from './helpers.js';

/** Topic page → code lab problem → run → wrong answer → accepted (seeded "Keys" problems). */
test('code lab: a student solves a SQL problem from the topic page', async ({ page }) => {
  await login(page, 'student08@acet.test');
  await openSubjectPath(page);
  const node = page.getByRole('button', { name: /^Keys\./ }).first();
  await page.goto(`/topics/${await node.getAttribute('data-path-topic')}`);

  // Every topic now has a video, notes and practice.
  await expect(page.getByRole('heading', { level: 1, name: 'Keys' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'In simple words' })).toBeVisible();
  await expect(page.getByText('Code lab: SQL problems')).toBeVisible();
  await page.getByRole('link', { name: /Can phone be a key\?/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Can phone be a key?' })).toBeVisible();
  const editor = page.getByLabel('Your SQL');
  await editor.fill('SELECT phone, count(*) FROM applicants GROUP BY phone');
  await editor.press('Control+Enter');
  await expect(page.getByRole('table', { name: 'Your output' })).toBeVisible();

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Wrong answer')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Expected output' })).toBeVisible();

  await editor.fill(
    'SELECT phone, count(*) AS n FROM applicants GROUP BY phone HAVING count(*) > 1',
  );
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Accepted')).toBeVisible();
  await expect(page.getByText('Solved', { exact: true })).toBeVisible();
});
