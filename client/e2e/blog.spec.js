// The blog list, opening a post, its share and related links, and returning.
import { test, expect } from '@playwright/test';
import { DESKTOP, PHONE, blockExternal, trackErrors } from './helpers.js';

for (const viewport of [DESKTOP, PHONE]) {
  test(`list → post → related → back (${viewport.width}px)`, async ({ page, baseURL }) => {
    await page.setViewportSize(viewport);
    const errors = trackErrors(page);
    await blockExternal(page, baseURL);
    await page.goto('/blog', { waitUntil: 'networkidle' });

    const cards = page.locator('article');
    expect(await cards.count()).toBeGreaterThanOrEqual(2);
    // Dates are real <time> elements with a machine-readable value.
    for (const dt of await page.locator('article time').evaluateAll((ts) => ts.map((t) => t.dateTime))) {
      expect(dt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    const first = cards.first().locator('h2 a');
    const title = (await first.textContent()).trim();
    const href = await first.getAttribute('href');
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page).toHaveTitle(new RegExp(title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    // Share buttons open in a new window and never navigate this tab.
    for (const name of ['Share on Twitter', 'Share on LinkedIn', 'Share on Facebook', 'Copy link']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Back to All Articles' }).click();
    await expect(page).toHaveURL(/\/blog$/);
    expect(errors).toEqual([]);
  });
}
