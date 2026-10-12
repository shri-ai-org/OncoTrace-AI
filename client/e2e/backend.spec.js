// Opt-in: the demo against the REAL analysis backend, through nginx, the way a
// visitor uses it. Skipped unless E2E_BACKEND=1. Needs:
//   - nginx serving dist/ with server/deploy/nginx/*.conf, proxying /api to
//   - uvicorn (server/) with reference data provisioned, started with
//     throwaway ONCOTRACE_DEMO_USERNAME / ONCOTRACE_DEMO_PASSWORD (12+ chars)
// Run it on its own (nginx rate-limits uploads to 2 a minute):
//   E2E_BACKEND=1 E2E_BASE_URL=http://127.0.0.1:8092 E2E_USER=... E2E_PASS=... \
//     npx playwright test backend
// Never point it at production or use real credentials.
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { DESKTOP, trackErrors } from './helpers.js';

const { E2E_BACKEND, E2E_USER, E2E_PASS } = process.env;
const SAMPLES = fileURLToPath(new URL('../public/sample-vcf/', import.meta.url));
const TABS = ['Doctor Summary', 'Variant Analysis', 'VAF & Risk', 'Drug Resistance', 'Technical Report'];

test.skip(E2E_BACKEND !== '1' || !E2E_USER || !E2E_PASS, 'set E2E_BACKEND=1, E2E_USER and E2E_PASS to run');
test.use({ viewport: DESKTOP });
test.setTimeout(15 * 60_000);

test('sign in, catch a wrong build, and analyse every bundled sample', async ({ page }) => {
  // The browser logs the deliberate 401 (wrong password) and 422 (wrong build).
  const errors = trackErrors(page, { ignore: [/the server responded with a status of (401|422)/] });
  const api = [];
  page.on('response', (r) => r.url().includes('/api/') && api.push(`${new URL(r.url()).pathname} ${r.status()}`));

  await page.goto('/demo', { waitUntil: 'networkidle' });
  await page.fill('#lb-auth-username', E2E_USER);
  await page.fill('#lb-auth-password', 'definitely-wrong-password');
  await page.locator('button[type=submit]').click();
  await expect(page.getByRole('alert')).toContainText("That username or password isn't right.");
  await page.fill('#lb-auth-password', E2E_PASS);
  await page.locator('button[type=submit]').click();
  await expect(page.locator('#vcf-input')).toBeAttached();

  // A GRCh37 file analysed as GRCh38 is the user's build choice, not a server fault.
  await page.setInputFiles('#vcf-input', `${SAMPLES}IonXpress-38.vcf`);
  await page.selectOption('#ref-build', 'GRCh38');
  await page.getByText('Get Your AI Report').click();
  await expect(page.locator('body')).toContainText("Reference build doesn't match", { timeout: 120_000 });
  await expect(page.locator('body')).toContainText('GRCh37 / hg19');
  expect(api).toContain('/api/v1/vcf/analyze 422');
  await page.getByRole('button', { name: 'Try a Different File' }).click();

  for (const [label, build] of [['Small panel (S5)', 'GRCh38'], ['IonXpress panel', 'GRCh37'], ['Robin panel', 'GRCh38']]) {
    await page.getByText('Sample Files', { exact: true }).click();
    await page.getByRole('button', { name: new RegExp(label.replace(/[()]/g, '\\$&')) }).click();
    await expect(page.locator('#ref-build')).toHaveValue(build);
    await page.getByText('Get Your AI Report').click();
    await expect(page.getByText('Analysis Complete')).toBeVisible({ timeout: 300_000 });
    for (const tab of TABS) {
      await page.locator('aside').getByRole('button', { name: tab, exact: true }).click();
      await page.waitForTimeout(500);
      expect((await page.locator('main').innerText()).length, `${label}: ${tab}`).toBeGreaterThan(200);
    }
    await page.getByRole('button', { name: 'Start a new analysis' }).click();
    await expect(page.locator('#vcf-input')).toBeAttached();
  }
  expect(errors).toEqual([]);
});
