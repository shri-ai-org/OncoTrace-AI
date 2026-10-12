// Automated accessibility checks (axe-core, WCAG 2.1 A/AA) on every route and
// every screen of the demo.
//
// Two known exceptions, both rooted in files that are protected from edits
// (the sample report and the design tokens it shares with the demo):
//   - the homepage's sample report (#sample-report) is not scanned;
//   - the demo screens are scanned with every rule except color-contrast:
//     their colours come from tokens.css / colors.js (muted text #9a9aa2 is
//     2.8:1 on white, status green #059669 3.8:1; AA needs 4.5:1);
//   - on the Doctor Summary tab, scrollable-region-focusable is also off
//     (DoctorSummaryPage.jsx). Both need an owner decision, recorded by the
//     test.fixme at the end.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { buildMockAnalysis } from '../src/features/liquidbiopsy/mockData.js';
import { DESKTOP, PHONE, blockExternal } from './helpers.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
// See the header: the demo's colours are protected design tokens.
const DEMO = { disableRules: ['color-contrast'] };
// DoctorSummaryPage.jsx is itself protected: its findings table scrolls
// sideways on phones without being keyboard-focusable.
const DOCTOR_SUMMARY = { disableRules: ['color-contrast', 'scrollable-region-focusable'] };

async function scan(page, { disableRules = [] } = {}) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS).exclude('#sample-report').disableRules(disableRules).analyze();
  // One line per violation and element, so a failure says exactly what to fix.
  return violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')}`));
}

// Scrolls through the page so lazy sections mount and reveal animations finish.
async function revealAll(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(800);
}

test.beforeEach(async ({ page, baseURL }) => {
  await blockExternal(page, baseURL);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const viewport of [DESKTOP, PHONE]) {
  for (const route of ['/', '/blog', '/blog/why-we-focus-on-ctdna', '/Book-LB', '/mammo-demo', '/no-such-page']) {
    test(`${route} has no WCAG A/AA violations (${viewport.width}px)`, async ({ page }) => {
      // The homepage's 3D section is rendered in software by headless Chromium.
      if (route === '/') test.slow();
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: 'networkidle' });
      await revealAll(page);
      expect(await scan(page)).toEqual([]);
    });
  }

  test(`demo screens have no WCAG A/AA violations (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/v1/auth/verify', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/v1/vcf/analyze', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(buildMockAnalysis()),
    }));
    const found = {};
    await page.goto('/demo', { waitUntil: 'networkidle' });
    found['sign-in'] = await scan(page, DEMO);

    await page.fill('#lb-auth-username', 'tester');
    await page.fill('#lb-auth-password', 'correct-horse-battery');
    await page.locator('button[type=submit]').click();
    await expect(page.locator('#vcf-input')).toBeAttached();
    found.upload = await scan(page, DEMO);

    await page.setInputFiles('#vcf-input', {
      name: 'tiny.vcf', mimeType: 'text/plain',
      buffer: Buffer.from('##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n'),
    });
    await page.selectOption('#ref-build', 'GRCh38');
    await page.getByText('Get Your AI Report').click();
    // The dashboard is up (its "Analysis Complete" badge is hidden on phones).
    await expect(page.getByRole('button', { name: 'Start a new analysis' })).toBeVisible({ timeout: 15_000 });
    const nav = viewport === PHONE ? page.getByRole('navigation', { name: 'Primary' }) : page.locator('aside');
    for (const tab of ['Doctor Summary', 'Variant Analysis', 'VAF & Risk', 'Drug Resistance', 'Technical Report']) {
      await nav.getByRole('button', { name: tab, exact: true }).click();
      await page.waitForTimeout(400);
      found[tab] = await scan(page, tab === 'Doctor Summary' ? DOCTOR_SUMMARY : DEMO);
    }
    expect(Object.fromEntries(Object.entries(found).filter(([, v]) => v.length))).toEqual({});
  });
}

test.fixme('demo screens meet WCAG AA colour contrast; Doctor Summary table is keyboard-scrollable', () => {
  // Blocked on protected files: raising contrast means changing the shared
  // demo/report design tokens (tokens.css, colors.js), or overriding them for
  // /demo only; the table fix needs tabIndex/role on a wrapper in
  // DoctorSummaryPage.jsx. Remove this fixme and the exceptions once decided.
});
