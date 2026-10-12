// Every way of moving around the site: hero capability buttons, navbar (bar
// on desktop, drawer on phones), footer, page routes, deep links, canonical
// redirects, the 404 page and Back.
import { test, expect } from '@playwright/test';
import {
  DESKTOP, PHONE, blockExternal, offsetFromNavbar, scrollSettled, scrollToTop, trackErrors,
} from './helpers.js';

// A jump has landed when the section's top sits at the navbar's bottom and
// stays there. Polled first: a deep link's scroll only starts once the lazy
// sections above the target have laid out.
async function expectLandedOn(page, selector) {
  const distance = async () => Math.abs((await offsetFromNavbar(page, selector)) ?? Infinity);
  await expect.poll(distance, { message: `${selector} top vs navbar bottom (px)`, timeout: 20_000 }).toBeLessThanOrEqual(40);
  await scrollSettled(page);
  expect(await distance(), `${selector} top vs navbar bottom once settled (px)`).toBeLessThanOrEqual(40);
}

for (const [device, viewport] of [['desktop', DESKTOP], ['phone', PHONE]]) {
  test.describe(device, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page, baseURL }) => {
      // Many scroll jumps across the homepage, whose 3D section is rendered
      // in software by headless Chromium: allow the slow-test budget.
      test.slow();
      await blockExternal(page, baseURL);
      await page.goto('/', { waitUntil: 'networkidle' });
    });

    test('hero capability buttons scroll to their sections', async ({ page }) => {
      const errors = trackErrors(page);
      const caps = page.locator('.ot-hero .ot-hero-cap-link');
      await expect(caps).toHaveCount(3);
      for (const [text, id] of [
        ['Mammogram Analysis', '#mammogram'],
        ['Liquid Biopsy Analysis', '#liquid-biopsy'],
        ['Lung Cancer Analysis', '#lung-imaging'],
      ]) {
        await scrollToTop(page);
        await scrollSettled(page);
        await caps.filter({ hasText: text }).click();
        await expectLandedOn(page, id);
      }
      expect(errors).toEqual([]);
    });

    test('navbar links scroll to their sections', async ({ page }) => {
      for (const [text, id] of [
        ['AI Mammogram Analysis', '#mammogram'],
        ['AI Blood-Based Cancer Test', '#liquid-biopsy'],
        ['AI Lung Cancer Imaging', '#lung-imaging'],
        ['Contact', '#cta'],
      ]) {
        await scrollToTop(page);
        await scrollSettled(page);
        if (device === 'phone') {
          await page.getByRole('button', { name: 'Open menu' }).click();
          const drawer = page.locator('#nb-mobile-drawer');
          await expect(drawer).toBeVisible();
          await drawer.getByText(text, { exact: true }).click();
          await expect(drawer).toBeHidden();
        } else {
          await page.getByRole('navigation', { name: 'Main navigation' }).getByText(text, { exact: true }).click();
        }
        await expectLandedOn(page, id);
      }
    });

    test('section and footer links', async ({ page }) => {
      await page.locator('#liquid-biopsy').scrollIntoViewIfNeeded();
      await page.locator('#liquid-biopsy button', { hasText: 'Explore technology' }).click();
      await expectLandedOn(page, '#lb-technology');

      await page.locator('#lung-imaging').scrollIntoViewIfNeeded();
      await page.locator('#lung-imaging button', { hasText: 'Talk to us about Lung AI' }).click();
      await expectLandedOn(page, '#cta');

      const sources = await page.locator('#lung-imaging a[href^="https://doi.org/"]')
        .evaluateAll((links) => links.map((a) => `${a.target}|${a.rel}`));
      expect(sources).toHaveLength(4);
      for (const s of sources) expect(s).toBe('_blank|noopener noreferrer');

      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      await footer.getByRole('button', { name: 'Lung Cancer Imaging' }).click();
      await expectLandedOn(page, '#lung-imaging');

      await expect(footer.getByRole('link', { name: /Team/ })).toHaveAttribute('href', 'https://shri-ai.org/team/');
      await expect(page.locator('#cta a[href="mailto:info@oncotraceai.org"]')).toHaveCount(1);
      // The CT images are CC BY-SA: their credit must stay in the footer.
      await expect(footer.locator('a[href*="CT-Thorax-5.0-B70f-Lungs"]')).toHaveCount(1);
    });
  });
}

test.describe('routes', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ page, baseURL }) => blockExternal(page, baseURL));

  test('booking and blog pages open from the homepage, sections from other pages', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#mammogram').scrollIntoViewIfNeeded();
    await page.locator('#mammogram button', { hasText: 'Book Mammo AI Demo' }).click();
    await expect(page).toHaveURL(/\/mammo-demo$/);
    await expect(page.locator('h1')).toBeVisible();

    await page.locator('footer').getByRole('button', { name: 'Blog' }).click();
    await expect(page).toHaveURL(/\/blog$/);

    await page.locator('footer').getByRole('button', { name: 'Lung Cancer Imaging' }).click();
    await expect(page).toHaveURL(/\/\?section=lung-imaging$/);
    await expectLandedOn(page, '#lung-imaging');
    expect(errors).toEqual([]);
  });

  for (const [path, id] of [['/?section=mammogram', '#mammogram'], ['/?section=lung-imaging', '#lung-imaging'], ['/#cta', '#cta']]) {
    test(`deep link ${path} lands on ${id}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expectLandedOn(page, id);
    });
  }

  for (const [from, to] of [['/book-lb', '/Book-LB'], ['/demo/', '/demo'], ['/Blog', '/blog'], ['/MAMMO-DEMO/', '/mammo-demo']]) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from, { waitUntil: 'networkidle' });
      await expect.poll(() => new URL(page.url()).pathname).toBe(to);
    });
  }

  test('an unknown path shows the 404 page and is not indexed', async ({ page }) => {
    await page.goto('/no-such-page', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveText('404');
    await expect(page).toHaveTitle(/Page not found/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('an unknown blog post returns to the blog list', async ({ page }) => {
    await page.goto('/blog/no-such-post', { waitUntil: 'networkidle' });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/blog');
  });

  test('Back returns to the same place on the homepage', async ({ page }) => {
    test.slow();
    // Judged by what is on screen (where the contact section sits), not raw
    // scrollY, which legitimately changes if content above settles late.
    const ctaTop = () => page.evaluate(() => Math.round(document.getElementById('cta').getBoundingClientRect().top));
    await page.goto('/?section=mammogram', { waitUntil: 'networkidle' });
    await expectLandedOn(page, '#mammogram');
    await page.evaluate(() => {
      const el = document.getElementById('cta');
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'instant' });
    });
    // Clicking scrolls the footer's Blog button into view first; the page
    // remembers that later position, so measure after it.
    const blog = page.locator('footer').getByRole('button', { name: 'Blog' });
    await blog.scrollIntoViewIfNeeded();
    await scrollSettled(page);
    const before = await ctaTop();

    await blog.click();
    await expect(page).toHaveURL(/\/blog$/);
    await page.goBack();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    await expect.poll(async () => Math.abs((await ctaTop()) - before), {
      message: `contact section top after Back vs before (${before}px)`, timeout: 15_000,
    }).toBeLessThan(40);
  });
});
