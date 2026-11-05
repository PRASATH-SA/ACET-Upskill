import { expect, test } from '@playwright/test';
import { login } from './helpers.js';

test.describe('subject root page', () => {
  test('opens straight on the unit journey and opens a unit on the map', async ({ page }) => {
    await login(page, 'student10@acet.test');
    await page
      .getByRole('link', { name: /Database Management Systems/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/subjects\/[a-f0-9]{24}$/);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Database Management Systems' }),
    ).toBeVisible();
    // The text sections are gone; the journey comes first.
    await expect(page.getByRole('heading', { name: 'What you should know first' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Why it matters' })).toHaveCount(0);

    // The journey: Unit 3 → Unit 4 joined by an arrow labelled with the topic link, then the finish.
    await expect(page.getByRole('heading', { name: 'How the units connect' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Database Design' })).toBeVisible();
    await expect(page.getByText(/Keys ↔ Indexing|→ Indexing/).first()).toBeVisible();
    await expect(page.getByText('Finish line')).toBeVisible();

    // A unit node opens the concept map with that unit selected.
    await page.getByRole('link', { name: /^Open unit 4/ }).click();
    await expect(page).toHaveURL(/\/learn\/[a-f0-9]{24}\?unit=/);
    await expect(page.getByRole('combobox', { name: 'Unit' })).toHaveValue(/[a-f0-9]{24}/);
  });

  test('works at 360px without horizontal scroll @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await login(page, 'student10@acet.test');
    await page
      .getByRole('link', { name: /Database Management Systems/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'How the units connect' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
