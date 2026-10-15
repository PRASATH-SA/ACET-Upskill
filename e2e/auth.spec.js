import { expect, test } from '@playwright/test';
import { login, SEED_PASSWORD } from './helpers.js';

test.describe('F2 login and role routing', () => {
  for (const [role, email, home, heading] of [
    ['student', 'student01@acet.test', '/learn', /Hello/],
    ['faculty', 'faculty1@acet.test', '/studio', /Your subjects|Studio/],
    ['mentor', 'mentor@acet.test', '/mentor', /My students/],
    ['admin', 'admin@acet.test', '/admin', /Department overview|Overview/],
  ]) {
    test(`${role} signs in and lands on ${home}`, async ({ page }) => {
      await login(page, email);
      await expect(page).toHaveURL(new RegExp(`${home}$`));
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    });
  }

  test('a refresh keeps the user signed in (refresh cookie)', async ({ page }) => {
    await login(page, 'student01@acet.test');
    await expect(page).toHaveURL(/\/learn$/);
    await page.reload();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole('button', { name: 'Profile menu' })).toBeVisible();
  });

  test('a student typing /studio sees the 403 page', async ({ page }) => {
    await login(page, 'student01@acet.test');
    await page.goto('/studio');
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
  });

  test('wrong password shows an error and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('student02@acet.test');
    await page.getByLabel('Password').fill(`${SEED_PASSWORD}x`);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('do not match');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('sign out returns to /login and a reload stays signed out', async ({ page }) => {
    await login(page, 'student03@acet.test');
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/learn');
    await expect(page).toHaveURL(/\/login$/);
  });
});
