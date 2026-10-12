// Every route at phone, tablet and desktop widths: it renders, has exactly one
// <h1>, never scrolls sideways, doesn't shift its layout, and logs no errors.
import { test, expect } from '@playwright/test';
import { ROUTES, blockExternal, trackErrors } from './helpers.js';

const WIDTHS = [320, 390, 768, 1280, 1920];

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`${route} renders cleanly at ${width}px`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = trackErrors(page);
      await blockExternal(page, baseURL);
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto(route, { waitUntil: 'networkidle' });
      if (route === '/') {
        // The 3D section is rendered in software by headless Chromium.
        test.slow();
        // Mount every lazy section (sample report, 3D DNA) on the way down.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 800) {
          await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
          await page.waitForTimeout(40);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      }
      await page.waitForTimeout(400);

      const r = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: document.querySelectorAll('h1').length,
        cls: window.__cls,
        text: document.body.innerText.length,
      }));
      expect(r.text, 'page has content').toBeGreaterThan(200);
      expect(r.overflow, 'horizontal overflow (px)').toBe(0);
      // The /demo app is a full-screen tool whose heading levels belong to
      // its own screens (sign-in dialog, upload, dashboard).
      if (route !== '/demo') expect(r.h1, 'number of <h1>').toBe(1);
      expect(r.cls, 'cumulative layout shift').toBeLessThan(0.1);
      expect(errors).toEqual([]);
    });
  }
}
