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
