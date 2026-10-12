// Shared helpers for the end-to-end suite.

export const ROUTES = ['/', '/blog', '/Book-LB', '/mammo-demo', '/demo', '/no-such-page'];

export const DESKTOP = { width: 1440, height: 900 };
export const PHONE = { width: 390, height: 844 };

/** Collects uncaught page errors and console errors. Assert it is empty at
 *  the end of a test. */
export function trackErrors(page, { ignore = [] } = {}) {
  const errors = [];
  const keep = (text) => !ignore.some((re) => re.test(text));
  page.on('pageerror', (e) => keep(e.message) && errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && keep(m.text()) && errors.push(`console: ${m.text()}`));
  return errors;
}

/** Aborts every request that leaves the site under test, so no test can reach
 *  a real third party (EmailJS, maps, DOI links). Tests that need one of them
 *  register their own route afterwards; later routes take precedence. */
export async function blockExternal(page, baseURL) {
  const host = new URL(baseURL).host;
  await page.route((url) => url.host !== host, (route) => route.abort());
}

/** Waits until a (smooth) scroll has come to rest: scrollY unchanged for
 *  600 ms, giving up after 10 s. */
export async function scrollSettled(page) {
  let last = -1;
  let still = 0;
  for (let i = 0; i < 100 && still < 6; i++) {
    await page.waitForTimeout(100);
    const y = await page.evaluate(() => window.scrollY);
    still = y === last ? still + 1 : 0;
    last = y;
  }
}

/** Distance (px) between a section's top and the bottom of the fixed navbar.
 *  Close to 0 when a jump landed on the section. */
export function offsetFromNavbar(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    return Math.round(el.getBoundingClientRect().top - nav);
  }, selector);
}

export function scrollToTop(page) {
  return page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}
