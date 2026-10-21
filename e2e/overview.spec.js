import { expect, test } from '@playwright/test';
import { login } from './helpers.js';

test.describe('subject root page', () => {
  test('shows why, prerequisites, the unit journey and outcomes, and opens a unit on the map', async ({
    page,
  }) => {
    await login(page, 'student10@acet.test');
    await page
      .getByRole('link', { name: /Database Management Systems/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/subjects\/[a-f0-9]{24}$/);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Database Management Systems' }),
    ).toBeVisible();
    await expect(page.getByText(/Design data so it stays correct/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What you should know first' })).toBeVisible();
    await expect(page.getByText('Data structures: trees and hashing')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Why it matters' })).toBeVisible();
    await expect(page.getByText('IRCTC and booking apps')).toBeVisible();

    // The journey: Unit 3 leads to Unit 4, with the reason, then the finish line.
    await expect(page.getByRole('heading', { name: 'How the units connect' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Database Design' })).toBeVisible();
    await expect(page.getByText('Leads to Unit 4: Storage and Indexing')).toBeVisible();
    await expect(page.getByText(/next question is speed/)).toBeVisible();
    await expect(page.getByText(/Keys ↔ Indexing/)).toBeVisible();

    await expect(page.getByRole('heading', { name: 'What you can do with it' })).toBeVisible();
    await expect(page.getByText('Database administrator (DBA)')).toBeVisible();
    await expect(page.getByText(/CO1\./)).toBeVisible();

    // A unit opens on the concept map with that unit selected.
    await page.getByRole('link', { name: 'Open unit on the map' }).last().click();
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
