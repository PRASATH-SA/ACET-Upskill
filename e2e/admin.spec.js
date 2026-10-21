import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { login } from './helpers.js';

/** Picks a <select> option by (part of) its visible text. */
async function selectByText(select, text) {
  const value = await select.evaluate(
    (el, t) => [...el.options].find((o) => o.textContent.includes(t))?.value,
    text,
  );
  expect(value, `option containing "${text}"`).toBeTruthy();
  await select.selectOption(value);
}

test.describe('H1 admin journeys', () => {
  test('(d) CO–PO attainment report exports as CSV and PDF', async ({ page }) => {
    await login(page, 'admin@acet.test');
    await page.goto('/admin/co-po');
    await expect(page.getByRole('heading', { level: 1, name: 'CO–PO attainment' })).toBeVisible();
    await selectByText(page.getByLabel('Subject', { exact: true }), 'CS T53');
    await expect(page.getByRole('heading', { name: 'Attainment', exact: true })).toBeVisible();

    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ]);
    expect(csv.suggestedFilename()).toMatch(/^co-attainment-CST53\.csv$/);
    const text = await readFile(await csv.path(), 'utf8');
    expect(text).toMatch(/CO1/);
    expect(text).toMatch(/CO2/);

    const [pdf] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PDF' }).click(),
    ]);
    const bytes = await readFile(await pdf.path());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('onboards a batch from CSV with a syllabus version, end to end', async ({
    page,
    browser,
  }) => {
    await login(page, 'admin@acet.test');
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Import students (CSV)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Import students from CSV' });

    const stamp = Date.now();
    const csv = [
      'name,email,batch',
      `Kavin R,kavin.${stamp}@acet.test,2026-30`,
      `Meera S,meera.${stamp}@acet.test,2026-30`,
      'No Email,not-an-email,2026-30',
    ].join('\n');
    await dialog.getByLabel('Students CSV').setInputFiles({
      name: 'batch-2026.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await selectByText(
      dialog.getByLabel('Syllabus version for this batch'),
      'CSE · R2023 · 2025-26',
    );
    await dialog.getByRole('button', { name: 'Import students' }).click();

    await expect(dialog.getByRole('status')).toHaveText(/2 created · 1 failed \(of 3\)/);
    await expect(dialog.getByText(/Row 4/)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Download passwords (CSV)' }).click(),
    ]);
    const rows = (await readFile(await download.path(), 'utf8')).trim().split('\n');
    const header = rows[0].split(',');
    const kavin = rows.find((r) => r.includes(`kavin.${stamp}@acet.test`)).split(',');
    const password = kavin[header.indexOf('temporary_password')].replace(/^"|"$/g, '');
    expect(password.length).toBeGreaterThanOrEqual(8);

    // The new student signs in with the temporary password and sees the assigned syllabus.
    const student = await browser.newPage();
    await login(student, `kavin.${stamp}@acet.test`, password);
    await expect(student).toHaveURL(/\/learn$/);
    await expect(
      student.getByRole('link', { name: /Database Management Systems/ }).first(),
    ).toBeVisible();
    await student.close();
  });
});
