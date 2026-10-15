// A quick Back on a slow device, while the next page is still rendering, must
// return the visitor to where they were. This once re-ran the homepage's
// ?section= jump instead (6 failures in 6 runs under these exact conditions).
//
// A file of its own because the race depends on timing: it runs without the
// two things that slow every step just enough to hide it, request
// interception (the site loads nothing external anyway) and trace recording.
import { test, expect } from '@playwright/test';
import { DESKTOP, offsetFromNavbar, scrollSettled } from './helpers.js';

test.use({ viewport: DESKTOP, trace: 'off' });

test('a quick Back, while the next page is still rendering, returns to the same place', async ({ page, context }) => {
  test.slow();
  const ctaTop = () => page.evaluate(() => Math.round(document.getElementById('cta').getBoundingClientRect().top));
  const cdp = await context.newCDPSession(page);

  // A slow phone: the blog page is still rendering when Back is pressed.
  // Several Back delays, since the race depends on timing.
  for (const delay of [100, 150, 250]) {
    await page.goto('/?section=mammogram', { waitUntil: 'networkidle' });
    await expect.poll(async () => Math.abs((await offsetFromNavbar(page, '#mammogram')) ?? Infinity), { timeout: 20_000 }).toBeLessThanOrEqual(40);
    await scrollSettled(page);
    const blog = page.locator('footer').getByRole('button', { name: 'Blog' });
    await blog.scrollIntoViewIfNeeded();
    await scrollSettled(page);
    const before = await ctaTop();

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    await blog.click();
    await page.waitForURL(/\/blog$/); // event-driven: polling would add its own delay
    await page.waitForTimeout(delay);
    await page.goBack();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    await page.waitForTimeout(3000); // past any late jump
    expect(Math.abs((await ctaTop()) - before), `Back ${delay} ms after leaving: contact section moved`).toBeLessThan(40);
  }
});
