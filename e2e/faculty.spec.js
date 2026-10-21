import { expect, test } from '@playwright/test';
import { login } from './helpers.js';
import { KEYS_NOTES, SYLLABUS_TEXT, makePdf } from './pdf.js';

/**
 * F6 acceptance (and H1 journey a): syllabus PDF → AI map → approve → notes → AI content →
 * approve → the student sees it. Runs against the scripted mock model in CI.
 */
test('faculty: syllabus PDF to an approved map and published AI content, no manual API calls', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const started = Date.now();
  await login(page, 'faculty1@acet.test');
  await expect(page).toHaveURL(/\/studio$/);
  // The empty sandbox subject (E2E01) from apps/api/scripts/e2e-server.js, not the seeded map.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'E2E01' })
    .getByRole('link', { name: 'Build the map' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Database Management Systems' }),
  ).toBeVisible();

  // 1. Upload the syllabus PDF.
  await page.getByLabel('Syllabus PDF').setInputFiles({
    name: 'dbms-syllabus.pdf',
    mimeType: 'application/pdf',
    buffer: await makePdf(SYLLABUS_TEXT),
  });
  await expect(page.getByText('dbms-syllabus.pdf')).toBeVisible();

  // 2. Draft the map with AI and watch the live job panel.
  await page.getByRole('button', { name: 'Draft map with AI' }).click();
  await expect(page).toHaveURL(/job=/);
  await expect(page.getByText('Drafting the map')).toBeVisible();
  await expect(page.getByText(/Created \d+ topics/)).toBeVisible({ timeout: 60_000 });

  // Job progress survives a refresh (resumes by jobId).
  await page.reload();
  await expect(page.getByText('Drafting the map')).toBeVisible();
  await expect(page.getByText('Done', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('AI draft').first()).toBeVisible();

  // 3. Approve the map.
  await page.getByRole('button', { name: 'Approve map' }).click();
  await expect(page.getByText('Map approved')).toBeVisible();

  // 4. Open a topic's content editor from the map.
  await page.locator('.react-flow__node', { hasText: 'Keys' }).first().click();
  await page.getByRole('link', { name: 'Edit content' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Keys' })).toBeVisible();
  const topicUrl = page.url();
  const topicId = topicUrl.split('/studio/topics/')[1].split('?')[0];

  // 5. Upload notes; ingestion runs and the file becomes ready for AI.
  await page.getByLabel('Notes file').setInputFiles({
    name: 'keys-notes.pdf',
    mimeType: 'application/pdf',
    buffer: await makePdf(KEYS_NOTES),
  });
  await expect(page.getByText('Ready for AI')).toBeVisible({ timeout: 30_000 });

  // 6. Draft only the easy explanation with AI.
  await page.reload(); // refresh coverage after ingestion
  for (const label of [
    '10-mark answer',
    'Flashcards (up to 15)',
    'Quiz MCQs (10, self-checked)',
    'Curiosity question',
    'Real-world uses + workshop brief',
  ]) {
    await page.getByLabel(label).uncheck();
  }
  await page.getByRole('button', { name: 'Draft with AI' }).click();
  await expect(page.getByText(/resources, .* flashcards and .* questions are waiting/)).toBeVisible(
    { timeout: 60_000 },
  );

  // 7. Approve and publish the draft.
  const tab = page.getByRole('tabpanel');
  await expect(tab.getByText('AI draft')).toBeVisible();
  await tab.getByRole('button', { name: 'Approve & publish' }).click();
  await expect(tab.getByText('Published')).toBeVisible();
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(`Faculty walkthrough (automated): ${elapsed} s from login to a published topic`);

  // 8. The student sees it on the topic page with no other step.
  const student = await browser.newPage();
  await login(student, 'student09@acet.test');
  await student.goto(`/topics/${topicId}`);
  await expect(student.getByRole('heading', { name: 'In simple words' })).toBeVisible();
  await expect(student.getByText(/Normalization means splitting one big table/)).toBeVisible();
  await student.close();
});
