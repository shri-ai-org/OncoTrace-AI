// The contact form and both booking forms. EmailJS is always intercepted:
// these tests never send a real email.
import { test, expect } from '@playwright/test';
import { DESKTOP, PHONE, blockExternal, scrollSettled, trackErrors } from './helpers.js';

const EMAILJS = '**/api.emailjs.com/**';

/** Answers every EmailJS call with `status` and counts the calls. */
async function interceptEmail(page, status = 200) {
  const calls = { count: 0 };
  await page.route(EMAILJS, (route) => {
    calls.count++;
    return route.fulfill({ status, body: status === 200 ? 'OK' : 'error' });
  });
  return calls;
}

const activeId = (page) => page.evaluate(() => document.activeElement?.id || '');

const fieldError = (page, id) => page.evaluate((fieldId) => {
  const el = document.getElementById(fieldId);
  const describedBy = el.getAttribute('aria-describedby');
  return {
    invalid: el.getAttribute('aria-invalid'),
    message: describedBy ? document.getElementById(describedBy)?.textContent.trim() : null,
  };
}, id);

for (const [path, x] of [['/Book-LB', 'lb'], ['/mammo-demo', 'mm']]) {
  test.describe(`booking form ${path}`, () => {
    test.use({ timezoneId: 'America/Los_Angeles' });

    async function fill(page, overrides = {}) {
      const v = {
        firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.org', phone: '+1 (555) 000-0000',
        organization: 'Test Lab', date: '2026-10-20', time: '10:30', ...overrides,
      };
      for (const k of ['firstName', 'lastName', 'email', 'phone', 'organization', 'date', 'time']) {
        await page.fill(`#${x}-${k}`, v[k]);
      }
      for (const k of ['role', 'primaryInterest', 'teamSize', 'timeZone']) {
        await page.selectOption(`#${x}-${k}`, { index: 1 });
      }
      await page.check(`#${x}-consent`);
    }
    const submit = (page) => page.locator('form button[type="submit"]').click();

    for (const viewport of [DESKTOP, { width: 320, height: 640 }]) {
      test(`validates, reports a failed send, then succeeds (${viewport.width}px)`, async ({ page, baseURL }) => {
        await page.setViewportSize(viewport);
        // The deliberate failed send is logged by the browser and the form.
        const errors = trackErrors(page, { ignore: [/status of 500/, /EmailJS error/] });
        await blockExternal(page, baseURL);
        // 23:59 local while UTC is already the next day: "today" must be local.
        await page.clock.setFixedTime(new Date('2026-10-12T23:59:00-07:00'));
        const failing = await interceptEmail(page, 500);
        await page.goto(path, { waitUntil: 'networkidle' });
        await expect(page.locator(`#${x}-date`)).toHaveAttribute('min', '2026-10-12');

        // Empty submit: errors, focus on the first field, nothing sent.
        await submit(page);
        expect(await fieldError(page, `${x}-firstName`)).toEqual({ invalid: 'true', message: 'First name is required.' });
        expect(await activeId(page)).toBe(`${x}-firstName`);

        // Junk phone and a past date are rejected; focus goes to the first.
        await fill(page, { phone: 'call me maybe', date: '2026-10-11' });
        await submit(page);
        expect(await fieldError(page, `${x}-phone`)).toEqual({ invalid: 'true', message: 'Enter a valid phone number.' });
        expect(await fieldError(page, `${x}-date`)).toEqual({ invalid: 'true', message: 'Please choose today or a later date.' });
        expect(await activeId(page)).toBe(`${x}-phone`);
        expect(failing.count).toBe(0);

        // A failed send is announced (role=alert) and focused.
        await page.fill(`#${x}-phone`, '+44 20 7946 0958');
        await page.fill(`#${x}-date`, '2026-10-12');
        await submit(page);
        const alert = page.locator('form [role="alert"]');
        await expect(alert).toBeVisible();
        await expect(alert).toBeFocused();
        expect(failing.count).toBe(1);

        // Then a successful send: confirmation heading, focused, page at top.
        // (Let the error's smooth scroll finish first, as it would for a
        // person; a still-running one would carry on past the jump to top.)
        await page.unroute(EMAILJS);
        const ok = await interceptEmail(page, 200);
        await scrollSettled(page);
        await submit(page);
        const done = page.getByRole('heading', { name: 'Request Received' });
        await expect(done).toBeVisible();
        await expect(done).toBeFocused();
        expect(ok.count).toBe(1);
        // The confirmation scrolls the page back to the top (smoothly).
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        expect(errors).toEqual([]);
      });
    }

    test('states it is for research or pilot use only', async ({ page, baseURL }) => {
      await blockExternal(page, baseURL);
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.getByText('Research / pilot use only')).toBeVisible();
    });
  });
}

test.describe('contact form', () => {
  for (const viewport of [DESKTOP, PHONE]) {
    test(`sends, and reports a failure (${viewport.width}px)`, async ({ page, baseURL }) => {
      await page.setViewportSize(viewport);
      // The deliberate failed send is logged by the browser and the form.
      const errors = trackErrors(page, { ignore: [/status of 500/, /Contact form send failed/] });
      await blockExternal(page, baseURL);
      const failing = await interceptEmail(page, 500);
      await page.goto('/#cta', { waitUntil: 'networkidle' });

      const form = page.locator('#cta form');
      // Name, email and organization are required: an incomplete form is
      // stopped by the browser and nothing is sent.
      await form.locator('#cta-name').fill('Ada Lovelace');
      await form.locator('#cta-email').fill('ada@example.org');
      await form.locator('button[type="submit"]').click();
      expect(await form.locator('#cta-organization').evaluate((el) => el.validity.valueMissing)).toBe(true);
      expect(failing.count).toBe(0);

      await form.locator('#cta-organization').fill('Test Lab');
      await form.locator('#cta-message').fill('Hello from the end-to-end suite.');
      await form.locator('button[type="submit"]').click();
      await expect(page.locator('#cta')).toContainText('Something went wrong sending your message.');
      expect(failing.count).toBe(1);

      await page.unroute(EMAILJS);
      const ok = await interceptEmail(page, 200);
      await form.locator('button[type="submit"]').click();
      await expect(page.locator('#cta')).toContainText("Thanks! We'll be in touch.");
      expect(ok.count).toBe(1);
      expect(errors).toEqual([]);
    });
  }

  test('caps field lengths', async ({ page, baseURL }) => {
    await blockExternal(page, baseURL);
    await page.goto('/#cta', { waitUntil: 'networkidle' });
    const limits = await page.evaluate(() => ['name', 'email', 'organization', 'message']
      .map((n) => document.getElementById(`cta-${n}`)?.maxLength));
    expect(limits).toEqual([120, 254, 160, 4000]);
  });
});
