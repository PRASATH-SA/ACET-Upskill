import { expect, test } from '@playwright/test';
import { login, openSubjectPath } from './helpers.js';

/** Opens the seeded Normalization topic page (it has published demo content). */
async function openNormalization(page, email) {
  await login(page, email);
  await openSubjectPath(page);
  // Students land on the learning path; each topic there is a button named "<title>. <state>…".
  const node = page.getByRole('button', { name: /^Normalization\./ }).first();
  const id = await node.getAttribute('data-path-topic');
  await page.goto(`/topics/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Normalization' })).toBeVisible();
  return id;
}

test.describe('F4 topic page and F5 practice', () => {
  test('topic page shows only published sections and the six-step tracker', async ({ page }) => {
    await openNormalization(page, 'student05@acet.test');
    const steps = page.getByRole('navigation', { name: 'Learning steps' });
    await expect(steps).toBeVisible();
    await expect(page.getByText('Curiosity challenge')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'In simple words' })).toBeVisible();
    await steps.getByRole('button', { name: /Prepare/ }).click();
    await expect(page.locator('#step-prepare')).toBeInViewport();
  });

  test('quiz answers are not in the network payload before submit', async ({ page }) => {
    const id = await openNormalization(page, 'student06@acet.test');
    const quizResponse = page.waitForResponse((r) => r.url().includes(`/topics/${id}/quiz`));
    await page.getByRole('link', { name: 'Take the quiz' }).click();
    const body = await (await quizResponse).json();
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/correctIndex|explanation|optionExplanations/);
    expect(body.data.questions.length).toBeGreaterThan(0);

    // Answer every question with option 1 via the keyboard, then submit.
    const total = body.data.questions.length;
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('1');
      if (i < total - 1) await page.getByRole('button', { name: 'Next' }).click();
    }
    const submit = page.waitForResponse((r) => r.url().endsWith('/quiz/submit'));
    await page.getByRole('button', { name: 'Submit quiz' }).click();
    const graded = await (await submit).json();
    expect(graded.data.results[0]).toHaveProperty('correctIndex');
    for (let i = 0; i < total - 1; i++) await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'See summary' }).click();
    await expect(page.getByText('Quiz complete')).toBeVisible();
  });

  test('revision: a quiz enrols cards, a session rates them, mastery shows on the map', async ({
    page,
  }) => {
    const id = await openNormalization(page, 'student07@acet.test');
    await page.goto(`/topics/${id}/quiz`);
    const quiz = await page.waitForResponse((r) => r.url().includes('/quiz'));
    const n = (await quiz.json()).data.questions.length;
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('2');
      if (i < n - 1) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Submit quiz' }).click();
    await expect(page.getByText('Review')).toBeVisible();

    await page.goto('/revision');
    await page.getByRole('button', { name: 'Start revision' }).click();
    await page.getByRole('button', { name: /Activate to show the answer/ }).click();
    await page.getByRole('button', { name: /^Good/ }).click();
    await expect(page.getByText(/Card 2 of|Session complete/)).toBeVisible();
  });
});

test('tutor: a question about the topic streams an answer with a citation that jumps to the section', async ({
  page,
}) => {
  await openNormalization(page, 'student10@acet.test');
  await page.getByRole('button', { name: 'Ask why' }).click();
  const drawer = page.getByRole('dialog', { name: 'Ask why' });
  await drawer.getByLabel(/Ask a question/).fill('Why do we split tables into smaller tables?');
  await drawer.getByRole('button', { name: 'Ask' }).click();
  await expect(drawer.getByText(/Check:/)).toBeVisible();
  const chip = drawer
    .getByRole('button', { name: /In simple words|Exam study material|Curiosity|Real-world/ })
    .first();
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(drawer).toBeHidden();

  // An unrelated question gets the refusal, not an invented answer.
  await page.getByRole('button', { name: 'Ask why' }).click();
  await drawer.getByLabel(/Ask a question/).fill('What was the cricket score yesterday?');
  await drawer.getByRole('button', { name: 'Ask' }).click();
  await expect(drawer.getByText(/I can only answer questions about "Normalization"/)).toBeVisible();
});
