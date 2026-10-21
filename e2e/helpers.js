import { expect } from '@playwright/test';

export const SEED_PASSWORD = 'Acet@2025';

/** Signs in through the real login form. */
export async function login(page, email, password = SEED_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

/** Opens a subject from Learn: its root page (overview) first, then the learning path. */
export async function openSubjectPath(page, name = /Database Management Systems/) {
  await page.getByRole('link', { name }).first().click();
  await expect(page.getByRole('heading', { name: 'How the units connect' })).toBeVisible();
  await page
    .getByRole('link', { name: /(Start|Continue) learning path/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/learn\/[a-f0-9]{24}$/);
}
