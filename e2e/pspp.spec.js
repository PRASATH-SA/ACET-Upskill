import { expect, test } from '@playwright/test';
import { login } from './helpers.js';

test('PSPP: open the subject, solve a Python problem, exam prep by subject', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'student03@acet.test');

  // PSPP is listed first and opens on its root page.
  await page
    .getByRole('link', { name: /Problem Solving and Python Programming/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/subjects\/[a-f0-9]{24}$/);
  await expect(
    page.getByRole('heading', { name: 'Introduction to Python', level: 3 }),
  ).toBeVisible();
  await expect(page.getByText('Leads to Unit 2: Decision Making and Looping')).toBeVisible();

  // A topic page has the full six steps and Python problems.
  await page.getByRole('link', { name: 'Conditional Statements' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Conditional Statements' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'In simple words' })).toBeVisible();
  await page.getByRole('link', { name: /Pass or fail/ }).click();

  await expect(page.getByText('Code lab · Python')).toBeVisible();
  const editor = page.getByLabel('Your Python');
  await editor.fill('mark = int(input())\nprint("Pass")');
  await page.getByLabel(/Input for Run/).fill('35');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByLabel('Program output')).toHaveText('Pass');

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Failed hidden tests')).toBeVisible();

  await editor.fill(
    'mark = int(input())\nif mark >= 50:\n    print("Pass")\nelse:\n    print("Fail")',
  );
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Accepted')).toBeVisible();

  // Exam prep: one tab per subject.
  await page.goto('/exam-prep');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveText([
    'Problem Solving and Python Programming',
    'Database Management Systems',
  ]);
  await page.getByRole('tab', { name: 'Database Management Systems' }).click();
  await expect(page).toHaveURL(/\/exam-prep\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name: 'Prepare for your exams' })).toBeVisible();
});
