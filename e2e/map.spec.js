import { expect, test } from '@playwright/test';
import { login } from './helpers.js';

async function openDbmsMap(page) {
  await login(page, 'student04@acet.test');
  await page
    .getByRole('link', { name: /Database Management Systems/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Database Management Systems' }),
  ).toBeVisible();
}

test.describe('F3 concept map', () => {
  test('renders every seeded topic with a state, and the current topic is marked', async ({
    page,
  }) => {
    await openDbmsMap(page);
    const nodes = page.locator('[data-topic-id]');
    await expect(nodes).toHaveCount(8);
    await expect(page.locator('[data-state="current"]')).toHaveCount(1);
    await expect(page.locator('.react-flow').getByText('You are here')).toBeVisible();
    // A fresh student: only topics without prerequisites can be open.
    expect(await page.locator('[data-state="locked"]').count()).toBeGreaterThan(0);
  });

  test('nodes are reachable by keyboard and Enter selects them', async ({ page }) => {
    await openDbmsMap(page);
    const first = page.locator('[data-topic-id]').first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press('Tab');
    const second = page.locator('[data-topic-id]').nth(1);
    await expect(second).toBeFocused();
    await page.keyboard.press('Enter');
    const title = (await second.textContent()).trim();
    await expect(
      page
        .getByRole('complementary', { name: 'Selected topic' })
        .getByRole('heading', { name: title }),
    ).toBeVisible();
  });

  test('clicking a link shows why the topics are connected', async ({ page }) => {
    await openDbmsMap(page);
    // The edge's wide invisible interaction path is what a pointer actually hits.
    await page.locator('.react-flow__edge-interaction').first().dispatchEvent('click');
    await expect(page.getByRole('tooltip')).toBeVisible();
  });

  test('list view announces states in learning order', async ({ page }) => {
    await openDbmsMap(page);
    await page.getByRole('button', { name: 'List' }).click();
    const list = page.getByRole('list', { name: /learning order/ });
    await expect(list.getByRole('listitem')).toHaveCount(8);
    await expect(list.getByRole('listitem').first()).toContainText(/You are here|Unlocked/);
  });

  test('works at 360px with the panel as a bottom sheet @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openDbmsMap(page);
    await page.locator('[data-state="current"]').click();
    await expect(page.getByRole('dialog', { name: 'Topic' })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('link', { name: /Start topic/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
