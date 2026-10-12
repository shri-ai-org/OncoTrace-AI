// The homepage hero: fills the first screen, the globe arc keeps its size
// (about 19% of the screen height), the copy never overlaps the blood-drop
// animation, and the page glides at 30% speed while the drop dissolves
// (no glide when the visitor prefers reduced motion).
import { test, expect } from '@playwright/test';
import { blockExternal } from './helpers.js';

const SIZES = [[320, 568], [390, 844], [844, 390], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]];

test.beforeEach(async ({ page, baseURL }) => blockExternal(page, baseURL));

for (const [width, height] of SIZES) {
  test(`hero fills the screen and the globe keeps its size at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const hero = document.querySelector('.ot-hero');
      const arc = hero.querySelector('.ot-hero-arc');
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
      const h = hero.getBoundingClientRect();
      const a = arc.getBoundingClientRect();
      const visibleArc = Math.min(h.bottom, innerHeight) - Math.max(a.top, nav);
      return { short: innerHeight - nav - h.height, globePct: (visibleArc / innerHeight) * 100 };
    });
    expect(r.short, 'hero shorter than the first screen (px)').toBeLessThanOrEqual(1);
    expect(r.globePct, 'globe height, % of the screen').toBeGreaterThanOrEqual(18.5);
    expect(r.globePct, 'globe height, % of the screen').toBeLessThan(19.5);
  });
}

// Bounding box of the drawn particles, in page CSS pixels.
const dropBox = (page) => page.evaluate(() => {
  const c = document.querySelector('.ot-hero-canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = -1;
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      const i = (y * c.width + x) * 4;
      if (d[i + 3] > 40 && d[i] > d[i + 2]) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    }
  }
  const r = c.getBoundingClientRect();
  const k = r.width / c.width;
  return x1 < 0 ? null : { left: r.left + x0 * k, right: r.left + x1 * k };
});

for (const [width, height] of [[1024, 768], [1280, 720], [1440, 900], [1920, 1080]]) {
  test(`copy and capability buttons stay clear of the blood drop at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const drop = await dropBox(page);
    expect(drop, 'the drop is drawn').not.toBeNull();
    const copyRight = await page.evaluate(() => Math.max(
      ...[...document.querySelectorAll('.ot-hero-copy > *')].map((el) => el.getBoundingClientRect().right),
    ));
    expect(copyRight, `copy right edge ${copyRight} vs drop left ${drop.left}`).toBeLessThan(drop.left);
  });
}

test('the hero glides at 30% speed while the drop dissolves', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const g = await page.evaluate(() => {
    const hero = document.querySelector('.ot-hero');
    const space = document.querySelector('.ot-hero-hold-space');
    const top = hero.parentElement.getBoundingClientRect().top + window.scrollY;
    return { distance: space.offsetHeight / 0.7, start: Math.max(0, top + hero.offsetHeight - innerHeight) };
  });
  const heroTopAt = async (y) => {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(500);
    return page.evaluate(() => document.querySelector('.ot-hero').getBoundingClientRect().top);
  };
  const y0 = g.start + 0.1 * g.distance;
  const y1 = g.start + 0.8 * g.distance;
  const speed = -((await heroTopAt(y1)) - (await heroTopAt(y0))) / (y1 - y0);
  expect(speed).toBeGreaterThan(0.25);
  expect(speed).toBeLessThan(0.35);
});

test('no glide under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const spacer = await page.evaluate(() => document.querySelector('.ot-hero-hold-space')?.offsetHeight ?? 0);
  expect(spacer).toBe(0);
});
